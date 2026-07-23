"use client";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface StatTileProps {
  label: string;
  value: string;
  context?: string;
  /** Full-precision value shown on hover (title attribute). */
  precise?: string;
  /** Reserved status accent — only for genuinely stateful tiles (e.g. overdue). */
  status?: "good" | "warning";
}

export default function StatTile({ label, value, context, precise, status }: StatTileProps) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-sm dark:bg-slate-800/50 dark:border-slate-700/40 dark:shadow-none p-3.5 flex flex-col gap-1">
      <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-500">{label}</div>
      <div className="flex items-center gap-1.5">
        {status === "warning" && (
          <AlertTriangle size={16} className="text-status-warning shrink-0" aria-label="Needs attention" />
        )}
        {status === "good" && (
          <CheckCircle2 size={16} className="text-status-good shrink-0" aria-label="On track" />
        )}
        <span
          className="text-xl font-semibold text-brand-navy dark:text-slate-50 leading-tight"
          title={precise}
        >
          {value}
        </span>
      </div>
      {context && <div className="text-[11px] text-slate-500 dark:text-slate-400">{context}</div>}
    </div>
  );
}
