# EstoquePay — Front-end

Aplicação front-end em React + Vite + TypeScript + Tailwind CSS v4, mantendo os componentes no padrão shadcn/ui e a identidade visual definida para o projeto.

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse http://localhost:5173

## Fluxos atuais

- `/` — Landing page
- `/login` — Login
- `/cadastro` — Cadastro
- `/recuperar-senha` — Solicitação de recuperação
- `/redefinir-senha?token=demo` — Redefinição de senha (protótipo)
- `/lojas` — Seleção/listagem de lojas
- `/onboarding` — Criação de estabelecimento
- `/painel` — Dashboard protegido
- `/termos` — Termos de uso
- `/privacidade` — Política de privacidade
- `/403` — Estado de acesso negado
- `/erro-rede` — Estado de erro de rede
- qualquer rota desconhecida — 404

## Design tokens

Definidos em `src/index.css`:

| Token | Valor | Uso |
|---|---|---|
| `--color-ink` | `#0D1C2E` | texto, navegação e superfícies escuras |
| `--color-amber` | `#006C4A` | CTA, foco e identidade principal |
| `--color-amber-dark` | `#00563B` | variações do verde principal |
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
