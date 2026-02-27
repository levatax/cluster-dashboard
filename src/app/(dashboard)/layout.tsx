import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar";
import { ConditionalSidebarTrigger } from "@/components/conditional-sidebar-trigger";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { BreadcrumbNameProvider } from "@/hooks/use-breadcrumb-name";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { LogoutButton } from "@/components/logout-button";
import { CommandPalette } from "@/components/command-palette";
import { KeyboardShortcutHint } from "@/components/keyboard-shortcut-hint";
import { ClusterSidebarProvider } from "@/hooks/use-cluster-sidebar";
import { SessionProvider } from "@/components/session-provider";
import { getAllClusters } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clusters = await getAllClusters();
  const clusterList = clusters.map(({ id, name }) => ({ id, name }));

  return (
    <SessionProvider>
      <BreadcrumbNameProvider>
        <ClusterSidebarProvider>
          <SidebarProvider>
            <AppSidebar clusters={clusterList} />
            <SidebarInset>
              <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur-sm">
                <ConditionalSidebarTrigger />
                <div className="min-w-0 flex-1">
                  <BreadcrumbNav />
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <KeyboardShortcutHint />
                  <LogoutButton />
                  <Separator orientation="vertical" className="h-4" />
                  <ThemeToggle />
                </div>
              </header>
              <main className="flex-1 overflow-auto p-6">
                {children}
              </main>
            </SidebarInset>
            <CommandPalette clusters={clusterList} />
          </SidebarProvider>
        </ClusterSidebarProvider>
      </BreadcrumbNameProvider>
    </SessionProvider>
  );
}
