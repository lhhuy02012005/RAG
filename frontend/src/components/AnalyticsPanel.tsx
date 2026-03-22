import type { ProjectAnalytics, RAGStats } from '../types';

interface AnalyticsPanelProps {
  stats: RAGStats | null;
  analytics: ProjectAnalytics | null;
}

export function AnalyticsPanel({ stats, analytics }: AnalyticsPanelProps) {
  return (
    <div className="rounded-2xl border border-cyan-100/20 bg-slate-900/70 p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-100">Analytics</h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-cyan-100/20 bg-slate-800/70 p-3">
          <label className="block text-xs text-slate-300">Documents</label>
          <strong className="text-xl text-slate-100">{stats?.total_documents ?? 0}</strong>
        </div>
        <div className="rounded-xl border border-cyan-100/20 bg-slate-800/70 p-3">
          <label className="block text-xs text-slate-300">Indexed</label>
          <strong className="text-xl text-slate-100">{stats?.indexed_documents ?? 0}</strong>
        </div>
        <div className="rounded-xl border border-cyan-100/20 bg-slate-800/70 p-3">
          <label className="block text-xs text-slate-300">Chunks</label>
          <strong className="text-xl text-slate-100">{stats?.total_chunks ?? 0}</strong>
        </div>
        <div className="rounded-xl border border-cyan-100/20 bg-slate-800/70 p-3">
          <label className="block text-xs text-slate-300">Images</label>
          <strong className="text-xl text-slate-100">{stats?.image_count ?? 0}</strong>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(analytics?.kg_analytics?.top_entities ?? []).slice(0, 10).map((entity) => (
          <span
            key={entity.name}
            className="rounded-full border border-cyan-100/20 bg-slate-700/50 px-2 py-1 text-[11px] text-slate-100"
          >
            {entity.name}
          </span>
        ))}
      </div>
    </div>
  );
}
