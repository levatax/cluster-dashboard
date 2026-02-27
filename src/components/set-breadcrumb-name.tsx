"use client";

import { useEffect } from "react";
import { useBreadcrumbName } from "@/hooks/use-breadcrumb-name";

export function SetBreadcrumbName({ name }: { name: string }) {
  const { setName } = useBreadcrumbName();
  useEffect(() => {
    setName(name);
    return () => setName("");
  }, [name, setName]);
  return null;
}
