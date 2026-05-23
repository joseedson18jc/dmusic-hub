/**
 * Sanitize untrusted text before composing a PostgREST `.or()` filter.
 *
 * PostgREST parses `,` `(` `)` and `.` inside `or(...)` to delimit filters.
 * If a search term contains those characters, an attacker (or a confused user)
 * can inject extra filters: e.g. searching for `,id.eq.<uuid>` would add an
 * unintended row predicate. We strip them entirely — they have no useful
 * meaning in a free-text search and Postgres `ilike` would match them
 * literally anyway.
 *
 * The wildcard chars `%` and `_` are also escaped so a search for `50%` does
 * not become a wildcard match.
 *
 * Length is capped to keep the URL well under PostgREST's request limits.
 */
export function escapeSearch(input: string, maxLen = 80): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[,()]/g, ' ')         // strip PostgREST filter delimiters
    .replace(/[%_]/g, (m) => `\\${m}`) // escape ilike wildcards
    .trim()
    .slice(0, maxLen);
}
