"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBreadcrumbName } from "@/hooks/use-breadcrumb-name";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function BreadcrumbNav() {
  const pathname = usePathname();
  const { name } = useBreadcrumbName();

  // Match /clusters/[id]
  const isClusterDetail = /^\/clusters\/\d+$/.test(pathname);

  if (!isClusterDetail) {
    return <BreadcrumbPage className="text-sm font-medium">K8s Dashboard</BreadcrumbPage>;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Clusters</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{name || "..."}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
