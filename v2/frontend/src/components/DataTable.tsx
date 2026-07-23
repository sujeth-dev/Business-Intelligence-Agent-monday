"use client";
import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { fetchBoard } from "@/lib/api";
import { formatCurrency, formatCurrencyPrecise, formatPercent } from "@/lib/format";
import StatTile from "./StatTile";

interface NormalizedRecord {
  type: string;
  name: string | null;
  fields: Record<string, string | number | null>;
  hasMissingFields: boolean;
}

interface BiSummary {
  deals: {
    totalDeals: number;
    totalPipelineValue: number;
    won: number;
    lost: number;
    open: number;
    winRate: number | null;
    bySector: Record<string, { count: number; value: number }>;
  };
  workOrders: {
    totalWorkOrders: number;
    statusCounts: Record<string, number>;
    overdueCount: number;
    totalOutstandingReceivable: number;
  };
  dataQuality: { dealsWithMissingFields: number; workOrdersWithMissingFields: number };
  joins?: {
    totalDeals: number;
    dealsWithLinkedWork: number;
    dealsUnmatched: number;
    linkRate: number | null;
    wonDealsMissingExecution: number;
  };
}

export default function DataTable() {
  const [bi, setBi] = useState<BiSummary | null>(null);
  const [workOrders, setWorkOrders] = useState<NormalizedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQualityFlags, setShowQualityFlags] = useState(false);

  useEffect(() => {
    Promise.all([fetchBoard("bi-summary"), fetchBoard("workorders")])
      .then(([biData, wo]) => {
        setBi(biData);
        setWorkOrders(wo);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-slate-500 dark:text-slate-400 text-sm animate-pulse">Syncing monday.com boards...</div>;
  }
  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-brand-navy dark:text-slate-200">
        <AlertCircle size={16} className="text-status-critical shrink-0" />
        {error}
      </div>
    );
  }
  if (!bi) return null;

  const sortedSectors = Object.entries(bi.deals.bySector).sort((a, b) => b[1].value - a[1].value);
  const maxSectorValue = Math.max(...sortedSectors.map(([, s]) => s.value), 1);

  return (
    <div className="h-full overflow-y-auto space-y-5 text-sm text-slate-700 dark:text-slate-300">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatTile
          label="Pipeline Value"
          value={formatCurrency(bi.deals.totalPipelineValue)}
          precise={formatCurrencyPrecise(bi.deals.totalPipelineValue)}
          context={`${bi.deals.open} open deals`}
        />
        <StatTile
          label="Win Rate"
          value={formatPercent(bi.deals.winRate)}
          context={`${bi.deals.won} won · ${bi.deals.lost} lost`}
        />
        <StatTile
          label="Open Deals"
          value={String(bi.deals.open)}
          context={`of ${bi.deals.totalDeals} total`}
        />
        <StatTile
          label="Overdue Work Orders"
          value={String(bi.workOrders.overdueCount)}
          context={`of ${bi.workOrders.totalWorkOrders} work orders`}
          status={bi.workOrders.overdueCount > 0 ? "warning" : "good"}
        />
        {bi.joins && (
          <StatTile
            label="Deals Linked to Work"
            value={formatPercent(bi.joins.linkRate)}
            context={`${bi.joins.dealsUnmatched} unmatched`}
          />
        )}
        <StatTile
          label="Outstanding Receivable"
          value={formatCurrency(bi.workOrders.totalOutstandingReceivable)}
          precise={formatCurrencyPrecise(bi.workOrders.totalOutstandingReceivable)}
        />
      </div>

      <div>
        <div className="font-medium text-brand-teal dark:text-brand-teal-dark mb-2">Deals by Sector</div>
        <div className="space-y-1.5">
          {sortedSectors.map(([sector, s]) => (
            <div key={sector} className="group">
              <div className="flex justify-between items-baseline text-xs mb-0.5">
                <span className="text-slate-700 dark:text-slate-300">{sector}</span>
                <span className="text-slate-500 dark:text-slate-400 tabular-nums" title={formatCurrencyPrecise(s.value)}>
                  {s.count} · {formatCurrency(s.value)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-teal dark:bg-brand-teal-dark"
                  style={{ width: `${Math.max((s.value / maxSectorValue) * 100, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-brand-teal dark:text-brand-teal-dark">
            Work Orders ({workOrders.length})
          </span>
          <button
            onClick={() => setShowQualityFlags((v) => !v)}
            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
              showQualityFlags
                ? "border-status-warning/60 text-slate-700 dark:text-slate-200 bg-status-warning/10"
                : "border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500"
            }`}
            aria-pressed={showQualityFlags}
          >
            <AlertCircle size={12} className={showQualityFlags ? "text-status-warning" : ""} />
            Data quality
          </button>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/70 overflow-hidden">
          {workOrders.slice(0, 25).map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-3 py-1.5 text-xs bg-white dark:bg-transparent"
            >
              <span className="truncate text-slate-700 dark:text-slate-300">{r.name || "(unnamed)"}</span>
              {showQualityFlags && r.hasMissingFields && (
                <span title="Missing required fields" aria-label="Missing required fields" className="shrink-0 ml-2 inline-flex">
                  <AlertCircle size={14} className="text-status-warning" />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
