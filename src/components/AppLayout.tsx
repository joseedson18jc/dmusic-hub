import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Outlet, useLocation } from 'react-router-dom';
import { CommandSearch } from '@/components/CommandSearch';
import { Bell } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { AdminPalettePreviewToggle } from '@/components/AdminPalettePreviewToggle';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { BrandStrip, BrandFooter } from '@/components/BrandStrip';

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="sticky top-0 z-30">
            <header className="h-12 md:h-14 flex items-center justify-between border-b border-border/60 px-3 md:px-5 bg-background/85 backdrop-blur-xl">
              <div className="flex items-center gap-2 min-w-0">
                <SidebarTrigger />
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <CommandSearch />
                <AdminPalettePreviewToggle />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Abrir notificações"
                  title="Notificações"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => navigate('/notificacoes')}
                >
                  <Bell className="h-4 w-4" />
                </Button>
              </div>
            </header>
            <BrandStrip />
          </div>
          <main className="flex-1 overflow-auto pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0 flex flex-col">
            <div className="page-shell px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 flex-1">
              <AnimatePresence mode="wait">
                <PageTransition key={location.pathname}>
                  <Outlet />
                </PageTransition>
              </AnimatePresence>
            </div>
            <BrandFooter />
          </main>
          <MobileBottomNav />
        </div>
      </div>
    </SidebarProvider>
  );
}
