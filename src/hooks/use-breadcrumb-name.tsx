"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const BreadcrumbNameContext = createContext<{
  name: string;
  setName: (name: string) => void;
}>({ name: "", setName: () => {} });

export function BreadcrumbNameProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState("");
  return (
    <BreadcrumbNameContext.Provider value={{ name, setName }}>
      {children}
    </BreadcrumbNameContext.Provider>
  );
}

export function useBreadcrumbName() {
  return useContext(BreadcrumbNameContext);
}
