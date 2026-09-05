const BASE = "/api";

export async function postChat(message) {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
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
