import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { resolveBackendAssetUrl } from '../lib/api';

interface MarkdownPreviewModalProps {
  open: boolean;
  title: string;
  markdown: string;
  onClose: () => void;
}

function normalizeDoclingImageSrc(src: string): string {
  if (!src) {
    return '';
  }

  // Keep valid remote links untouched.
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  const normalized = src.replace(/\\/g, '/').trim();

  // Already a backend static path.
  const staticIdx = normalized.indexOf('/static/doc-images/');
  if (staticIdx >= 0) {
    return resolveBackendAssetUrl(normalized.slice(staticIdx));
  }

  // Legacy markdown may contain local filesystem paths to docling images.
  const doclingMatch = normalized.match(/(?:^|\/)data\/docling\/(kb_\d+\/images\/[^?#\s)]+)/i);
  if (doclingMatch?.[1]) {
    return resolveBackendAssetUrl(`/static/doc-images/${doclingMatch[1]}`);
  }

  // Some files only store the suffix `kb_x/images/...`.
  const kbImageMatch = normalized.match(/(?:^|\/)(kb_\d+\/images\/[^?#\s)]+)/i);
  if (kbImageMatch?.[1]) {
    return resolveBackendAssetUrl(`/static/doc-images/${kbImageMatch[1]}`);
  }

  return resolveBackendAssetUrl(normalized);
}

function processMarkdownImages(raw: string): string {
  if (!raw) {
    return '';
  }

  // Rewrite markdown image links so local docling paths become backend static URLs.
  return raw.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (full, alt, linkTarget) => {
    const target = String(linkTarget || '').trim();
    if (!target) {
      return full;
    }

    const normalized = normalizeDoclingImageSrc(target);
    if (!normalized || normalized === target) {
      return full;
    }

    return `![${alt}](${normalized})`;
  });
}

export function MarkdownPreviewModal({
  open,
  title,
  markdown,
  onClose,
}: MarkdownPreviewModalProps) {
  const safeMarkdown = useMemo(() => processMarkdownImages(markdown), [markdown]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-5xl rounded-2xl border border-cyan-100/20 bg-slate-900/95 p-4"
            initial={{ y: 16 }}
            animate={{ y: 0 }}
            exit={{ y: 16 }}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-100">{title}</h3>
              <button
                className="rounded-lg border border-cyan-100/20 bg-slate-700/50 px-3 py-1.5 text-sm text-slate-100"
                onClick={onClose}
              >
                Close
              </button>
            </div>

            <div className="max-h-[72vh] overflow-auto rounded-xl border border-cyan-100/20 p-3 text-sm leading-6 text-slate-100 [&_h1]:mt-4 [&_h1]:text-xl [&_h2]:mt-4 [&_h2]:text-lg [&_h3]:mt-3 [&_h3]:text-base [&_p]:my-2 [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-cyan-100/20 [&_pre]:bg-slate-950/70 [&_pre]:p-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-cyan-100/20 [&_td]:p-2 [&_th]:border [&_th]:border-cyan-100/20 [&_th]:p-2">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  img: ({ src, alt }) => (
                    <img
                      src={normalizeDoclingImageSrc(src || '')}
                      alt={alt || ''}
                      loading="lazy"
                      className="my-3 max-h-105 w-full rounded-lg border border-cyan-100/20 object-contain"
                    />
                  ),
                }}
              >
                {safeMarkdown}
              </ReactMarkdown>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
