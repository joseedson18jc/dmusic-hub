import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { DJSidebar } from '@/components/DJSidebar';
import { CommandSearch } from '@/components/CommandSearch';
import { BrandStrip, BrandFooter } from '@/components/BrandStrip';

export function DJLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DJSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="sticky top-0 z-30">
            <header className="h-14 flex items-center justify-between border-b border-border/40 px-4 bg-background/80 backdrop-blur-sm">
              <SidebarTrigger className="text-muted-foreground" />
              <CommandSearch />
            </header>
            <BrandStrip />
          </div>
          <main className="flex-1 overflow-y-auto flex flex-col">
            <div className="flex-1 p-6">
              <Outlet />
            </div>
            <BrandFooter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
