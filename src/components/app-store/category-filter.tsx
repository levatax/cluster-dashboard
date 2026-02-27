"use client";

import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, type CatalogCategory } from "@/lib/catalog/types";

interface CategoryFilterProps {
  categories: CatalogCategory[];
  selected: CatalogCategory | null;
  onSelect: (category: CatalogCategory | null) => void;
}

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "rounded-full px-3 py-1 text-xs font-medium transition-colors",
          selected === null
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat === selected ? null : cat)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            selected === cat
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {CATEGORY_LABELS[cat]}
        </button>
      ))}
    </div>
  );
}
