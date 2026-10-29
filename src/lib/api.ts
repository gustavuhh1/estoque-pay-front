import { config } from "@/config"

/** Erro devolvido pela API: o `code` é o contrato estável (nunca decidir pelo texto da mensagem). */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.details = details
  }
}

/** A API não respondeu (fora do ar, sem internet ou estourou o tempo, por exemplo no cold start). */
export class ApiNetworkError extends Error {
  constructor(message = "Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.") {
    super(message)
    this.name = "ApiNetworkError"
  }
}

/** Disparado quando a API responde 401: o contexto de autenticação encerra a sessão e leva ao login. */
export const UNAUTHORIZED_EVENT = "estoquepay:unauthorized"

let tenantId: string | null = null

/** Loja ativa: enviada em `x-estabelecimento-id` nas rotas de negócio. */
export function setTenant(id: string | null) {
  tenantId = id
}

type Query = Record<string, string | number | boolean | undefined>
type RequestOptions = {
  body?: unknown
  query?: Query
  /** false nas rotas que não pertencem a uma loja (ex.: listar lojas, criar loja). */
  tenant?: boolean
  signal?: AbortSignal
}

function buildUrl(path: string, query?: Query) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    // A API recusa parâmetro vazio: o que não vai ser usado deve ser omitido.
    if (value !== undefined && value !== "") params.set(key, String(value))
  }
  const qs = params.toString()
  return `${config.apiUrl}${path}${qs ? `?${qs}` : ""}`
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" }
  if (options.body !== undefined) headers["Content-Type"] = "application/json"
  if (options.tenant !== false && tenantId) headers["x-estabelecimento-id"] = tenantId

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      credentials: "include",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal ?? AbortSignal.timeout(config.requestTimeoutMs),
    })
  } catch {
    throw new ApiNetworkError()
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  let payload: unknown = undefined
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = undefined
    }
  }

  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    const body = (payload ?? {}) as { code?: string; message?: string; details?: unknown }
    throw new ApiError(response.status, body.code ?? `HTTP_${response.status}`, body.message ?? `Erro ${response.status} ao falar com o servidor.`, body.details)
  }
  return payload as T
}

/** Cliente único da API. Sempre `/api/...`, com cookie de sessão e a loja ativa no header. */
export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, "body">) => request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) => request<T>("POST", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) => request<T>("PATCH", path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>("DELETE", path, options),
}

/** Mensagem amigável para qualquer erro, com os códigos de plano da API traduzidos em aviso de upgrade. */
export function errorMessage(error: unknown) {
  if (error instanceof ApiNetworkError) return error.message
  if (error instanceof ApiError) {
    switch (error.code) {
      case "PLANO_LIMITE_PRODUTOS":
        return "O plano Free permite até 50 produtos ativos. Assine o Premium para cadastrar mais."
      case "PLANO_LIMITE_MEMBROS":
        return "O plano Free permite até 3 membros na equipe. Assine o Premium para adicionar mais."
      case "PLANO_RECURSO_PREMIUM":
        return "Este recurso é do plano Premium."
      case "VALIDATION_ERROR": {
        // A API lista os campos com problema em details.issues: mostrar o texto deles, não o genérico.
        const issues = (error.details as { issues?: { message?: string }[] } | undefined)?.issues
        const texts = issues?.map((issue) => issue.message).filter(Boolean)
        return texts?.length ? [...new Set(texts)].join(" ") : error.message
      }
      default:
        return error.message
    }
  }
  return error instanceof Error ? error.message : "Ocorreu um erro inesperado."
}
