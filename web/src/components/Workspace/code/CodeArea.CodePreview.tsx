"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { CodeLanguage } from "./CodeArea.fileUtils";

type CodeTokenType = "plain" | "comment" | "string" | "keyword" | "number" | "boolean" | "null" | "tag" | "attr" | "punct";

type CodeToken = { type: CodeTokenType; text: string };

function tokenClassName(type: CodeTokenType) {
  switch (type) {
    case "comment":
      return "text-gray-500 italic";
    case "string":
      return "text-emerald-700";
    case "keyword":
      return "text-blue-700 font-medium";
    case "tag":
      return "text-blue-700 font-semibold";
    case "attr":
      return "text-sky-800";
    case "punct":
      return "text-gray-500";
    case "number":
      return "text-fuchsia-700";
    case "boolean":
      return "text-rose-700 font-medium";
    case "null":
      return "text-rose-700 font-medium";
    default:
      return "text-gray-900";
  }
}

const TS_KEYWORDS = [
  "as",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "finally",
  "for",
  "from",
  "function",
  "get",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "of",
  "private",
  "protected",
  "public",
  "readonly",
  "return",
  "set",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "try",
  "type",
  "typeof",
  "var",
  "void",
  "while",
  "yield",
  "satisfies",
];

const TS_KEYWORDS_RE = new RegExp(`\\b(?:${TS_KEYWORDS.join("|")})\\b`, "g");
const TS_LITERAL_RE = /\b(?:true|false|null|undefined)\b/g;
const NUMBER_RE = /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g;

function classifyLiteral(word: string): CodeTokenType {
  if (word === "true" || word === "false") return "boolean";
  if (word === "null") return "null";
  if (word === "undefined") return "null";
  return "plain";
}

function highlightPlain(text: string, language: CodeLanguage): CodeToken[] {
  if (!text) return [];

  const tokens: CodeToken[] = [];
  const pushPlain = (s: string) => {
    if (!s) return;
    const last = tokens[tokens.length - 1];
    if (last && last.type === "plain") last.text += s;
    else tokens.push({ type: "plain", text: s });
  };

  const pushToken = (type: CodeTokenType, s: string) => {
    if (!s) return;
    tokens.push({ type, text: s });
  };

  const patterns: Array<{ re: RegExp; type: (match: string) => CodeTokenType }> = [];

  if (language === "json") {
    patterns.push({ re: TS_LITERAL_RE, type: classifyLiteral });
    patterns.push({ re: NUMBER_RE, type: () => "number" });
  } else if (language === "ts" || language === "tsx" || language === "js" || language === "jsx") {
    patterns.push({ re: TS_KEYWORDS_RE, type: () => "keyword" });
    patterns.push({ re: TS_LITERAL_RE, type: classifyLiteral });
    patterns.push({ re: NUMBER_RE, type: () => "number" });
  } else {
    return [{ type: "plain", text }];
  }

  const matches: Array<{ start: number; end: number; type: CodeTokenType; text: string }> = [];
  for (const p of patterns) {
    p.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = p.re.exec(text))) {
      const start = m.index;
      const end = start + m[0].length;
      matches.push({ start, end, type: p.type(m[0]), text: m[0] });
      if (m[0].length === 0) p.re.lastIndex += 1;
    }
  }

  matches.sort((a, b) => (a.start - b.start) || (b.end - a.end));

  let cursor = 0;
  for (const m of matches) {
    if (m.start < cursor) continue;
    pushPlain(text.slice(cursor, m.start));
    pushToken(m.type, m.text);
    cursor = m.end;
  }
  pushPlain(text.slice(cursor));

  return tokens;
}

