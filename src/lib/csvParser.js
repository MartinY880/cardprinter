export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  const colMap = {};
  headers.forEach((h, i) => {
    if (h.includes("first")) colMap.firstName = i;
    else if (h.includes("last")) colMap.lastName = i;
    else if (h.includes("title") || h.includes("position")) colMap.title = i;
    else if (h.includes("dept") || h.includes("department")) colMap.department = i;
    else if (h.includes("id") || h.includes("employee")) colMap.employeeId = i;
  });

  // Fallback: if no mapping found, assume order: first, last, title, dept
  if (colMap.firstName === undefined && headers.length >= 2) {
    colMap.firstName = 0;
    colMap.lastName = 1;
    if (headers.length >= 3) colMap.title = 2;
    if (headers.length >= 4) colMap.department = 3;
  }

  const employees = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const emp = {
      firstName: cols[colMap.firstName] || "",
      lastName: cols[colMap.lastName] || "",
      title: colMap.title !== undefined ? cols[colMap.title] || "" : "",
      department: colMap.department !== undefined ? cols[colMap.department] || "" : "",
      employeeId: colMap.employeeId !== undefined ? cols[colMap.employeeId] || "" : "",
    };
    if (emp.firstName || emp.lastName) {
      employees.push(emp);
    }
  }
  return employees;
}

export function deduplicateEmployees(existing, incoming) {
  const keys = new Set(existing.map((e) => `${e.firstName}|${e.lastName}`.toLowerCase()));
  const newOnes = incoming.filter(
    (e) => !keys.has(`${e.firstName}|${e.lastName}`.toLowerCase())
  );
  return [...existing, ...newOnes];
}
