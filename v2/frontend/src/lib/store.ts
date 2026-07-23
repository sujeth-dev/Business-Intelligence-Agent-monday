import { create } from "zustand";
import { sendChatMessage, fetchLeadershipSummary } from "./api";

interface Message {
  role: "agent" | "user";
  content: string;
  suggestedOptions?: string[];
  caveats?: string[];
}

interface ChatStore {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  leadershipSummary: string | null;
  isLeadershipLoading: boolean;
  leadershipError: string | null;
  sendMessage: (text: string) => Promise<void>;
  generateLeadershipSummary: () => Promise<void>;
  clearLeadershipSummary: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [{ role: "agent", content: "How is our pipeline looking this quarter?" }],
  isLoading: false,
  error: null,
  leadershipSummary: null,
  isLeadershipLoading: false,
  leadershipError: null,
  sendMessage: async (text: string) => {
    set((state) => ({
      messages: [...state.messages, { role: "user", content: text }],
      isLoading: true,
      error: null,
    }));

    try {
      const history = get().messages.map((m) => ({
        role: (m.role === "agent" ? "assistant" : "user") as "assistant" | "user",
        content: m.content,
      }));
      const data = await sendChatMessage(text, history);
      set((state) => ({
        messages: [
          ...state.messages,
          {
            role: "agent",
            content: data.reply || "No response received.",
            suggestedOptions: data.needsClarification ? data.suggestedOptions : undefined,
            caveats: data.caveats && data.caveats.length ? data.caveats : undefined,
          },
        ],
      }));
    } catch (err) {
      set((state) => ({
        messages: [
          ...state.messages,
          { role: "agent", content: "Connection to the BI agent failed. Check that the backend is running and configured." },
        ],
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    } finally {
      set({ isLoading: false });
    }
  },
  generateLeadershipSummary: async () => {
    set({ isLeadershipLoading: true, leadershipError: null });
    try {
      const data = await fetchLeadershipSummary();
      set({ leadershipSummary: data.summary || "No summary received." });
    } catch (err) {
      set({ leadershipError: err instanceof Error ? err.message : "Failed to generate leadership update" });
    } finally {
      set({ isLeadershipLoading: false });
    }
  },
  clearLeadershipSummary: () => set({ leadershipSummary: null, leadershipError: null }),
}));
