import { ChevronDownIcon, ChevronRightIcon, DatabaseIcon, FileCodeIcon, FileIcon, FileJsonIcon, FileTextIcon, FolderIcon, FolderOpenIcon, PaletteIcon, type LucideIcon } from "lucide-react";
import * as React from "react";
import { C, MONO } from "./kit";
import { tint } from "./shell";

// The app's code pages, drawn like an editor: a file tree with folder and file icons, a tab strip with
// the open file, a line-number gutter, syntax colouring suited to Midnight (keywords periwinkle,
// strings green-ish, comments muted) and diffs with soft green and red lines and a +/- gutter.

/** The colours of the code, from the theme where it has them. */
const SYNTAX = {
  keyword: C.accent,
  string: "#9ad3a6",
  number: "#e6c07b",
  comment: C.dim,
  property: "#a9b6ff",
  tag: C.accent,
  attr: "#c9d0ff",
  type: "#7fd4e6",
  call: "#dcdde0",
  punct: C.muted,
  plain: C.fg,
};

export type Lang = "ts" | "tsx" | "json" | "sql" | "md" | "css" | "text";

const KEYWORDS = new Set(["import", "export", "from", "const", "let", "var", "function", "return", "if", "else", "for", "of", "in", "new", "await", "async", "type", "interface", "extends", "default", "true", "false", "null", "undefined", "class", "throw", "try", "catch", "as", "satisfies", "switch", "case", "break", "void", "typeof", "declare", "readonly"]);
const SQL = new Set(["create", "table", "if", "not", "exists", "primary", "key", "text", "integer", "real", "default", "null", "references", "on", "delete", "set", "cascade", "index", "unique", "insert", "into", "values", "select", "from", "where", "and", "or", "order", "by", "limit", "alter", "add", "column", "datetime", "now"]);

