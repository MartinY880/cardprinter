export default function ButtonGroup({ label, value, onChange, options }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      {label && (
        <span style={{ fontSize: 11, fontWeight: 500, color: "#666", minWidth: 60 }}>
          {label}
        </span>
      )}
      <div style={{ display: "flex", gap: 0, borderRadius: 6, overflow: "hidden", border: "1px solid #222" }}>
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              padding: "5px 12px",
              fontSize: 11,
              fontWeight: 500,
              background: value === o.value ? "#00d4aa" : "#111",
              color: value === o.value ? "#000" : "#888",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
