# EstoquePay — Front-end

Front-end do EstoquePay em React 19 + Vite + TypeScript + Tailwind CSS v4, com componentes no padrão shadcn/ui. Publicado em https://estoquepay.vercel.app.

Os requisitos e as regras de negócio ficam num documento só, no repositório da API: [`Requisitos_e_Regras_de_Negocio_V5_EstoquePay.md`](https://github.com/gustavuhh1/estoque-pay-api/blob/main/docs/Requisitos_e_Regras_de_Negocio_V5_EstoquePay.md). O login com Google aparece com `VITE_GOOGLE_LOGIN=true` e as chaves do Google configuradas na API.

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
| `/perfil` | Meu perfil: nome, foto (enviada ou do Google), lojas e formas de login | Todos os cargos |
| `/estoque`, `/clientes`, `/ajustes` | Estoque, CRM, equipe, fiscal e assinatura | Owner e Gestor |
| `/403`, `/erro-rede`, `*` | Sem permissão, erro de conexão e 404 | — |

## Leitor de código de barras

Funciona com qualquer leitor USB ou Bluetooth no modo teclado (HID), o padrão de fábrica: não precisa de driver nem de clicar num campo antes. O app reconhece a leitura pelo ritmo (6+ caracteres digitados em poucos milissegundos) e a separa da digitação humana (`src/scanner/useBarcodeScanner.ts`).

| Onde | O que a leitura faz |
| --- | --- |
| PDV | Coloca o produto no carrinho (bipe agudo); código desconhecido ou sem estoque avisa (bipe grave) |
| Estoque | Filtra pelo código; se não existir, oferece "Cadastrar com este código" |
| Novo/editar produto | Preenche o EAN, mesmo com o foco em outro campo; avisa se o código já é de outro produto |
| Movimentação | Escolhe o produto |
| Demais telas do painel | Abre o Estoque filtrado pelo código |

Configure o leitor para enviar **Enter** no fim da leitura (é o padrão; Tab ou nenhum sufixo também funcionam) e com o layout de teclado igual ao do computador.

## Estrutura

```
src/
  pages/        uma página por rota
  components/   ui/ (base shadcn) e componentes por área (pdv, sales, stock, settings...)
  auth/ store/  sessão (Better Auth) e loja ativa
  inventory/ pdv/ caixa/ customers/ team/ billing/ dashboard/   estado e chamadas de cada área
  scanner/      leitor de código de barras (detecção e bipe)
  config.ts     única leitura de import.meta.env
  index.css     tokens de design (@theme do Tailwind v4)
```

## Design

Tokens em `src/index.css`, iguais às variáveis do Figma ([EstoquePay — Design System + App](https://www.figma.com/design/gG2uQFGCQpPMTtI4fsXXAP/)): verde `#006C49` como cor principal, `#0B1C30` para texto, `#F8F9FF` de fundo e `#DC2626` para alertas. Tipografia: **Manrope** em todo o texto e **JetBrains Mono** para códigos e números.

## Documentos

- [`docs/APRESENTACAO.md`](docs/APRESENTACAO.md): roteiro e contas da apresentação.
- [`docs/ETAPA-7-RELATORIO.md`](docs/ETAPA-7-RELATORIO.md): validação em produção.
