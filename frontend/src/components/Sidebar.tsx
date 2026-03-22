import { motion } from 'framer-motion';
import { PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react';

import type { Workspace } from '../types';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  workspaces: Workspace[];
  workspaceId: number | null;
  newWorkspaceName: string;
  newWorkspaceDescription: string;
  newWorkspaceLanguage: string;
  setNewWorkspaceName: (value: string) => void;
  setNewWorkspaceDescription: (value: string) => void;
  setNewWorkspaceLanguage: (value: string) => void;
  onCreateWorkspace: () => void;
  onSelectWorkspace: (id: number) => void;
}

export function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  workspaces,
  workspaceId,
  newWorkspaceName,
  newWorkspaceDescription,
  newWorkspaceLanguage,
  setNewWorkspaceName,
  setNewWorkspaceDescription,
  setNewWorkspaceLanguage,
  onCreateWorkspace,
  onSelectWorkspace,
}: SidebarProps) {
  return (
    <motion.aside
      className="border-b border-cyan-100/20 bg-slate-900/75 p-4 backdrop-blur md:min-h-screen md:border-b-0 md:border-r"
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
    >
      <button
        className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-100/20 bg-slate-700/40 text-slate-100"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
      </button>

      <div className="mt-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300">Local RAG Studio</p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-100">Nexus Console</h1>
        <p className="mt-1 text-sm text-slate-300">Control center for ingestion and chat streaming.</p>
      </div>

      {sidebarOpen && (
        <>
          <div className="mt-5 text-xs uppercase tracking-wider text-cyan-300">Create Workspace</div>
          <input
            className="mt-2 w-full rounded-xl border border-cyan-100/20 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-cyan-300/60"
            placeholder="Workspace name"
            value={newWorkspaceName}
            onChange={(event) => setNewWorkspaceName(event.target.value)}
          />
          <textarea
            className="mt-2 w-full rounded-xl border border-cyan-100/20 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-cyan-300/60"
            placeholder="Description"
            rows={3}
            value={newWorkspaceDescription}
            onChange={(event) => setNewWorkspaceDescription(event.target.value)}
          />
          <select
            className="mt-2 w-full rounded-xl border border-cyan-100/20 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
            value={newWorkspaceLanguage}
            onChange={(event) => setNewWorkspaceLanguage(event.target.value)}
          >
            <option value="" className="bg-slate-900 text-slate-100">Auto Detect</option>
            <option value="English" className="bg-slate-900 text-slate-100">English</option>
            <option value="Vietnamese" className="bg-slate-900 text-slate-100">Vietnamese</option>
            <option value="Chinese" className="bg-slate-900 text-slate-100">Chinese</option>
            <option value="Japanese" className="bg-slate-900 text-slate-100">Japanese</option>
            <option value="Korean" className="bg-slate-900 text-slate-100">Korean</option>
          </select>
          <button
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-emerald-300 to-cyan-300 px-3 py-2 text-sm font-semibold text-slate-900"
            onClick={onCreateWorkspace}
          >
            <Plus size={15} /> Create
          </button>

          <div className="mt-5 text-xs uppercase tracking-wider text-cyan-300">Workspaces</div>
          <div className="mt-2 flex max-h-[38vh] flex-col gap-2 overflow-auto">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                className={`rounded-xl border px-3 py-2 text-left text-sm text-slate-100 ${
                  workspaceId === workspace.id
                    ? 'border-emerald-300/70 bg-slate-700/60'
                    : 'border-cyan-100/20 bg-slate-800/70'
                }`}
                onClick={() => onSelectWorkspace(workspace.id)}
              >
                <div>{workspace.name}</div>
                <div className="text-xs text-slate-300">
                  {workspace.indexed_count}/{workspace.document_count} indexed
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </motion.aside>
  );
}
