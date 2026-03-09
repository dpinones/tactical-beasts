const BOT_API_URL = import.meta.env.VITE_BOT_API_URL || "http://localhost:3001";

export async function requestBotOpponent(gameId: number): Promise<{ botAddress: string }> {
  const res = await fetch(`${BOT_API_URL}/api/practice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameId }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Bot API error: ${res.status}`);
  }

  return res.json();
}
