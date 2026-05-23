import { LayoutDashboard, Briefcase, Calendar, DollarSign, Menu } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/components/ui/sidebar';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

/**
 * Bottom-tab bar fixa para mobile (<768px).
 * Mostra 4 atalhos principais + botão "Mais" que abre a sidebar drawer.
 * Visível só em telas pequenas (md:hidden) e quando há usuário logado.
 */
export function MobileBottomNav() {
  const { user, roles } = useAuth();
  const { setOpenMobile } = useSidebar();
  const location = useLocation();

  if (!user) return null;

  const isDJ = roles.length > 0 && roles.every((r) => r === 'dj');

  const tabs = isDJ
    ? [
        { to: '/', label: 'Início', icon: LayoutDashboard, end: true },
        { to: '/agenda', label: 'Agenda', icon: Calendar },
        { to: '/eventos', label: 'Eventos', icon: Briefcase },
        { to: '/financeiro', label: 'Financeiro', icon: DollarSign },
      ]
    : [
        { to: '/', label: 'Início', icon: LayoutDashboard, end: true },
        { to: '/bookings', label: 'Pipeline', icon: Briefcase },
        { to: '/agenda', label: 'Agenda', icon: Calendar },
        { to: '/financeiro', label: 'Financeiro', icon: DollarSign },
      ];

  const isActive = (to: string, end?: boolean) =>
    end ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <nav
      aria-label="Navegação principal mobile"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/70 safe-bottom shadow-[0_-4px_20px_-8px_hsl(var(--background))]"
    >
      <ul className="grid grid-cols-5 h-14 max-w-screen-sm mx-auto">
        {tabs.map((tab) => {
          const active = isActive(tab.to, tab.end);
          const TabIcon = tab.icon;
          return (
            <li key={tab.to} className="flex">
              <NavLink
                to={tab.to}
                end={tab.end}
                aria-label={tab.label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 w-full min-h-[44px] text-micro font-medium tracking-tight transition-colors relative',
                  active
                    ? 'text-primary after:content-[""] after:absolute after:top-0 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:w-8 after:bg-primary after:rounded-b-full'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon icon={TabIcon} size="md" bold={active} />
                <span className="leading-none">{tab.label}</span>
              </NavLink>
            </li>
          );
        })}
        <li className="flex">
          <button
            type="button"
            onClick={() => setOpenMobile(true)}
            aria-label="Abrir menu completo"
            className="flex flex-col items-center justify-center gap-1 w-full min-h-[44px] text-micro font-medium tracking-tight text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon icon={Menu} size="md" />
            <span className="leading-none">Mais</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}