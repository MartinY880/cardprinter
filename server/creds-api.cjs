const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || __dirname;
const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, "dist");
const PORT = parseInt(process.env.PORT || "3000", 10);

fs.mkdirSync(DATA_DIR, { recursive: true });

const CREDS_FILE = path.join(DATA_DIR, "creds.json");
const PRESETS_FILE = path.join(DATA_DIR, "presets.json");
const EMPLOYEES_FILE = path.join(DATA_DIR, "employees.json");
const PRINTLOG_FILE = path.join(DATA_DIR, "printlog.json");

function readCreds() {
  try { return JSON.parse(fs.readFileSync(CREDS_FILE, "utf8")); }
  catch { return { graphCreds: null, pdkCreds: null }; }
}

function writeCreds(data) {
  fs.writeFileSync(CREDS_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

function seedFromEnv() {
  const current = readCreds();
  let changed = false;
  if (!current.graphCreds || !current.graphCreds.clientId) {
    const tenantId = process.env.GRAPH_TENANT_ID || "";
    const clientId = process.env.GRAPH_CLIENT_ID || "";
    const clientSecret = process.env.GRAPH_CLIENT_SECRET || "";
    if (tenantId || clientId || clientSecret) {
      current.graphCreds = { tenantId, clientId, clientSecret };
      changed = true;
    }
  }
  if (!current.pdkCreds || !current.pdkCreds.pdkClientId) {
    const pdkClientId = process.env.PDK_CLIENT_ID || "";
    const pdkClientSecret = process.env.PDK_CLIENT_SECRET || "";
    if (pdkClientId || pdkClientSecret) {
      current.pdkCreds = { pdkClientId, pdkClientSecret };
      changed = true;
    }
  }
  if (changed) {
    writeCreds(current);
    console.log("Seeded credentials from environment variables.");
  }
}

if (!fs.existsSync(CREDS_FILE)) writeCreds({ graphCreds: null, pdkCreds: null });
seedFromEnv();

function readPresets() {
  try { return JSON.parse(fs.readFileSync(PRESETS_FILE, "utf8")); }
  catch { return { presets: [], defaultPreset: null }; }
}
function writePresets(data) { fs.writeFileSync(PRESETS_FILE, JSON.stringify(data, null, 2)); }
if (!fs.existsSync(PRESETS_FILE)) writePresets({ presets: [], defaultPreset: null });

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}
function writeJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data)); }
if (!fs.existsSync(EMPLOYEES_FILE)) writeJSON(EMPLOYEES_FILE, []);
if (!fs.existsSync(PRINTLOG_FILE)) writeJSON(PRINTLOG_FILE, []);

function readBody(req, res, maxSize, cb) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > maxSize) {
      res.writeHead(413); res.end(JSON.stringify({ error: "Payload too large" })); req.destroy();
    }
  });
  req.on("end", () => {
    try { cb(JSON.parse(body)); }
    catch { res.writeHead(400); res.end(JSON.stringify({ error: "Invalid JSON" })); }
  });
}

// --- Static file serving ---

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

function serveStatic(req, res, urlPath) {
  const filePath = urlPath === "/" ? "/index.html" : urlPath;
  const fullPath = path.resolve(path.join(STATIC_DIR, filePath));
  const staticRoot = path.resolve(STATIC_DIR);

  if (!fullPath.startsWith(staticRoot + path.sep) && fullPath !== staticRoot) {
    res.writeHead(403, { "Content-Type": "text/plain" }); res.end("Forbidden"); return;
  }

  const ext = path.extname(fullPath).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";
  const isAsset = urlPath.startsWith("/assets/");

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      // SPA fallback for client-side routes
      fs.readFile(path.join(STATIC_DIR, "index.html"), (err2, html) => {
        if (err2) { res.writeHead(404, { "Content-Type": "text/plain" }); res.end("Not found"); return; }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
        res.end(html);
      });
      return;
    }
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": isAsset ? "public, max-age=31536000, immutable" : "no-cache",
    });
    res.end(data);
  });
}

// --- HTTPS proxy helper ---

function proxyHttps(req, res, hostname, targetPath) {
  const opts = {
    hostname, port: 443, path: targetPath, method: req.method,
    headers: { host: hostname },
  };
  for (const h of ["content-type", "content-length", "authorization"]) {
    if (req.headers[h]) opts.headers[h] = req.headers[h];
  }

  const pReq = https.request(opts, (pRes) => {
    const headers = {};
    if (pRes.headers["content-type"]) headers["content-type"] = pRes.headers["content-type"];
    if (pRes.headers["content-length"]) headers["content-length"] = pRes.headers["content-length"];
    res.writeHead(pRes.statusCode, headers);
    pRes.pipe(res);
  });

  pReq.on("error", (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Proxy error", detail: err.message }));
    }
  });

  req.pipe(pReq);
}

// --- Request router ---

