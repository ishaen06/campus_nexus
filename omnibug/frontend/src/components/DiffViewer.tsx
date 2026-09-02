import React, { useState } from 'react';

interface DiffViewerProps {
  diffText?: string;
  title?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diffText, title = 'Unified Code Patch' }) => {
  const [copied, setCopied] = useState(false);

  if (!diffText) {
    return (
      <div className="card p-6 text-center text-xs text-[var(--text-tertiary)] border-dashed font-mono">
        No code patch or diff attached.
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(diffText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = diffText.split('\n');

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden font-mono text-xs shadow-xs my-3">
      {/* Header bar */}
      <div className="bg-[var(--bg-raised)] px-4 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
        <span className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">{title}</span>
        <button
          onClick={handleCopy}
          className="btn btn-secondary btn-sm text-xs font-mono"
        >
          {copied ? '✓ Copied' : 'Copy Diff'}
        </button>
      </div>

      {/* Code diff lines */}
      <div className="overflow-x-auto max-h-96 bg-[var(--bg-surface)]">
        <table className="w-full text-left border-collapse font-mono text-[12px] leading-relaxed">
          <tbody>
            {lines.map((line, idx) => {
              let rowBg = 'bg-transparent text-[var(--text-primary)]';
              let symbol = ' ';

              if (line.startsWith('+++') || line.startsWith('---')) {
                rowBg = 'bg-[var(--bg-raised)] text-[var(--text-primary)] font-bold';
              } else if (line.startsWith('@@')) {
                rowBg = 'bg-[var(--accent-light)] text-[var(--accent)] font-semibold';
              } else if (line.startsWith('+')) {
                rowBg = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium';
                symbol = '+';
              } else if (line.startsWith('-')) {
                rowBg = 'bg-red-500/10 text-red-600 dark:text-red-400 line-through';
                symbol = '-';
              }

              return (
                <tr key={idx} className={rowBg}>
                  <td className="w-12 select-none text-right pr-3 text-[var(--text-tertiary)] font-mono text-[10px] border-r border-[var(--border)]">
                    {idx + 1}
                  </td>
                  <td className="w-5 select-none text-center font-bold font-mono text-[11px]">
                    {symbol !== ' ' ? symbol : ''}
                  </td>
                  <td className="whitespace-pre pl-3 font-mono py-0.5">
                    {line.startsWith('+') || line.startsWith('-') ? line.substring(1) : line}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
