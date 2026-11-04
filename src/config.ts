/**
 * Única camada de configuração do front: todo o resto lê daqui, ninguém lê `import.meta.env` solto.
 *
 * - `VITE_API_URL`: base da API vista pelo navegador. Em produção é `/api` (a Vercel faz o proxy para a
 *   Render, então o cookie de sessão é de primeira parte). Vazio = modo demonstração (dados locais).
 * - `VITE_BETTER_AUTH_URL`: base do Better Auth. Por padrão, `<VITE_API_URL>/auth`.
 * - `VITE_APP_URL`: endereço público do front, usado nos links que o servidor manda por e-mail. Por padrão, a origem
 *   atual; só precisa de valor no desenvolvimento local, porque o servidor recusa `localhost` como destino.
 * - `VITE_GOOGLE_LOGIN`: `true` mostra "Continuar com Google". Só vale com a API (o provedor fica no Better Auth).
 */
const apiUrl = (import.meta.env.VITE_API_URL ?? "").trim().replace(/\/$/, "")
const authUrl = (import.meta.env.VITE_BETTER_AUTH_URL ?? "").trim().replace(/\/$/, "")
const appUrl = (import.meta.env.VITE_APP_URL ?? "").trim().replace(/\/$/, "")
const googleLogin = (import.meta.env.VITE_GOOGLE_LOGIN ?? "").trim() === "true"

export const config = {
  /** Base da API de negócio (ex.: `/api`). */
  apiUrl,
  /** Base do Better Auth (ex.: `/api/auth`). Vazio no modo demonstração. */
  authUrl: authUrl || (apiUrl ? `${apiUrl}/auth` : ""),
  /** true quando o front conversa com a API de verdade; false usa os dados de demonstração locais. */
  useApi: apiUrl !== "",
  /** Login com Google ligado e com servidor de autenticação para atendê-lo. */
  googleLogin: googleLogin && apiUrl !== "",
  /** Endereço público do front (links de e-mail). */
  appUrl: appUrl || window.location.origin,
  /** A API hospedada na Render hiberna e leva cerca de 1 minuto para acordar. */
  requestTimeoutMs: 90_000,
} as const