const server = http.createServer((req, res) => {
  const raw = req.url || "/";
  const urlPath = raw.split("?")[0];

  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Azure AD token proxy: POST /api/token/{tenantId}
  if (req.method === "POST" && urlPath.startsWith("/api/token/")) {
    const tenantId = decodeURIComponent(urlPath.slice("/api/token/".length));
    if (tenantId) { proxyHttps(req, res, "login.microsoftonline.com", `/${tenantId}/oauth2/v2.0/token`); return; }
  }

  // PDK proxies
  if (urlPath.startsWith("/pdk/auth/")) {
    proxyHttps(req, res, "accounts.pdk.io", "/oauth2" + raw.slice("/pdk/auth".length)); return;
  }
  if (urlPath.startsWith("/pdk/accounts/")) {
    proxyHttps(req, res, "accounts.pdk.io", "/api" + raw.slice("/pdk/accounts".length)); return;
  }
  if (urlPath.startsWith("/pdk/systems/")) {
    proxyHttps(req, res, "systems.pdk.io", raw.slice("/pdk/systems".length) || "/"); return;
  }

  // Internal JSON API
  res.setHeader("Content-Type", "application/json");

  if (req.method === "GET" && urlPath === "/api/creds") {
    res.writeHead(200); res.end(JSON.stringify(readCreds())); return;
  }

  if (req.method === "PUT" && urlPath === "/api/creds") {
    readBody(req, res, 10000, (parsed) => {
      const current = readCreds();
      if (parsed.graphCreds && typeof parsed.graphCreds === "object") {
        current.graphCreds = {
          tenantId: String(parsed.graphCreds.tenantId || ""),
          clientId: String(parsed.graphCreds.clientId || ""),
          clientSecret: String(parsed.graphCreds.clientSecret || ""),
        };
      }
      if (parsed.pdkCreds && typeof parsed.pdkCreds === "object") {
        current.pdkCreds = {
          pdkClientId: String(parsed.pdkCreds.pdkClientId || ""),
          pdkClientSecret: String(parsed.pdkCreds.pdkClientSecret || ""),
        };
      }
      writeCreds(current);
      res.writeHead(200); res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  if (req.method === "GET" && urlPath === "/api/presets") {
    res.writeHead(200); res.end(JSON.stringify(readPresets())); return;
  }

  if (req.method === "POST" && urlPath === "/api/presets") {
    readBody(req, res, 10000000, (parsed) => {
      const name = String(parsed.name || "").trim();
      if (!name) { res.writeHead(400); res.end(JSON.stringify({ error: "Name required" })); return; }
      if (!parsed.design || !parsed.elements) { res.writeHead(400); res.end(JSON.stringify({ error: "Design and elements required" })); return; }
      const data = readPresets();
      const idx = data.presets.findIndex((p) => p.name === name);
      const preset = { name, design: parsed.design, elements: parsed.elements, images: parsed.images || null, saved: new Date().toISOString() };
      if (idx >= 0) data.presets[idx] = preset; else data.presets.push(preset);
      writePresets(data);
      res.writeHead(200); res.end(JSON.stringify({ ok: true, count: data.presets.length }));
    });
    return;
  }

  if (req.method === "PUT" && urlPath === "/api/presets/default") {
    readBody(req, res, 1000, (parsed) => {
      const name = parsed.name != null ? String(parsed.name) : null;
      const data = readPresets();
      data.defaultPreset = name || null;
      writePresets(data);
      res.writeHead(200); res.end(JSON.stringify({ ok: true, defaultPreset: data.defaultPreset }));
    });
    return;
  }

  if (req.method === "DELETE" && urlPath.startsWith("/api/presets")) {
    const u = new URL(raw, "http://localhost");
    const name = u.searchParams.get("name");
    if (!name) { res.writeHead(400); res.end(JSON.stringify({ error: "Name required" })); return; }
    const data = readPresets();
    data.presets = data.presets.filter((p) => p.name !== name);
    if (data.defaultPreset === name) data.defaultPreset = null;
    writePresets(data);
    res.writeHead(200); res.end(JSON.stringify({ ok: true })); return;
  }

  if (req.method === "GET" && urlPath === "/api/employees") {
    res.writeHead(200); res.end(JSON.stringify(readJSON(EMPLOYEES_FILE, []))); return;
  }
  if (req.method === "PUT" && urlPath === "/api/employees") {
    readBody(req, res, 5000000, (parsed) => {
      if (!Array.isArray(parsed)) { res.writeHead(400); res.end(JSON.stringify({ error: "Array required" })); return; }
      writeJSON(EMPLOYEES_FILE, parsed);
      res.writeHead(200); res.end(JSON.stringify({ ok: true, count: parsed.length }));
    });
    return;
  }

  if (req.method === "GET" && urlPath === "/api/printlog") {
    res.writeHead(200); res.end(JSON.stringify(readJSON(PRINTLOG_FILE, []))); return;
  }
  if (req.method === "PUT" && urlPath === "/api/printlog") {
    readBody(req, res, 2000000, (parsed) => {
      if (!Array.isArray(parsed)) { res.writeHead(400); res.end(JSON.stringify({ error: "Array required" })); return; }
      writeJSON(PRINTLOG_FILE, parsed);
      res.writeHead(200); res.end(JSON.stringify({ ok: true, count: parsed.length }));
    });
    return;
  }

  if (urlPath.startsWith("/api/")) {
    res.writeHead(404); res.end(JSON.stringify({ error: "Not found" })); return;
  }

  // Serve React SPA for everything else
  serveStatic(req, res, urlPath);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Card Design Studio on 0.0.0.0:${PORT}`);
  console.log(`  Static: ${STATIC_DIR}`);
  console.log(`  Data:   ${DATA_DIR}`);
});
