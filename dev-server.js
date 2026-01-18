import { serve } from "bun";
import { access, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT || 8000);
const root = fileURLToPath(new URL(".", import.meta.url));
const distRoot = join(root, "dist");

const contentTypes = {
  ".css": "text/css",
  ".js": "application/javascript",
  ".html": "text/html",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".yml": "text/yaml",
  ".yaml": "text/yaml"
};

const buildProcess = Bun.spawn(
  ["bun", "build", "index.html", "--outdir", "dist", "--minify", "--watch"],
  { stdout: "inherit", stderr: "inherit" }
);

process.on("SIGINT", () => {
  buildProcess.kill();
  process.exit(0);
});

async function waitForBuild() {
  const indexPath = join(distRoot, "index.html");
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      await access(indexPath);
      return;
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}

const server = serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") {
      pathname = "index.html";
    } else {
      pathname = pathname.replace(/^\/+/, "");
    }
    const filePath = join(distRoot, pathname);
    try {
      const stats = await stat(filePath);
      if (stats.isDirectory()) {
        return new Response("Not Found", { status: 404 });
      }
      const file = Bun.file(filePath);
      const ext = extname(filePath);
      const headers = { "content-type": contentTypes[ext] || "application/octet-stream" };
      return new Response(file, { headers });
    } catch (error) {
      return new Response("Not Found", { status: 404 });
    }
  }
});

const url = `http://localhost:${server.port}`;
await waitForBuild();
console.log(`Dev server running at ${url}`);
try {
  await Bun.spawn(["open", url], { stdout: "ignore", stderr: "ignore" }).exited;
} catch (error) {
  // Ignore open failures.
}
