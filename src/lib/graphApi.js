const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

let cachedToken = null;
let tokenExpiry = 0;

export function clearTokenCache() {
  cachedToken = null;
  tokenExpiry = 0;
}

async function getAccessToken(tenantId, clientId, clientSecret) {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  const tokenUrl = `/api/token/${encodeURIComponent(tenantId)}`;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try {
      const json = JSON.parse(text);
      detail = json.error_description || json.error || text;
    } catch {}
    throw new Error(`Token request failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

export async function fetchGraphUsers(creds, onProgress) {
  const { tenantId, clientId, clientSecret } = creds;
  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Fill in all three fields: Tenant ID, Client ID, and Client Secret.");
  }

  const token = await getAccessToken(tenantId, clientId, clientSecret);
  const allUsers = [];
  // Filter: only enabled Member accounts with at least one license assigned
  // This excludes: disabled users, guests/external, shared mailboxes, room/resource accounts
  let url = `${GRAPH_BASE}/users?$select=id,givenName,surname,jobTitle,department,mail,accountEnabled,userType,assignedLicenses&$filter=accountEnabled eq true and userType eq 'Member' and assignedLicenses/$count ne 0&$count=true&$top=999`;

  while (url) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        ConsistencyLevel: "eventual",
      },
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error("401 — token invalid. Check your Client ID and Secret.");
      if (res.status === 403) throw new Error("403 — app lacks User.Read.All application permission. Grant admin consent in Azure portal.");
      const text = await res.text();
      throw new Error(`Graph API error ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    const users = (data.value || [])
      .filter((u) => {
        // Skip accounts without a real name (service accounts, room mailboxes, etc.)
        if (!u.givenName && !u.surname) return false;
        // Skip accounts without a mail address
        if (!u.mail) return false;
        // Skip unlicensed accounts (shared mailboxes, room accounts, disabled users with no license)
        if (!u.assignedLicenses || u.assignedLicenses.length === 0) return false;
        return true;
      })
      .map((u) => ({
        firstName: u.givenName || "",
        lastName: u.surname || "",
        title: u.jobTitle || "",
        department: u.department || "",
        graphId: u.id,
      }));
    allUsers.push(...users);
    if (onProgress) onProgress(allUsers.length);
    url = data["@odata.nextLink"] || null;
  }

  return allUsers;
}

export async function fetchGraphPhoto(creds, graphId) {
  const { tenantId, clientId, clientSecret } = creds;
  let token;
  try {
    token = await getAccessToken(tenantId, clientId, clientSecret);
  } catch {
    return null;
  }
  const res = await fetch(`${GRAPH_BASE}/users/${encodeURIComponent(graphId)}/photo/$value`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}
