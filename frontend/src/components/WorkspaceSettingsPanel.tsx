import { CheckCircle2 } from 'lucide-react';

import type { Workspace } from '../types';

interface WorkspaceSettingsPanelProps {
  selectedWorkspace: Workspace | null;
  editingWorkspace: boolean;
  editName: string;
  editDescription: string;
  editLanguage: string;
  setEditingWorkspace: (value: boolean) => void;
  setEditName: (value: string) => void;
  setEditDescription: (value: string) => void;
  setEditLanguage: (value: string) => void;
  onSaveWorkspace: () => void;
}

export function WorkspaceSettingsPanel({
  selectedWorkspace,
  editingWorkspace,
  editName,
  editDescription,
  editLanguage,
  setEditingWorkspace,
  setEditName,
  setEditDescription,
  setEditLanguage,
  onSaveWorkspace,
}: WorkspaceSettingsPanelProps) {
  return (
    <div className="rounded-2xl border border-cyan-100/20 bg-slate-900/70 p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-100">Workspace Settings</h3>
        <button
          className="rounded-xl border border-cyan-100/20 bg-slate-700/50 px-3 py-1.5 text-sm text-slate-100"
          onClick={() => setEditingWorkspace(!editingWorkspace)}
          disabled={!selectedWorkspace}
        >
          {editingWorkspace ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {!selectedWorkspace && <p className="text-sm text-slate-300">No workspace selected.</p>}

      {selectedWorkspace && (
        <div className="flex flex-col gap-2">
          <input
            className="w-full rounded-xl border border-cyan-100/20 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
            value={editingWorkspace ? editName : selectedWorkspace.name}
            onChange={(event) => setEditName(event.target.value)}
            disabled={!editingWorkspace}
          />
          <textarea
            className="w-full rounded-xl border border-cyan-100/20 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
            rows={3}
            value={editingWorkspace ? editDescription : selectedWorkspace.description ?? ''}
            onChange={(event) => setEditDescription(event.target.value)}
            disabled={!editingWorkspace}
          />
          <select
            className="w-full rounded-xl border border-cyan-100/20 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
            value={editingWorkspace ? editLanguage : selectedWorkspace.kg_language ?? ''}
            onChange={(event) => setEditLanguage(event.target.value)}
            disabled={!editingWorkspace}
          >
            <option value="" className="bg-slate-900 text-slate-100">Auto Detect</option>
            <option value="English" className="bg-slate-900 text-slate-100">English</option>
            <option value="Vietnamese" className="bg-slate-900 text-slate-100">Vietnamese</option>
            <option value="Chinese" className="bg-slate-900 text-slate-100">Chinese</option>
            <option value="Japanese" className="bg-slate-900 text-slate-100">Japanese</option>
            <option value="Korean" className="bg-slate-900 text-slate-100">Korean</option>
          </select>

          {editingWorkspace && (
            <button
              className="inline-flex items-center gap-2 self-start rounded-xl bg-linear-to-r from-emerald-300 to-cyan-300 px-3 py-2 text-sm font-semibold text-slate-900"
              onClick={onSaveWorkspace}
            >
              <CheckCircle2 size={15} /> Save Changes
            </button>
          )}
        </div>
      )}
    </div>
  );
}
