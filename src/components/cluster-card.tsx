"use client";

import Link from "next/link";
import { MoreVertical, Trash2, Server } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "motion/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { removeCluster } from "@/app/actions/clusters";

interface ClusterCardProps {
  id: string;
  name: string;
  server: string;
  createdAt: string;
}

export function ClusterCard({ id, name, server, createdAt }: ClusterCardProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    const result = await removeCluster(id);
    if (result.success) {
      toast.success("Cluster deleted");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }

  return (
    <Link href={`/clusters/${id}`}>
      <motion.div
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="group relative overflow-hidden border transition-all hover:shadow-lg hover:shadow-primary/5">
          {/* Always-visible gradient top bar */}
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[var(--gradient-from)] via-primary to-[var(--gradient-to)]" />

          <CardHeader className="flex flex-row items-start gap-3 space-y-0 pt-5">
            {/* Icon chip */}
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--gradient-from)]/15 to-[var(--gradient-to)]/15 ring-1 ring-primary/20">
              <Server className="size-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <CardTitle className="text-sm font-semibold leading-tight">{name}</CardTitle>
              <CardDescription className="font-mono text-[11px] truncate">{server}</CardDescription>
            </div>
            {/* Dropdown — hidden until hover */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                <Button variant="ghost" size="sm" className="size-7 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100">
                  <MoreVertical className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={loading}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground/60 text-[11px]">
              Added {new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}
