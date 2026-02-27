import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ClusterNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <h2 className="mb-2 text-2xl font-bold">Cluster Not Found</h2>
      <p className="text-muted-foreground mb-6">
        The cluster you&apos;re looking for doesn&apos;t exist or has been deleted.
      </p>
      <Button asChild>
        <Link href="/">Back to Home</Link>
      </Button>
    </div>
  );
}
