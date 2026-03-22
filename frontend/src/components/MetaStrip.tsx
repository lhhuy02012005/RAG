import { Brain, CheckCircle2, Database, LoaderCircle } from 'lucide-react';

import type { ConfigStatus, LLMCapabilities } from '../types';

interface MetaStripProps {
  configStatus: ConfigStatus | null;
  capabilities: LLMCapabilities | null;
  streamStatus: string;
}

export function MetaStrip({ configStatus, capabilities, streamStatus }: MetaStripProps) {
  const chipClass =
    'inline-flex items-center gap-1 rounded-full border border-cyan-100/20 bg-slate-900/70 px-3 py-1 text-xs text-slate-100';

  return (
    <section className="flex flex-wrap gap-2">
      <div className={chipClass}>
        <Database size={14} />
        {configStatus?.llm_provider ?? '...'} / {configStatus?.llm_model ?? '...'}
      </div>
      <div className={chipClass}>
        <Brain size={14} /> Embedding {configStatus?.kg_embedding_model ?? '...'}
      </div>
      <div className={chipClass}>
        <CheckCircle2 size={14} /> Vision {String(capabilities?.supports_vision ?? false)}
      </div>
      <div className={chipClass}>
        <LoaderCircle size={14} /> {streamStatus}
      </div>
    </section>
  );
}
