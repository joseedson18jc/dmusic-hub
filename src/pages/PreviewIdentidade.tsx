import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icon } from '@/components/ui/icon';
import { AppIcons } from '@/lib/icons';

/**
 * Preview Identidade Visual
 * --------------------------------------------------------------
 * Página interna (admin) para validar tokens, tipografia, ícones,
 * componentes de formulário, tabelas, modais e toasts antes de
 * publicar mudanças visuais.
 *
 * Acesso: /preview-identidade
 */
export default function PreviewIdentidade() {
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    const prev = document.title;
    document.title = 'Preview Identidade Visual | D-Music Hub';
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const prevDesc = meta?.content ?? '';
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = 'Validação interna de tipografia, formulários, tabelas, modais e toasts.';
    return () => {
      document.title = prev;
      if (meta) meta.content = prevDesc;
    };
  }, []);

  return (
    <>
      <div className="container mx-auto px-4 py-8 space-y-10 max-w-6xl">
        {/* Cabeçalho */}
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <Icon icon={AppIcons.ai} size="lg" className="text-primary" />
            <Badge variant="outline" className="border-primary/40 text-primary">Interno · QA Visual</Badge>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Preview · Identidade Visual</h1>
          <p className="text-muted-foreground max-w-2xl">
            Página de validação dos tokens, tipografia, ícones e componentes do design system
            <span className="text-foreground"> Neon Syndicate</span>. Use antes de publicar para garantir coerência.
          </p>
        </header>

        {/* Paleta de cores */}
        <Section title="Paleta de cores" description="Tokens semânticos do tema (HSL via CSS variables).">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { name: 'background', class: 'bg-background border-border' },
              { name: 'foreground', class: 'bg-foreground text-background' },
              { name: 'primary', class: 'bg-primary text-primary-foreground' },
              { name: 'secondary', class: 'bg-secondary text-secondary-foreground' },
              { name: 'muted', class: 'bg-muted text-muted-foreground' },
              { name: 'accent', class: 'bg-accent text-accent-foreground' },
              { name: 'card', class: 'bg-card text-card-foreground border-border' },
              { name: 'popover', class: 'bg-popover text-popover-foreground border-border' },
              { name: 'destructive', class: 'bg-destructive text-destructive-foreground' },
              { name: 'border', class: 'bg-border' },
              { name: 'input', class: 'bg-input' },
              { name: 'ring', class: 'bg-ring' },
            ].map((c) => (
              <div key={c.name} className={`rounded-lg border p-4 h-20 flex items-end text-xs font-mono ${c.class}`}>
                {c.name}
              </div>
            ))}
          </div>
        </Section>

        {/* Tipografia */}
        <Section title="Tipografia" description="Hierarquia tipográfica usando Space Grotesk (display) e Plus Jakarta Sans (body).">
          <div className="space-y-4 rounded-lg border border-border bg-card p-6">
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1">h1 · text-4xl font-bold</p>
              <h1 className="text-4xl font-bold tracking-tight">Neon Syndicate</h1>
            </div>
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1">h2 · text-3xl font-semibold</p>
              <h2 className="text-3xl font-semibold tracking-tight">Cabeçalho secundário</h2>
            </div>
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1">h3 · text-2xl font-semibold</p>
              <h3 className="text-2xl font-semibold">Seção interna</h3>
            </div>
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1">h4 · text-xl font-medium</p>
              <h4 className="text-xl font-medium">Subtítulo</h4>
            </div>
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1">body · text-base</p>
              <p className="text-base">
                O quick brown fox pula sobre o cão preguiçoso. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              </p>
            </div>
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1">small · text-sm text-muted-foreground</p>
              <p className="text-sm text-muted-foreground">Texto secundário em escala menor para metadados.</p>
            </div>
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1">code · font-mono</p>
              <code className="font-mono text-sm bg-muted px-2 py-1 rounded">const neon = '#05050A';</code>
            </div>
          </div>
        </Section>

        {/* Ícones */}
        <Section title="Ícones" description="Sistema canônico — wrapper <Icon> com tokens xs/sm/md/lg/xl/2xl, stroke 1.75 (bold 2.25).">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Tamanhos</CardTitle></CardHeader>
              <CardContent className="flex items-end gap-4 text-primary">
                <div className="flex flex-col items-center gap-1"><Icon icon={AppIcons.booking} size="xs" /><span className="text-micro text-muted-foreground">xs</span></div>
                <div className="flex flex-col items-center gap-1"><Icon icon={AppIcons.booking} size="sm" /><span className="text-micro text-muted-foreground">sm</span></div>
                <div className="flex flex-col items-center gap-1"><Icon icon={AppIcons.booking} size="md" /><span className="text-micro text-muted-foreground">md</span></div>
                <div className="flex flex-col items-center gap-1"><Icon icon={AppIcons.booking} size="lg" /><span className="text-micro text-muted-foreground">lg</span></div>
                <div className="flex flex-col items-center gap-1"><Icon icon={AppIcons.booking} size="xl" /><span className="text-micro text-muted-foreground">xl</span></div>
                <div className="flex flex-col items-center gap-1"><Icon icon={AppIcons.booking} size="2xl" /><span className="text-micro text-muted-foreground">2xl</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Stroke</CardTitle></CardHeader>
              <CardContent className="flex items-center gap-6 text-primary">
                <div className="flex flex-col items-center gap-1"><Icon icon={AppIcons.dj} size="xl" /><span className="text-micro text-muted-foreground">1.75</span></div>
                <div className="flex flex-col items-center gap-1"><Icon icon={AppIcons.dj} size="xl" bold /><span className="text-micro text-muted-foreground">2.25 (bold)</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Domínio (AppIcons)</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-6 gap-3 text-foreground">
                {(['booking', 'dj', 'producer', 'finance', 'event', 'task', 'document', 'whatsapp', 'email', 'integration', 'analytics', 'ai'] as const).map((k) => (
                  <div key={k} className="flex flex-col items-center gap-1" title={k}>
                    <Icon icon={AppIcons[k]} size="md" />
                    <span className="text-nano text-muted-foreground truncate">{k}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* Botões e badges */}
        <Section title="Botões & Badges" description="Variantes do design system.">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button variant="destructive">Destructive</Button>
              <Button disabled>Disabled</Button>
              <Button><Icon icon={AppIcons.add} size="sm" className="mr-2" />Com ícone</Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" aria-label="Icon"><Icon icon={AppIcons.settings} size="md" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge className="bg-primary/15 text-primary border-primary/30 border">Custom neon</Badge>
            </div>
          </div>
        </Section>

        {/* Forms */}
        <Section title="Formulários" description="Inputs, selects, textareas, switches, checkboxes, radios e sliders.">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Campos básicos</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pv-name">Nome</Label>
                  <Input id="pv-name" placeholder="Ex.: DJ Neon" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pv-email">E-mail</Label>
                  <Input id="pv-email" type="email" placeholder="email@dominio.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pv-bio">Bio</Label>
                  <Textarea id="pv-bio" placeholder="Conte um pouco..." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pv-genre">Estilo</Label>
                  <Select>
                    <SelectTrigger id="pv-genre"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="techno">Techno</SelectItem>
                      <SelectItem value="trance">Trance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Controles</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pv-switch">Notificações por e-mail</Label>
                  <Switch id="pv-switch" defaultChecked />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="pv-cb" defaultChecked />
                  <Label htmlFor="pv-cb">Aceito os termos</Label>
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <RadioGroup defaultValue="alta" className="flex gap-4">
                    <div className="flex items-center gap-2"><RadioGroupItem value="baixa" id="pv-r1" /><Label htmlFor="pv-r1">Baixa</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="media" id="pv-r2" /><Label htmlFor="pv-r2">Média</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="alta" id="pv-r3" /><Label htmlFor="pv-r3">Alta</Label></div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>Cachê (R$)</Label>
                  <Slider defaultValue={[3500]} min={0} max={10000} step={100} />
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* Alertas */}
        <Section title="Alertas" description="Mensagens inline.">
          <div className="grid md:grid-cols-2 gap-4">
            <Alert>
              <Icon icon={AppIcons.info} size="md" />
              <AlertTitle>Informação</AlertTitle>
              <AlertDescription>Tudo certo com o sistema. Última sincronização há 2 minutos.</AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <Icon icon={AppIcons.warning} size="md" />
              <AlertTitle>Atenção</AlertTitle>
              <AlertDescription>Há 3 contratos pendentes de assinatura.</AlertDescription>
            </Alert>
          </div>
        </Section>

        {/* Tabelas */}
        <Section title="Tabelas" description="Listagens densas com badges de status.">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>DJ</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Cachê</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { evento: 'Festival Pulse', dj: 'DJ Neon', data: '12/06/2026', cache: 'R$ 8.000', status: 'Confirmado', variant: 'default' as const },
                    { evento: 'Club Matrix', dj: 'DJ Synth', data: '20/06/2026', cache: 'R$ 3.500', status: 'Pendente', variant: 'secondary' as const },
                    { evento: 'Open Air', dj: 'DJ Vox', data: '05/07/2026', cache: 'R$ 12.000', status: 'Cancelado', variant: 'destructive' as const },
                  ].map((row) => (
                    <TableRow key={row.evento}>
                      <TableCell className="font-medium">{row.evento}</TableCell>
                      <TableCell>{row.dj}</TableCell>
                      <TableCell>{row.data}</TableCell>
                      <TableCell className="text-right font-mono">{row.cache}</TableCell>
                      <TableCell><Badge variant={row.variant}>{row.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Section>

        {/* Tabs */}
        <Section title="Tabs" description="Navegação interna.">
          <Tabs defaultValue="t1" className="w-full">
            <TabsList>
              <TabsTrigger value="t1">Visão geral</TabsTrigger>
              <TabsTrigger value="t2">Detalhes</TabsTrigger>
              <TabsTrigger value="t3">Histórico</TabsTrigger>
            </TabsList>
            <TabsContent value="t1" className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">Conteúdo da aba 1.</TabsContent>
            <TabsContent value="t2" className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">Conteúdo da aba 2.</TabsContent>
            <TabsContent value="t3" className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">Conteúdo da aba 3.</TabsContent>
          </Tabs>
        </Section>

        {/* Modais */}
        <Section title="Modais" description="Dialog de formulário e AlertDialog de confirmação destrutiva.">
          <div className="flex flex-wrap gap-3">
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button variant="outline"><Icon icon={AppIcons.edit} size="sm" className="mr-2" />Abrir Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar booking</DialogTitle>
                  <DialogDescription>Ajuste os detalhes e salve.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-2"><Label htmlFor="pv-d-name">Nome</Label><Input id="pv-d-name" defaultValue="Festival Pulse" /></div>
                  <div className="space-y-2"><Label htmlFor="pv-d-cache">Cachê</Label><Input id="pv-d-cache" type="number" defaultValue={8000} /></div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpenDialog(false)}>Cancelar</Button>
                  <Button onClick={() => { setOpenDialog(false); toast.success('Booking atualizado'); }}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive"><Icon icon={AppIcons.delete} size="sm" className="mr-2" />Excluir registro</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação aplica soft delete e pode ser revertida via Audit Logs.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => toast.success('Registro arquivado')}>Confirmar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Section>

        {/* Toasts */}
        <Section title="Toasts (Sonner)" description="Notificações flutuantes.">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => toast('Evento criado', { description: 'Festival Pulse · 12/06/2026' })}>
              Default
            </Button>
            <Button variant="outline" onClick={() => toast.success('Operação concluída com sucesso')}>
              Success
            </Button>
            <Button variant="outline" onClick={() => toast.error('Falha ao salvar. Tente novamente.')}>
              Error
            </Button>
            <Button variant="outline" onClick={() => toast.warning('Conexão instável detectada')}>
              Warning
            </Button>
            <Button variant="outline" onClick={() => toast.info('Sincronização agendada para 23h')}>
              Info
            </Button>
            <Button variant="outline" onClick={() => toast.promise(
              new Promise((res) => setTimeout(res, 1500)),
              { loading: 'Salvando...', success: 'Salvo!', error: 'Erro ao salvar' }
            )}>
              Promise
            </Button>
          </div>
        </Section>

        <Separator />
        <footer className="text-center text-xs text-muted-foreground py-4">
          Página interna · não publicada externamente · use para QA visual antes de cada release.
        </footer>
      </div>
    </>
  );
}

function Section({
  title, description, children,
}: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}