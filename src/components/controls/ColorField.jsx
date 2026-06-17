import { useState } from "react";

export default function ColorField({ label, value, onChange }) {
  const [text, setText] = useState(value);

  const handleText = (e) => {
    const v = e.target.value;
    setText(v);
    if (/^#([0-9a-fA-F]{3,8})$/.test(v)) onChange(v);
  };

  const handlePicker = (e) => {
    onChange(e.target.value);
    setText(e.target.value);
  };

  // Sync text when value changes externally
  if (value !== text && document.activeElement?.dataset?.colorText !== "1") {
    // will sync on next render
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      {label && (
        <span style={{ fontSize: 11, fontWeight: 500, color: "#666", minWidth: 60 }}>
          {label}
        </span>
      )}
      <input
        type="color"
        value={value.slice(0, 7)}
        onChange={handlePicker}
        style={{
          width: 28,
          height: 28,
          border: "1px solid #222",
          borderRadius: 6,
          background: "#111",
          cursor: "pointer",
          padding: 2,
        }}
      />
      <input
        data-color-text="1"
        type="text"
        value={text}
        onChange={handleText}
        onBlur={() => setText(value)}
        style={{
          flex: 1,
          fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace",
          background: "#111",
          border: "1px solid #222",
          borderRadius: 6,
          color: "#ccc",
          padding: "4px 8px",
          outline: "none",
        }}
      />
    </div>
  );
}
