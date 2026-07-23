"use client";
import { Sparkles } from "lucide-react";

const QUESTIONS = [
  "Which sectors have the largest open pipeline?",
  "How many work orders are overdue right now?",
  "Which won deals have no matched work order yet?",
];

interface PopularQuestionsProps {
  onAsk: (question: string) => void;
  onLeadershipSummary: () => void;
  disabled?: boolean;
  /** "full" = empty-state block in the message list; "compact" = one scrollable chip row above the input. */
  variant?: "full" | "compact";
}

export default function PopularQuestions({
  onAsk,
  onLeadershipSummary,
  disabled,
  variant = "full",
}: PopularQuestionsProps) {
  const chipBase =
    "text-left text-xs px-3 py-1.5 rounded-full border border-slate-300 text-slate-600 hover:border-brand-teal hover:text-brand-teal dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-teal-dark dark:hover:text-brand-teal-dark transition-colors disabled:opacity-50";
  const reportChip =
    "flex items-center gap-1.5 text-left text-xs px-3 py-1.5 rounded-full border border-brand-teal/50 text-brand-teal dark:border-brand-teal-dark/50 dark:text-brand-teal-dark hover:bg-brand-teal hover:text-white dark:hover:bg-brand-teal-dark dark:hover:text-slate-900 transition-colors disabled:opacity-50";

  if (variant === "compact") {
    return (
      <div className="flex gap-1.5 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {QUESTIONS.map((q) => (
          <button key={q} onClick={() => onAsk(q)} disabled={disabled} className={`${chipBase} shrink-0 whitespace-nowrap`}>
            {q}
          </button>
        ))}
        <button onClick={onLeadershipSummary} disabled={disabled} className={`${reportChip} shrink-0 whitespace-nowrap`}>
          <Sparkles size={12} />
          Leadership report
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-1">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">Popular questions</div>
      <div className="flex flex-col items-start gap-2">
        {QUESTIONS.map((q) => (
          <button key={q} onClick={() => onAsk(q)} disabled={disabled} className={chipBase}>
            {q}
          </button>
        ))}
        <button onClick={onLeadershipSummary} disabled={disabled} className={reportChip}>
          <Sparkles size={12} />
          Give me a leadership-ready summary
        </button>
      </div>
    </div>
  );
}
