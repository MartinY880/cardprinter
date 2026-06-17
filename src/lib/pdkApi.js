let cachedIdToken = null;
let idTokenExpiry = 0;
let cachedSystemToken = null;
let systemTokenExpiry = 0;
let cachedSystemId = null;

export function clearPdkCache() {
  cachedIdToken = null;
  idTokenExpiry = 0;
  cachedSystemToken = null;
  systemTokenExpiry = 0;
  cachedSystemId = null;
}

async function getIdToken(clientId, clientSecret) {
  if (cachedIdToken && Date.now() < idTokenExpiry - 30000) {
    return cachedIdToken;
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch("/pdk/auth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PDK auth failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  cachedIdToken = data.id_token;
  idTokenExpiry = Date.now() + (data.expires_in || 300) * 1000;
  return cachedIdToken;
}

async function getSystemId(idToken) {
  if (cachedSystemId) return cachedSystemId;

  const res = await fetch("/pdk/accounts/organizations/mine", {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!res.ok) {
    throw new Error(`PDK list orgs failed (${res.status})`);
  }

  const orgs = await res.json();
  // Find the first org (or child) with a systemId
  for (const org of orgs) {
    if (org.systemId) {
      cachedSystemId = org.systemId;
      return cachedSystemId;
    }
    if (org.children) {
      for (const child of org.children) {
        if (child.systemId) {
          cachedSystemId = child.systemId;
          return cachedSystemId;
        }
      }
    }
  }
  throw new Error("No PDK system found in your organizations.");
}

async function getSystemToken(idToken, systemId) {
  if (cachedSystemToken && Date.now() < systemTokenExpiry - 30000) {
    return cachedSystemToken;
  }

  const res = await fetch(`/pdk/accounts/systems/${systemId}/token`, {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!res.ok) {
    throw new Error(`PDK system token failed (${res.status})`);
  }

  const data = await res.json();
  cachedSystemToken = data.token;
  // System tokens also expire — use 4 minutes to be safe
  systemTokenExpiry = Date.now() + 240000;
  return cachedSystemToken;
}

async function authenticate(creds) {
  const { pdkClientId, pdkClientSecret } = creds;
  if (!pdkClientId || !pdkClientSecret) {
    throw new Error("Enter PDK Client ID and Client Secret.");
  }
  const idToken = await getIdToken(pdkClientId, pdkClientSecret);
  const systemId = await getSystemId(idToken);
  const systemToken = await getSystemToken(idToken, systemId);
  return { systemId, systemToken };
}

export async function searchPdkHolder(creds, firstName, lastName) {
  const { systemId, systemToken } = await authenticate(creds);
  const query = `${firstName} ${lastName}`.trim();

  const res = await fetch(
    `/pdk/systems/${systemId}/holders?search=${encodeURIComponent(query)}&search_fields=firstName,lastName&per_page=20&include=credentials`,
    { headers: { Authorization: `Bearer ${systemToken}` } }
  );

  if (!res.ok) {
    throw new Error(`PDK holder search failed (${res.status})`);
  }

  const holders = await res.json();
  // Try exact match first
  const exact = holders.find(
    (h) =>
      h.firstName?.toLowerCase() === firstName.toLowerCase() &&
      h.lastName?.toLowerCase() === lastName.toLowerCase()
  );
  return exact || holders[0] || null;
}

export async function assignPdkCard(creds, holderId, cardNumber) {
  const { systemId, systemToken } = await authenticate(creds);

  const num = parseInt(cardNumber, 10);
  if (isNaN(num) || num <= 0) {
    throw new Error("Card number must be a positive integer.");
  }

  const res = await fetch(
    `/pdk/systems/${systemId}/holders/${holderId}/credentials`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${systemToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        types: ["card"],
        credentialNumber: num,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PDK assign card failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return await res.json();
}

export async function testPdkConnection(creds) {
  const { systemId } = await authenticate(creds);
  return systemId;
}
