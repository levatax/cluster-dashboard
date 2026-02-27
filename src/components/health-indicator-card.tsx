"use client";

import type { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface HealthIndicatorCardProps {
  title: string;
  value: string;
  subtitle?: string;
  percent?: number | null;
  color?: "green" | "yellow" | "red" | "default";
  icon?: LucideIcon;
}

const colorMap = {
  green:   { bar: "from-emerald-500/80 to-emerald-400", topBorder: "border-t-emerald-500/40",   iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600 dark:text-emerald-400" },
  yellow:  { bar: "from-amber-500/80 to-yellow-400",    topBorder: "border-t-amber-500/40",    iconBg: "bg-amber-500/10",   iconColor: "text-amber-600 dark:text-amber-400" },
  red:     { bar: "from-red-500/80 to-rose-400",        topBorder: "border-t-red-500/40",      iconBg: "bg-red-500/10",     iconColor: "text-red-600 dark:text-red-400" },
  default: { bar: "from-[var(--gradient-from)] to-[var(--gradient-to)]", topBorder: "border-t-primary/30", iconBg: "bg-primary/10", iconColor: "text-primary" },
};

export function HealthIndicatorCard({
  title,
  value,
  subtitle,
  percent,
  color = "default",
  icon: Icon,
}: HealthIndicatorCardProps) {
  const colors = colorMap[color];

  return (
    <Card className={`relative overflow-hidden border-t-2 transition-shadow hover:shadow-sm ${colors.topBorder}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className={`flex size-7 items-center justify-center rounded-md ${colors.iconBg}`}>
              <Icon className={`size-3.5 ${colors.iconColor}`} />
            </div>
          )}
          <CardTitle className="text-muted-foreground text-sm font-medium">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {subtitle && (
          <p className="text-muted-foreground text-xs">{subtitle}</p>
        )}
        {percent != null && (
          <div className="space-y-1">
            <div className="bg-secondary h-1.5 w-full overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full bg-gradient-to-r transition-all ${colors.bar}`}
                style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
              />
            </div>
            <p className="text-muted-foreground text-xs text-right">
              {percent.toFixed(1)}%
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
