"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Moon, Send, Sparkles, Sun } from "lucide-react";
import { useChatStore } from "@/lib/store";
import { useTheme } from "@/lib/useTheme";
import DataTable from "@/components/DataTable";
import PopularQuestions from "@/components/PopularQuestions";
import LeadershipSummaryModal from "@/components/LeadershipSummaryModal";
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
  const { isDark, toggle } = useTheme();
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
    <div className="max-w-4xl mx-auto p-6 md:p-8 min-h-screen space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy dark:text-slate-50">
            Executive Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Live from monday.com · Deals + Work Orders</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-brand-navy dark:hover:text-white transition-colors"
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Button
            onClick={generateLeadershipSummary}
            disabled={isLeadershipLoading}
            className="bg-brand-teal hover:bg-brand-teal/90 dark:bg-brand-teal-dark dark:hover:bg-brand-teal-dark/90 text-white dark:text-slate-900 font-semibold gap-2"
          >
            <Sparkles size={15} />
            {isLeadershipLoading ? "Generating..." : "Leadership Update"}
          </Button>
        </div>
      </div>

      {/* Business snapshot first -- all the information, then the chat below it */}
      <Card className="bg-white border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800 dark:shadow-none p-4 max-h-[440px] overflow-y-auto">
        <DataTable />
      </Card>

      <Card className="bg-white border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800 dark:shadow-none flex flex-col h-[560px]">
        <div className="px-4 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="text-sm font-semibold text-brand-navy dark:text-slate-100">BI Agent</div>
          <div className="text-[11px] text-slate-500">Ask anything about pipeline or operations</div>
        </div>
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
                className={`p-3 rounded-lg text-sm max-w-[85%] leading-relaxed ${
                  msg.role === "agent"
                    ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    : "bg-brand-teal text-white dark:bg-brand-teal-dark dark:text-slate-900 ml-auto"
                }`}
              >
                {msg.content}
              </div>
              {msg.suggestedOptions && msg.suggestedOptions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {msg.suggestedOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleOptionClick(option)}
                      disabled={isLoading}
                      className="text-xs px-3 py-1 rounded-full border border-slate-300 text-slate-600 hover:border-brand-teal hover:text-brand-teal dark:border-slate-600 dark:text-slate-300 dark:hover:border-brand-teal-dark dark:hover:text-brand-teal-dark transition-colors disabled:opacity-50"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
              {msg.caveats && msg.caveats.length > 0 && (
                <details className="text-[11px] text-slate-500 dark:text-slate-400">
                  <summary className="cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300">
                    Data notes ({msg.caveats.length})
                  </summary>
                  <div className="mt-1 space-y-0.5 pl-3 border-l border-slate-200 dark:border-slate-700">
                    {msg.caveats.map((c, i) => (
                      <div key={i}>{c}</div>
                    ))}
                  </div>
                </details>
              )}
            </motion.div>
          ))}
          {messages.length === 1 && !isLoading && (
            <PopularQuestions
              onAsk={handleOptionClick}
              onLeadershipSummary={generateLeadershipSummary}
              disabled={isLoading || isLeadershipLoading}
            />
          )}
          {isLoading && (
            <div className="text-slate-500 text-xs animate-pulse">BI agent is thinking...</div>
          )}
        </div>
        {messages.length > 1 && (
          <PopularQuestions
            variant="compact"
            onAsk={handleOptionClick}
            onLeadershipSummary={generateLeadershipSummary}
            disabled={isLoading || isLeadershipLoading}
          />
        )}
        <form onSubmit={handleSubmit} className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
          <Input
            className="bg-slate-50 border-slate-200 text-brand-navy placeholder:text-slate-400 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
            placeholder="Ask the BI Agent..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <Button
            type="submit"
            className="bg-brand-teal hover:bg-brand-teal/90 dark:bg-brand-teal-dark dark:hover:bg-brand-teal-dark/90 text-white dark:text-slate-900"
            disabled={isLoading}
          >
            <Send size={16} />
          </Button>
        </form>
      </Card>

      <LeadershipSummaryModal
        summary={leadershipSummary}
        isLoading={isLeadershipLoading}
        error={leadershipError}
        onClose={clearLeadershipSummary}
      />
    </div>
  );
}
