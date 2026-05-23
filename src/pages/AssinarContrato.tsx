import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, AlertTriangle, FileSignature, Eraser } from 'lucide-react';
import { toast } from 'sonner';

const FUNCTIONS_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

export default function AssinarContrato() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contract, setContract] = useState<any>(null);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasDrawnRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${FUNCTIONS_BASE}/sign-contract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'view', token }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar contrato');
        setContract(data.contract);
        setAlreadySigned(data.already_signed);
        setSignedAt(data.signed_at);
        if (data.signer_name) setSignerName(data.signer_name);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || alreadySigned) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;;
    // Lê a cor do foreground do design system para manter consistência com o tema ativo
    const fg = getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim();
    ctx.strokeStyle = fg ? `hsl(${fg})` : 'currentColor';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const point = 'touches' in e ? e.touches[0] : e;
      return { x: point.clientX - rect.left, y: point.clientY - rect.top };
    };
    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      drawingRef.current = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const move = (e: MouseEvent | TouchEvent) => {
      if (!drawingRef.current) return;
      e.preventDefault();
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      hasDrawnRef.current = true;
    };
    const end = () => { drawingRef.current = false; };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start);
    canvas.addEventListener('touchmove', move);
    canvas.addEventListener('touchend', end);
    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', end);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', move);
      canvas.removeEventListener('touchend', end);
    };
  }, [alreadySigned, contract]);

  const clearSig = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
  };

  const handleSign = async () => {
    if (!signerName.trim()) { toast.error('Informe seu nome completo'); return; }
    if (!accepted) { toast.error('Você precisa aceitar os termos'); return; }
    if (!hasDrawnRef.current) { toast.error('Desenhe sua assinatura no campo'); return; }

    setSubmitting(true);
    try {
      const sigData = canvasRef.current!.toDataURL('image/png');
      const res = await fetch(`${FUNCTIONS_BASE}/sign-contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sign',
          token,
          signer_name: signerName.trim(),
          signer_email: signerEmail.trim() || undefined,
          signature_data: sigData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao assinar');
      setAlreadySigned(true);
      setSignedAt(data.signed_at);
      toast.success('Contrato assinado com sucesso!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardContent className="py-10 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h1 className="text-xl font-bold mb-2">Link inválido</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-6 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <FileSignature className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Assinatura de Contrato</h1>
            <p className="text-xs text-muted-foreground">{contract?.template_name} • v{contract?.version}</p>
          </div>
        </div>

        {/* Documento */}
        <Card>
          <CardContent className="p-0 overflow-hidden">
            {contract?.html_content ? (
              <iframe
                srcDoc={contract.html_content}
                sandbox=""
                className="w-full h-[60vh] border-0 bg-white"
                title="Contrato"
              />
            ) : (
              <div className="p-6 text-sm text-muted-foreground">Conteúdo do contrato indisponível.</div>
            )}
          </CardContent>
        </Card>

        {alreadySigned ? (
          <Card className="border-success/40 bg-success/5">
            <CardContent className="py-6 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 mx-auto text-success" />
              <h2 className="text-lg font-semibold">Contrato já assinado</h2>
              <p className="text-sm text-muted-foreground">
                Assinado por <strong>{signerName}</strong>
                {signedAt && <> em {new Date(signedAt).toLocaleString('pt-BR')}</>}.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-5 space-y-4">
              <h2 className="text-base font-semibold">Dados do signatário</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nome completo *</Label>
                  <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Seu nome completo" />
                </div>
                <div>
                  <Label className="text-xs">E-mail (opcional)</Label>
                  <Input type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} placeholder="email@exemplo.com" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">Sua assinatura *</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={clearSig} className="h-7 text-xs gap-1">
                    <Eraser className="h-3 w-3" /> Limpar
                  </Button>
                </div>
                <div className="rounded-lg border border-border bg-muted/30">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={180}
                    className="w-full h-[180px] touch-none cursor-crosshair"
                  />
                </div>
                <p className="text-micro text-muted-foreground mt-1">Desenhe com o mouse ou o dedo dentro do campo acima.</p>
              </div>

              <label className="flex items-start gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5" />
                <span className="text-muted-foreground">
                  Declaro que li o contrato acima, concordo integralmente com seus termos e que minha assinatura digital
                  tem validade jurídica equivalente à assinatura manuscrita (MP 2.200-2/2001).
                </span>
              </label>

              <Button onClick={handleSign} disabled={submitting} className="w-full bg-primary hover:bg-primary/90">
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSignature className="h-4 w-4 mr-2" />}
                {submitting ? 'Assinando...' : 'Assinar Contrato'}
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-micro text-muted-foreground">
          CRM FEITO POR J.E.M.C. • D.Music Manager
        </p>
      </div>
    </div>
  );
}
