import { useState } from "react";
import Section from "./controls/Section.jsx";
import ColorField from "./controls/ColorField.jsx";
import SliderField from "./controls/SliderField.jsx";
import SelectField from "./controls/SelectField.jsx";
import ToggleField from "./controls/ToggleField.jsx";
import ButtonGroup from "./controls/ButtonGroup.jsx";
import { FONT_OPTIONS, BUILTIN_KEYS } from "../lib/constants.js";
import { patterns } from "../lib/patterns.js";

const WEIGHT_OPTIONS = [
  { label: "300", value: "300" },
  { label: "400", value: "400" },
  { label: "500", value: "500" },
  { label: "600", value: "600" },
  { label: "700", value: "700" },
  { label: "800", value: "800" },
  { label: "900", value: "900" },
];

const PATTERN_OPTIONS = Object.entries(patterns).map(([key, p]) => ({
  label: p.label,
  value: key,
}));

const BG_PRESETS = [
  { name: "Clean",      bgType: "solid", bgColor1: "#ffffff", bgColor2: "#ffffff", bgPattern: "none",              patternColor: "#000000", patternOpacity: 0.08, accentColor: "#00d4aa",  preview: "#fff" },
  { name: "Dot Grid",   bgType: "solid", bgColor1: "#ffffff", bgColor2: "#ffffff", bgPattern: "dots",              patternColor: "#333333", patternOpacity: 0.15, accentColor: "#333333",  preview: "#fff" },
  { name: "Diagonal",   bgType: "solid", bgColor1: "#ffffff", bgColor2: "#ffffff", bgPattern: "diagonalLines",     patternColor: "#444444", patternOpacity: 0.12, accentColor: "#444444",  preview: "#fff" },
  { name: "Crosshatch", bgType: "solid", bgColor1: "#ffffff", bgColor2: "#ffffff", bgPattern: "crosshatch",        patternColor: "#555555", patternOpacity: 0.10, accentColor: "#555555",  preview: "#fff" },
  { name: "Honeycomb",  bgType: "solid", bgColor1: "#ffffff", bgColor2: "#ffffff", bgPattern: "hexagons",          patternColor: "#3a3a3a", patternOpacity: 0.12, accentColor: "#3a3a3a",  preview: "#fff" },
  { name: "Waves",      bgType: "solid", bgColor1: "#ffffff", bgColor2: "#ffffff", bgPattern: "waves",             patternColor: "#0077b6", patternOpacity: 0.12, accentColor: "#0077b6",  preview: "#fff" },
  { name: "Rings",      bgType: "solid", bgColor1: "#ffffff", bgColor2: "#ffffff", bgPattern: "concentricCircles", patternColor: "#666666", patternOpacity: 0.10, accentColor: "#666666",  preview: "#fff" },
  { name: "Triangles",  bgType: "solid", bgColor1: "#ffffff", bgColor2: "#ffffff", bgPattern: "triangles",         patternColor: "#444444", patternOpacity: 0.10, accentColor: "#444444",  preview: "#fff" },
  { name: "Corner",     bgType: "solid", bgColor1: "#ffffff", bgColor2: "#ffffff", bgPattern: "cornerGeo",         patternColor: "#222222", patternOpacity: 0.15, accentColor: "#222222",  preview: "#fff" },
  { name: "Navy Dots",  bgType: "solid", bgColor1: "#ffffff", bgColor2: "#ffffff", bgPattern: "dots",              patternColor: "#1a3a5a", patternOpacity: 0.18, accentColor: "#1a3a5a",  preview: "#fff" },
  { name: "Teal Lines", bgType: "solid", bgColor1: "#ffffff", bgColor2: "#ffffff", bgPattern: "diagonalLines",     patternColor: "#00897b", patternOpacity: 0.14, accentColor: "#00897b",  preview: "#fff" },
  { name: "Gold Geo",   bgType: "solid", bgColor1: "#ffffff", bgColor2: "#ffffff", bgPattern: "cornerGeo",         patternColor: "#b8860b", patternOpacity: 0.20, accentColor: "#b8860b",  preview: "#fff" },
];

