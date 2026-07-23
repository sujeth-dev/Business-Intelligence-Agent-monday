const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export async function sendChatMessage(message: string, history: ChatHistoryMessage[]) {
  const res = await fetch(`${API_URL}/api/agent/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Agent request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchBoard(path: "workorders" | "deals" | "bi-summary") {
  const res = await fetch(`${API_URL}/api/data/${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Data request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchLeadershipSummary() {
  const res = await fetch(`${API_URL}/api/agent/leadership-summary`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Leadership summary request failed (${res.status})`);
  }
  return res.json();
}
