#!/usr/bin/env bun
/**
 * Auditoria de ícones — D-Music Hub
 * --------------------------------------------------------------
 * Varre src/ procurando usos de ícones Lucide que NÃO seguem o
 * sistema canônico definido em src/components/ui/icon.tsx.
 *
 * Sinaliza:
 *   - Ícones com strokeWidth divergente do padrão (1.75 / 2.25)
 *   - Tamanhos arbitrários (fora de h-3/4/5/6/8 ou tokens xs..2xl)
 *   - Arquivos que importam de "lucide-react" mas NÃO usam <Icon/>
 *
 * Uso:
 *   bun run scripts/audit-icons.ts            # relatório humano
 *   bun run scripts/audit-icons.ts --json     # saída JSON
 *   bun run scripts/audit-icons.ts --strict   # exit 1 se houver issues
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(process.cwd(), "src");
const ALLOWED_TW_SIZES = new Set([
  "h-3", "w-3", "h-4", "w-4", "h-5", "w-5", "h-6", "w-6", "h-8", "w-8",
]);
const ALLOWED_STROKES = new Set(["1.75", "2.25"]);
const EXCLUDE_DIRS = new Set(["node_modules", "dist", "build", ".next"]);
const EXCLUDE_FILES = new Set([
  "src/components/ui/icon.tsx",
  "src/lib/icons.ts",
]);
/**
 * Diretórios isentos da regra "sem-wrapper-Icon".
 * Os primitives de shadcn em src/components/ui/* são gerados e fazem
 * parte do design system — eles podem importar Lucide diretamente.
 * Ainda assim auditamos stroke/size dentro deles.
 */
const WRAPPER_EXEMPT_PREFIXES = ["src/components/ui/"];

type Issue = { file: string; line: number; kind: string; snippet: string };

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (EXCLUDE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(entry)) out.push(full);
  }
  return out;
}

function audit(file: string): Issue[] {
  const rel = relative(process.cwd(), file);
  if (EXCLUDE_FILES.has(rel)) return [];
  const src = readFileSync(file, "utf8");
  if (!/from\s+['"]lucide-react['"]/.test(src)) return [];
  const lines = src.split("\n");
  const issues: Issue[] = [];

  lines.forEach((line, i) => {
    // strokeWidth divergente (ignora recharts: Area/Line/Pie/Bar)
    const sw = line.match(/strokeWidth=\{?["']?([0-9.]+)["']?\}?/);
    if (sw && !/<(Area|Line|Pie|Bar|Radar|Cell|Sector)\b/.test(line)) {
      if (!ALLOWED_STROKES.has(sw[1])) {
        issues.push({ file: rel, line: i + 1, kind: "stroke-divergente", snippet: line.trim() });
      }
    }
    // size={N} arbitrário em ícones
    const sz = line.match(/\bsize=\{(\d+)\}/);
    if (sz && /<[A-Z][A-Za-z0-9]*\s/.test(line)) {
      const px = parseInt(sz[1], 10);
      if (![12, 14, 16, 20, 24, 32].includes(px)) {
        issues.push({ file: rel, line: i + 1, kind: "size-arbitrario", snippet: line.trim() });
      }
    }
    // tamanho tailwind fora do whitelist em SVG-like (ex. h-[18px])
    const arb = line.match(/\b(?:h|w)-\[(\d+)px\]/);
    if (arb && /Icon|svg|lucide/i.test(line)) {
      issues.push({ file: rel, line: i + 1, kind: "tamanho-arbitrario", snippet: line.trim() });
    }
  });

  // Arquivo importa lucide direto e NÃO usa o wrapper Icon canônico
  const usesWrapper = /from\s+['"]@\/components\/ui\/icon['"]/.test(src);
  const importsLucide = /import\s+\{[^}]*\}\s+from\s+['"]lucide-react['"]/.test(src);
  const isWrapperExempt = WRAPPER_EXEMPT_PREFIXES.some((p) => rel.startsWith(p));
  if (importsLucide && !usesWrapper && !isWrapperExempt) {
    issues.push({
      file: rel,
      line: 1,
      kind: "sem-wrapper-Icon",
      snippet: "Importa de lucide-react diretamente — considere usar <Icon icon={...}/>",
    });
  }

  return issues;
}

const args = new Set(process.argv.slice(2));
const files = walk(ROOT);
const all = files.flatMap(audit);

if (args.has("--json")) {
  console.log(JSON.stringify(all, null, 2));
} else {
  if (all.length === 0) {
    console.log("✓ Nenhum problema de ícones encontrado.");
  } else {
    const byKind = all.reduce<Record<string, Issue[]>>((acc, x) => {
      (acc[x.kind] ||= []).push(x);
      return acc;
    }, {});
    for (const [kind, list] of Object.entries(byKind)) {
      console.log(`\n● ${kind} (${list.length})`);
      for (const it of list.slice(0, 50)) {
        console.log(`  ${it.file}:${it.line}  ${it.snippet.slice(0, 100)}`);
      }
      if (list.length > 50) console.log(`  … +${list.length - 50} ocorrências`);
    }
    console.log(`\nTotal: ${all.length} ocorrências em ${new Set(all.map((x) => x.file)).size} arquivos.`);
  }
}

if (args.has("--strict") && all.length > 0) process.exit(1);