const TOKEN = /(\/\/.*$|--.*$|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|(<\/?[A-Za-z][\w.-]*|\/?>)|([A-Za-z_$][\w$]*)|(\s+)|(.)/g;

/** Splits one line of code into coloured runs. Kept small: enough for the few files the film shows. */
export function tokens(line: string, lang: Lang): { text: string; color: string }[] {
  if (lang === "text" || lang === "md") return [{ text: line, color: lang === "md" && line.startsWith("#") ? C.strong : C.fg }];
  const out: { text: string; color: string }[] = [];
  let inTag = false;
  let m: RegExpExecArray | null;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(line))) {
    const [text, comment, str, num, tag, word, ws, punct] = m;
    let color = SYNTAX.plain;
    if (comment) color = SYNTAX.comment;
    else if (str) {
      // in JSON a key is the string before a colon
      const rest = line.slice(m.index + text.length);
      color = lang === "json" && /^\s*:/.test(rest) ? SYNTAX.property : SYNTAX.string;
    } else if (num) color = SYNTAX.number;
    else if (tag) {
      if (lang !== "tsx") color = SYNTAX.punct;
      else {
        color = SYNTAX.tag;
        inTag = !tag.endsWith(">");
      }
    } else if (word) {
      const w = word.toLowerCase();
      const rest = line.slice(m.index + text.length);
      if (lang === "sql") color = SQL.has(w) ? SYNTAX.keyword : /^\s*\(/.test(rest) ? SYNTAX.call : SYNTAX.plain;
      else if (lang === "css") color = /^\s*:/.test(rest) ? SYNTAX.property : /^[.#]/.test(line.slice(Math.max(0, m.index - 1), m.index)) ? SYNTAX.tag : SYNTAX.plain;
      else if (inTag) color = SYNTAX.attr;
      else if (KEYWORDS.has(word)) color = SYNTAX.keyword;
      else if (/^[A-Z]/.test(word) && !/^[A-Z_]+$/.test(word)) color = SYNTAX.type;
      else if (/^\s*\(/.test(rest)) color = SYNTAX.call;
      else if (/^\s*:/.test(rest) && !/^\s*:\s*[A-Z]/.test(rest)) color = SYNTAX.property;
    } else if (ws) color = SYNTAX.plain;
    else if (punct) color = SYNTAX.punct;
    const last = out[out.length - 1];
    if (last && last.color === color) last.text += text;
    else out.push({ text, color });
  }
  return out;
}

export function langOf(name: string): Lang {
  const ext = name.split(".").pop() ?? "";
  return ext === "tsx" ? "tsx" : ext === "ts" || ext === "mjs" || ext === "js" ? "ts" : ext === "json" || ext === "jsonc" ? "json" : ext === "sql" ? "sql" : ext === "md" ? "md" : ext === "css" ? "css" : "text";
}

export function fileIcon(name: string): LucideIcon {
  const ext = name.split(".").pop() ?? "";
  if (ext === "json" || ext === "jsonc") return FileJsonIcon;
  if (ext === "ts" || ext === "tsx" || ext === "mjs" || ext === "js" || ext === "yaml") return FileCodeIcon;
  if (ext === "md" || ext === "txt") return FileTextIcon;
  if (ext === "sql") return DatabaseIcon;
  if (ext === "css") return PaletteIcon;
  return FileIcon;
}

export type TreeNode = { name: string; depth: number; dir?: boolean; open?: boolean; active?: boolean; lit?: number; appear?: number; status?: "A" | "M" };

/** The file tree: folders with a chevron, files with an icon for their kind, git status at the end. */
export function Tree({ nodes, rowHeight = 28, style }: { nodes: TreeNode[]; rowHeight?: number; style?: React.CSSProperties }): React.ReactElement {
  return (
    <div style={{ padding: "4px 8px", fontSize: 13.5, ...style }}>
      {nodes.map((n, i) => {
        const Icon = n.dir ? (n.open ? FolderOpenIcon : FolderIcon) : fileIcon(n.name);
        const Chev = n.open ? ChevronDownIcon : ChevronRightIcon;
        const lit = n.lit ?? 0;
        const a = n.appear ?? 1;
        const status = n.status ? { A: { fg: C.success, label: "A" }, M: { fg: C.warning, label: "M" } }[n.status] : null;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, height: rowHeight, paddingLeft: 6 + n.depth * 16, paddingRight: 8, borderRadius: 6, background: lit > 0 ? tint(C.accent, lit * 16) : n.active ? C.active : undefined, color: n.active || lit > 0.5 ? C.strong : status ? status.fg : C.fg, opacity: a, transform: `translateX(${(1 - a) * -10}px)` }}>
            {n.dir ? <Chev style={{ width: 13, height: 13, color: C.dim, flexShrink: 0 }} /> : <span style={{ width: 13, flexShrink: 0 }} />}
            <Icon style={{ width: 15, height: 15, color: lit > 0.3 || n.active ? C.accent : n.dir ? C.muted : C.dim, flexShrink: 0 }} />
            <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.name}</span>
            {status ? <span style={{ fontFamily: MONO, fontSize: 12, color: status.fg }}>{status.label}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

/** The strip of open files above an editor. */
export function TabStrip({ tabs, right }: { tabs: { name: string; active?: boolean; status?: "A" | "M" }[]; right?: React.ReactNode }): React.ReactElement {
  return (
    <div style={{ height: 38, display: "flex", alignItems: "stretch", borderBottom: `1px solid ${C.line}`, background: C.card, flexShrink: 0 }}>
      {tabs.map((tab) => {
        const Icon = fileIcon(tab.name);
        return (
          <div key={tab.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px", fontSize: 13.5, color: tab.active ? C.strong : C.muted, background: tab.active ? C.page : "transparent", borderRight: `1px solid ${C.lineSoft}`, boxShadow: tab.active ? `inset 0 2px 0 ${C.accent}` : undefined, whiteSpace: "nowrap" }}>
            <Icon style={{ width: 14, height: 14, color: tab.active ? C.accent : C.dim }} />
            {tab.name}
            {tab.status ? <span style={{ fontFamily: MONO, fontSize: 12, color: tab.status === "A" ? C.success : C.warning }}>{tab.status}</span> : null}
          </div>
        );
      })}
      <div style={{ flex: 1 }} />
      {right ? <div style={{ display: "flex", alignItems: "center", padding: "0 14px", fontSize: 12.5, color: C.dim, gap: 14 }}>{right}</div> : null}
    </div>
  );
}

const LINE_H = 22;

function Run({ runs }: { runs: { text: string; color: string }[] }): React.ReactElement {
  return (
    <>
      {runs.map((r, i) => (
        <span key={i} style={{ color: r.color }}>{r.text}</span>
      ))}
    </>
  );
}

/** Code with a line-number gutter. `k` for each line fades it in; `lit` lines get the accent behind them. */
export function CodeView({ lines, lang, from = 1, appear, lit, style }: { lines: string[]; lang: Lang; from?: number; appear?: (i: number) => number; lit?: (i: number) => number; style?: React.CSSProperties }): React.ReactElement {
  return (
    <div style={{ fontFamily: MONO, fontSize: 13, lineHeight: `${LINE_H}px`, padding: "10px 0", color: C.fg, ...style }}>
      {lines.map((l, i) => {
        const a = appear?.(i) ?? 1;
        const hot = lit?.(i) ?? 0;
        return (
          <div key={i} style={{ display: "flex", whiteSpace: "pre", opacity: a, background: hot > 0 ? tint(C.accent, hot * 12) : undefined }}>
            <span style={{ width: 52, flexShrink: 0, textAlign: "right", paddingRight: 16, color: C.dim, userSelect: "none" }}>{from + i}</span>
            <span style={{ paddingRight: 24 }}><Run runs={tokens(l, lang)} /></span>
          </div>
        );
      })}
    </div>
  );
}

export type DiffLine = { kind: "+" | "-" | " " | "@"; text: string; note?: React.ReactNode };

/** A diff: old and new line numbers, a +/- gutter, soft green and red behind the changed lines. */
export function DiffView({ lines, lang, oldFrom = 1, newFrom = 1, appear, style }: { lines: DiffLine[]; lang: Lang; oldFrom?: number; newFrom?: number; appear?: (i: number) => number; style?: React.CSSProperties }): React.ReactElement {
  let o = oldFrom;
  let n = newFrom;
  return (
    <div style={{ fontFamily: MONO, fontSize: 13, lineHeight: `${LINE_H}px`, padding: "8px 0", color: C.fg, ...style }}>
      {lines.map((l, i) => {
        const a = appear?.(i) ?? 1;
        if (l.kind === "@") {
          return (
            <div key={i} style={{ display: "flex", whiteSpace: "pre", background: C.fill, color: C.meta, opacity: a }}>
              <span style={{ width: 88, flexShrink: 0 }} />
              <span style={{ paddingLeft: 10 }}>{l.text}</span>
            </div>
          );
        }
        const bg = l.kind === "+" ? tint(C.success, 11) : l.kind === "-" ? tint(C.danger, 11) : undefined;
        const gutter = l.kind === "+" ? tint(C.success, 20) : l.kind === "-" ? tint(C.danger, 20) : undefined;
        const left = l.kind === "+" ? "" : String(o++);
        const right = l.kind === "-" ? "" : String(n++);
        return (
          <div key={i} style={{ display: "flex", whiteSpace: "pre", background: bg, opacity: a }}>
            <span style={{ width: 40, flexShrink: 0, textAlign: "right", paddingRight: 8, color: C.dim, background: gutter }}>{left}</span>
            <span style={{ width: 40, flexShrink: 0, textAlign: "right", paddingRight: 8, color: C.dim, background: gutter }}>{right}</span>
            <span style={{ width: 22, flexShrink: 0, textAlign: "center", color: l.kind === "+" ? C.success : l.kind === "-" ? C.danger : C.dim }}>{l.kind.trim()}</span>
            <span style={{ flex: 1, paddingRight: 16 }}><Run runs={tokens(l.text, lang)} /></span>
            {l.note ? <span style={{ paddingRight: 14, fontSize: 12 }}>{l.note}</span> : null}
          </div>
        );
      })}
    </div>
  );
}
