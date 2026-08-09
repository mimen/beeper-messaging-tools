import type { ReviewSummary } from '../types/messaging';

interface ReviewProgressProps {
  currentIndex: number;
  summary: ReviewSummary;
}

export function ReviewProgress({ currentIndex, summary }: ReviewProgressProps) {
  const progress = summary.total > 0
    ? ((summary.sent + summary.skipped + summary.errors) / summary.total) * 100
    : 0;

  const isComplete = summary.sent + summary.skipped + summary.errors === summary.total;

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-purple-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Counters */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300">
          {isComplete
            ? 'Review complete'
            : `Reviewing ${currentIndex + 1} of ${summary.total}`}
        </span>
        <div className="flex gap-4">
          {summary.sent > 0 && (
            <span className="text-green-300">{summary.sent} sent</span>
          )}
          {summary.skipped > 0 && (
            <span className="text-yellow-300">{summary.skipped} skipped</span>
          )}
          {summary.errors > 0 && (
            <span className="text-red-300">{summary.errors} failed</span>
          )}
          {summary.total - summary.sent - summary.skipped - summary.errors > 0 && (
            <span className="text-slate-400">
              {summary.total - summary.sent - summary.skipped - summary.errors} remaining
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
