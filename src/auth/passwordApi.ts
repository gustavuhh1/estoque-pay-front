import { config } from "@/config"

type Failure = { code?: string; message?: string }

const NETWORK_ERROR = "Não foi possível falar com o servidor. Tente de novo em instantes."

async function post(path: string, body: unknown) {
  try {
    const response = await fetch(`${config.authUrl}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    })
    if (response.ok) return { ok: true as const }
    const failure = (await response.json().catch(() => null)) as Failure | null
    return { ok: false as const, code: failure?.code, status: response.status }
  } catch {
    return { ok: false as const, code: "NETWORK", status: 0 }
  }
}

/** Pede o e-mail de redefinição. Devolve a mensagem de erro, ou null quando o pedido foi aceito. */
export async function requestPasswordReset(email: string): Promise<string | null> {
  // O link do e-mail volta para esta tela; o servidor só aceita destinos de origens confiáveis.
  const result = await post("/request-password-reset", { email, redirectTo: `${config.appUrl}/redefinir-senha` })
  if (result.ok) return null
  if (result.code === "NETWORK") return NETWORK_ERROR
  return "Não foi possível enviar o e-mail agora. Confira o endereço e tente de novo."
}

export type ResetResult = { ok: true } | { ok: false; invalidToken: boolean; error: string }

/** Troca a senha com o token recebido por e-mail. */
export async function resetPassword(token: string, password: string): Promise<ResetResult> {
  const result = await post("/reset-password", { token, newPassword: password })
  if (result.ok) return { ok: true }
  if (result.code === "NETWORK") return { ok: false, invalidToken: false, error: NETWORK_ERROR }
  if (result.code === "INVALID_TOKEN") return { ok: false, invalidToken: true, error: "Link expirado ou inválido." }
  if (result.code === "PASSWORD_TOO_SHORT") return { ok: false, invalidToken: false, error: "Use pelo menos 8 caracteres." }
  return { ok: false, invalidToken: false, error: "Não foi possível redefinir a senha. Tente de novo." }
}
