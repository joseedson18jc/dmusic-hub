import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Upload } from 'lucide-react';
import { EditorialHero } from '@/components/ui/EditorialHero';

export default function Documentos() {
  return (
    <div className="space-y-6">
      {/* ════════ HERO editorial cyberpunk ════════ */}
      <EditorialHero
        title="DOCUMENTOS"
        accentHueA="hsl(var(--slate))"
        accentHueB="hsl(var(--info))"
        status={[
          { label: 'STORAGE · LIVE', tone: 'live' },
          { label: '▸ 0 arquivos', tone: 'muted' },
        ]}
        subtitle={
          <p className="font-mono uppercase tracking-[0.14em] text-mini">
            press kits · riders · contratos · backups
          </p>
        }
        actions={
          <Button className="h-9 gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
            <Upload className="h-4 w-4" /> Upload
          </Button>
        }
      />
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FileText className="h-12 w-12 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground">Nenhum documento armazenado.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Faça upload de press kits, contratos e riders.</p>
        </CardContent>
      </Card>
    </div>
  );
}
