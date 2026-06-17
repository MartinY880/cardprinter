export default function SelectField({ label, value, onChange, options }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      {label && (
        <span style={{ fontSize: 11, fontWeight: 500, color: "#666", minWidth: 60 }}>
          {label}
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          fontSize: 12,
          background: "#111",
          border: "1px solid #222",
          borderRadius: 6,
          color: "#ccc",
          padding: "5px 8px",
          outline: "none",
          cursor: "pointer",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
