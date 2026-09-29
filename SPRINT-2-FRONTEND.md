# EstoquePay — Sprint 2 Front-end

## Escopo implementado nesta pasta

A marcação "Sprint 2" não aparece como `milestone` ou label explícita na API de Issues disponível no repositório. Para manter a entrega rastreável, esta versão cobre o conjunto de issues de front-end que formam o fluxo de autenticação, contexto de loja e fundação do dashboard:

- #2 — Gerenciamento de Sessão
- #3 — Recuperação de Senha
- #4 — Onboarding / Criação de Estabelecimento
- #5 — Seleção/Listagem de Lojas
- #6 — Store Switcher
- #9 — Fundação de Front-end

## #2 — Gerenciamento de sessão

### Implementado

- `ProtectedRoute` para bloquear áreas autenticadas.
- Redirecionamento para `/login` quando a sessão não existe ou expira.
- Persistência em `localStorage` somente no modo de demonstração.
- Caminho Better Auth usando cookie de sessão e `credentials: include`.
- Revalidação ao receber foco na janela.
- Revalidação periódica durante uma sessão ativa.
- Logout limpa a sessão e envia para `/login`.

### Teste visual

1. Abrir `/painel` sem sessão.
2. Entrar em `/login`.
3. Confirmar redirecionamento para `/lojas`.
4. Selecionar uma loja e abrir `/painel`.
5. Atualizar a página e confirmar a permanência no estado de demonstração.
6. Usar `Sair da conta` e confirmar o retorno para `/login`.

## #3 — Recuperação de senha

### Implementado

- Solicitação de recuperação em `/recuperar-senha`.
- Estado visual de instruções enviadas.
- Tela `/redefinir-senha?token=demo`.
- Estado de sucesso após validação mínima de senha.
- Estado de token expirado/inválido usando `?token=expired` ou `?token=invalid`.
- Retorno ao login após a redefinição.

### Backend posterior

O envio de e-mail, validação real do token e atualização da credencial permanecem desacoplados do protótipo e serão ligados ao Better Auth/API posteriormente.

## #4 — Onboarding

### Implementado

- Wizard em dois passos.
- Nome, CNPJ e telefone.
- Cidade e UF.
- Confirmação visual.
- Nova loja criada como `Owner` no estado demonstrativo.
- Redirecionamento ao Dashboard.

## #5 — Seleção de lojas

### Implementado

- `/lojas` protegido por autenticação.
- Cards com nome, identificação, função e localização.
- Estado de loja ativa.
- Botão `Nova loja`.
- Clique na loja atualiza o contexto e navega para o Dashboard.

## #6 — Store Switcher

### Implementado

- Componente no Header do Dashboard.
- Exibe estabelecimento ativo.
- Lista estabelecimentos disponíveis.
- Troca de contexto sem recarregar a aplicação.
- Contexto persistido localmente no protótipo.
- Atalho `Ver todos` para `/lojas`.

## #9 — Fundação do front-end

### Componentes base

- `Button`
- `Input`
- `Select`
- `Table`
- `Dialog`
- `Toast`
- `Skeleton`
- `Card`
- `Label`

### Layout

- Sidebar responsiva.
- Header fixo.
- Store Switcher.
- Menu do usuário.
- Dashboard como rota autenticada.

### Estados

- Carregamento de sessão.
- 403 — acesso negado.
- 404 — rota inexistente.
- Erro de rede.

## Estrutura principal

```text
src/
├── auth/
│   ├── AuthContext.tsx
│   └── ProtectedRoute.tsx
├── components/
│   ├── layout/
│   └── ui/
├── pages/
│   ├── Dashboard.tsx
│   ├── StoreSelection.tsx
│   ├── Onboarding.tsx
│   ├── ForgotPassword.tsx
│   ├── ResetPassword.tsx
│   ├── Forbidden.tsx
│   ├── NotFound.tsx
│   └── NetworkError.tsx
└── store/
    └── StoreContext.tsx
```

## Observação de integração

Os dados de loja, métricas e estados apresentados são ilustrativos. A camada visual foi fechada primeiro para permitir revisão das telas. A integração com Better Auth e APIs do domínio será feita depois, preservando os contratos dos contextos e componentes.
