import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LayoutDashboard, Music, Users, Briefcase, CalendarDays, DollarSign, FileText, CheckSquare, Settings, Loader2 } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { escapeSearch } from '@/lib/searchEscape';

const pages = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'DJs', url: '/djs', icon: Music },
  { title: 'Produtores', url: '/produtores', icon: Users },
  { title: 'Bookings', url: '/bookings', icon: Briefcase },
  { title: 'Agenda', url: '/agenda', icon: CalendarDays },
  { title: 'Financeiro', url: '/financeiro', icon: DollarSign },
  { title: 'Documentos', url: '/documentos', icon: FileText },
  { title: 'Tarefas', url: '/tarefas', icon: CheckSquare },
  { title: 'Configurações', url: '/configuracoes', icon: Settings },
];

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const term = query.trim();
  const enabled = open && term.length >= 2;

  const { data: results, isFetching } = useQuery({
    queryKey: ['cmdk-search', term],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const sb = supabase as any;
      const safe = escapeSearch(term);
      if (!safe) return { djs: [], producers: [], bookings: [] };
      const like = `%${safe}%`;
      const [djs, producers, bookings] = await Promise.all([
        sb.from('djs').select('id, nome_artistico').ilike('nome_artistico', like).limit(5),
        sb.from('producers').select('id, nome').ilike('nome', like).limit(5),
        sb.from('bookings').select('id, evento_nome, data_evento').ilike('evento_nome', like).limit(5),
      ]);
      return {
        djs: (djs.data ?? []) as Array<{ id: string; nome_artistico: string }>,
        producers: (producers.data ?? []) as Array<{ id: string; nome: string }>,
        bookings: (bookings.data ?? []) as Array<{ id: string; evento_nome: string; data_evento?: string }>,
      };
    },
  });

  const go = (url: string) => { navigate(url); setOpen(false); setQuery(''); };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Abrir busca global"
        className="text-muted-foreground gap-2 h-9 px-3 w-64"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs">Buscar...</span>
        <kbd className="ml-auto pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-micro font-medium text-muted-foreground sm:flex">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar módulo, DJ, produtor, booking..." value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>
            {isFetching ? (
              <span className="inline-flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando...</span>
            ) : (
              'Nenhum resultado encontrado.'
            )}
          </CommandEmpty>
          <CommandGroup heading="Navegação">
            {pages.map((page) => (
              <CommandItem key={page.url} onSelect={() => go(page.url)}>
                <page.icon className="mr-2 h-4 w-4" />
                {page.title}
              </CommandItem>
            ))}
          </CommandGroup>
          {results && (results.djs.length + results.producers.length + results.bookings.length) > 0 && (
            <CommandSeparator />
          )}
          {results && results.djs.length > 0 && (
            <CommandGroup heading="DJs">
              {results.djs.map((d) => (
                <CommandItem key={`dj-${d.id}`} value={`dj ${d.nome_artistico}`} onSelect={() => go(`/djs/${d.id}`)}>
                  <Music className="mr-2 h-4 w-4" />
                  {d.nome_artistico}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {results && results.producers.length > 0 && (
            <CommandGroup heading="Produtores">
              {results.producers.map((p) => (
                <CommandItem key={`prod-${p.id}`} value={`prod ${p.nome}`} onSelect={() => go(`/produtores/${p.id}`)}>
                  <Users className="mr-2 h-4 w-4" />
                  {p.nome}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {results && results.bookings.length > 0 && (
            <CommandGroup heading="Bookings">
              {results.bookings.map((b) => (
                <CommandItem key={`bk-${b.id}`} value={`bk ${b.evento_nome}`} onSelect={() => go(`/bookings`)}>
                  <Briefcase className="mr-2 h-4 w-4" />
                  {b.evento_nome}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
