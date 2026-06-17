import { useState } from "react";
import Section from "./controls/Section.jsx";
import { parseCSV, deduplicateEmployees } from "../lib/csvParser.js";
import { fetchGraphUsers, clearTokenCache } from "../lib/graphApi.js";
import { clearPdkCache } from "../lib/pdkApi.js";

export default function PeoplePanel({
  employees,
  setEmployees,
  selectedEmployee,
  setSelectedEmployee,
  printLog,
  setPrintLog,
  graphCreds,
  setGraphCreds,
  pdkCreds,
  setPdkCreds,
}) {
  const [search, setSearch] = useState("");
  const [graphStatus, setGraphStatus] = useState("");
  const [sortBy, setSortBy] = useState("first");       // "first" | "last"
  const [groupBy, setGroupBy] = useState("title");     // "off" | "title" | "printed"
  const [ctxMenu, setCtxMenu] = useState(null);        // { x, y, emp }

  const printedNames = new Set(printLog.map((e) => `${e.name}`));

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const full = `${e.firstName} ${e.lastName}`.toLowerCase();
    return (
      full.includes(q) ||
      e.firstName.toLowerCase().includes(q) ||
      e.lastName.toLowerCase().includes(q) ||
      (e.department || "").toLowerCase().includes(q)
    );
  });

  const sortFn = (a, b) => {
    if (sortBy === "last") return (a.lastName || "").localeCompare(b.lastName || "") || (a.firstName || "").localeCompare(b.firstName || "");
    return (a.firstName || "").localeCompare(b.firstName || "") || (a.lastName || "").localeCompare(b.lastName || "");
  };

  const sorted = [...filtered].sort(sortFn);

  const handleCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string") return;
      const parsed = parseCSV(text);
      if (parsed.length === 0) return;
      setEmployees((prev) => deduplicateEmployees(prev, parsed));
    };
    reader.readAsText(file);
  };

  const handleGraphPull = async () => {
    if (!graphCreds.tenantId || !graphCreds.clientId || !graphCreds.clientSecret) {
      setGraphStatus("Fill in all three fields");
      return;
    }
    setGraphStatus("Authenticating...");
    try {
      const users = await fetchGraphUsers(graphCreds, (count) => {
        setGraphStatus(`Pulling users... ${count} so far`);
      });
      // Replace all Graph-sourced users with fresh pull; keep manual/CSV entries
      setEmployees((prev) => {
        const manual = prev.filter((e) => !e.graphId);
        return deduplicateEmployees(manual, users);
      });
      setGraphStatus(`Synced ${users.length} users`);
    } catch (err) {
      setGraphStatus(`Error: ${err.message}`);
    }
  };

  const isPrinted = (emp) => printedNames.has(`${emp.firstName} ${emp.lastName}`);

  const togglePrinted = (emp) => {
    const name = `${emp.firstName} ${emp.lastName}`;
    if (isPrinted(emp)) {
      setPrintLog((prev) => prev.filter((e) => e.name !== name));
    } else {
      setPrintLog((prev) => [...prev, { name, time: new Date().toISOString(), id: emp.employeeId || "", manual: true }]);
    }
    setCtxMenu(null);
  };

  const exportEmployeeCSV = () => {
    const header = "FirstName,LastName,Title,Department,EmployeeID,Printed";
    const rows = employees.map((emp) => {
      const printed = isPrinted(emp) ? "Yes" : "No";
      const escape = (v) => {
        const s = String(v || "");
        return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      };
      return [escape(emp.firstName), escape(emp.lastName), escape(emp.title), escape(emp.department), escape(emp.employeeId), printed].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employees-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderEmployee = (emp, i) => {
    const isSelected =
      selectedEmployee &&
      selectedEmployee.firstName === emp.firstName &&
      selectedEmployee.lastName === emp.lastName;
    const initials = (emp.firstName?.[0] || "") + (emp.lastName?.[0] || "");
    return (
      <div
        key={`${emp.firstName}-${emp.lastName}-${i}`}
        onClick={() => setSelectedEmployee(emp)}
        onContextMenu={(e) => {
          e.preventDefault();
          setCtxMenu({ x: e.clientX, y: e.clientY, emp });
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 10px",
          borderRadius: 8,
          cursor: "pointer",
          background: isSelected ? "#00d4aa10" : "transparent",
          border: isSelected ? "1px solid #00d4aa33" : "1px solid transparent",
          marginBottom: 2,
          transition: "all 0.15s",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            background: isSelected ? "#00d4aa22" : "#1a1a1a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 600,
            color: isSelected ? "#00d4aa" : "#666",
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#eee",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {sortBy === "last" ? `${emp.lastName}, ${emp.firstName}` : `${emp.firstName} ${emp.lastName}`}
            {isPrinted(emp) && (
              <span style={{ color: "#00d4aa", marginLeft: 6, fontSize: 11 }}>✓</span>
            )}
          </div>
          <div
            style={{
              fontSize: 10.5,
              color: "#666",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {emp.title}
            {emp.title && emp.department ? " · " : ""}
            {emp.department}
          </div>
        </div>
      </div>
    );
  };

  const pillStyle = (active) => ({
    padding: "3px 8px",
    fontSize: 10,
    fontWeight: active ? 600 : 400,
    background: active ? "#00d4aa18" : "transparent",
    border: active ? "1px solid #00d4aa44" : "1px solid #222",
    borderRadius: 4,
    color: active ? "#00d4aa" : "#666",
    cursor: "pointer",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }} onClick={() => ctxMenu && setCtxMenu(null)}>
      {/* Right-click context menu */}
      {ctxMenu && (
        <div
          style={{
            position: "fixed",
            left: ctxMenu.x,
            top: ctxMenu.y,
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: 6,
            padding: 4,
            zIndex: 9999,
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            minWidth: 160,
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); togglePrinted(ctxMenu.emp); }}
            style={{
              display: "block",
              width: "100%",
              padding: "6px 10px",
              fontSize: 11,
              fontWeight: 500,
              background: "transparent",
              border: "none",
              borderRadius: 4,
              color: isPrinted(ctxMenu.emp) ? "#ff6b6b" : "#00d4aa",
              cursor: "pointer",
              textAlign: "left",
            }}
            onMouseEnter={(e) => e.target.style.background = "#222"}
            onMouseLeave={(e) => e.target.style.background = "transparent"}
          >
            {isPrinted(ctxMenu.emp) ? "✕ Mark as Not Printed" : "✓ Mark as Printed"}
          </button>
        </div>
      )}
      {/* Search + sort controls */}
      <div style={{ padding: "10px 14px 6px", flexShrink: 0 }}>
        <input
          type="text"
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            fontSize: 12,
            background: "#111",
            border: "1px solid #222",
            borderRadius: 6,
            color: "#ccc",
            padding: "7px 10px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
          <span style={{ fontSize: 10, color: "#555" }}>Sort:</span>
          <button onClick={() => setSortBy("first")} style={pillStyle(sortBy === "first")}>First</button>
          <button onClick={() => setSortBy("last")} style={pillStyle(sortBy === "last")}>Last</button>
          <span style={{ fontSize: 10, color: "#555", marginLeft: 6 }}>Group:</span>
          <button onClick={() => setGroupBy(groupBy === "off" ? "title" : groupBy === "title" ? "printed" : "off")} style={pillStyle(groupBy !== "off")}>
            {groupBy === "off" ? "Off" : groupBy === "title" ? "Title" : "Printed"}
          </button>
          <button onClick={exportEmployeeCSV} style={{ ...pillStyle(false), marginLeft: "auto" }} title="Export employees CSV">📥</button>
          <span style={{ fontSize: 10, color: "#444" }}>{filtered.length}/{employees.length}</span>
        </div>
      </div>

      {/* Employee list — fills remaining space */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 6px" }}>
        {filtered.length === 0 && (
          <div style={{ padding: "20px 14px", color: "#555", fontSize: 12, textAlign: "center" }}>
            {employees.length === 0 ? "Import employees via CSV or Graph API" : "No matches"}
          </div>
        )}
        {groupBy !== "off" ? (() => {
          const groups = {};
          if (groupBy === "title") {
            for (const emp of sorted) {
              const title = emp.title || "No Title";
              if (!groups[title]) groups[title] = [];
              groups[title].push(emp);
            }
          } else {
            groups["Not Printed"] = [];
            groups["Printed"] = [];
            for (const emp of sorted) {
              (isPrinted(emp) ? groups["Printed"] : groups["Not Printed"]).push(emp);
            }
          }
          const sortedKeys = Object.keys(groups).sort((a, b) => {
            if (groupBy === "printed") {
              if (a === "Not Printed") return -1;
              if (b === "Not Printed") return 1;
              return 0;
            }
            if (a === "No Title") return 1;
            if (b === "No Title") return -1;
            return a.localeCompare(b);
          });
          return sortedKeys.map((label) => (
            groups[label].length > 0 && <div key={label}>
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                color: groupBy === "printed" && label === "Printed" ? "#00d4aa" : "#555",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "8px 10px 4px",
                borderBottom: "1px solid #1a1a1a",
                marginBottom: 2,
                position: "sticky",
                top: 0,
                background: "#0b0b0b",
                zIndex: 1,
              }}>
                {label} <span style={{ color: "#444", fontWeight: 400 }}>({groups[label].length})</span>
              </div>
              {groups[label].map((emp, i) => renderEmployee(emp, i))}
            </div>
          ));
        })() : sorted.map((emp, i) => renderEmployee(emp, i))}
      </div>

      {/* Config sections — collapsed by default */}
      <div style={{ flexShrink: 0 }}>
        <Section title="Import CSV" subtitle="upload employee list">
        <label
          htmlFor="csv-upload"
          style={{
            display: "block",
            width: "100%",
            padding: "7px 0",
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
          📄 Upload CSV File
          <input id="csv-upload" type="file" accept=".csv" onChange={handleCSV} style={{ display: "none" }} />
        </label>
        <div style={{ fontSize: 10, color: "#444", marginTop: 4 }}>
          Expected: FirstName, LastName, Title, Department
        </div>
      </Section>

      {/* Azure AD / Graph */}
      <Section title="Azure AD / Graph" subtitle="app registration sync">
        <div style={{ fontSize: 10, color: "#555", marginBottom: 8, lineHeight: 1.5 }}>
          Create an <span style={{ color: "#888" }}>App Registration</span> in Azure Portal with
          <span style={{ color: "#00d4aa" }}> User.Read.All</span> application permission + admin consent.
        </div>
        {[
          { key: "tenantId", label: "Tenant ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
          { key: "clientId", label: "Client ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
          { key: "clientSecret", label: "Client Secret", placeholder: "your client secret value", secret: true },
        ].map(({ key, label, placeholder, secret }) => (
          <div key={key} style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 10, color: "#666", display: "block", marginBottom: 2 }}>
              {label}
            </label>
            <input
              type={secret ? "password" : "text"}
              placeholder={placeholder}
              value={graphCreds[key]}
              onChange={(e) => {
                clearTokenCache();
                setGraphCreds((prev) => ({ ...prev, [key]: e.target.value }));
              }}
              style={{
                width: "100%",
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                background: "#111",
                border: "1px solid #222",
                borderRadius: 6,
                color: "#aaa",
                padding: "6px 8px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        ))}
        <button
          onClick={handleGraphPull}
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
            marginTop: 6,
          }}
        >
          ☁️ Pull All Users
        </button>
        {graphStatus && (
          <div
            style={{
              fontSize: 10.5,
              color: graphStatus.startsWith("Error") ? "#e94560" : "#00d4aa",
              marginTop: 6,
              lineHeight: 1.4,
              wordBreak: "break-word",
            }}
          >
            {graphStatus}
          </div>
        )}
      </Section>

      {/* PDK Access Control */}
      <Section title="PDK Access Control" subtitle="card credential sync">
        <div style={{ fontSize: 10, color: "#555", marginBottom: 8, lineHeight: 1.5 }}>
          Enter your PDK <span style={{ color: "#888" }}>Client ID</span> and
          <span style={{ color: "#888" }}> Client Secret</span> to assign card numbers after printing.
        </div>
        {[
          { key: "pdkClientId", label: "Client ID", placeholder: "your PDK client ID" },
          { key: "pdkClientSecret", label: "Client Secret", placeholder: "your PDK client secret", secret: true },
        ].map(({ key, label, placeholder, secret }) => (
          <div key={key} style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 10, color: "#666", display: "block", marginBottom: 2 }}>
              {label}
            </label>
            <input
              type={secret ? "password" : "text"}
              placeholder={placeholder}
              value={pdkCreds[key]}
              onChange={(e) => {
                clearPdkCache();
                setPdkCreds((prev) => ({ ...prev, [key]: e.target.value }));
              }}
              style={{
                width: "100%",
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                background: "#111",
                border: "1px solid #222",
                borderRadius: 6,
                color: "#aaa",
                padding: "6px 8px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        ))}
      </Section>
      </div>
    </div>
  );
}
