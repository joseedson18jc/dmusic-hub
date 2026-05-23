# GitHub Actions — CI/CD setup

Workflows configurados:

| File | Quando dispara | O que faz |
|---|---|---|
| `preview.yml` | Push em branch ≠ main · PR aberto/atualizado | Roda tsc + tests + deploy preview no Vercel · cola URL no PR |
| `production.yml` | Push em `main` · manual via GitHub UI | Roda tsc + tests + deploy de produção no Vercel |

## Setup inicial (uma vez)

### 1. Inicializa git no projeto (se ainda não é repo)

```bash
cd /Users/jose.costa/Downloads/dmusichub-main
git init -b main
git add .
git commit -m "feat: initial commit"
```

### 2. Cria repo no GitHub

```bash
gh repo create dmusichub-main --private --source=. --remote=origin --push
```
(precisa do `gh` CLI; instala com `brew install gh` + `gh auth login`).

Ou via UI: https://github.com/new → cria privado → cola URL no `.git/config`.

### 3. Configura os 3 secrets necessários no GitHub

🔗 https://github.com/<owner>/<repo>/settings/secrets/actions

| Secret | Valor | Como pegar |
|---|---|---|
| `VERCEL_TOKEN` | Token API Vercel | https://vercel.com/account/tokens → "Create" → scope: full account |
| `VERCEL_ORG_ID` | `team_tE3bJVw3cxeHlKA3TBUr1uyG` | Já está em `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `prj_6L8DCFLdxnuEA9lld6GSfPBVtAmf` | Idem |

Comando atalho via `gh`:
```bash
gh secret set VERCEL_TOKEN -b "<token-aqui>"
gh secret set VERCEL_ORG_ID -b "team_tE3bJVw3cxeHlKA3TBUr1uyG"
gh secret set VERCEL_PROJECT_ID -b "prj_6L8DCFLdxnuEA9lld6GSfPBVtAmf"
```

### 4. Primeiro push

```bash
git push -u origin main
```

A partir daqui:
- Toda branch que você criar e fizer push → preview URL automática.
- Toda merge na `main` → deploy de produção automático.

## Fluxo de PR

1. Você cria branch: `git checkout -b feat/nova-feature`
2. Faz mudanças + commit + push
3. `gh pr create` (ou via UI)
4. GitHub Actions roda tsc + tests + cria preview
5. Bot comenta no PR: "🔗 Preview deploy ready: https://...-preview.vercel.app"
6. Revisa → merge → produção atualiza sozinha
