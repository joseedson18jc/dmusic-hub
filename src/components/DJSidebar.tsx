import {
  CalendarDays,
  CheckSquare,
  DollarSign,
  Headphones,
  LogOut,
  User,
  Calendar,
  Bell,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import logoDmusic from '@/assets/logo-dmusic-color.png';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const djNav = [
  { title: 'Meu Portal', url: '/dj', icon: Headphones },
  { title: 'Meus Eventos', url: '/dj/eventos', icon: CalendarDays },
  { title: 'Minha Agenda', url: '/dj/agenda', icon: Calendar },
  { title: 'Meu Financeiro', url: '/dj/financeiro', icon: DollarSign },
  { title: 'Minhas Tarefas', url: '/dj/tarefas', icon: CheckSquare },
  { title: 'Notificações', url: '/dj/notificacoes', icon: Bell },
];

export function DJSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { signOut, user } = useAuth();

  const isActive = (path: string) =>
    path === '/dj' ? location.pathname === '/dj' : location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2.5">
          <img src={logoDmusic} alt="DMusic Hub" className="h-10 w-10 object-contain flex-shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="heading-cyber text-[15px] font-semibold text-sidebar-accent-foreground leading-tight">
                DMusic Hub
              </h1>
              <p className="font-mono-cyber text-nano text-sidebar-foreground/60 tracking-[0.18em] uppercase mt-0.5">
                Portal DJ
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1">
        <SidebarGroup>
          <SidebarGroupLabel className="text-micro uppercase tracking-[0.15em] text-sidebar-foreground/40 font-medium px-3">
            Meu Espaço
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {djNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end={item.url === '/dj'}
                      className="hover:bg-sidebar-accent transition-colors duration-150"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive('/dj/perfil')}>
              <NavLink
                to="/dj/perfil"
                className="hover:bg-sidebar-accent transition-colors duration-150"
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              >
                <User className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span className="truncate">Meu Perfil</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!collapsed && user && (
          <p className="text-micro text-sidebar-foreground/50 truncate px-3 mt-1">
            {user.email}
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 mt-1"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
