# Fora do escopo desta entrega

Itens do plano que foram cortados de propósito por causa do prazo (29/10/2026). Cada um diz o que existe hoje e o que falta para entrar depois.

## Login com Google

**Decisão (29/10/2026, dono do projeto):** retirar o login com Google desta entrega por causa do prazo curto.

**Como está hoje**
- O front **não tem** botão "Entrar com Google" no Login nem no Cadastro. Entrada só por e-mail e senha (Better Auth, `POST /api/auth/sign-in/email` e `/sign-up/email`).
- A API já traz o provedor Google configurado no Better Auth (`socialProviders.google` em `src/lib/auth.ts`, lendo `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`). Nada disso precisa ser removido; sem as variáveis preenchidas ele não é usado.
- O design (Figma e artifact) não tem o botão, então nenhuma tela foi alterada.

**Impacto na validação (Etapa 7)**
- Cenário 1 (cadastro e login): vale só para e-mail e senha, logout e sessão expirada. A parte "login Google" fica registrada como **fora do escopo**, e não como falha.

**Para ativar depois**
1. Criar o cliente OAuth no console do Google e liberar a origem `https://estoquepay.vercel.app` e o redirect `https://estoquepay.vercel.app/api/auth/callback/google` (o `/api` passa pelo proxy da Vercel, então o cookie fica de primeira parte).
2. Preencher `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` nas variáveis do serviço na Render (nunca no repositório).
3. No front, adicionar o botão no Login e no Cadastro chamando `POST /api/auth/sign-in/social` com `{ provider: "google", callbackURL: "<origem>/lojas" }` e seguindo a URL devolvida. Depois do retorno, o `AuthProvider` já recarrega a sessão pelo `get-session`.
4. Conferir o fluxo de quem entra pelo Google sem loja: deve cair no onboarding como qualquer conta nova.
