# EstoquePay — Front-end

Aplicação front-end em React + Vite + TypeScript + Tailwind CSS v4, mantendo os componentes no padrão shadcn/ui e a identidade visual definida para o projeto.

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse http://localhost:5173

## Variáveis de ambiente e modo demonstração

Copie `.env.example` para `.env.local`.

| Variável | Efeito |
|---|---|
| `VITE_BETTER_AUTH_URL` | Base da API Better Auth. Quando definida, o login usa cookie de sessão (`credentials: include`). |
| `VITE_DEMO_MODE=true` | Liga o login local de demonstração **fora** do `npm run dev` (ex.: build publicado para apresentação). |

O modo demonstração aceita qualquer senha, por isso só fica ativo em `npm run dev` ou com `VITE_DEMO_MODE=true`.
Sem `VITE_BETTER_AUTH_URL` e sem o modo demo, as telas de login/cadastro mostram "Autenticação não configurada".

**Deploy:** o app usa `BrowserRouter`; configure o host para devolver `index.html` em qualquer rota (SPA fallback),
senão abrir `/painel` direto retorna 404.

## Fluxos atuais

- `/` — Landing page
- `/login` — Login
- `/cadastro` — Cadastro
- `/recuperar-senha` — Solicitação de recuperação
- `/redefinir-senha?token=demo` — Redefinição de senha (protótipo)
- `/lojas` — Seleção/listagem de lojas
- `/onboarding` — Criação de estabelecimento
- `/painel` — Dashboard protegido (indicadores calculados a partir dos dados de produtos, vendas e estoque)
- `/produtos` — Catálogo: busca, filtros, cadastro, edição e inativação
- `/vendas` — Histórico de vendas, nova venda (carrinho + forma de pagamento) e cancelamento
- `/estoque` — Saldo por produto, movimentações (entrada, saída, ajuste de contagem) e histórico
- `/termos` — Termos de uso
- `/privacidade` — Política de privacidade
- `/403` — Estado de acesso negado
- `/erro-rede` — Estado de erro de rede (rota pública; o app redireciona para cá quando não consegue checar a sessão)
- qualquer rota desconhecida — 404

## Produtos, Vendas e Estoque

As três telas compartilham o mesmo layout (`DashboardLayout`: sidebar + header + `<Outlet />`) e os mesmos dados, mantidos
por loja ativa em `src/inventory/`:

| Arquivo | Papel |
|---|---|
| `types.ts` | Tipos (`Product`, `Sale`, `Movement`…). Valores monetários em **centavos** (inteiros). |
| `logic.ts` | Regras em funções puras: validação, venda, cancelamento, movimentação e dados de demonstração. |
| `InventoryContext.tsx` | Provider por loja ativa, com persistência em `localStorage` (somente demonstração). |

Regras principais:

- Venda só com produto **ativo** e saldo suficiente; falha em qualquer item não altera nada. Gera uma movimentação por item.
- Cancelar uma venda devolve os itens ao estoque (movimentação `cancelamento`) e a tira do faturamento. A venda guarda o preço do momento.
- Saída não pode passar do saldo; saída e ajuste exigem motivo; ajuste informa a quantidade **contada** (novo saldo).
- O saldo do produto só muda por movimentação (nunca pela edição do produto). SKU é único por loja.
- Situação do estoque: **Sem estoque** (0), **Estoque baixo** (≤ mínimo) e **Normal**.
- Lojas de demonstração (`ponto-certo`, `centro`, `shopping`) começam com 12 produtos e 9 vendas coerentes entre si; lojas
  criadas no onboarding começam **vazias**. Ao sair da conta, o inventário volta ao estado de demonstração.

Quando houver backend, `InventoryProvider` é o ponto de troca: as funções de `logic.ts` continuam como referência das
regras (RN) e o contexto passa a chamar a API.

## Design tokens

Definidos em `src/index.css`:

| Token | Valor | Uso |
|---|---|---|
| `--color-ink` | `#0D1C2E` | texto, navegação e superfícies escuras |
| `--color-brand` | `#006C4A` | CTA (texto branco), foco e identidade principal |
| `--color-alert-dark` | `#A83232` | texto de erro sobre `alert-soft`/branco (5,67:1) |
| `--color-warn` / `--color-warn-soft` | `#8A5A00` / `#FFF1CC` | estoque baixo (5,28:1) |
| `--color-mint` | `#3DDC97` | verde claro para textos/ícones sobre fundo escuro (`--color-ink`) |
| `--color-brand-dark` | `#00563B` | variações do verde principal |
| `--color-paper` | `#F8F9FF` | fundo principal |
| `--color-paper-dim` | `#EEF2F7` | superfícies secundárias |
| `--color-slate` | `#6B7280` | textos auxiliares |
| `--color-stock-green` | `#006C4A` | positivo/estoque normal |
| `--color-alert` | `#C44848` | alertas/estoque crítico |

Tipografia: **Space Grotesk** para títulos e **Inter** para corpo/UI.

## Sprint 2 — Front-end

As issues do repositório que compõem o fluxo de autenticação, onboarding, contexto de loja e fundação visual foram modeladas nesta pasta como protótipo funcional, mantendo o backend para uma etapa posterior.

### #2 — Gerenciamento de sessão

- guarda de rotas protegidas;
- persistência local somente no modo de demonstração;
- fluxo de logout;
- revalidação de sessão ao foco da janela e por temporizador;
- caminho preparado para Better Auth via cookie com `credentials: include`.

### #3 — Recuperação de senha

- tela de solicitação já existente;
- tela de redefinição adicionada;
- estados de token inválido/expirado e sucesso;
- redirecionamento para login após conclusão.

### #4 — Onboarding

- wizard de dois passos;
- dados mínimos do estabelecimento;
- criação de nova loja no estado local;
- vínculo de `Owner` no protótipo;
- conclusão levando ao Dashboard.

### #5 — Seleção/listagem de lojas

- cards de estabelecimentos;
- identificação visual, CNPJ, cidade/UF e papel;
- botão `Nova loja`;
- escolha do estabelecimento leva ao Dashboard.

### #6 — Store Switcher

- loja ativa no header;
- demais lojas disponíveis no dropdown;
- troca de contexto sem reload completo;
- persistência do estabelecimento ativo no modo de demonstração;
- atalho para a tela completa de lojas.

### #9 — Fundação do Front-end

- Button, Input, Select, Table, Dialog/Modal, Toast e Skeleton;
- layout de Dashboard com Sidebar + Header;
- estado padrão de carregamento;
- estados 403, 404 e erro de rede;
- rota coringa para 404.

## Observação sobre dados

Os dados usados nas telas do Dashboard e nos estabelecimentos são ilustrativos. O objetivo desta etapa é fechar o fluxo visual e de navegação sem acoplar o front-end a um backend ainda não integrado.

Quando o Better Auth e as APIs estiverem disponíveis, o `AuthContext` e o `StoreContext` podem trocar a persistência demonstrativa pelas chamadas reais sem exigir redesenho das telas.