export default function DesignPanel({ design, setDesign, onLogoFile, onBgFile, onClearBg, bgImg, elements, setElements }) {
  const set = (key) => (val) => setDesign((d) => ({ ...d, [key]: val }));

  const setElAlign = (elKey) => (val) => {
    setElements((prev) => prev[elKey] ? { ...prev, [elKey]: { ...prev[elKey], align: val } } : prev);
  };
  const getElAlign = (elKey) => elements?.[elKey]?.align || "left";

  const applyPreset = (preset) => {
    setDesign((d) => ({ ...d, ...preset, name: undefined }));
  };

  return (
    <div>
      <Section title="Card & Font" subtitle="orientation · typeface" defaultOpen>
        <ButtonGroup
          label="Orient."
          value={design.orientation}
          onChange={set("orientation")}
          options={[
            { label: "Landscape", value: "landscape" },
            { label: "Portrait", value: "portrait" },
          ]}
        />
        <SelectField label="Font" value={design.fontFamily} onChange={set("fontFamily")} options={FONT_OPTIONS} />
      </Section>

      <Section title="Presets" subtitle="quick background themes" defaultOpen>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {BG_PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              style={{
                padding: "6px 4px",
                fontSize: 10,
                fontWeight: 500,
                border: "1px solid #333",
                borderRadius: 6,
                color: "#222",
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
                background: p.preview || "#fff",
                textShadow: "none",
                transition: "transform 0.1s, border-color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = p.patternColor; e.currentTarget.style.transform = "scale(1.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.transform = "scale(1)"; }}
            >
              <span style={{ position: "relative", zIndex: 1 }}>{p.name}</span>
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: p.patternColor,
                }}
              />
            </button>
          ))}
        </div>
      </Section>

      <Section title="Background" subtitle="fill · gradient · pattern">
        <ButtonGroup
          label="Fill"
          value={design.bgType}
          onChange={set("bgType")}
          options={[
            { label: "Solid", value: "solid" },
            { label: "Gradient", value: "gradient" },
          ]}
        />
        <ColorField label="Color 1" value={design.bgColor1} onChange={set("bgColor1")} />
        {design.bgType === "gradient" && (
          <>
            <ColorField label="Color 2" value={design.bgColor2} onChange={set("bgColor2")} />
            <ButtonGroup
              label="Dir."
              value={design.gradientDir}
              onChange={set("gradientDir")}
              options={[
                { label: "V", value: "vertical" },
                { label: "H", value: "horizontal" },
                { label: "D", value: "diagonal" },
              ]}
            />
          </>
        )}
        <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
          <label
            htmlFor="bg-image-upload"
            style={{
              flex: 1,
              padding: "6px 0",
              fontSize: 11,
              fontWeight: 500,
              background: "#111",
              border: "1px solid #222",
              borderRadius: 6,
              color: "#888",
              cursor: "pointer",
              textAlign: "center",
              display: "block",
            }}
          >
            🖼️ Upload Background
            <input
              id="bg-image-upload"
              type="file"
              accept="image/png,image/svg+xml,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onBgFile) onBgFile(file);
              }}
              style={{ display: "none" }}
            />
          </label>
          {bgImg && (
            <button
              onClick={onClearBg}
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
              ✕
            </button>
          )}
        </div>
        <SelectField label="Pattern" value={design.bgPattern} onChange={set("bgPattern")} options={PATTERN_OPTIONS} />
        {design.bgPattern !== "none" && (
          <>
            <ColorField label="Pat. Color" value={design.patternColor} onChange={set("patternColor")} />
            <SliderField label="Opacity" value={design.patternOpacity} onChange={set("patternOpacity")} min={0.01} max={0.3} step={0.01} />
            <SliderField label="Scale" value={design.patternScale} onChange={set("patternScale")} min={0.3} max={3.0} step={0.1} />
            <SliderField label="Offset X" value={design.patternOffsetX} onChange={set("patternOffsetX")} min={-500} max={500} step={1} />
            <SliderField label="Offset Y" value={design.patternOffsetY} onChange={set("patternOffsetY")} min={-500} max={500} step={1} />
          </>
        )}
      </Section>

      <Section title="Accent Bar" subtitle="edge highlight">
        <ToggleField label="Show Bar" value={design.showAccentBar} onChange={set("showAccentBar")} />
        {design.showAccentBar && (
          <>
            <ColorField label="Color" value={design.accentColor} onChange={set("accentColor")} />
            <ButtonGroup
              label="Position"
              value={design.accentBarPos}
              onChange={set("accentBarPos")}
              options={[
                { label: "T", value: "top" },
                { label: "B", value: "bottom" },
                { label: "L", value: "left" },
                { label: "R", value: "right" },
              ]}
            />
            <SliderField label="Size" value={design.accentBarSize} onChange={set("accentBarSize")} min={2} max={30} />
          </>
        )}
      </Section>

      <Section title="Company / Logo" subtitle="branding">
        <div style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: "#666", display: "block", marginBottom: 4 }}>
            Company Name
          </span>
          <input
            type="text"
            value={design.companyName}
            onChange={(e) => set("companyName")(e.target.value)}
            style={{
              width: "100%",
              fontSize: 12,
              background: "#111",
              border: "1px solid #222",
              borderRadius: 6,
              color: "#ccc",
              padding: "5px 8px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        <ColorField label="Text Color" value={design.companyNameColor} onChange={set("companyNameColor")} />
        <SliderField label="Size" value={design.companyNameSize} onChange={set("companyNameSize")} min={12} max={48} />
        <SelectField label="Weight" value={design.companyNameWeight} onChange={set("companyNameWeight")} options={WEIGHT_OPTIONS} />
        <div style={{ marginTop: 6 }}>
          <label
            htmlFor="design-logo-upload"
            style={{
              display: "block",
              width: "100%",
              padding: "6px 0",
              fontSize: 11,
              fontWeight: 500,
              background: "#111",
              border: "1px solid #222",
              borderRadius: 6,
              color: "#888",
              cursor: "pointer",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            📁 Upload Logo Image
            <input
              id="design-logo-upload"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onLogoFile) {
                  onLogoFile(file);
                }
              }}
              style={{ display: "none" }}
            />
          </label>
        </div>
        <SliderField label="Logo Size" value={design.logoSize} onChange={set("logoSize")} min={20} max={120} />
      </Section>

      <Section title="Photo Style" subtitle="shape · border">
        <ToggleField label="Show Photo" value={design.showPhoto !== false} onChange={set("showPhoto")} />
        {design.showPhoto !== false && (<>
        <ButtonGroup
          label="Shape"
          value={design.photoShape}
          onChange={set("photoShape")}
          options={[
            { label: "Rounded", value: "rounded" },
            { label: "Circle", value: "circle" },
            { label: "Square", value: "square" },
          ]}
        />
        {design.photoShape === "rounded" && (
          <SliderField label="Radius" value={design.photoRadius} onChange={set("photoRadius")} min={0} max={40} />
        )}
        <ToggleField label="Border" value={design.photoBorder} onChange={set("photoBorder")} />
        <SliderField label="Crop Position" value={design.photoCropBias ?? 0.15} onChange={set("photoCropBias")} min={0} max={1} step={0.01} />
        </>)}
      </Section>

      <Section title="Name" subtitle="employee name styling">
        <ToggleField label="Show Name" value={design.showName !== false} onChange={set("showName")} />
        {design.showName !== false && (
          <>
            <ColorField label="Color" value={design.nameColor} onChange={set("nameColor")} />
            <SliderField label="Size" value={design.nameSize} onChange={set("nameSize")} min={16} max={72} />
            <SelectField label="Weight" value={design.nameWeight} onChange={set("nameWeight")} options={WEIGHT_OPTIONS} />
            <ButtonGroup label="Align" value={getElAlign("name")} onChange={setElAlign("name")} options={[{ label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }]} />
          </>
        )}
      </Section>

      <Section title="Title" subtitle="job title styling">
        <ToggleField label="Show Title" value={design.showTitle} onChange={set("showTitle")} />
        {design.showTitle && (
          <>
            <ColorField label="Color" value={design.titleColor} onChange={set("titleColor")} />
            <SliderField label="Size" value={design.titleSize} onChange={set("titleSize")} min={10} max={48} />
            <SelectField label="Weight" value={design.titleWeight} onChange={set("titleWeight")} options={WEIGHT_OPTIONS} />
            <ButtonGroup label="Align" value={getElAlign("title")} onChange={setElAlign("title")} options={[{ label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }]} />
          </>
        )}
      </Section>

      <Section title="Department" subtitle="department styling">
        <ToggleField label="Show Dept" value={design.showDept} onChange={set("showDept")} />
        {design.showDept && (
          <>
            <ColorField label="Color" value={design.deptColor} onChange={set("deptColor")} />
            <SliderField label="Size" value={design.deptSize} onChange={set("deptSize")} min={10} max={36} />
            <SelectField label="Weight" value={design.deptWeight} onChange={set("deptWeight")} options={WEIGHT_OPTIONS} />
            <ButtonGroup label="Align" value={getElAlign("department")} onChange={setElAlign("department")} options={[{ label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }]} />
          </>
        )}
      </Section>

      <Section title="Employee ID" subtitle="badge number">
        <ToggleField label="Show ID" value={design.showEmployeeId} onChange={set("showEmployeeId")} />
        {design.showEmployeeId && (
          <>
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: "#666", display: "block", marginBottom: 4 }}>
                Prefix
              </span>
              <input
                type="text"
                value={design.idPrefix}
                onChange={(e) => set("idPrefix")(e.target.value)}
                style={{
                  width: "100%",
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  background: "#111",
                  border: "1px solid #222",
                  borderRadius: 6,
                  color: "#ccc",
                  padding: "5px 8px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <SliderField label="Size" value={design.idSize} onChange={set("idSize")} min={10} max={30} />
          </>
        )}
      </Section>

      {/* Custom Text Fields */}
      {Object.entries(elements)
        .filter(([key, el]) => el.type === "custom")
        .map(([key, el]) => (
          <Section key={key} title={el.label || "Custom Text"} subtitle="custom text field">
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: "#666", display: "block", marginBottom: 4 }}>Label</span>
              <input
                type="text"
                value={el.label || ""}
                onChange={(e) => setElements((prev) => ({ ...prev, [key]: { ...prev[key], label: e.target.value } }))}
                style={{ width: "100%", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", background: "#111", border: "1px solid #222", borderRadius: 6, color: "#ccc", padding: "5px 8px", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: "#666", display: "block", marginBottom: 4 }}>Text</span>
              <input
                type="text"
                value={el.text || ""}
                onChange={(e) => setElements((prev) => ({ ...prev, [key]: { ...prev[key], text: e.target.value } }))}
                style={{ width: "100%", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", background: "#111", border: "1px solid #222", borderRadius: 6, color: "#ccc", padding: "5px 8px", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <ToggleField label="Visible" value={el.visible !== false} onChange={(v) => setElements((prev) => ({ ...prev, [key]: { ...prev[key], visible: v } }))} />
            <ColorField label="Color" value={el.color || "#ffffff"} onChange={(v) => setElements((prev) => ({ ...prev, [key]: { ...prev[key], color: v } }))} />
            <SliderField label="Size" value={el.fontSize || 20} onChange={(v) => setElements((prev) => ({ ...prev, [key]: { ...prev[key], fontSize: v } }))} min={8} max={72} />
            <SelectField label="Weight" value={String(el.fontWeight || "400")} onChange={(v) => setElements((prev) => ({ ...prev, [key]: { ...prev[key], fontWeight: v } }))} options={WEIGHT_OPTIONS} />
            <ButtonGroup label="Align" value={el.align || "left"} onChange={(v) => setElements((prev) => ({ ...prev, [key]: { ...prev[key], align: v } }))} options={[{ label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }]} />
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => setElements((prev) => { const next = { ...prev }; delete next[key]; return next; })}
                style={{ width: "100%", padding: "5px 0", fontSize: 11, fontWeight: 500, background: "#1a0000", border: "1px solid #ff444433", borderRadius: 6, color: "#ff6666", cursor: "pointer" }}
              >
                Delete Text Field
              </button>
            </div>
          </Section>
        ))}

      <div style={{ padding: "12px 14px" }}>
        <button
          onClick={() => {
            const id = `custom_${Date.now()}`;
            setElements((prev) => ({
              ...prev,
              [id]: { x: 280, y: 300, w: 300, h: 30, label: "Custom Text", visible: true, type: "custom", align: "left", text: "Custom Text", fontSize: 20, fontWeight: "400", color: "#ffffff" },
            }));
          }}
          style={{ width: "100%", padding: "8px 0", fontSize: 12, fontWeight: 600, background: "#00d4aa15", border: "1px solid #00d4aa33", borderRadius: 8, color: "#00d4aa", cursor: "pointer", letterSpacing: "0.02em" }}
        >
          + Add Text Field
        </button>
      </div>
    </div>
  );
}
