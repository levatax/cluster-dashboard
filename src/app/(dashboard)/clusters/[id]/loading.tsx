import { Skeleton } from "@/components/ui/skeleton";

export default function ClusterLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <Skeleton className="h-10 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-28 rounded-xl"
            style={{ animationDelay: `${i * 0.08}s` }}
          />
        ))}
      </div>
    </div>
  );
}
