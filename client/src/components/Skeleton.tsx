/**
 * Skeleton placeholders — used while data is loading.
 * Provides smoother UX than spinner alone.
 */
import { motion } from "framer-motion";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <motion.div
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      className={`bg-white/5 rounded ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card rounded-xl p-5 space-y-3">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="glass-card rounded-xl p-4 space-y-2">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="glass-card rounded-xl p-5 space-y-2">
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}

export function SkeletonChart({ height = 200 }: { height?: number }) {
  return (
    <div className="glass-card rounded-xl p-5">
      <Skeleton className="h-3 w-1/4 mb-3" />
      <Skeleton className="w-full" style={{ height: `${height}px` }} />
    </div>
  );
}