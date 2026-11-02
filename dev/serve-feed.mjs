// Serves dev/releases as a release feed for a local platform: pnpm feed
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
const root = join(import.meta.dirname, "releases");
createServer(async (req, res) => {
  const path = normalize(new URL(req.url, "http://x").pathname);
  try { res.end(await readFile(join(root, path))); } catch { res.statusCode = 404; res.end("not found"); }
}).listen(5310, () => console.log("release feed on http://localhost:5310"));