function tokenizeLines(content: string, language: CodeLanguage) {
  const lines = String(content || "").replaceAll("\r\n", "\n").split("\n");
  const maxHighlightChars = 200_000;
  const maxHighlightLines = 6_000;
  const shouldHighlight = language !== "plain" && content.length <= maxHighlightChars && lines.length <= maxHighlightLines;

  if (!shouldHighlight) {
    return { lines, tokensByLine: null as null | CodeToken[][] };
  }

  const tokensByLine: CodeToken[][] = [];

  if (language === "json") {
    for (const line of lines) {
      const tokens: CodeToken[] = [];
      let i = 0;
      while (i < line.length) {
        const ch = line[i] || "";
        if (ch === '"') {
          let j = i + 1;
          while (j < line.length) {
            const c = line[j] || "";
            if (c === "\\" && j + 1 < line.length) {
              j += 2;
              continue;
            }
            if (c === '"') {
              j += 1;
              break;
            }
            j += 1;
          }
          tokens.push({ type: "string", text: line.slice(i, j) });
          i = j;
          continue;
        }
        let j = i + 1;
        while (j < line.length && line[j] !== '"') j += 1;
        tokens.push(...highlightPlain(line.slice(i, j), language));
        i = j;
      }
      tokensByLine.push(tokens.length ? tokens : [{ type: "plain", text: "" }]);
    }
    return { lines, tokensByLine };
  }

  if (language === "ts" || language === "tsx" || language === "js" || language === "jsx") {
    let inBlockComment = false;
    for (const line of lines) {
      const tokens: CodeToken[] = [];
      let i = 0;

      while (i < line.length) {
        if (inBlockComment) {
          const end = line.indexOf("*/", i);
          if (end < 0) {
            tokens.push({ type: "comment", text: line.slice(i) });
            i = line.length;
            break;
          }
          tokens.push({ type: "comment", text: line.slice(i, end + 2) });
          i = end + 2;
          inBlockComment = false;
          continue;
        }

        const ch = line[i] || "";
        const next = line[i + 1] || "";

        if (ch === "/" && next === "/") {
          tokens.push({ type: "comment", text: line.slice(i) });
          i = line.length;
          break;
        }

        if (ch === "/" && next === "*") {
          const end = line.indexOf("*/", i + 2);
          if (end < 0) {
            tokens.push({ type: "comment", text: line.slice(i) });
            inBlockComment = true;
            i = line.length;
            break;
          }
          tokens.push({ type: "comment", text: line.slice(i, end + 2) });
          i = end + 2;
          continue;
        }

        if (ch === '"' || ch === "'" || ch === "`") {
          const quote = ch;
          let j = i + 1;
          while (j < line.length) {
            const c = line[j] || "";
            if (c === "\\" && j + 1 < line.length) {
              j += 2;
              continue;
            }
            if (c === quote) {
              j += 1;
              break;
            }
            j += 1;
          }
          tokens.push({ type: "string", text: line.slice(i, j) });
          i = j;
          continue;
        }

        let j = i + 1;
        while (j < line.length) {
          const c = line[j] || "";
          const n = line[j + 1] || "";
          if (c === '"' || c === "'" || c === "`") break;
          if (c === "/" && (n === "/" || n === "*")) break;
          j += 1;
        }
        tokens.push(...highlightPlain(line.slice(i, j), language));
        i = j;
      }

      tokensByLine.push(tokens.length ? tokens : [{ type: "plain", text: "" }]);
    }
    return { lines, tokensByLine };
  }

  if (language === "html") {
    let inHtmlComment = false;

    const isNameStart = (c: string) => /[A-Za-z_]/.test(c);
    const isNameChar = (c: string) => /[A-Za-z0-9:_-]/.test(c);

    for (const line of lines) {
      const tokens: CodeToken[] = [];
      let i = 0;

      const push = (type: CodeTokenType, text: string) => {
        if (!text) return;
        tokens.push({ type, text });
      };

      while (i < line.length) {
        if (inHtmlComment) {
          const end = line.indexOf("-->", i);
          if (end < 0) {
            push("comment", line.slice(i));
            i = line.length;
            break;
          }
          push("comment", line.slice(i, end + 3));
          i = end + 3;
          inHtmlComment = false;
          continue;
        }

        const commentStart = line.indexOf("<!--", i);
        const tagStart = line.indexOf("<", i);

        const next = (() => {
          if (commentStart < 0) return tagStart;
          if (tagStart < 0) return commentStart;
          return Math.min(commentStart, tagStart);
        })();

        if (next < 0) {
          push("plain", line.slice(i));
          break;
        }

        if (next > i) {
          push("plain", line.slice(i, next));
          i = next;
        }

        if (line.startsWith("<!--", i)) {
          const end = line.indexOf("-->", i + 4);
          if (end < 0) {
            push("comment", line.slice(i));
            inHtmlComment = true;
            i = line.length;
            break;
          }
          push("comment", line.slice(i, end + 3));
          i = end + 3;
          continue;
        }

        if (line[i] !== "<") {
          push("plain", line[i] || "");
          i += 1;
          continue;
        }

        push("punct", "<");
        i += 1;

        if (line[i] === "/") {
          push("punct", "/");
          i += 1;
        }

        let tagName = "";
        while (i < line.length && isNameChar(line[i] || "")) {
          tagName += line[i] || "";
          i += 1;
        }
        if (tagName) push("tag", tagName);

        while (i < line.length) {
          const ch = line[i] || "";
          if (ch === ">") {
            push("punct", ">");
            i += 1;
            break;
          }
          if (ch === "/" && (line[i + 1] || "") === ">") {
            push("punct", "/>");
            i += 2;
            break;
          }
          if (/\s/.test(ch)) {
            let j = i + 1;
            while (j < line.length && /\s/.test(line[j] || "")) j += 1;
            push("plain", line.slice(i, j));
            i = j;
            continue;
          }
          if (!isNameStart(ch)) {
            push("punct", ch);
            i += 1;
            continue;
          }

          let attrName = "";
          while (i < line.length && isNameChar(line[i] || "")) {
            attrName += line[i] || "";
            i += 1;
          }
          if (attrName) push("attr", attrName);

          while (i < line.length && /\s/.test(line[i] || "")) {
            push("plain", line[i] || "");
            i += 1;
          }

          if ((line[i] || "") === "=") {
            push("punct", "=");
            i += 1;
            while (i < line.length && /\s/.test(line[i] || "")) {
              push("plain", line[i] || "");
              i += 1;
            }
            const q = line[i] || "";
            if (q === '"' || q === "'") {
              let j = i + 1;
              while (j < line.length) {
                const c = line[j] || "";
                if (c === "\\" && j + 1 < line.length) {
                  j += 2;
                  continue;
                }
                if (c === q) {
                  j += 1;
                  break;
                }
                j += 1;
              }
              push("string", line.slice(i, j));
              i = j;
            } else {
              let j = i;
              while (j < line.length) {
                const c = line[j] || "";
                if (/\s/.test(c) || c === ">" || (c === "/" && (line[j + 1] || "") === ">")) break;
                j += 1;
              }
              push("string", line.slice(i, j));
              i = j;
            }
          }
        }
      }

      tokensByLine.push(tokens.length ? tokens : [{ type: "plain", text: "" }]);
    }

    return { lines, tokensByLine };
  }

  return { lines, tokensByLine: null as null | CodeToken[][] };
}

