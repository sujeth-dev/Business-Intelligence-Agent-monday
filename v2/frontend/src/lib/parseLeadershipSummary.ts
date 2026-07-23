export type BulletIcon = "pipeline" | "operations" | "execution" | "dataQuality" | "general";

export interface SummaryBullet {
  text: string;
  icon: BulletIcon;
}

// Best-effort per-bullet topic tagging over an unstructured LLM string —
// deliberately not full semantic sectioning, which would need structured
// output from the backend prompt. A mis-tagged icon is cosmetically minor;
// a mis-bucketed section would be structurally wrong.
function classify(line: string): BulletIcon {
  const lower = line.toLowerCase();
  if (/data quality|missing|incomplete|caveat/.test(lower)) return "dataQuality";
  if (/won.*(no|without|not).*(work order|execution|start)|execution|handover/.test(lower)) return "execution";
  if (/overdue|work order|operational|receivable|billing|collect/.test(lower)) return "operations";
  if (/pipeline|sector|deal|win rate|revenue/.test(lower)) return "pipeline";
  return "general";
}

export function parseLeadershipSummary(raw: string): SummaryBullet[] {
  const bullets = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-*•]+\s*/, "").replace(/^\d+[.)]\s*/, "").replace(/\*\*/g, "").trim())
    .filter(Boolean);

  if (bullets.length === 0) {
    return [{ text: raw.trim(), icon: "general" }];
  }

  return bullets.map((text) => ({ text, icon: classify(text) }));
}
