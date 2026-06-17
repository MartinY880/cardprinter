import { useState } from "react";

export default function Section({ title, subtitle, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ borderBottom: "1px solid #171717" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#eee", letterSpacing: "0.03em" }}>
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 10.5,
                fontFamily: "'JetBrains Mono', monospace",
                color: "#444",
                marginTop: 2,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        <span
          style={{
            fontSize: 10,
            color: "#555",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          ▼
        </span>
      </div>
      {open && <div style={{ padding: "0 14px 12px" }}>{children}</div>}
    </div>
  );
}
