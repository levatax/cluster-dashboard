"use client";

import { useTransition } from "react";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => startTransition(() => logoutAction())}
      disabled={isPending}
      title="Sign out"
    >
      <LogOut className="size-4" />
    </Button>
  );
}
