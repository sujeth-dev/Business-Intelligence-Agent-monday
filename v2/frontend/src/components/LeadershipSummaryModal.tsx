"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  BarChart3,
  ClipboardList,
  FileWarning,
  Rocket,
  Sparkles,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { parseLeadershipSummary, type BulletIcon } from "@/lib/parseLeadershipSummary";

const ICONS: Record<BulletIcon, typeof BarChart3> = {
  pipeline: BarChart3,
  operations: ClipboardList,
  execution: Rocket,
  dataQuality: FileWarning,
  general: Sparkles,
};

interface LeadershipSummaryModalProps {
  summary: string | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

export default function LeadershipSummaryModal({ summary, isLoading, error, onClose }: LeadershipSummaryModalProps) {
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  useEffect(() => {
    if (summary) {
      setGeneratedAt(
        new Date().toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
      );
    }
  }, [summary]);

  if (!summary && !error && !isLoading) return null;

  const bullets = summary ? parseLeadershipSummary(summary) : [];

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <Card className="bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 max-w-2xl w-full max-h-[82vh] overflow-y-auto p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-brand-navy dark:hover:text-white transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="mb-5">
          <h2 className="text-xl font-semibold text-brand-navy dark:text-slate-50 flex items-center gap-2">
            <Sparkles size={18} className="text-brand-teal dark:text-brand-teal-dark" /> Leadership Update
          </h2>
          {generatedAt && (
            <div className="text-xs text-slate-500 mt-1">Generated {generatedAt} · live monday.com data</div>
          )}
        </div>

        {isLoading && (
          <div className="text-slate-500 dark:text-slate-400 text-sm animate-pulse">
            Analyzing boards and preparing your update...
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-brand-navy dark:text-slate-200">
            <AlertCircle size={16} className="text-status-critical shrink-0" />
            {error}
          </div>
        )}

        {summary && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
            className="space-y-2.5"
          >
            {bullets.map((b, i) => {
              const Icon = ICONS[b.icon];
              return (
                <motion.div
                  key={i}
                  variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                  className="flex items-start gap-3 rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700/40 p-3"
                >
                  <span className="shrink-0 mt-0.5 w-7 h-7 rounded-full bg-brand-teal/10 dark:bg-brand-teal-dark/10 flex items-center justify-center">
                    <Icon size={14} className="text-brand-teal dark:text-brand-teal-dark" />
                  </span>
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{b.text}</p>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </Card>
    </div>
  );
}
