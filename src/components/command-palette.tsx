"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Home,
  Server,
  RefreshCw,
  Sun,
  Moon,
  Monitor,
  PanelLeftIcon,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "@/components/ui/command";
import { useSidebar } from "@/components/ui/sidebar";

interface CommandPaletteProps {
  clusters?: { id: string; name: string }[];
}

export function CommandPalette({ clusters = [] }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();
  const { toggleSidebar } = useSidebar();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function runCommand(command: () => void) {
    setOpen(false);
    command();
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} showCloseButton={false}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
            <Home className="size-4" />
            <span>Go Home</span>
            <CommandShortcut>H</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        {clusters.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Clusters">
              {clusters.map((cluster) => (
                <CommandItem
                  key={cluster.id}
                  onSelect={() =>
                    runCommand(() => router.push(`/clusters/${cluster.id}`))
                  }
                >
                  <Server className="size-4" />
                  <span>{cluster.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => runCommand(() => router.refresh())}
          >
            <RefreshCw className="size-4" />
            <span>Refresh Page</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(toggleSidebar)}
          >
            <PanelLeftIcon className="size-4" />
            <span>Toggle Sidebar</span>
            <CommandShortcut>Ctrl+B</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
            <Sun className="size-4" />
            <span>Light Theme</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
            <Moon className="size-4" />
            <span>Dark Theme</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
            <Monitor className="size-4" />
            <span>System Theme</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
