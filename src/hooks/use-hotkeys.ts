"use client";

import { useEffect, useCallback } from "react";

type ModifierKey = "meta" | "ctrl" | "shift" | "alt";

interface HotkeyOptions {
  /** Key to listen for (e.g. "k", "1", "r") */
  key: string;
  /** Modifier keys required */
  modifiers?: ModifierKey[];
  /** Callback to run when hotkey is pressed */
  callback: (e: KeyboardEvent) => void;
  /** Whether the hotkey is enabled (default: true) */
  enabled?: boolean;
}

function matchesModifiers(e: KeyboardEvent, modifiers: ModifierKey[] = []): boolean {
  const meta = modifiers.includes("meta");
  const ctrl = modifiers.includes("ctrl");
  const shift = modifiers.includes("shift");
  const alt = modifiers.includes("alt");

  // For "meta" or "ctrl", accept either (cross-platform)
  const cmdOrCtrl = meta || ctrl;
  const hasCmdOrCtrl = e.metaKey || e.ctrlKey;

  if (cmdOrCtrl && !hasCmdOrCtrl) return false;
  if (!cmdOrCtrl && (e.metaKey || e.ctrlKey)) return false;
  if (shift !== e.shiftKey) return false;
  if (alt !== e.altKey) return false;

  return true;
}

function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target.isContentEditable
  );
}

/**
 * Register a single keyboard shortcut.
 */
export function useHotkey(options: HotkeyOptions) {
  const { key, modifiers, callback, enabled = true } = options;

  const handler = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in input fields,
      // unless a modifier key (Cmd/Ctrl) is held
      const hasModifier = modifiers && modifiers.length > 0;
      if (!hasModifier && isInputElement(e.target)) return;

      if (e.key.toLowerCase() !== key.toLowerCase()) return;
      if (!matchesModifiers(e, modifiers)) return;

      e.preventDefault();
      callback(e);
    },
    [key, modifiers, callback, enabled]
  );

  useEffect(() => {
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handler]);
}

/**
 * Register multiple keyboard shortcuts at once.
 */
export function useHotkeys(hotkeys: HotkeyOptions[]) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      for (const hk of hotkeys) {
        if (hk.enabled === false) continue;

        const hasModifier = hk.modifiers && hk.modifiers.length > 0;
        if (!hasModifier && isInputElement(e.target)) continue;

        if (e.key.toLowerCase() !== hk.key.toLowerCase()) continue;
        if (!matchesModifiers(e, hk.modifiers)) continue;

        e.preventDefault();
        hk.callback(e);
        return;
      }
    },
    [hotkeys]
  );

  useEffect(() => {
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handler]);
}
