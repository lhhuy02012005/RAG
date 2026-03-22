import { RefreshCcw, Trash2 } from 'lucide-react';

import type { Workspace } from '../types';

interface TopBarProps {
  selectedWorkspace: Workspace | null;
  workspaceId: number | null;
  loadingWorkspace: boolean;
  onRefresh: () => void;
  onDeleteWorkspace: () => void;
}

export function TopBar({
  selectedWorkspace,
  workspaceId,
  loadingWorkspace,
  onRefresh,
  onDeleteWorkspace,
}: TopBarProps) {
  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-cyan-100/20 bg-slate-900/70 p-4 shadow-2xl lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-100">
          {selectedWorkspace?.name ?? 'No workspace selected'}
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          {selectedWorkspace?.description || 'Select or create a workspace to start.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-100/20 bg-slate-700/50 px-3 py-2 text-sm text-slate-100"
          onClick={onRefresh}
          disabled={!workspaceId || loadingWorkspace}
        >
          <RefreshCcw size={15} className={loadingWorkspace ? 'animate-spin' : ''} />
          Refresh
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-rose-300/40 bg-rose-900/40 px-3 py-2 text-sm text-rose-100"
          onClick={onDeleteWorkspace}
          disabled={!selectedWorkspace}
        >
          <Trash2 size={15} /> Delete Workspace
        </button>
      </div>
    </header>
  );
}
