"use client";
import { useEffect, useState } from "react";
import { fetchBoard } from "@/lib/api";

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
    return <div className="text-slate-400 text-sm animate-pulse">Syncing monday.com boards...</div>;
  }
  if (error) {
    return <div className="text-red-400 text-sm">{error}</div>;
  }
  if (!bi) return null;

  const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const caveats: string[] = [];
  if (bi.dataQuality.dealsWithMissingFields > 0) {
    caveats.push(`${bi.dataQuality.dealsWithMissingFields} deal record(s) have missing fields.`);
  }
  if (bi.dataQuality.workOrdersWithMissingFields > 0) {
    caveats.push(`${bi.dataQuality.workOrdersWithMissingFields} work order record(s) have missing fields.`);
  }
  if (bi.joins && bi.joins.wonDealsMissingExecution > 0) {
    caveats.push(`${bi.joins.wonDealsMissingExecution} deal(s) are Won but have no matched work order yet.`);
  }

  return (
    <div className="h-full overflow-y-auto space-y-4 text-sm text-slate-300">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Pipeline Value" value={rupees(bi.deals.totalPipelineValue)} />
        <StatCard label="Win Rate" value={bi.deals.winRate !== null ? `${bi.deals.winRate}%` : "N/A"} />
        <StatCard label="Open Deals" value={bi.deals.open} />
        <StatCard label="Overdue Work Orders" value={bi.workOrders.overdueCount} />
        {bi.joins && <StatCard label="Deals Linked to Work" value={`${bi.joins.linkRate ?? 0}%`} />}
        <StatCard label="Outstanding Receivable" value={rupees(bi.workOrders.totalOutstandingReceivable)} />
      </div>

      {caveats.length > 0 && (
        <div className="text-xs text-amber-400/90 bg-amber-950/30 border border-amber-900/50 rounded-md px-3 py-2 space-y-1">
          {caveats.map((c, i) => (
            <div key={i}>⚠ {c}</div>
          ))}
        </div>
      )}

      <div>
        <div className="font-medium text-indigo-400 mb-1">Deals by Sector</div>
        {Object.entries(bi.deals.bySector).map(([sector, s]) => (
          <div key={sector} className="flex justify-between py-1 border-b border-slate-800">
            <span>{sector}</span>
            <span>{s.count} deals · {rupees(s.value)}</span>
          </div>
        ))}
      </div>

      <div>
        <div className="font-medium text-indigo-400 mb-1">Work Orders ({workOrders.length})</div>
        {workOrders.slice(0, 25).map((r, i) => (
          <div key={i} className={`py-1 border-b border-slate-800 ${r.hasMissingFields ? "text-amber-400" : ""}`}>
            {r.name || "(unnamed)"} {r.hasMissingFields && "— incomplete record"}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-800/60 p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-lg font-semibold text-slate-100">{value}</div>
    </div>
  );
}
