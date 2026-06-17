export default function SliderField({ label, value, onChange, min = 0, max = 100, step = 1 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      {label && (
        <span style={{ fontSize: 11, fontWeight: 500, color: "#666", minWidth: 60 }}>
          {label}
        </span>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: "#00d4aa" }}
      />
      <span
        style={{
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          color: "#888",
          minWidth: 30,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}
