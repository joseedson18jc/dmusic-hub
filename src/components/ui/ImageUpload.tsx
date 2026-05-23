import { useRef, useState, type ChangeEvent } from 'react';
import { Loader2, Upload, X, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * ImageUpload — upload de imagem pro Supabase Storage com preview, validação,
 * e botão de remover.
 *
 * Uso:
 *   <ImageUpload
 *     value={photoUrl}
 *     onChange={setPhotoUrl}
 *     bucket="dj-assets"
 *     folder="profile/dj-123"  // organiza por entidade
 *     variant="circle"          // ou "rect" pra covers
 *     label="Foto de perfil"
 *   />
 *
 * Validação:
 *   • Tipo: image/* (jpg, png, webp, gif)
 *   • Tamanho: 5 MB max (default — passa `maxSizeMB` pra customizar)
 *   • Upload com `upsert: true` + filename random pra evitar cache do Supabase
 *     em re-uploads no mesmo path.
 */

export interface ImageUploadProps {
  /** URL atual (do banco). undefined/null = nenhuma. */
  value?: string | null;
  /** Callback com a nova URL pública após upload (ou null se removido). */
  onChange: (url: string | null) => void;
  /** Nome do bucket no Supabase Storage. */
  bucket: string;
  /** Pasta dentro do bucket (ex: `profile/<dj-id>`). Sem barra final. */
  folder: string;
  /** Visual variant: circle (avatar) ou rect (banner). */
  variant?: 'circle' | 'rect';
  /** Label exibido acima do uploader. */
  label?: string;
  /** Help text abaixo. */
  hint?: string;
  /** Tamanho máximo em MB. */
  maxSizeMB?: number;
  /** Aspect ratio para `rect`. Default 3 (banner wide). */
  aspectRatio?: number;
  /** Disabled state. */
  disabled?: boolean;
  className?: string;
}

const sb = supabase as any;

export function ImageUpload({
  value,
  onChange,
  bucket,
  folder,
  variant = 'circle',
  label,
  hint,
  maxSizeMB = 5,
  aspectRatio = 3,
  disabled,
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem (JPG, PNG, WEBP).');
      return;
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      toast.error(`Arquivo muito grande (${sizeMB.toFixed(1)} MB). Máximo: ${maxSizeMB} MB.`);
      return;
    }

    setUploading(true);
    try {
      // Filename random pra evitar collision + cache
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
      const path = `${folder}/${filename}`;

      const { error: uploadErr } = await sb.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = sb.storage.from(bucket).getPublicUrl(path);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error('Falha ao obter URL pública.');

      onChange(publicUrl);
      toast.success('Imagem enviada.');
    } catch (err: any) {
      console.error('[ImageUpload]', err);
      toast.error(err.message || 'Falha ao enviar imagem.');
    } finally {
      setUploading(false);
      // Limpa input pra permitir re-upload do mesmo arquivo
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    onChange(null);
  };

  const isCircle = variant === 'circle';

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-sm font-medium leading-none">{label}</label>
      )}

      <div className="flex items-center gap-3">
        {/* Preview */}
        <div
          className={cn(
            'relative overflow-hidden bg-muted/40 border border-border/60 flex items-center justify-center shrink-0',
            isCircle ? 'h-20 w-20 rounded-full' : 'rounded-lg',
          )}
          style={!isCircle ? { width: 200, aspectRatio } : undefined}
        >
          {value ? (
            <img
              src={value}
              alt={label || 'preview'}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon className="h-7 w-7 text-muted-foreground/40" />
          )}
          {uploading && (
            <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className="h-8 gap-1.5 text-xs"
          >
            <Upload className="h-3.5 w-3.5" />
            {value ? 'Trocar' : 'Enviar'}
          </Button>
          {value && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled || uploading}
              onClick={handleRemove}
              className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <X className="h-3.5 w-3.5" />
              Remover
            </Button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
          disabled={disabled}
        />
      </div>

      {hint && <p className="text-mini text-muted-foreground">{hint}</p>}
    </div>
  );
}
