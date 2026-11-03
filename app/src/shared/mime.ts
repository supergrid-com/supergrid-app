// What a file is, from its name: the content type R2 stores and the family the Files page filters
// by. Shared by the main process (uploads from the picker carry no type) and the renderer.

export type FileFamily = "image" | "video" | "audio" | "document" | "spreadsheet" | "presentation" | "archive" | "code" | "font" | "other";

const TYPES: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", avif: "image/avif", svg: "image/svg+xml", heic: "image/heic", bmp: "image/bmp", tif: "image/tiff", tiff: "image/tiff", ico: "image/x-icon",
  mp4: "video/mp4", m4v: "video/x-m4v", mov: "video/quicktime", webm: "video/webm", mkv: "video/x-matroska", avi: "video/x-msvideo", mpg: "video/mpeg", mpeg: "video/mpeg",
  mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", wav: "audio/wav", flac: "audio/flac", ogg: "audio/ogg", oga: "audio/ogg", aiff: "audio/aiff", aif: "audio/aiff",
  pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", rtf: "application/rtf", txt: "text/plain", md: "text/markdown", pages: "application/vnd.apple.pages", epub: "application/epub+zip",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", csv: "text/csv", tsv: "text/tab-separated-values", numbers: "application/vnd.apple.numbers",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", key: "application/vnd.apple.keynote",
  zip: "application/zip", gz: "application/gzip", tgz: "application/gzip", tar: "application/x-tar", rar: "application/vnd.rar", "7z": "application/x-7z-compressed", dmg: "application/x-apple-diskimage",
  json: "application/json", xml: "application/xml", html: "text/html", htm: "text/html", css: "text/css", js: "text/javascript", mjs: "text/javascript", ts: "text/typescript", tsx: "text/typescript", jsx: "text/javascript", py: "text/x-python", rb: "text/x-ruby", go: "text/x-go", rs: "text/x-rust", sh: "application/x-sh", yml: "application/yaml", yaml: "application/yaml", toml: "application/toml", sql: "application/sql",
  woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf",
};

export const extensionOf = (name: string): string => (/\.([a-z0-9]+)$/i.exec(name)?.[1] ?? "").toLowerCase();

/** The content type for a file name, or octet-stream when nothing is known about it. */
export function mimeOf(name: string, given?: string | null): string {
  if (given && given !== "application/octet-stream") return given.split(";")[0].trim();
  return TYPES[extensionOf(name)] ?? "application/octet-stream";
}

const CODE_EXT = new Set(["json", "xml", "html", "htm", "css", "js", "mjs", "ts", "tsx", "jsx", "py", "rb", "go", "rs", "sh", "yml", "yaml", "toml", "sql"]);

/** The family a file belongs to, from its content type and name. */
export function familyOf(contentType: string | null | undefined, name: string): FileFamily {
  const t = (contentType ?? "").toLowerCase();
  const ext = extensionOf(name);
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("video/")) return "video";
  if (t.startsWith("audio/")) return "audio";
  if (t.startsWith("font/") || ["woff", "woff2", "ttf", "otf"].includes(ext)) return "font";
  if (/(zip|gzip|tar|rar|7z|diskimage|compressed)/.test(t) || ["zip", "gz", "tgz", "tar", "rar", "7z", "dmg"].includes(ext)) return "archive";
  if (/(sheet|excel|csv|tab-separated|numbers)/.test(t) || ["xls", "xlsx", "csv", "tsv", "numbers"].includes(ext)) return "spreadsheet";
  if (/(presentation|powerpoint|keynote)/.test(t) || ["ppt", "pptx", "key"].includes(ext)) return "presentation";
  if (CODE_EXT.has(ext) || /(json|xml|javascript|typescript|yaml|toml|sql|x-sh)/.test(t)) return "code";
  if (/(pdf|msword|wordprocessing|rtf|text\/|epub|pages)/.test(t) || ["pdf", "doc", "docx", "rtf", "txt", "md", "pages", "epub"].includes(ext)) return "document";
  return "other";
}

export const FAMILY_LABELS: Record<FileFamily, string> = { image: "Images", video: "Video", audio: "Audio", document: "Documents", spreadsheet: "Spreadsheets", presentation: "Presentations", archive: "Archives", code: "Code", font: "Fonts", other: "Other" };
