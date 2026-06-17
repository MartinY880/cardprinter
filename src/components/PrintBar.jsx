import { useRef } from "react";
import { CR80 } from "../lib/constants.js";
import { drawCard } from "../lib/cardRenderer.js";

export default function PrintBar({ design, elements, employee, photoImg, logoImg, bgImg, printLog, setPrintLog }) {
  const printCanvasRef = useRef(null);
  const printWindowRef = useRef(null);

  const handlePrint = () => {
    if (!employee) return;

    // Draw to hidden canvas at full 300 DPI — no bounding boxes
    const canvas = document.createElement("canvas");
    drawCard(canvas, design, elements, employee, photoImg, logoImg, null, null, null, bgImg);
    const dataUrl = canvas.toDataURL("image/png");

    const isPortrait = design.orientation === "portrait";
    const pageW = isPortrait ? "2.125in" : "3.375in";
    const pageH = isPortrait ? "3.375in" : "2.125in";

    const html = `<!DOCTYPE html>
<html><head><style>
@page { size: ${pageW} ${pageH}; margin: 0; }
* { margin: 0; padding: 0; }
body { display: flex; align-items: center; justify-content: center; }
img { width: ${pageW}; height: ${pageH}; }
</style></head><body>
<img src="${dataUrl}" onload="window.print()" />
</body></html>`;

    // Reuse the same popup window instead of opening a new one each time
    if (!printWindowRef.current || printWindowRef.current.closed) {
      printWindowRef.current = window.open("", "cardprint", "width=400,height=300");
    }
    const w = printWindowRef.current;
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
    }

    // Log the print
    const entry = {
      name: `${employee.firstName} ${employee.lastName}`,
      time: new Date().toISOString(),
      id: employee.employeeId || "",
    };
    setPrintLog((prev) => [...prev, entry]);
  };

  const last6 = printLog.slice(-6);
  const overflow = printLog.length > 6 ? printLog.length - 6 : 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "12px 24px",
        borderTop: "1px solid #171717",
        background: "#0a0a0a",
      }}
    >
      <button
        onClick={handlePrint}
        disabled={!employee}
        style={{
          padding: "10px 28px",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "'Outfit', sans-serif",
          border: "none",
          borderRadius: 8,
          cursor: employee ? "pointer" : "not-allowed",
          background: employee
            ? "linear-gradient(135deg, #00d4aa, #00a88a)"
            : "#1a1a1a",
          color: employee ? "#000" : "#444",
          boxShadow: employee ? "0 4px 20px rgba(0,212,170,0.25)" : "none",
          transition: "all 0.2s",
        }}
      >
        🖨️ Print Card
      </button>

      {/* Print log chips */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flex: 1, overflow: "hidden" }}>
        {overflow > 0 && (
          <span style={{ fontSize: 10, color: "#555", flexShrink: 0 }}>+{overflow}</span>
        )}
        {last6.map((entry, i) => (
          <span
            key={i}
            style={{
              fontSize: 10.5,
              fontFamily: "'JetBrains Mono', monospace",
              color: "#00d4aa",
              background: "#00d4aa11",
              border: "1px solid #00d4aa22",
              borderRadius: 4,
              padding: "3px 8px",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {entry.name}
          </span>
        ))}
        {printLog.length === 0 && (
          <span style={{ fontSize: 11, color: "#333" }}>No prints yet</span>
        )}
      </div>
    </div>
  );
}
