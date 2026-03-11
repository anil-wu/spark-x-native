import * as http from "node:http"
import * as https from "node:https"
import { existsSync, readFileSync } from "node:fs"

function isLikelyRunningInDocker() {
  if (process.platform !== "linux") return false
  try {
    return existsSync("/.dockerenv")
  } catch {
    return false
  }
}

function isWsl() {
  if (process.platform !== "linux") return false
  if (process.env.WSL_DISTRO_NAME) return true
  try {
    const osrelease = readFileSync("/proc/sys/kernel/osrelease", "utf8").toLowerCase()
    return osrelease.includes("microsoft")
  } catch {
    return false
  }
}

function getWindowsHostIpFromWsl() {
  try {
    const conf = readFileSync("/etc/resolv.conf", "utf8")
    const line = conf
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.startsWith("nameserver "))
    if (!line) return null
    const ip = line.replace(/^nameserver\s+/, "").trim()
    if (!ip) return null
    return ip
  } catch {
    return null
  }
}

function replaceUrlHost(rawUrl: string, hostname: string) {
  const u = new URL(rawUrl)
  u.hostname = hostname
  return u.toString()
}

function connectHostCandidates(rawUrl: string) {
  try {
    const u = new URL(rawUrl)
    const hosts: string[] = []
    const pushHost = (hostname: string | null | undefined) => {
      if (!hostname || hostname === u.hostname) return
      hosts.push(hostname)
    }
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
      if (isLikelyRunningInDocker()) {
        pushHost("minio")
        pushHost("host.docker.internal")
        pushHost("service")
      }
      if (isWsl()) {
        pushHost(getWindowsHostIpFromWsl())
      }
      pushHost(u.hostname === "localhost" ? "127.0.0.1" : "localhost")
    } else if (u.hostname === "host.docker.internal") {
      if (isLikelyRunningInDocker()) {
        pushHost("minio")
        pushHost("service")
      }
      pushHost("localhost")
      pushHost("127.0.0.1")
    } else if (!isLikelyRunningInDocker() && u.hostname === "minio") {
      pushHost("localhost")
      pushHost("127.0.0.1")
    }
    return Array.from(new Set(hosts))
  } catch {
    return []
  }
}

function downloadUrlCandidates(rawUrl: string) {
  try {
    const u = new URL(rawUrl)
    const candidates: string[] = [rawUrl]
    const pushHost = (hostname: string | null | undefined) => {
      if (!hostname || hostname === u.hostname) return
      candidates.push(replaceUrlHost(rawUrl, hostname))
    }
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
      if (isLikelyRunningInDocker()) {
        pushHost("minio")
        pushHost("host.docker.internal")
        pushHost("service")
      }
      if (isWsl()) {
        pushHost(getWindowsHostIpFromWsl())
      }
      pushHost(u.hostname === "localhost" ? "127.0.0.1" : "localhost")
    } else if (u.hostname === "host.docker.internal") {
      if (isLikelyRunningInDocker()) {
        pushHost("minio")
        pushHost("service")
      }
      pushHost("localhost")
      pushHost("127.0.0.1")
    } else if (!isLikelyRunningInDocker() && u.hostname === "minio") {
      pushHost("localhost")
      pushHost("127.0.0.1")
    }
    return Array.from(new Set(candidates))
  } catch {
    return [rawUrl]
  }
}

async function requestBufferViaHostOverride(rawUrl: string, connectHost: string, originalHostHeader: string) {
  const u = new URL(rawUrl)
  const client = u.protocol === "https:" ? https : http
  const port = u.port ? Number.parseInt(u.port, 10) : u.protocol === "https:" ? 443 : 80
  return await new Promise<Buffer>((resolve, reject) => {
    const req = client.request(
      {
        protocol: u.protocol,
        hostname: connectHost,
        port,
        method: "GET",
        path: `${u.pathname}${u.search}`,
        headers: { host: originalHostHeader },
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
        res.on("end", () => {
          const status = res.statusCode || 0
          if (status < 200 || status >= 300) {
            const bodyText = Buffer.concat(chunks).toString("utf8").slice(0, 400)
            reject(new Error(`download failed (${status}) from ${connectHost} with host=${originalHostHeader}: ${bodyText}`))
            return
          }
          resolve(Buffer.concat(chunks))
        })
      },
    )
    req.on("error", reject)
    req.end()
  })
}

export async function fetchBinaryWithFallback(url: string) {
  const candidates = downloadUrlCandidates(url)
  const originalHostHeader = new URL(url).host
  const hosts = connectHostCandidates(url)
  let lastError: unknown = null

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate)
      if (!response.ok) {
        lastError = new Error(`download failed (${response.status}) from ${candidate}`)
        continue
      }
      const ab = await response.arrayBuffer()
      return Buffer.from(ab)
    } catch (e) {
      lastError = e
    }
  }

  for (const host of hosts) {
    try {
      return await requestBufferViaHostOverride(url, host, originalHostHeader)
    } catch (e) {
      lastError = e
    }
  }

  const lastMessage = lastError instanceof Error ? lastError.message : String(lastError || "")
  const hints = hosts.map((h) => `${h} (host=${originalHostHeader})`)
  const allTried = [...candidates, ...hints]
  throw new Error(`download failed. Tried: ${allTried.join(", ")}${lastMessage ? `. Last error: ${lastMessage}` : ""}`)
}

export async function putToSignedUrlWithFallback(url: string, contentType: string, content: Buffer) {
  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "content-type": contentType,
      },
      body: content,
    })
    if (response.ok) return
    const text = await response.text()
    throw new Error(`upload failed (${response.status}): ${text}`)
  } catch (initialError) {
    const originalHostHeader = new URL(url).host
    const hosts = connectHostCandidates(url)
    let lastError: unknown = initialError
    for (const host of hosts) {
      try {
        const u = new URL(url)
        const client = u.protocol === "https:" ? https : http
        const port = u.port ? Number.parseInt(u.port, 10) : u.protocol === "https:" ? 443 : 80
        await new Promise<void>((resolve, reject) => {
          const req = client.request(
            {
              protocol: u.protocol,
              hostname: host,
              port,
              method: "PUT",
              path: `${u.pathname}${u.search}`,
              headers: {
                host: originalHostHeader,
                "content-type": contentType,
                "content-length": String(content.length),
              },
            },
            (res) => {
              const chunks: Buffer[] = []
              res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
              res.on("end", () => {
                const status = res.statusCode || 0
                if (status >= 200 && status < 300) {
                  resolve()
                  return
                }
                const bodyText = Buffer.concat(chunks).toString("utf8").slice(0, 400)
                reject(new Error(`upload failed (${status}) from ${host} with host=${originalHostHeader}: ${bodyText}`))
              })
            },
          )
          req.on("error", reject)
          req.write(content)
          req.end()
        })
        return
      } catch (e) {
        lastError = e
      }
    }
    const lastMessage = lastError instanceof Error ? lastError.message : String(lastError || "")
    const hints = hosts.map((h) => `${h} (host=${originalHostHeader})`)
    throw new Error(`upload failed. Tried: ${url}${hints.length ? `, ${hints.join(", ")}` : ""}${lastMessage ? `. Last error: ${lastMessage}` : ""}`)
  }
}
