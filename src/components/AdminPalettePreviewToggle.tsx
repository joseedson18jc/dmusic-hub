import { useEffect, useState } from 'react';
import { Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'admin-palette-preview';
const PREVIEW_VALUE = 'dark-slate';

/**
 * Toggle visível APENAS para admins.
 * Alterna entre a paleta oficial (#05050A) e o preview #08090d
 * em tempo real, somente na sessão local (sessionStorage).
 * Não persiste no banco e não afeta outros usuários.
 * Não reintroduz o tema descontinuado — serve só para validação visual.
 */
export function AdminPalettePreviewToggle() {
  const { isAdmin } = useAuth();
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    const saved = sessionStorage.getItem(STORAGE_KEY) === PREVIEW_VALUE;
    if (saved) {
      document.documentElement.setAttribute('data-palette-preview', PREVIEW_VALUE);
      setActive(true);
    }
  }, [isAdmin]);

  // Garante remoção do atributo quando o usuário deixa de ser admin
  useEffect(() => {
    if (!isAdmin) {
      document.documentElement.removeAttribute('data-palette-preview');
      sessionStorage.removeItem(STORAGE_KEY);
      setActive(false);
    }
  }, [isAdmin]);

  if (!isAdmin) return null;

  const toggle = () => {
    const next = !active;
    setActive(next);
    if (next) {
      document.documentElement.setAttribute('data-palette-preview', PREVIEW_VALUE);
      sessionStorage.setItem(STORAGE_KEY, PREVIEW_VALUE);
    } else {
      document.documentElement.removeAttribute('data-palette-preview');
      sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  const label = active
    ? 'Paleta preview: #08090d (clique para voltar a #05050A)'
    : 'Paleta atual: #05050A (clique para preview #08090d)';

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={toggle}
      className={`h-8 w-8 ${active ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
    >
      <Palette className="h-4 w-4" />
      {active && (
        <span className="sr-only">Preview de paleta #08090d ativo</span>
      )}
    </Button>
  );
}