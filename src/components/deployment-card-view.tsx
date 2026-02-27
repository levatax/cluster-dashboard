"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Box,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { DeploymentInfo } from "@/lib/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

function getDeploymentHealth(dep: DeploymentInfo): string {
  const [ready, desired] = dep.ready.split("/").map(Number);
  if (ready === desired && desired > 0) return "Healthy";
  const progressing = dep.conditions.find((c) => c.type === "Progressing");
  if (progressing?.status === "True") return "Progressing";
  return "Degraded";
}

const healthConfig: Record<string, { color: string; Icon: typeof CheckCircle2 }> = {
  Healthy: {
    color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    Icon: CheckCircle2,
  },
  Progressing: {
    color: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    Icon: Loader2,
  },
  Degraded: {
    color: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
    Icon: AlertCircle,
  },
};

const STORAGE_KEY = "deployment-namespace-order";

interface DeploymentCardProps {
  deployment: DeploymentInfo & { health: string };
  index: number;
  onSelect: (deployment: DeploymentInfo) => void;
}

function DeploymentCard({ deployment, index, onSelect }: DeploymentCardProps) {
  const config = healthConfig[deployment.health] || healthConfig.Degraded;
  const Icon = config.Icon;
  const [ready, desired] = deployment.ready.split("/").map(Number);
  const isFullyReady = ready === desired && desired > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03, ease }}
    >
      <Card
        className="group cursor-pointer border transition-all hover:shadow-md hover:shadow-primary/5"
        onClick={() => onSelect(deployment)}
      >
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-start gap-3">
            <div
              className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                isFullyReady
                  ? "bg-emerald-500/10"
                  : deployment.health === "Progressing"
                  ? "bg-yellow-500/10"
                  : "bg-red-500/10"
              }`}
            >
              <Box
                className={`size-4 ${
                  isFullyReady
                    ? "text-emerald-600 dark:text-emerald-400"
                    : deployment.health === "Progressing"
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-sm font-semibold">
                {deployment.name}
              </CardTitle>
              <p className="text-muted-foreground text-xs">{deployment.age}</p>
            </div>
            <Badge variant="outline" className={config.color}>
              <Icon
                className={`mr-1 size-3 ${
                  deployment.health === "Progressing" ? "animate-spin" : ""
                }`}
              />
              {deployment.health}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-4 px-4">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-muted-foreground">Ready: </span>
                <span className="font-medium">{deployment.ready}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Up-to-date: </span>
                <span className="font-medium">{deployment.upToDate}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Available: </span>
                <span className="font-medium">{deployment.available}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface NamespaceGroupProps {
  namespace: string;
  deployments: (DeploymentInfo & { health: string })[];
  onSelect: (deployment: DeploymentInfo) => void;
  defaultOpen?: boolean;
}

function SortableNamespaceGroup({
  namespace,
  deployments,
  onSelect,
  defaultOpen = true,
}: NamespaceGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: namespace });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const healthySummary = useMemo(() => {
    const healthy = deployments.filter((d) => d.health === "Healthy").length;
    const total = deployments.length;
    return { healthy, total };
  }, [deployments]);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-card ${isDragging ? "opacity-50 shadow-lg" : ""}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease }}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <button
            className="flex size-6 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted/50 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-auto p-1">
              {isOpen ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <div className="flex-1 font-medium">{namespace}</div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                healthySummary.healthy === healthySummary.total
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : healthySummary.healthy === 0
                  ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
                  : "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
              }
            >
              {healthySummary.healthy}/{healthySummary.total} healthy
            </Badge>
          </div>
        </div>
        <CollapsibleContent>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {deployments.map((dep, i) => (
              <DeploymentCard
                key={`${dep.namespace}/${dep.name}`}
                deployment={dep}
                index={i}
                onSelect={onSelect}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}

interface DeploymentCardViewProps {
  deployments: DeploymentInfo[];
  onSelect: (deployment: DeploymentInfo) => void;
  clusterId: string;
}

export function DeploymentCardView({
  deployments,
  onSelect,
  clusterId,
}: DeploymentCardViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Process deployments with health status
  const deploymentsWithHealth = useMemo(
    () => deployments.map((d) => ({ ...d, health: getDeploymentHealth(d) })),
    [deployments]
  );

  // Get all unique namespaces from deployments
  const allNamespaces = useMemo(() => {
    return [...new Set(deploymentsWithHealth.map((d) => d.namespace))].sort();
  }, [deploymentsWithHealth]);

  // State for namespace order (persisted)
  const [namespaceOrder, setNamespaceOrder] = useState<string[]>([]);

  // Load saved order from localStorage on mount
  useEffect(() => {
    const storageKey = `${STORAGE_KEY}-${clusterId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[];
        // Merge saved order with current namespaces (handle new/removed namespaces)
        const validSaved = parsed.filter((ns) => allNamespaces.includes(ns));
        const newNamespaces = allNamespaces.filter((ns) => !validSaved.includes(ns));
        setNamespaceOrder([...validSaved, ...newNamespaces]);
      } catch {
        setNamespaceOrder(allNamespaces);
      }
    } else {
      setNamespaceOrder(allNamespaces);
    }
  }, [allNamespaces, clusterId]);

  // Save order to localStorage when it changes
  const saveOrder = useCallback(
    (order: string[]) => {
      const storageKey = `${STORAGE_KEY}-${clusterId}`;
      localStorage.setItem(storageKey, JSON.stringify(order));
    },
    [clusterId]
  );

  // Group deployments by namespace
  const groupedDeployments = useMemo(() => {
    const groups: Record<string, (DeploymentInfo & { health: string })[]> = {};
    for (const dep of deploymentsWithHealth) {
      if (!groups[dep.namespace]) {
        groups[dep.namespace] = [];
      }
      groups[dep.namespace].push(dep);
    }
    return groups;
  }, [deploymentsWithHealth]);

  // Get ordered namespaces (only those that have deployments)
  const orderedNamespaces = useMemo(() => {
    return namespaceOrder.filter((ns) => groupedDeployments[ns]?.length > 0);
  }, [namespaceOrder, groupedDeployments]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setNamespaceOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        saveOrder(newOrder);
        return newOrder;
      });
    }
  }

  if (deployments.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center">
        No deployments found.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {deployments.length} deployment{deployments.length !== 1 ? "s" : ""} across{" "}
          {orderedNamespaces.length} namespace{orderedNamespaces.length !== 1 ? "s" : ""}
        </p>
        <p className="text-muted-foreground text-xs">
          Drag to reorder namespaces
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedNamespaces}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {orderedNamespaces.map((namespace) => (
              <SortableNamespaceGroup
                key={namespace}
                namespace={namespace}
                deployments={groupedDeployments[namespace]}
                onSelect={onSelect}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
