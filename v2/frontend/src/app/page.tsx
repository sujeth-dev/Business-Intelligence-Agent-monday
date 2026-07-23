"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles, X } from "lucide-react";
import { useChatStore } from "@/lib/store";
import DataTable from "@/components/DataTable";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [input, setInput] = useState("");
  const {
    messages,
    isLoading,
    sendMessage,
    leadershipSummary,
    isLeadershipLoading,
    leadershipError,
    generateLeadershipSummary,
    clearLeadershipSummary,
  } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  };

  const handleOptionClick = (option: string) => {
    if (isLoading) return;
    sendMessage(option);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 max-w-7xl mx-auto h-screen">
      <div className="col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-light tracking-tight">Executive Dashboard</h1>
          <Button
            onClick={generateLeadershipSummary}
            disabled={isLeadershipLoading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
          >
            <Sparkles size={16} />
            {isLeadershipLoading ? "Generating..." : "Generate Leadership Update"}
          </Button>
        </div>
        <Card className="h-[600px] bg-slate-900 border-slate-800 p-4 overflow-hidden">
          <DataTable />
        </Card>
      </div>

      <Card className="col-span-1 bg-slate-900 border-slate-800 flex flex-col h-[600px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
          {messages.map((msg, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              key={idx}
              className="space-y-2"
            >
              <div
                className={`p-3 rounded-lg text-sm max-w-[85%] ${
                  msg.role === "agent" ? "bg-slate-800 text-slate-200" : "bg-indigo-600 text-white ml-auto"
                }`}
              >
                {msg.content}
              </div>
              {msg.suggestedOptions && msg.suggestedOptions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {msg.suggestedOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleOptionClick(option)}
                      disabled={isLoading}
                      className="text-xs px-3 py-1 rounded-full border border-indigo-500 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-colors disabled:opacity-50"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
              {msg.caveats && msg.caveats.length > 0 && (
                <div className="text-xs text-amber-400/90 bg-amber-950/30 border border-amber-900/50 rounded-md px-3 py-2">
                  {msg.caveats.map((c, i) => (
                    <div key={i}>⚠ {c}</div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
          {isLoading && (
            <div className="text-slate-500 text-xs animate-pulse">BI agent is thinking...</div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="p-4 border-t border-slate-800 flex gap-2">
          <Input
            className="bg-slate-950 border-slate-800"
            placeholder="Ask the BI Agent..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white" disabled={isLoading}>
            <Send size={16} />
          </Button>
        </form>
      </Card>

      {(leadershipSummary || leadershipError || isLeadershipLoading) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-8 z-50">
          <Card className="bg-slate-900 border-slate-800 max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 relative">
            <button
              onClick={clearLeadershipSummary}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <h2 className="text-xl font-light mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-400" /> Leadership Update
            </h2>
            {isLeadershipLoading && <div className="text-slate-400 text-sm animate-pulse">Generating summary...</div>}
            {leadershipError && <div className="text-red-400 text-sm">{leadershipError}</div>}
            {leadershipSummary && (
              <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{leadershipSummary}</div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
