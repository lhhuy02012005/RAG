import { motion } from 'framer-motion';
import { Bot, MessageSquareText, SendHorizontal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { resolveBackendAssetUrl } from '../lib/api';
import type { UIMessage } from '../types';

interface ChatPanelProps {
  chatMessages: UIMessage[];
  chatInput: string;
  streaming: boolean;
  workspaceId: number | null;
  enableThinking: boolean;
  forceSearch: boolean;
  setEnableThinking: (value: boolean) => void;
  setForceSearch: (value: boolean) => void;
  setChatInput: (value: string) => void;
  onSendMessage: () => void;
  onClearHistory: () => void;
}

export function ChatPanel({
  chatMessages,
  chatInput,
  streaming,
  workspaceId,
  enableThinking,
  forceSearch,
  setEnableThinking,
  setForceSearch,
  setChatInput,
  onSendMessage,
  onClearHistory,
}: ChatPanelProps) {
  return (
    <div className="rounded-2xl border border-cyan-100/20 bg-slate-900/70 p-4 shadow-2xl lg:row-span-3 lg:min-h-160">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-base font-semibold text-slate-100">
          <MessageSquareText size={18} /> RAG Chat
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={enableThinking}
              onChange={(event) => setEnableThinking(event.target.checked)}
            />
            Thinking
          </label>
          <label className="inline-flex items-center gap-1 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={forceSearch}
              onChange={(event) => setForceSearch(event.target.checked)}
            />
            Force Search
          </label>
          <button
            className="rounded-lg border border-cyan-100/20 bg-slate-700/50 px-2.5 py-1 text-xs text-slate-100"
            onClick={onClearHistory}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex max-h-117.5 flex-col gap-2 overflow-auto pr-1">
        {chatMessages.map((message, index) => (
          <motion.article
            key={`${message.id}-${index}`}
            className={`rounded-xl border p-3 ${
              message.role === 'assistant'
                ? 'border-cyan-100/20 bg-slate-800/70'
                : 'border-cyan-200/25 bg-cyan-950/35'
            }`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <header className="mb-2 inline-flex items-center gap-1 text-xs text-cyan-200">
              {message.role === 'assistant' ? <Bot size={14} /> : <span>you</span>}
            </header>

            {message.role === 'assistant' ? (
              <div className="space-y-2 text-sm leading-6 text-slate-100 [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-cyan-100/20 [&_pre]:bg-slate-950/70 [&_pre]:p-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || '...'}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-slate-100">{message.content}</p>
            )}

            {message.sources.length > 0 && (
              <div className="mt-3 flex flex-col gap-1.5">
                {message.sources.slice(0, 4).map((source) => (
                  <details
                    key={`${message.id}-${source.index}`}
                    className="rounded-lg border border-dashed border-cyan-100/20 p-2 text-xs"
                  >
                    <summary className="cursor-pointer text-cyan-200">
                      [{source.index}] page {source.page_no || '-'}
                    </summary>
                    <p className="mt-2 text-slate-300">{source.content.slice(0, 360)}...</p>
                  </details>
                ))}
              </div>
            )}

            {message.image_refs.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-auto">
                {message.image_refs.slice(0, 3).map((image) => (
                  <figure key={`${message.id}-${image.image_id}`} className="min-w-36">
                    <img
                      src={resolveBackendAssetUrl(image.url)}
                      alt={image.caption || image.image_id}
                      className="h-20 w-full rounded-lg border border-cyan-100/20 object-cover"
                    />
                    <figcaption className="mt-1 text-[11px] text-slate-300">
                      {image.caption || image.image_id}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </motion.article>
        ))}

        {chatMessages.length === 0 && (
          <p className="text-sm text-slate-300">
            Ask anything about indexed documents. Streaming response and sources will appear here.
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2 md:flex-row">
        <textarea
          className="w-full rounded-xl border border-cyan-100/20 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
          rows={3}
          value={chatInput}
          placeholder="Ask your documents..."
          onChange={(event) => setChatInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onSendMessage();
            }
          }}
        />
        <button
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-300 to-cyan-300 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
          onClick={onSendMessage}
          disabled={!workspaceId || streaming || !chatInput.trim()}
        >
          <SendHorizontal size={15} />
          {streaming ? 'Streaming...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
