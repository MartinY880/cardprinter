const http = require("http");
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || __dirname;
fs.mkdirSync(DATA_DIR, { recursive: true });

const CREDS_FILE = path.join(DATA_DIR, "creds.json");
const PRESETS_FILE = path.join(DATA_DIR, "presets.json");
const EMPLOYEES_FILE = path.join(DATA_DIR, "employees.json");
const PRINTLOG_FILE = path.join(DATA_DIR, "printlog.json");
const PORT = 8471;

function readCreds() {
  try {
    return JSON.parse(fs.readFileSync(CREDS_FILE, "utf8"));
  } catch {
    return { graphCreds: null, pdkCreds: null };
  }
}

function writeCreds(data) {
  fs.writeFileSync(CREDS_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

// Seed from environment variables when no credentials are stored yet
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

if (!fs.existsSync(CREDS_FILE)) {
  writeCreds({ graphCreds: null, pdkCreds: null });
}
seedFromEnv();

// --- Presets ---
function readPresets() {
  try {
    return JSON.parse(fs.readFileSync(PRESETS_FILE, "utf8"));
  } catch {
    return { presets: [], defaultPreset: null };
  }
}

function writePresets(data) {
  fs.writeFileSync(PRESETS_FILE, JSON.stringify(data, null, 2));
}

if (!fs.existsSync(PRESETS_FILE)) {
  writePresets({ presets: [], defaultPreset: null });
}

// --- Employees & Print Log ---
function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data));
}
if (!fs.existsSync(EMPLOYEES_FILE)) writeJSON(EMPLOYEES_FILE, []);
if (!fs.existsSync(PRINTLOG_FILE)) writeJSON(PRINTLOG_FILE, []);

function readBody(req, res, maxSize, cb) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > maxSize) {
      res.writeHead(413);
      res.end(JSON.stringify({ error: "Payload too large" }));
      req.destroy();
    }
  });
  req.on("end", () => {
    try {
      cb(JSON.parse(body));
    } catch {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Invalid JSON" }));
    }
  });
}

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "GET" && req.url === "/creds") {
    const data = readCreds();
    res.writeHead(200);
    res.end(JSON.stringify(data));
    return;
  }

  if (req.method === "PUT" && req.url === "/creds") {
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
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  // --- Presets endpoints ---
  if (req.method === "GET" && req.url === "/presets") {
    res.writeHead(200);
    res.end(JSON.stringify(readPresets()));
    return;
  }

  // Save a preset (POST /presets)
  if (req.method === "POST" && req.url === "/presets") {
    readBody(req, res, 10000000, (parsed) => {
      const name = String(parsed.name || "").trim();
      if (!name) { res.writeHead(400); res.end(JSON.stringify({ error: "Name required" })); return; }
      if (!parsed.design || !parsed.elements) { res.writeHead(400); res.end(JSON.stringify({ error: "Design and elements required" })); return; }
      const data = readPresets();
      const existing = data.presets.findIndex((p) => p.name === name);
      const preset = { name, design: parsed.design, elements: parsed.elements, images: parsed.images || null, saved: new Date().toISOString() };
      if (existing >= 0) {
        data.presets[existing] = preset;
      } else {
        data.presets.push(preset);
      }
      writePresets(data);
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, count: data.presets.length }));
    });
    return;
  }

  // Set default preset (PUT /presets/default)
  if (req.method === "PUT" && req.url === "/presets/default") {
    readBody(req, res, 1000, (parsed) => {
      const name = parsed.name != null ? String(parsed.name) : null;
      const data = readPresets();
      data.defaultPreset = name || null;
      writePresets(data);
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, defaultPreset: data.defaultPreset }));
    });
    return;
  }

  // Delete a preset (DELETE /presets?name=...)
  if (req.method === "DELETE" && req.url.startsWith("/presets")) {
    const url = new URL(req.url, "http://localhost");
    const name = url.searchParams.get("name");
    if (!name) { res.writeHead(400); res.end(JSON.stringify({ error: "Name required" })); return; }
    const data = readPresets();
    data.presets = data.presets.filter((p) => p.name !== name);
    if (data.defaultPreset === name) data.defaultPreset = null;
    writePresets(data);
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // --- Employees endpoints ---
  if (req.method === "GET" && req.url === "/employees") {
    res.writeHead(200);
    res.end(JSON.stringify(readJSON(EMPLOYEES_FILE, [])));
    return;
  }
  if (req.method === "PUT" && req.url === "/employees") {
    readBody(req, res, 5000000, (parsed) => {
      if (!Array.isArray(parsed)) { res.writeHead(400); res.end(JSON.stringify({ error: "Array required" })); return; }
      writeJSON(EMPLOYEES_FILE, parsed);
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, count: parsed.length }));
    });
    return;
  }

  // --- Print Log endpoints ---
  if (req.method === "GET" && req.url === "/printlog") {
    res.writeHead(200);
    res.end(JSON.stringify(readJSON(PRINTLOG_FILE, [])));
    return;
  }
  if (req.method === "PUT" && req.url === "/printlog") {
    readBody(req, res, 2000000, (parsed) => {
      if (!Array.isArray(parsed)) { res.writeHead(400); res.end(JSON.stringify({ error: "Array required" })); return; }
      writeJSON(PRINTLOG_FILE, parsed);
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, count: parsed.length }));
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Creds API listening on 0.0.0.0:${PORT}`);
});
