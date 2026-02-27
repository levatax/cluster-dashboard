import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { BreadcrumbNameProvider } from "@/hooks/use-breadcrumb-name";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { LogoutButton } from "@/components/logout-button";
import { CommandPalette } from "@/components/command-palette";
import { ClusterSidebarProvider } from "@/hooks/use-cluster-sidebar";
import { getAllClusters } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clusters = await getAllClusters();
  const clusterList = clusters.map(({ id, name }) => ({ id, name }));

  return (
    <BreadcrumbNameProvider>
      <ClusterSidebarProvider>
        <SidebarProvider>
          <AppSidebar clusters={clusterList} />
          <SidebarInset>
            <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur-sm">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="min-w-0 flex-1">
                <BreadcrumbNav />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
                  <span className="text-xs">&#8984;</span>K
                </kbd>
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
  );
}
