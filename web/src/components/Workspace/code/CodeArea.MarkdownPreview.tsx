"use client";

import React, { useMemo, useState } from "react";
import { CodePreview } from "./CodeArea.CodePreview";
import { formatBytes } from "./CodeArea.fileUtils";

type MdBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; lines: string[] }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "blockquote"; lines: string[] }
  | { type: "code"; lang: string; text: string };

function parseMarkdownBlocks(markdown: string): MdBlock[] {
  const lines = String(markdown || "").replaceAll("\r\n", "\n").split("\n");
  const blocks: MdBlock[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";

    const fenceMatch = line.match(/^\s*```(?:\s*(\S+))?\s*$/);
    if (fenceMatch) {
      const lang = (fenceMatch[1] || "").trim();
      i += 1;
      const codeLines: string[] = [];
      while (i < lines.length && !/^\s*```/.test(String(lines[i] ?? ""))) {
        codeLines.push(lines[i] ?? "");
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: "code", lang, text: codeLines.join("\n") });
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({ type: "heading", level: headingMatch[1].length, text: headingMatch[2] || "" });
      i += 1;
      continue;
    }

    if (/^\s*$/.test(line)) {
      i += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const qLines: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(String(lines[i] ?? ""))) {
        qLines.push(String(lines[i] ?? "").replace(/^\s*>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "blockquote", lines: qLines });
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(String(lines[i] ?? ""))) {
        items.push(String(lines[i] ?? "").replace(/^\s*[-*]\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(String(lines[i] ?? ""))) {
        items.push(String(lines[i] ?? "").replace(/^\s*\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const pLines: string[] = [];
    while (i < lines.length) {
      const l = String(lines[i] ?? "");
      if (/^\s*$/.test(l)) break;
      if (/^\s*```/.test(l)) break;
      if (/^(#{1,6})\s+/.test(l)) break;
      if (/^\s*>\s?/.test(l)) break;
      if (/^\s*[-*]\s+/.test(l)) break;
      if (/^\s*\d+\.\s+/.test(l)) break;
      pLines.push(l);
      i += 1;
    }
    blocks.push({ type: "paragraph", lines: pLines });
  }

  return blocks;
}

function renderInlineMarkdown(text: string) {
  const nodes: React.ReactNode[] = [];
  const s = String(text || "");
  let i = 0;

  const pushText = (v: string) => {
    if (!v) return;
    nodes.push(v);
  };

  while (i < s.length) {
    const rest = s.slice(i);

    if (rest.startsWith("`")) {
      const end = rest.indexOf("`", 1);
      if (end > 0) {
        const code = rest.slice(1, end);
        nodes.push(
          <code key={`c_${i}`} className="px-1 py-0.5 rounded bg-gray-100 text-[11px] font-mono text-gray-800">
            {code}
          </code>,
        );
        i += end + 1;
        continue;
      }
      pushText("`");
      i += 1;
      continue;
    }

    if (rest.startsWith("[")) {
      const closeBracket = rest.indexOf("]");
      const openParen = closeBracket > 0 ? rest.indexOf("(", closeBracket) : -1;
      const closeParen = openParen > 0 ? rest.indexOf(")", openParen) : -1;
      if (closeBracket > 0 && openParen === closeBracket + 1 && closeParen > openParen + 1) {
        const label = rest.slice(1, closeBracket);
        const url = rest.slice(openParen + 1, closeParen);
        nodes.push(
          <a key={`a_${i}`} href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-words">
            {label || url}
          </a>,
        );
        i += closeParen + 1;
        continue;
      }
      pushText("[");
      i += 1;
      continue;
    }

    const nextSpecial = (() => {
      const nextTick = rest.indexOf("`");
      const nextBracket = rest.indexOf("[");
      const candidates = [nextTick, nextBracket].filter(n => n >= 0);
      if (candidates.length === 0) return -1;
      return Math.min(...candidates);
    })();

    if (nextSpecial < 0) {
      pushText(rest);
      break;
    }
    if (nextSpecial === 0) {
      pushText(rest[0] || "");
      i += 1;
      continue;
    }
    pushText(rest.slice(0, nextSpecial));
    i += nextSpecial;
  }

  return nodes;
}

export function MarkdownPreview({ content }: { content: string }) {
  const blocks = useMemo(() => parseMarkdownBlocks(content), [content]);
  const [forceRender, setForceRender] = useState(false);

  const stats = useMemo(() => {
    const text = String(content || "");
    const lines = text.replaceAll("\r\n", "\n").split("\n").length;
    return { chars: text.length, lines };
  }, [content]);

  const isLarge = stats.chars > 120_000 || stats.lines > 4_000 || blocks.length > 600;

  if (isLarge && !forceRender) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Markdown 文件较大（{formatBytes(stats.chars)} · {stats.lines} 行），为避免卡顿已自动以纯文本显示。
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setForceRender(true)}
            className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
          >
            仍要渲染 Markdown
          </button>
        </div>
        <CodePreview content={content} language="md" />
      </div>
    );
  }

  return (
    <div className="text-sm leading-6 text-gray-900 space-y-3">
      {isLarge && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
          已启用 Markdown 渲染（大文件可能较慢）。{" "}
          <button type="button" onClick={() => setForceRender(false)} className="text-blue-600 hover:text-blue-700 hover:underline">
            切回纯文本
          </button>
        </div>
      )}
      {blocks.map((b, idx) => {
        if (b.type === "heading") {
          const Tag = (["h1", "h2", "h3", "h4", "h5", "h6"][Math.min(5, Math.max(0, b.level - 1))] || "h3") as keyof JSX.IntrinsicElements;
          const size = b.level === 1 ? "text-xl" : b.level === 2 ? "text-lg" : b.level === 3 ? "text-base" : "text-sm";
          return (
            <Tag key={idx} className={`${size} font-semibold mt-2`}>
              {renderInlineMarkdown(b.text)}
            </Tag>
          );
        }
        if (b.type === "code") {
          return (
            <pre key={idx} className="text-[12px] leading-5 bg-gray-50 border border-gray-200 rounded-xl p-3 overflow-auto">
              <code className="font-mono whitespace-pre">{b.text}</code>
            </pre>
          );
        }
        if (b.type === "blockquote") {
          return (
            <blockquote key={idx} className="border-l-4 border-gray-200 pl-3 text-gray-700 bg-gray-50/50 rounded-r-md py-1">
              {b.lines.map((l, li) => (
                <div key={li} className="whitespace-pre-wrap">
                  {renderInlineMarkdown(l)}
                </div>
              ))}
            </blockquote>
          );
        }
        if (b.type === "ul") {
          return (
            <ul key={idx} className="list-disc pl-5 space-y-1">
              {b.items.map((it, ii) => (
                <li key={ii} className="whitespace-pre-wrap">
                  {renderInlineMarkdown(it)}
                </li>
              ))}
            </ul>
          );
        }
        if (b.type === "ol") {
          return (
            <ol key={idx} className="list-decimal pl-5 space-y-1">
              {b.items.map((it, ii) => (
                <li key={ii} className="whitespace-pre-wrap">
                  {renderInlineMarkdown(it)}
                </li>
              ))}
            </ol>
          );
        }
        return (
          <div key={idx} className="whitespace-pre-wrap">
            {renderInlineMarkdown(b.lines.join("\n"))}
          </div>
        );
      })}
    </div>
  );
}
