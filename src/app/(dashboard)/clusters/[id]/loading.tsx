import { Skeleton } from "@/components/ui/skeleton";

export default function ClusterLoading() {
  return (
    <div className="space-y-6">
      {/* Header: icon + name + server + delete button */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="ml-11 h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Tab bar */}
      <Skeleton className="h-10 w-full max-w-md" />

      {/* Resource usage gauges */}
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[160px] rounded-xl" />
        <Skeleton className="h-[160px] rounded-xl" />
      </div>

      {/* Health status cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-[140px] rounded-xl"
            style={{ animationDelay: `${i * 0.08}s` }}
          />
        ))}
      </div>

      {/* Quick stats row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-[70px] rounded-lg"
            style={{ animationDelay: `${i * 0.06}s` }}
          />
        ))}
      </div>

      {/* Cluster details card */}
      <Skeleton className="h-[240px] rounded-xl" />
    </div>
  );
}
