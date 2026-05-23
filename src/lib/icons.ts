/**
 * Registry canônico de ícones do D-Music Hub.
 * --------------------------------------------------------------
 * Cada conceito de domínio mapeia para UM único ícone Lucide.
 * Ao adicionar novas telas, importe daqui em vez de escolher um
 * ícone arbitrário — isso garante coerência visual em todo o app.
 *
 * Uso:
 *   import { Icon } from "@/components/ui/icon";
 *   import { AppIcons } from "@/lib/icons";
 *   <Icon icon={AppIcons.booking} />
 */
import {
  // Navegação / sistema
  LayoutDashboard,
  Settings,
  Bell,
  Search,
  Menu,
  LogOut,
  User,
  Users,
  // Domínio
  CalendarDays,
  Briefcase,
  Music2,
  Building2,
  FileText,
  Wallet,
  TrendingUp,
  CheckSquare,
  MessageCircle,
  Mail,
  Phone,
  MapPin,
  Plug,
  Sparkles,
  // Ações
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Check,
  Copy,
  Download,
  Upload,
  ExternalLink,
  RefreshCw,
  Filter,
  Eye,
  EyeOff,
  // Estados
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  XCircle,
  Loader2,
  Inbox,
  // Direção
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  // Misc
  CreditCard,
  Calendar,
  Clock,
  Star,
} from "lucide-react";

export const AppIcons = {
  // Navegação
  dashboard: LayoutDashboard,
  settings: Settings,
  notifications: Bell,
  search: Search,
  menu: Menu,
  logout: LogOut,

  // Entidades
  user: User,
  users: Users,
  dj: Music2,
  producer: Building2,
  booking: Briefcase,
  event: CalendarDays,
  document: FileText,
  finance: Wallet,
  analytics: TrendingUp,
  task: CheckSquare,
  whatsapp: MessageCircle,
  email: Mail,
  phone: Phone,
  location: MapPin,
  integration: Plug,
  ai: Sparkles,

  // Ações
  add: Plus,
  edit: Pencil,
  delete: Trash2,
  save: Save,
  close: X,
  confirm: Check,
  copy: Copy,
  download: Download,
  upload: Upload,
  externalLink: ExternalLink,
  refresh: RefreshCw,
  filter: Filter,
  show: Eye,
  hide: EyeOff,

  // Estados
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
  success: CheckCircle2,
  failure: XCircle,
  loading: Loader2,
  empty: Inbox,

  // Direção
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  back: ArrowLeft,
  forward: ArrowRight,

  // Misc
  payment: CreditCard,
  calendar: Calendar,
  clock: Clock,
  favorite: Star,
} as const;

export type AppIconName = keyof typeof AppIcons;