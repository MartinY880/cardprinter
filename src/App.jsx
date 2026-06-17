import { useState, useEffect, useRef, useCallback } from "react";
import CardCanvas from "./components/CardCanvas.jsx";
import DesignPanel from "./components/DesignPanel.jsx";
import LayoutPanel from "./components/LayoutPanel.jsx";
import PeoplePanel from "./components/PeoplePanel.jsx";
import PrintBar from "./components/PrintBar.jsx";
import { DEFAULT_DESIGN, DEFAULT_ELEMENTS, FONTS_URL, CR80 } from "./lib/constants.js";
import { storage } from "./lib/storage.js";
import { fetchGraphPhoto } from "./lib/graphApi.js";
import { searchPdkHolder, assignPdkCard, clearPdkCache } from "./lib/pdkApi.js";

const TABS = ["People", "Design", "Layout"];

function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback(
    (...args) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  );
}

export default function App() {
  const [design, setDesign] = useState(() => storage.get("design", DEFAULT_DESIGN));
  const [elements, setElements] = useState(() => storage.get("elements", { ...DEFAULT_ELEMENTS }));
  const [employees, setEmployees] = useState(() => storage.get("employees", []));
  const [printLog, setPrintLog] = useState(() => storage.get("printLog", []));
  const [graphCreds, setGraphCreds] = useState(() => storage.get("graphCreds", { tenantId: "", clientId: "", clientSecret: "" }));
  const [pdkCreds, setPdkCreds] = useState(() => storage.get("pdkCreds", { pdkClientId: "", pdkClientSecret: "" }));
  const [locked, setLocked] = useState(() => !!storage.get("design", DEFAULT_DESIGN).masterPin);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEl, setSelectedEl] = useState(null);
  const [activeTab, setActiveTab] = useState("People");
  const [photoImg, setPhotoImg] = useState(null);
  const [logoImg, setLogoImg] = useState(null);
  const [bgImg, setBgImg] = useState(null);

  const [uploadStatus, setUploadStatus] = useState(null);
  const [cardNumber, setCardNumber] = useState("");
  const [pdkStatus, setPdkStatus] = useState(null);
  const [presets, setPresets] = useState([]);
  const [defaultPreset, setDefaultPreset] = useState(null);
  const [activePreset, setActivePreset] = useState("");

  // Load Google Fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONTS_URL;
    document.head.appendChild(link);
  }, []);

  // Restore saved images on mount
  useEffect(() => {
    const savedLogo = storage.get("logoDataUrl", null);
    if (savedLogo) {
      const img = new Image();
      img.onload = () => setLogoImg(img);
      img.src = savedLogo;
    }
    const savedPhoto = storage.get("photoDataUrl", null);
    if (savedPhoto) {
      const img = new Image();
      img.onload = () => setPhotoImg(img);
      img.src = savedPhoto;
    }
    const savedBg = storage.get("bgDataUrl", null);
    if (savedBg) {
      const img = new Image();
      img.onload = () => setBgImg(img);
      img.src = savedBg;
    }
  }, []);

  // Persist with debounce
  const saveDesign = useDebounce((d) => storage.set("design", d), 500);
  const saveElements = useDebounce((e) => storage.set("elements", e), 500);

  useEffect(() => saveDesign(design), [design, saveDesign]);
  useEffect(() => saveElements(elements), [elements, saveElements]);
  useEffect(() => storage.set("employees", employees), [employees]);
  useEffect(() => storage.set("printLog", printLog), [printLog]);
  useEffect(() => storage.set("graphCreds", graphCreds), [graphCreds]);
  useEffect(() => storage.set("pdkCreds", pdkCreds), [pdkCreds]);

  // Sync employees to server (debounced)
  const saveEmployeesToServer = useDebounce((emps) => {
    fetch("/api/employees", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emps),
    }).catch(() => {});
  }, 2000);
  useEffect(() => saveEmployeesToServer(employees), [employees, saveEmployeesToServer]);

  // Sync printLog to server (debounced)
  const savePrintLogToServer = useDebounce((log) => {
    fetch("/api/printlog", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log),
    }).catch(() => {});
  }, 1000);
  useEffect(() => savePrintLogToServer(printLog), [printLog, savePrintLogToServer]);

  // Sync creds to server
  const saveCredsToServer = useDebounce((graph, pdk) => {
    fetch("/api/creds", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ graphCreds: graph, pdkCreds: pdk }),
    }).catch(() => {});
  }, 1000);
  useEffect(() => saveCredsToServer(graphCreds, pdkCreds), [graphCreds, pdkCreds, saveCredsToServer]);

  // Load creds from server on mount
  useEffect(() => {
    fetch("/api/creds").then((r) => r.json()).then((data) => {
      if (data.graphCreds && data.graphCreds.clientId) {
        setGraphCreds(data.graphCreds);
      }
      if (data.pdkCreds && data.pdkCreds.pdkClientId) {
        setPdkCreds(data.pdkCreds);
      }
    }).catch(() => {});
  }, []);

  // Load employees and print log from server on mount
  useEffect(() => {
    fetch("/api/employees").then((r) => r.json()).then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setEmployees(data);
      }
    }).catch(() => {});
    fetch("/api/printlog").then((r) => r.json()).then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setPrintLog(data);
      }
    }).catch(() => {});
  }, []);

  // Load presets from server on mount; apply default on first visit
  useEffect(() => {
    fetch("/api/presets").then((r) => r.json()).then((data) => {
      setPresets(data.presets || []);
      setDefaultPreset(data.defaultPreset || null);
      // If no design saved in localStorage yet, apply the default preset
      const hasLocalDesign = !!localStorage.getItem("card-studio:design");
      if (!hasLocalDesign && data.defaultPreset) {
        const preset = (data.presets || []).find((p) => p.name === data.defaultPreset);
        if (preset) {
          setDesign({ ...DEFAULT_DESIGN, ...preset.design });
          setElements({ ...DEFAULT_ELEMENTS, ...preset.elements });
          if (preset.images) {
            if (preset.images.bgDataUrl) {
              storage.set("bgDataUrl", preset.images.bgDataUrl);
              const img = new Image();
              img.onload = () => setBgImg(img);
              img.src = preset.images.bgDataUrl;
            }
            if (preset.images.logoDataUrl) {
              storage.set("logoDataUrl", preset.images.logoDataUrl);
              const img = new Image();
              img.onload = () => setLogoImg(img);
              img.src = preset.images.logoDataUrl;
            }
          }
          setActivePreset(preset.name);
        }
      }
    }).catch(() => {});
  }, []);

  const savePreset = () => {
    const name = window.prompt("Preset name:", activePreset || "");
    if (!name) return;
    const images = {
      bgDataUrl: storage.get("bgDataUrl", null),
      logoDataUrl: storage.get("logoDataUrl", null),
    };
    fetch("/api/presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, design, elements, images }),
    }).then((r) => r.json()).then(() => {
      setActivePreset(name);
      fetch("/api/presets").then((r) => r.json()).then((data) => {
        setPresets(data.presets || []);
        setDefaultPreset(data.defaultPreset || null);
      });
    }).catch(() => {});
  };

  const setAsDefault = () => {
    if (!activePreset) {
      window.alert("Save a preset first, then set it as default.");
      return;
    }
    fetch("/api/presets/default", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: activePreset }),
    }).then((r) => r.json()).then((data) => {
      setDefaultPreset(data.defaultPreset);
    }).catch(() => {});
  };

  const restorePresetImages = (preset) => {
    if (preset.images) {
      if (preset.images.bgDataUrl) {
        storage.set("bgDataUrl", preset.images.bgDataUrl);
        const img = new Image();
        img.onload = () => setBgImg(img);
        img.src = preset.images.bgDataUrl;
      } else {
        storage.set("bgDataUrl", null);
        setBgImg(null);
      }
      if (preset.images.logoDataUrl) {
        storage.set("logoDataUrl", preset.images.logoDataUrl);
        const img = new Image();
        img.onload = () => setLogoImg(img);
        img.src = preset.images.logoDataUrl;
      } else {
        storage.set("logoDataUrl", null);
        setLogoImg(null);
      }
    }
  };

  const loadPreset = (name) => {
    const preset = presets.find((p) => p.name === name);
    if (!preset) return;
    setDesign({ ...DEFAULT_DESIGN, ...preset.design });
    setElements({ ...DEFAULT_ELEMENTS, ...preset.elements });
    restorePresetImages(preset);
    setActivePreset(name);
  };

  const deletePreset = (name) => {
    if (!window.confirm(`Delete preset "${name}"?`)) return;
    fetch(`/api/presets?name=${encodeURIComponent(name)}`, { method: "DELETE" })
      .then(() => {
        if (activePreset === name) setActivePreset("");
        fetch("/api/presets").then((r) => r.json()).then((data) => {
          setPresets(data.presets || []);
          setDefaultPreset(data.defaultPreset || null);
        });
      }).catch(() => {});
  };

  // Clamp elements into canvas bounds when orientation changes
  useEffect(() => {
    const isPortrait = design.orientation === "portrait";
    const cw = isPortrait ? CR80.h : CR80.w;
    const ch = isPortrait ? CR80.w : CR80.h;
    setElements((prev) => {
      let changed = false;
      const next = {};
      for (const [key, el] of Object.entries(prev)) {
        if (!el || typeof el.x !== "number") { next[key] = el; continue; }
        let { x, y } = el;
        if (x + el.w > cw) { x = Math.max(0, cw - el.w); changed = true; }
        if (y + el.h > ch) { y = Math.max(0, ch - el.h); changed = true; }
        next[key] = changed ? { ...el, x, y } : el;
      }
      return changed ? next : prev;
    });
  }, [design.orientation]);

  // Fetch Graph photo when a different employee is selected
  const lastGraphId = useRef(null);
  useEffect(() => {
    if (!selectedEmployee) { lastGraphId.current = null; return; }
    if (selectedEmployee.graphId === lastGraphId.current) return;
    lastGraphId.current = selectedEmployee.graphId || null;
    setPhotoImg(null);
    if (selectedEmployee.graphId && graphCreds.tenantId && graphCreds.clientId && graphCreds.clientSecret) {
      fetchGraphPhoto(graphCreds, selectedEmployee.graphId).then((url) => {
        if (url) {
          const img = new Image();
          img.onload = () => setPhotoImg(img);
          img.src = url;
        }
      });
    }
  }, [selectedEmployee, graphCreds]);

  const loadImageFromFile = (file, onSuccess, label, storageKey) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const img = new Image();
      img.onload = () => {
        onSuccess(img);
        if (storageKey) storage.set(storageKey, dataUrl);
        setUploadStatus(`${label} loaded ✓`);
        setTimeout(() => setUploadStatus(null), 2000);
      };
      img.onerror = () => {
        console.error(`Failed to load ${label} image`);
        setUploadStatus(`${label} failed ✗`);
        setTimeout(() => setUploadStatus(null), 2000);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadImageFromFile(file, setPhotoImg, "Photo", "photoDataUrl");
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadImageFromFile(file, setLogoImg, "Logo", "logoDataUrl");
  };

  const handleLockToggle = () => {
    if (locked) {
      const pin = window.prompt("Enter master PIN to unlock:");
      if (pin === null) return;
      if (pin === design.masterPin) {
        setLocked(false);
      } else {
        window.alert("Incorrect PIN.");
      }
    } else {
      const existing = design.masterPin;
      if (existing) {
        setLocked(true);
        setActiveTab("People");
      } else {
        const pin = window.prompt("Set a master PIN to lock the template:");
        if (!pin) return;
        const confirm = window.prompt("Confirm PIN:");
        if (confirm !== pin) { window.alert("PINs do not match."); return; }
        setDesign((d) => ({ ...d, masterPin: pin }));
        setLocked(true);
        setActiveTab("People");
      }
    }
  };

  const exportTemplate = () => {
    const data = JSON.stringify({ design, elements }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "card-template.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTemplate = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result);
        if (json.design && typeof json.design === "object") {
          const merged = { ...DEFAULT_DESIGN, ...json.design };
          setDesign(merged);
          if (merged.masterPin) { setLocked(true); setActiveTab("People"); }
        }
        if (json.elements && typeof json.elements === "object") setElements({ ...DEFAULT_ELEMENTS, ...json.elements });
      } catch {
        // invalid JSON — ignore
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      style={{
        fontFamily: "'Outfit', sans-serif",
        background: "#09090b",
        color: "#ffffff",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 20px",
          borderBottom: "1px solid #171717",
          background: "#0a0a0a",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🪪</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Card Design Studio
            </div>
            <div
              style={{
                fontSize: 10.5,
                fontFamily: "'JetBrains Mono', monospace",
                color: "#444",
              }}
            >
              CR-80 · 300 DPI · Evolis Primacy 2
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Stats */}
          <span
            style={{
              fontSize: 10.5,
              fontFamily: "'JetBrains Mono', monospace",
              color: "#555",
              background: "#111",
              padding: "4px 10px",
              borderRadius: 4,
              border: "1px solid #1a1a1a",
            }}
          >
            {employees.length} people
          </span>
          <span
            style={{
              fontSize: 10.5,
              fontFamily: "'JetBrains Mono', monospace",
              color: "#555",
              background: "#111",
              padding: "4px 10px",
              borderRadius: 4,
              border: "1px solid #1a1a1a",
            }}
          >
            {printLog.length} printed
          </span>

          {!locked && (<>
          {/* Preset selector */}
          <select
            value={activePreset}
            onChange={(e) => {
              if (e.target.value) loadPreset(e.target.value);
              else setActivePreset("");
            }}
            style={{
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              background: "#111",
              border: "1px solid #222",
              borderRadius: 6,
              color: "#aaa",
              padding: "4px 8px",
              outline: "none",
              cursor: "pointer",
              maxWidth: 140,
            }}
          >
            <option value="">— Presets —</option>
            {presets.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}{p.name === defaultPreset ? " ★" : ""}
              </option>
            ))}
          </select>
          <button
            onClick={savePreset}
            title="Save current design as preset"
            style={{
              padding: "5px 10px",
              fontSize: 11,
              fontWeight: 500,
              background: "#111",
              border: "1px solid #222",
              borderRadius: 6,
              color: "#888",
              cursor: "pointer",
            }}
          >
            💾 Save
          </button>
          <button
            onClick={setAsDefault}
            title={activePreset ? `Set "${activePreset}" as the default for new users` : "Save a preset first"}
            style={{
              padding: "5px 10px",
              fontSize: 11,
              fontWeight: 500,
              background: activePreset && activePreset === defaultPreset ? "#0a1a15" : "#111",
              border: activePreset && activePreset === defaultPreset ? "1px solid #00d4aa44" : "1px solid #222",
              borderRadius: 6,
              color: activePreset && activePreset === defaultPreset ? "#00d4aa" : "#888",
              cursor: "pointer",
            }}
          >
            {activePreset && activePreset === defaultPreset ? "★ Default" : "☆ Set Default"}
          </button>
          {activePreset && (
            <button
              onClick={() => deletePreset(activePreset)}
              title={`Delete preset "${activePreset}"`}
              style={{
                padding: "5px 8px",
                fontSize: 11,
                fontWeight: 500,
                background: "#111",
                border: "1px solid #332222",
                borderRadius: 6,
                color: "#ff6b6b",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          )}

          <label
            htmlFor="import-template"
            style={{
              padding: "5px 12px",
              fontSize: 11,
              fontWeight: 500,
              background: "#111",
              border: "1px solid #222",
              borderRadius: 6,
              color: "#888",
              cursor: "pointer",
              display: "inline-block",
            }}
          >
            📂 Import
            <input id="import-template" type="file" accept=".json" onChange={importTemplate} style={{ display: "none" }} />
          </label>
          <button
            onClick={exportTemplate}
            style={{
              padding: "5px 12px",
              fontSize: 11,
              fontWeight: 500,
              background: "#111",
              border: "1px solid #222",
              borderRadius: 6,
              color: "#888",
              cursor: "pointer",
            }}
          >
            💾 Export
          </button>
          </>)}
          <button
            onClick={handleLockToggle}
            style={{
              padding: "5px 12px",
              fontSize: 11,
              fontWeight: 500,
              background: locked ? "#1a1210" : "#111",
              border: locked ? "1px solid #332211" : "1px solid #222",
              borderRadius: 6,
              color: locked ? "#ff9500" : "#888",
              cursor: "pointer",
            }}
          >
            {locked ? "🔒 Locked" : "🔓 Lock"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <div
          style={{
            width: 320,
            borderRight: "1px solid #171717",
            background: "#0b0b0b",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
        >
          {/* Tabs */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid #171717",
              flexShrink: 0,
            }}
          >
            {(locked ? ["People"] : TABS).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  fontSize: 12,
                  fontWeight: activeTab === tab ? 600 : 400,
                  color: activeTab === tab ? "#00d4aa" : "#666",
                  background: "transparent",
                  border: "none",
                  borderBottom: activeTab === tab ? "2px solid #00d4aa" : "2px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {activeTab === "People" && (
              <PeoplePanel
                employees={employees}
                setEmployees={setEmployees}
                selectedEmployee={selectedEmployee}
                setSelectedEmployee={setSelectedEmployee}
                printLog={printLog}
                setPrintLog={setPrintLog}
                graphCreds={graphCreds}
              />
            )}
            {activeTab === "Design" && !locked && (
              <DesignPanel
                design={design}
                setDesign={setDesign}
                onLogoFile={(file) => {
                  loadImageFromFile(file, setLogoImg, "Logo", "logoDataUrl");
                }}
                onBgFile={(file) => {
                  loadImageFromFile(file, setBgImg, "Background", "bgDataUrl");
                }}
                onClearBg={() => { setBgImg(null); storage.set("bgDataUrl", null); }}
                bgImg={bgImg}
                elements={elements}
                setElements={setElements}
              />
            )}
            {activeTab === "Layout" && !locked && (
              <LayoutPanel
                elements={elements}
                setElements={setElements}
                selectedEl={selectedEl}
                setSelectedEl={setSelectedEl}
              />
            )}
          </div>
        </div>

        {/* Main area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Canvas area */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              padding: 24,
              overflow: "auto",
            }}
          >
            <CardCanvas
              design={design}
              elements={elements}
              setElements={setElements}
              employee={selectedEmployee}
              photoImg={photoImg}
              logoImg={logoImg}
              bgImg={bgImg}
              selectedEl={selectedEl}
              setSelectedEl={setSelectedEl}
              locked={locked}
            />

            {/* Photo/logo upload buttons below canvas */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {!locked && (<>
              <label
                htmlFor="photo-upload"
                style={{
                  padding: "6px 16px",
                  fontSize: 11,
                  fontWeight: 500,
                  background: "#111",
                  border: "1px solid #222",
                  borderRadius: 6,
                  color: "#888",
                  cursor: "pointer",
                  display: "inline-block",
                }}
              >
                📷 Upload Photo
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: "none" }}
                />
              </label>
              <label
                htmlFor="logo-upload"
                style={{
                  padding: "6px 16px",
                  fontSize: 11,
                  fontWeight: 500,
                  background: "#111",
                  border: "1px solid #222",
                  borderRadius: 6,
                  color: "#888",
                  cursor: "pointer",
                  display: "inline-block",
                }}
              >
                📁 Upload Logo
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  style={{ display: "none" }}
                />
              </label>
              {photoImg && (
                <button
                  onClick={() => { setPhotoImg(null); storage.set("photoDataUrl", null); }}
                  style={{
                    padding: "6px 12px",
                    fontSize: 11,
                    fontWeight: 500,
                    background: "#111",
                    border: "1px solid #332222",
                    borderRadius: 6,
                    color: "#ff6b6b",
                    cursor: "pointer",
                  }}
                >
                  ✕ Clear Photo
                </button>
              )}
              {logoImg && (
                <button
                  onClick={() => { setLogoImg(null); storage.set("logoDataUrl", null); }}
                  style={{
                    padding: "6px 12px",
                    fontSize: 11,
                    fontWeight: 500,
                    background: "#111",
                    border: "1px solid #332222",
                    borderRadius: 6,
                    color: "#ff6b6b",
                    cursor: "pointer",
                  }}
                >
                  ✕ Clear Logo
                </button>
              )}
              {selectedEmployee?.graphId && graphCreds.clientId && (
                <button
                  onClick={async () => {
                    const url = await fetchGraphPhoto(graphCreds, selectedEmployee.graphId);
                    if (url) {
                      const img = new Image();
                      img.onload = () => setPhotoImg(img);
                      img.src = url;
                    }
                  }}
                  style={{
                    padding: "6px 16px",
                    fontSize: 11,
                    fontWeight: 500,
                    background: "#111",
                    border: "1px solid #222",
                    borderRadius: 6,
                    color: "#888",
                    cursor: "pointer",
                  }}
                >
                  ☁️ Pull M365 Photo
                </button>
              )}
              {uploadStatus && (
                <span style={{
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: uploadStatus.includes("✓") ? "#00d4aa" : "#ff6b6b",
                  padding: "4px 10px",
                  background: "#111",
                  borderRadius: 4,
                  border: "1px solid #1a1a1a",
                }}>
                  {uploadStatus}
                </span>
              )}
              </>)}
              {photoImg && selectedEmployee && (() => {
                const cropVal = selectedEmployee.photoCropBias ?? design.photoCropBias ?? 0.25;
                const hCropVal = selectedEmployee.photoCropHBias ?? 0.5;
                const zoomVal = selectedEmployee.photoZoom ?? 1.0;
                const updateEmp = (patch) => {
                  const updated = { ...selectedEmployee, ...patch };
                  setSelectedEmployee(updated);
                  setEmployees((prev) =>
                    prev.map((emp) =>
                      emp.firstName === updated.firstName && emp.lastName === updated.lastName
                        ? { ...emp, ...patch }
                        : emp
                    )
                  );
                };
                const btnStyle = {
                  width: 24, height: 24,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 700, lineHeight: 1,
                  background: "#111", border: "1px solid #333", borderRadius: 4,
                  color: "#aaa", cursor: "pointer", padding: 0,
                };
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 11, color: "#666", whiteSpace: "nowrap" }}>↕</span>
                      <button onClick={() => updateEmp({ photoCropBias: Math.max(0, Math.round((cropVal - 0.03) * 100) / 100) })} style={btnStyle}>▲</button>
                      <button onClick={() => updateEmp({ photoCropBias: Math.min(1, Math.round((cropVal + 0.03) * 100) / 100) })} style={btnStyle}>▼</button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 11, color: "#666", whiteSpace: "nowrap" }}>↔</span>
                      <button onClick={() => updateEmp({ photoCropHBias: Math.max(0, Math.round((hCropVal - 0.03) * 100) / 100) })} style={btnStyle}>◀</button>
                      <button onClick={() => updateEmp({ photoCropHBias: Math.min(1, Math.round((hCropVal + 0.03) * 100) / 100) })} style={btnStyle}>▶</button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 11, color: "#666", whiteSpace: "nowrap" }}>🔍</span>
                      <button onClick={() => updateEmp({ photoZoom: Math.max(0.5, Math.round((zoomVal - 0.05) * 100) / 100) })} style={btnStyle}>−</button>
                      <button onClick={() => updateEmp({ photoZoom: Math.min(2.5, Math.round((zoomVal + 0.05) * 100) / 100) })} style={btnStyle}>+</button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Print bar */}
          <PrintBar
            design={design}
            elements={elements}
            employee={selectedEmployee}
            photoImg={photoImg}
            logoImg={logoImg}
            bgImg={bgImg}
            printLog={printLog}
            setPrintLog={setPrintLog}
          />

          {/* PDK Card Assignment */}
          {selectedEmployee && pdkCreds.pdkClientId && (
            <div style={{
              background: "#0a0a0a",
              border: "1px solid #1a1a1a",
              borderRadius: 8,
              padding: "10px 14px",
              marginTop: 8,
            }}>
              <div style={{ fontSize: 11, color: "#666", marginBottom: 6 }}>
                🔑 PDK Card — {selectedEmployee.firstName} {selectedEmployee.lastName}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Card number"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ""))}
                  style={{
                    width: 120,
                    fontSize: 12,
                    fontFamily: "'JetBrains Mono', monospace",
                    background: "#111",
                    border: "1px solid #222",
                    borderRadius: 6,
                    color: "#ccc",
                    padding: "5px 8px",
                    outline: "none",
                  }}
                />
                <button
                  onClick={async () => {
                    if (!cardNumber) return;
                    setPdkStatus("Searching PDK...");
                    try {
                      const holder = await searchPdkHolder(
                        pdkCreds,
                        selectedEmployee.firstName,
                        selectedEmployee.lastName
                      );
                      if (!holder) {
                        setPdkStatus(`Error: "${selectedEmployee.firstName} ${selectedEmployee.lastName}" not found in PDK.`);
                        return;
                      }
                      setPdkStatus(`Found holder, assigning card #${cardNumber}...`);
                      await assignPdkCard(pdkCreds, holder.id, cardNumber);
                      setPdkStatus(`✓ Card #${cardNumber} assigned to ${holder.firstName} ${holder.lastName}`);
                      setCardNumber("");
                    } catch (err) {
                      setPdkStatus(`Error: ${err.message}`);
                    }
                  }}
                  style={{
                    padding: "5px 12px",
                    fontSize: 11,
                    fontWeight: 500,
                    background: "#111",
                    border: "1px solid #222",
                    borderRadius: 6,
                    color: "#888",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Assign Card
                </button>
              </div>
              {pdkStatus && (
                <div style={{
                  fontSize: 10.5,
                  color: pdkStatus.startsWith("Error") ? "#e94560" : pdkStatus.startsWith("✓") ? "#00d4aa" : "#888",
                  marginTop: 6,
                  lineHeight: 1.4,
                  wordBreak: "break-word",
                }}>
                  {pdkStatus}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
