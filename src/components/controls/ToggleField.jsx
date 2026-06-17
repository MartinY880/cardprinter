export default function ToggleField({ label, value, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        marginBottom: 6,
      }}
    >
      {label && (
        <span style={{ fontSize: 11, fontWeight: 500, color: "#666" }}>{label}</span>
      )}
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: value ? "#00d4aa" : "#333",
          cursor: "pointer",
          position: "relative",
          transition: "background 0.2s",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            background: "#fff",
            position: "absolute",
            top: 2,
            left: value ? 18 : 2,
            transition: "left 0.2s",
          }}
        />
      </div>
    </div>
  );
}