export function CodePreview({ content, language = "plain" }: { content: string; language?: CodeLanguage }) {
  const [wrap, setWrap] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [content]);

  const highlighted = useMemo(() => tokenizeLines(content, language), [content, language]);
  const effectiveLines = highlighted.lines;
  const tokensByLine = highlighted.tokensByLine;
  const lineDigits = useMemo(() => String(Math.max(1, effectiveLines.length)).length, [effectiveLines.length]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 900);
    } catch {}
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs text-gray-600">
        <button type="button" onClick={() => setWrap(v => !v)} className="hover:text-gray-900 hover:underline">
          {wrap ? "不换行" : "自动换行"}
        </button>
        <button type="button" onClick={() => void copy()} className="hover:text-gray-900 hover:underline">
          {copied ? "已复制" : "复制"}
        </button>
        {tokensByLine ? <span className="text-[11px] text-gray-400">语法高亮</span> : null}
      </div>
      <div className="font-mono text-xs leading-5 text-gray-900">
        {effectiveLines.map((line, idx) => (
          <div key={idx} className="flex">
            <div className="shrink-0 select-none text-right text-gray-400 pr-4" style={{ width: `${lineDigits + 2}ch` }}>
              {idx + 1}
            </div>
            <div className={`${wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"} min-w-0 flex-1`}>
              {tokensByLine ? (
                tokensByLine[idx]?.map((t, ti) => (
                  <span key={ti} className={tokenClassName(t.type)}>
                    {t.text}
                  </span>
                ))
              ) : (
                <span>{line.length ? line : "\u00A0"}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
