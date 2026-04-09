interface SkeletonCardProps {
  className?: string;
  rows?: number;
}

// Fixed bar heights for SkeletonChart — avoids calling Math.random() inside
// the render function, which produces a different value on every render and
// triggers React's StrictMode purity check to flag the component as impure,
// causing extra reconciliation work.
const SKELETON_BAR_HEIGHTS = [45, 70, 55, 90, 60, 80, 40, 75];

export function SkeletonCard({ className = '', rows = 3 }: SkeletonCardProps) {
  return (
    <div
      className={`glass rounded-2xl p-5 ${className}`}
    >
      <div className="skeleton-pulse space-y-3">
        <div className="h-4 bg-white/10 rounded-lg w-2/3" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-3 bg-white/5 rounded-lg" style={{ width: `${60 + i * 10}%` }} />
        ))}
        <div className="h-20 bg-white/5 rounded-xl mt-4" />
      </div>
    </div>
  );
}

export function SkeletonChart({ className = '' }: { className?: string }) {
  return (
    <div className={`glass rounded-2xl p-5 ${className}`}>
      <div className="skeleton-pulse space-y-3">
        <div className="h-4 bg-white/10 rounded-lg w-1/3" />
        <div className="h-3 bg-white/5 rounded-lg w-1/4" />
        <div className="h-48 bg-white/5 rounded-xl mt-4 flex items-end gap-2 p-3">
          {SKELETON_BAR_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-white/10 rounded-t"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonKPI({ className = '' }: { className?: string }) {
  return (
    <div className={`glass rounded-2xl p-5 ${className}`}>
      <div className="skeleton-pulse space-y-3">
        <div className="flex justify-between">
          <div className="h-3 bg-white/5 rounded-lg w-1/3" />
          <div className="h-8 w-8 bg-white/10 rounded-lg" />
        </div>
        <div className="h-8 bg-white/10 rounded-lg w-1/2" />
        <div className="h-3 bg-white/5 rounded-lg w-2/3" />
      </div>
    </div>
  );
}
