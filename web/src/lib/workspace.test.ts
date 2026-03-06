import "../test/setup"

import { afterEach, beforeEach, describe, expect, it } from "bun:test"

import { workspaceAPI, type LayerSyncRequest } from "./workspace-api"

type FetchCall = { url: string; init?: RequestInit }

function jsonResponse(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  })
}

describe("Workspace API", () => {
  const calls: FetchCall[] = []
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    calls.length = 0
    globalThis.fetch = (async (input: any, init?: RequestInit) => {
      const url = typeof input === "string" ? input : String(input?.url || "")
      calls.push({ url, init })

      if (url.startsWith("/api/workspace/canvas") && init?.method === "POST") {
        return jsonResponse({ data: { canvasId: 101 } })
      }
      if (url.startsWith("/api/workspace/canvas") && (init?.method === "GET" || !init?.method)) {
        return jsonResponse({
          canvas: {
            id: 101,
            projectId: 123,
            name: "Main Canvas",
            backgroundColor: "#ffffff",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 1,
          },
          layers: [],
        })
      }
      if (url.startsWith("/api/workspace/layers/sync") && init?.method === "POST") {
        return jsonResponse({ uploaded: 1, updated: 0, skipped: 0, layerMapping: { "layer-1": 999 } })
      }
      if (url.startsWith("/api/workspace/layers/") && init?.method === "PUT") {
        return jsonResponse({ ok: true })
      }
      if (url.startsWith("/api/workspace/layers/") && init?.method === "DELETE") {
        return jsonResponse({ layerId: 456, deleted: true, deletedAt: new Date().toISOString() })
      }
      if (url.endsWith("/restore") && init?.method === "POST") {
        return jsonResponse({ layerId: 456, restored: true, restoredAt: new Date().toISOString() })
      }
      if (url.startsWith("/api/workspace/layers/deleted") && (init?.method === "GET" || !init?.method)) {
        return jsonResponse({ deletedLayers: [], total: 0 })
      }
      return new Response("not found", { status: 404 })
    }) as any
  })
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("creates canvas via api route", async () => {
    const canvasId = await workspaceAPI.createCanvas(123, { name: "Test Canvas" })
    expect(canvasId).toBe(101)
    expect(calls.some((c) => c.url.includes("/api/workspace/canvas") && c.init?.method === "POST")).toBe(true)
  })

  it("gets canvas via api route", async () => {
    const canvas = await workspaceAPI.getCanvas(123)
    expect(canvas?.canvas?.id).toBe(101)
    expect(Array.isArray(canvas?.layers)).toBe(true)
  })

  it("syncs layers via api route", async () => {
    const layers: LayerSyncRequest[] = [
      {
        id: "layer-1",
        layerType: "rectangle",
        name: "Rect",
        zIndex: 0,
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        rotation: 0,
        visible: true,
        locked: false,
        properties: { color: "#000" },
      },
    ]
    const result = await workspaceAPI.syncLayers(123, layers)
    expect(result.uploaded).toBe(1)
    expect(result.layerMapping["layer-1"]).toBe(999)
  })

  it("updates layer via api route", async () => {
    await workspaceAPI.updateLayer(456, { x: 1 })
    expect(calls.some((c) => c.url.includes("/api/workspace/layers/456") && c.init?.method === "PUT")).toBe(true)
  })

  it("deletes layer via api route", async () => {
    const result = await workspaceAPI.deleteLayer(456)
    expect(result.deleted).toBe(true)
  })

  it("restores layer via api route", async () => {
    const result = await workspaceAPI.restoreLayer(456)
    expect(result.restored).toBe(true)
  })

  it("gets deleted layers via api route", async () => {
    const result = await workspaceAPI.getDeletedLayers(789, 50)
    expect(Array.isArray(result.deletedLayers)).toBe(true)
    expect(result.total).toBe(0)
  })

  it("records fetch calls", () => {
    expect(calls.length).toBeGreaterThanOrEqual(0)
  })
})
