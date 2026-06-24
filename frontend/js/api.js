async function submitNodes(rawInput) {
  const data = rawInput
    .split(/[\n,]+/)
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);

  const res = await fetch(`${CONFIG.API_BASE_URL}/bfhl`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || "API request failed");
  }

  return json;
}
