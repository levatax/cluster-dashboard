"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToCSV, exportToJSON } from "@/lib/export";
import type { ExportColumn } from "@/lib/export";

interface ExportDropdownProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ExportColumn<any>[];
  filename: string;
}

export function ExportDropdown({ data, columns, filename }: ExportDropdownProps) {
  if (data.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-1 size-3.5" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportToCSV(data, columns, filename)}>
          Export CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportToJSON(data, filename)}>
          Export JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
