import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AIChatbot } from "@/components/AIChatbot";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppLayout } from "@/components/AppLayout";
import { DJLayout } from "@/components/DJLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteFallback } from "@/components/RouteFallback";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";

// Lazy-loaded pages for code splitting
const Dashboard = lazy(() => import("@/pages/Index"));
const DJs = lazy(() => import("@/pages/DJs"));
const DJProfile = lazy(() => import("@/pages/DJProfile"));
const Produtores = lazy(() => import("@/pages/Produtores"));
const ProducerProfile = lazy(() => import("@/pages/ProducerProfile"));
const Bookings = lazy(() => import("@/pages/Bookings"));
const Agenda = lazy(() => import("@/pages/Agenda"));
const PortalDJ = lazy(() => import("@/pages/portal/PortalDJ"));
const PortalProducer = lazy(() => import("@/pages/portal/PortalProducer"));
const Eventos = lazy(() => import("@/pages/Eventos"));
const Financeiro = lazy(() => import("@/pages/Financeiro"));
const Cobrancas = lazy(() => import("@/pages/Cobrancas"));
const Contratos = lazy(() => import("@/pages/Contratos"));
const Documentos = lazy(() => import("@/pages/Documentos"));
const Tarefas = lazy(() => import("@/pages/Tarefas"));
const Notificacoes = lazy(() => import("@/pages/Notificacoes"));
const Integracoes = lazy(() => import("@/pages/Integracoes"));
const Usuarios = lazy(() => import("@/pages/Usuarios"));
const Configuracoes = lazy(() => import("@/pages/Configuracoes"));
const MeuPerfil = lazy(() => import("@/pages/MeuPerfil"));
const Logs = lazy(() => import("@/pages/Logs"));
const AuditLogs = lazy(() => import("@/pages/AuditLogs"));
const Integridade = lazy(() => import("@/pages/Integridade"));
const PreviewIdentidade = lazy(() => import("@/pages/PreviewIdentidade"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const AssinarContrato = lazy(() => import("@/pages/AssinarContrato"));

// DJ Portal pages
const DJEventos = lazy(() => import("@/pages/dj/DJEventos"));
const DJAgenda = lazy(() => import("@/pages/dj/DJAgenda"));
const DJFinanceiro = lazy(() => import("@/pages/dj/DJFinanceiro"));
const DJNotificacoes = lazy(() => import("@/pages/dj/DJNotificacoes"));
const DJTarefas = lazy(() => import("@/pages/dj/DJTarefas"));

// Sensible defaults so we don't refetch every time the window regains focus
// and don't hammer the API on every component remount. Pages that need
// fresher data can override per-query via `staleTime: 0`.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/assinar/:token" element={<AssinarContrato />} />

              {/* DJ Portal — dedicated layout */}
              <Route element={<ProtectedRoute><DJLayout /></ProtectedRoute>}>
                <Route path="/dj" element={<PortalDJ />} />
                <Route path="/dj/eventos" element={<DJEventos />} />
                <Route path="/dj/agenda" element={<DJAgenda />} />
                <Route path="/dj/financeiro" element={<DJFinanceiro />} />
                <Route path="/dj/tarefas" element={<DJTarefas />} />
                <Route path="/dj/notificacoes" element={<DJNotificacoes />} />
                <Route path="/dj/perfil" element={<MeuPerfil />} />
              </Route>

              {/* Manager layout */}
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/djs" element={<DJs />} />
                <Route path="/djs/:id" element={<DJProfile />} />
                <Route path="/produtores" element={<Produtores />} />
                <Route path="/produtores/:id" element={<ProducerProfile />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/eventos" element={<Eventos />} />
                <Route path="/financeiro" element={<Financeiro />} />
                <Route path="/cobrancas" element={<Cobrancas />} />
                <Route path="/contratos" element={<Contratos />} />
                <Route path="/documentos" element={<Documentos />} />
                <Route path="/tarefas" element={<Tarefas />} />
                <Route path="/notificacoes" element={<Notificacoes />} />
                <Route path="/integracoes" element={<Integracoes />} />
                <Route path="/usuarios" element={
                  <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                    <Usuarios />
                  </ProtectedRoute>
                } />
                <Route path="/configuracoes" element={
                  <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                    <Configuracoes />
                  </ProtectedRoute>
                } />
                <Route path="/perfil" element={<MeuPerfil />} />
                <Route path="/logs" element={
                  <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                    <Logs />
                  </ProtectedRoute>
                } />
                <Route path="/audit-logs" element={
                  <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                    <AuditLogs />
                  </ProtectedRoute>
                } />
                <Route path="/integridade" element={
                  <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                    <Integridade />
                  </ProtectedRoute>
                } />
                <Route path="/preview-identidade" element={
                  <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                    <PreviewIdentidade />
                  </ProtectedRoute>
                } />
                <Route path="/portal/dj" element={<PortalDJ />} />
                <Route path="/portal/produtor" element={<PortalProducer />} />
              </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <AIChatbot />
          </AuthProvider>
        </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
