const BASE = "/api";

export async function postChat(message, userContext = null) {
  const apiKey = localStorage.getItem("clearcart_gemini_api_key") || "";
  let user = userContext;
  if (!user) {
    try {
      const stored = localStorage.getItem("clearcart_auth_user");
      if (stored) user = JSON.parse(stored);
    } catch {}
  }

  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      api_key: apiKey || null,
      user_context: user || null,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function testApiKey(apiKey) {
  const res = await fetch(`${BASE}/test_key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getAlerts() {
  const res = await fetch(`${BASE}/alerts`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getData() {
  const res = await fetch(`${BASE}/data`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
