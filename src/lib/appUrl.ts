/**
 * appUrl — constrói uma URL absoluta da aplicação respeitando o base path.
 *
 * `window.location.origin` é só scheme+host (ex: https://joseedson18jc.github.io),
 * sem o prefixo de subpath. No GitHub Pages o app vive em /dmusic-hub/, então
 * redirects/links precisam incluir esse segmento. Em dev BASE_URL === "/".
 *
 * Uso:
 *   appUrl('/reset-password')  // prod → https://host/dmusic-hub/reset-password
 *                              // dev  → http://localhost:8080/reset-password
 */
export function appUrl(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, ''); // "/dmusic-hub" | ""
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${base}${clean}`;
}
