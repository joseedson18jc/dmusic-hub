import {
  LayoutDashboard,
  Music,
  Users,
  CalendarDays,
  Briefcase,
  DollarSign,
  FileText,
  CheckSquare,
  Settings,
  LogOut,
  Bell,
  CreditCard,
  FileSignature,
  Calendar,
  Plug,
  User,
  ShieldCheck,
  ScrollText,
  Headphones,
  Building,
  UserCog,
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

const mainNav = [
  { title: 'Portal Manager', url: '/', icon: LayoutDashboard },
  { title: 'Pipeline', url: '/bookings', icon: Briefcase },
  { title: 'Calendário', url: '/agenda', icon: Calendar },
  { title: 'Eventos', url: '/eventos', icon: CalendarDays },
  { title: 'DJs', url: '/djs', icon: Music },
  { title: 'Produtores', url: '/produtores', icon: Users },
];

const financeNav = [
  { title: 'Financeiro', url: '/financeiro', icon: DollarSign },
  { title: 'Cobranças Stripe', url: '/cobrancas', icon: CreditCard },
  { title: 'Contratos', url: '/contratos', icon: FileSignature },
];

const operationalNav = [
  { title: 'Tarefas', url: '/tarefas', icon: CheckSquare },
  { title: 'Documentos', url: '/documentos', icon: FileText },
  { title: 'Notificações', url: '/notificacoes', icon: Bell },
];

const adminNav = [
  { title: 'Usuários', url: '/usuarios', icon: UserCog },
  { title: 'Integrações', url: '/integracoes', icon: Plug },
  { title: 'Configurações', url: '/configuracoes', icon: Settings },
  { title: 'Logs / Auditoria', url: '/logs', icon: ScrollText },
  { title: 'Audit Logs (avançado)', url: '/audit-logs', icon: ScrollText },
  { title: 'Integridade', url: '/integridade', icon: ShieldCheck },
];

const portalNav = [
  { title: 'Portal DJ', url: '/portal/dj', icon: Headphones },
  { title: 'Portal Produtor', url: '/portal/produtor', icon: Building },
];

type NavSection = {
  label: string;
  items: typeof mainNav;
};

const getSections = (isDJ: boolean): NavSection[] => {
  if (isDJ) {
    return [
      { label: 'Principal', items: [
        { title: 'Portal Manager', url: '/', icon: LayoutDashboard },
        { title: 'Calendário', url: '/agenda', icon: Calendar },
        { title: 'Eventos', url: '/eventos', icon: CalendarDays },
      ]},
      { label: 'Financeiro', items: [
        { title: 'Financeiro', url: '/financeiro', icon: DollarSign },
      ]},
      { label: 'Portais', items: [
        { title: 'Portal DJ', url: '/portal/dj', icon: Headphones },
      ]},
    ];
  }
  return [
    { label: 'Principal', items: mainNav },
    { label: 'Financeiro', items: financeNav },
    { label: 'Operacional', items: operationalNav },
    { label: 'Admin', items: adminNav },
    { label: 'Portais', items: portalNav },
  ];
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { signOut, user, roles, hasRole } = useAuth();
  const isDJ = roles.length > 0 && roles.every(r => r === 'dj');
  const sections = getSections(isDJ);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2.5">
          <img src={logoDmusic} alt="DMusic Hub" className="h-10 w-10 object-contain flex-shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <span className="heading-cyber block text-[15px] font-semibold text-sidebar-accent-foreground leading-tight">
                DMusic Hub
              </span>
              <p className="font-mono-cyber text-nano text-sidebar-foreground/60 tracking-[0.18em] uppercase mt-0.5">
                Neon Syndicate
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1">
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-micro uppercase tracking-[0.15em] text-sidebar-foreground/40 font-medium px-3">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
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
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive('/perfil')}>
              <NavLink
                to="/perfil"
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
