import { DEFAULT_ELEMENTS, BUILTIN_KEYS } from "../lib/constants.js";

const inputStyle = {
  width: 52,
  fontSize: 11,
  fontFamily: "'JetBrains Mono', monospace",
  background: "#111",
  border: "1px solid #222",
  borderRadius: 4,
  color: "#aaa",
  padding: "3px 5px",
  outline: "none",
  textAlign: "center",
};

const smallBtn = {
  padding: "2px 6px",
  fontSize: 10,
  background: "#111",
  border: "1px solid #222",
  borderRadius: 4,
  cursor: "pointer",
  lineHeight: 1,
};

export default function LayoutPanel({ elements, setElements, selectedEl, setSelectedEl }) {
  const keys = Object.keys(elements);

  const updateField = (key, field, val) => {
    const n = parseInt(val, 10);
    if (isNaN(n)) return;
    setElements((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: n },
    }));
  };

  const updateProp = (key, field, val) => {
    setElements((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: val },
    }));
  };

  const toggleVisible = (key, e) => {
    e.stopPropagation();
    setElements((prev) => ({
      ...prev,
      [key]: { ...prev[key], visible: !prev[key].visible },
    }));
  };

  const removeElement = (key, e) => {
    e.stopPropagation();
    if (selectedEl === key) setSelectedEl(null);
    setElements((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const addCustomField = () => {
    const id = `custom_${Date.now()}`;
    setElements((prev) => ({
      ...prev,
      [id]: {
        x: 280,
        y: 300,
        w: 300,
        h: 30,
        label: "Custom Text",
        visible: true,
        type: "custom",
        align: "left",
        text: "Custom Text",
        fontSize: 20,
        fontWeight: "400",
        color: "#ffffff",
      },
    }));
    setSelectedEl(id);
  };

  const isBuiltin = (key) => BUILTIN_KEYS.includes(key);
  const isTextEl = (el) => el.type !== "photo";

  return (
    <div style={{ padding: "8px 0" }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#eee",
          letterSpacing: "0.03em",
          padding: "0 14px 8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        Element Positions
        <button
          onClick={addCustomField}
          style={{
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 500,
            background: "#00d4aa15",
            border: "1px solid #00d4aa33",
            borderRadius: 6,
            color: "#00d4aa",
            cursor: "pointer",
          }}
        >
          + Add Field
        </button>
      </div>
      {keys.map((key) => {
        const el = elements[key];
        const isActive = selectedEl === key;
        const hidden = el.visible === false;
        return (
          <div
            key={key}
            onClick={() => setSelectedEl(key)}
            style={{
              padding: "8px 14px",
              borderLeft: isActive ? "3px solid #00d4aa" : "3px solid transparent",
              background: isActive ? "#00d4aa08" : "transparent",
              cursor: "pointer",
              transition: "all 0.15s",
              opacity: hidden ? 0.4 : 1,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: isActive ? "#00d4aa" : "#ccc" }}>
                {el.label || key}
              </span>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "#555",
                  }}
                >
                  {el.x},{el.y} · {el.w}×{el.h}
                </span>
                <button
                  onClick={(e) => toggleVisible(key, e)}
                  title={hidden ? "Show" : "Hide"}
                  style={{ ...smallBtn, color: hidden ? "#555" : "#888" }}
                >
                  {hidden ? "👁️‍🗨️" : "👁️"}
                </button>
                {!isBuiltin(key) && (
                  <button
                    onClick={(e) => removeElement(key, e)}
                    title="Delete"
                    style={{ ...smallBtn, color: "#e94560" }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Position fields */}
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              {["x", "y", "w", "h"].map((f) => (
                <div key={f} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <span style={{ fontSize: 9, color: "#555", textTransform: "uppercase" }}>{f}</span>
                  <input
                    type="number"
                    value={el[f]}
                    onChange={(e) => updateField(key, f, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>

            {/* Alignment (text elements only) */}
            {isTextEl(el) && (
              <div style={{ display: "flex", gap: 0, borderRadius: 4, overflow: "hidden", border: "1px solid #222", marginBottom: 6 }}>
                {[
                  { label: "◧", value: "left", title: "Left" },
                  { label: "◫", value: "center", title: "Center" },
                  { label: "◨", value: "right", title: "Right" },
                ].map((a) => (
                  <button
                    key={a.value}
                    onClick={(e) => { e.stopPropagation(); updateProp(key, "align", a.value); }}
                    title={a.title}
                    style={{
                      padding: "3px 10px",
                      fontSize: 11,
                      background: (el.align || "left") === a.value ? "#00d4aa" : "#111",
                      color: (el.align || "left") === a.value ? "#000" : "#666",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {a.title}
                  </button>
                ))}
              </div>
            )}

            {/* Custom field extra controls */}
            {el.type === "custom" && isActive && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 9, color: "#555", width: 36 }}>Label</span>
                  <input
                    type="text"
                    value={el.label || ""}
                    onChange={(e) => { e.stopPropagation(); updateProp(key, "label", e.target.value); }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ ...inputStyle, width: "100%", textAlign: "left" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 9, color: "#555", width: 36 }}>Text</span>
                  <input
                    type="text"
                    value={el.text || ""}
                    onChange={(e) => { e.stopPropagation(); updateProp(key, "text", e.target.value); }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ ...inputStyle, width: "100%", textAlign: "left" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: "#555" }}>Size</span>
                    <input
                      type="number"
                      value={el.fontSize || 20}
                      onChange={(e) => { e.stopPropagation(); updateProp(key, "fontSize", parseInt(e.target.value) || 20); }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ ...inputStyle, width: 44 }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: "#555" }}>Wt</span>
                    <select
                      value={el.fontWeight || "400"}
                      onChange={(e) => { e.stopPropagation(); updateProp(key, "fontWeight", e.target.value); }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ ...inputStyle, width: 56, textAlign: "left", cursor: "pointer" }}
                    >
                      {["300", "400", "500", "600", "700", "800", "900"].map((w) => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: "#555" }}>Color</span>
                    <input
                      type="color"
                      value={(el.color || "#ffffff").slice(0, 7)}
                      onChange={(e) => { e.stopPropagation(); updateProp(key, "color", e.target.value); }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: 24, height: 22, border: "1px solid #222", borderRadius: 4, background: "#111", cursor: "pointer", padding: 1 }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div style={{ padding: "12px 14px" }}>
        <button
          onClick={() => setElements({ ...DEFAULT_ELEMENTS })}
          style={{
            width: "100%",
            padding: "7px 0",
            fontSize: 11,
            fontWeight: 500,
            background: "#111",
            border: "1px solid #222",
            borderRadius: 6,
            color: "#888",
            cursor: "pointer",
          }}
        >
          ↺ Reset All Positions
        </button>
      </div>
    </div>
  );
}
