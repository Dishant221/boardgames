import type { MetricName, Usage } from '../lib/types';

/**
 * Tenant quota meters. Design follows the dataviz guidance: a stat tile per
 * metric, one hue (terracotta) for the fill, text in ink tokens (never the
 * fill colour), status communicated with icon + label, never colour alone.
 */
const LABELS: Record<MetricName, { label: string; hint: string }> = {
  workers_requests: { label: 'API requests', hint: 'Cloudflare Workers requests' },
  do_requests: { label: 'Workspace ops', hint: 'Durable Object requests (your private store)' },
  ai_neurons: { label: 'AI neurons', hint: 'Workers AI compute for chat & planning' },
  external_calls: { label: 'Map & data lookups', hint: 'OpenStreetMap, weather, Wikipedia calls' },
  d1_rows_read: { label: 'DB rows read', hint: 'D1 rows read' },
  d1_rows_written: { label: 'DB rows written', hint: 'D1 rows written' },
  kv_reads: { label: 'Cache reads', hint: 'KV reads' },
  kv_writes: { label: 'Cache writes', hint: 'KV writes' }
};

const ORDER: MetricName[] = ['ai_neurons', 'workers_requests', 'external_calls', 'do_requests', 'd1_rows_read', 'd1_rows_written', 'kv_reads', 'kv_writes'];

export default function UsageMeters({ usage }: { usage: Usage }) {
  const reset = new Date(usage.reset_at);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-xl font-semibold">Your daily allowance</h3>
        <span className="text-xs text-umber/70">Resets {reset.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ORDER.map((m) => {
          const used = usage.used[m] ?? 0;
          const max = usage.allowance[m] ?? 1;
          const pct = Math.min(100, Math.round((used / max) * 100));
          const state = pct >= 100 ? 'exhausted' : pct >= 80 ? 'high' : 'ok';
          return (
            <div key={m} className="marble p-3" title={LABELS[m].hint}>
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wider text-umber/80">{LABELS[m].label}</span>
                <span className="text-[11px] text-umber/70">
                  {state === 'exhausted' ? '⛔ used up' : state === 'high' ? '⚠ running low' : '✓ ok'}
                </span>
              </div>
              <div className="mt-1 font-display text-2xl text-ink">
                {compact(used)} <span className="text-sm text-umber/60">/ {compact(max)}</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-umber/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-terracotta transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {usage.project && (
        <div className="mt-6">
          <h4 className="small-caps mb-2 font-serif text-sm text-umber">Project-wide (all travellers share 40% of the Cloudflare free tier)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-umber/70">
                  <th className="py-1 pr-3 font-medium">Resource</th>
                  <th className="py-1 pr-3 font-medium">Used today</th>
                  <th className="py-1 pr-3 font-medium">Project budget</th>
                  <th className="py-1 font-medium">State</th>
                </tr>
              </thead>
              <tbody>
                {ORDER.map((m) => {
                  const u = usage.project!.used[m] ?? 0;
                  const b = usage.project!.budget[m] ?? 0;
                  const ex = usage.project!.exhausted.includes(m);
                  return (
                    <tr key={m} className="border-t border-umber/10">
                      <td className="py-1 pr-3">{LABELS[m].label}</td>
                      <td className="py-1 pr-3 font-medium">{compact(u)}</td>
                      <td className="py-1 pr-3">{compact(b)}</td>
                      <td className="py-1">{ex ? '⛔ exhausted' : `${Math.round((u / Math.max(1, b)) * 100)}%`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
