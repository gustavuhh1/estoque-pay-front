# EstoquePay — Front-end

Scaffold inicial em React + Vite + TypeScript + Tailwind CSS v4 + componentes
no padrão shadcn/ui.

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse http://localhost:5173

## Rotas já criadas

- `/` — Landing page
- `/login` — Tela de login
- `/cadastro` — Tela de cadastro

## Estrutura

```
src/
  components/
    ui/            componentes-base no padrão shadcn (Button, Input, Label, Card)
    BarcodeStrip.tsx
  pages/
    Landing.tsx
    Login.tsx
    Signup.tsx
  lib/
    utils.ts       helper `cn` (clsx + tailwind-merge)
  index.css        tokens de design (cores, fontes) via @theme do Tailwind v4
```

## Design tokens

Definidos em `src/index.css` como variáveis CSS do Tailwind v4 (`@theme`):

| Token | Valor | Uso |
|---|---|---|
| `--color-ink` | `#1b2a4a` | cor primária, texto, nav |
| `--color-amber` | `#e8a33d` | acento, CTAs |
| `--color-paper` | `#f7f5f0` | fundo |
| `--color-slate` | `#5b6472` | texto secundário |
| `--color-stock-green` | `#2f7b5c` | positivo (estoque OK, venda) |
| `--color-alert` | `#c1443a` | alerta (estoque baixo) |

Tipografia: **Space Grotesk** para títulos, **Inter** para corpo/UI.

## Próximos passos sugeridos

- Adicionar validação de formulário (ex: react-hook-form + zod)
- Conectar `/login` e `/cadastro` ao back-end (auth)
- Adicionar mais componentes shadcn conforme necessário (`select`, `dialog`, `table` etc.) — o `components.json` já está configurado
