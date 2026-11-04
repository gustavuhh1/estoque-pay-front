# EstoquePay — Front-end

Front-end do EstoquePay em React 19 + Vite + TypeScript + Tailwind CSS v4, com componentes no padrão shadcn/ui. Publicado em https://estoquepay.vercel.app.

Os requisitos e as regras de negócio ficam num documento só, no repositório da API: [`Requisitos_e_Regras_de_Negocio_V5_EstoquePay.md`](https://github.com/gustavuhh1/estoque-pay-api/blob/main/docs/Requisitos_e_Regras_de_Negocio_V5_EstoquePay.md). O login com Google está fora desta entrega (ver a seção "Fora do escopo" desse documento).

## Rodando localmente

```bash
npm install
cp .env.example .env.development   # ajuste as variáveis
npm run dev
```

Acesse http://localhost:5173. Com `VITE_API_URL` vazio o front roda em modo demonstração, com dados locais. Para usar uma API, preencha `VITE_DEV_API_TARGET`: o Vite replica o proxy do `vercel.json` (`/api/auth/*` mantém o prefixo, `/api/*` o remove). Todas as variáveis estão comentadas no `.env.example`.

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Checagem de tipos e build de produção |
| `npm run lint` | Lint com oxlint |
| `node scripts/seed-demo.mjs` | Recria a loja de apresentação sem duplicar |

## Telas

| Rota | Tela | Acesso |
| --- | --- | --- |
| `/`, `/termos`, `/privacidade` | Landing e páginas legais | Público |
| `/login`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha` | Autenticação | Público |
| `/lojas`, `/onboarding` | Seleção e criação de loja | Logado |
| `/painel` | Dashboard (vendas, lucro, reposição) | Owner e Gestor |
| `/pdv` | Ponto de venda | Todos os cargos |
| `/vendas` | Histórico, cancelamento e abertura e fechamento do caixa | Todos os cargos (só Owner e Gestor cancelam) |
| `/estoque`, `/clientes`, `/ajustes` | Estoque, CRM, equipe, fiscal e assinatura | Owner e Gestor |
| `/403`, `/erro-rede`, `*` | Sem permissão, erro de conexão e 404 | — |

## Estrutura

```
src/
  pages/        uma página por rota
  components/   ui/ (base shadcn) e componentes por área (pdv, sales, stock, settings...)
  auth/ store/  sessão (Better Auth) e loja ativa
  inventory/ pdv/ caixa/ customers/ team/ billing/ dashboard/   estado e chamadas de cada área
  config.ts     única leitura de import.meta.env
  index.css     tokens de design (@theme do Tailwind v4)
```

## Design

Tokens em `src/index.css`, iguais às variáveis do Figma ([EstoquePay — Design System + App](https://www.figma.com/design/gG2uQFGCQpPMTtI4fsXXAP/)): verde `#006C49` como cor principal, `#0B1C30` para texto, `#F8F9FF` de fundo e `#DC2626` para alertas. Tipografia: **Manrope** em todo o texto e **JetBrains Mono** para códigos e números.

## Documentos

- [`docs/APRESENTACAO.md`](docs/APRESENTACAO.md): roteiro e contas da apresentação.
- [`docs/ETAPA-7-RELATORIO.md`](docs/ETAPA-7-RELATORIO.md): validação em produção.
