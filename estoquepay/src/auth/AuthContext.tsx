import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { AuthContext, type AuthContextValue, type UserSession } from "@/auth/auth-context"

const DEMO_STORAGE_KEY = "estoquepay.demo.session"
const DEMO_SESSION_TTL = 30 * 60 * 1000
const FOCUS_REFRESH_MIN_INTERVAL = 30_000

const betterAuthBaseUrl = import.meta.env.VITE_BETTER_AUTH_URL?.replace(/\/$/, "") ?? ""
const isBetterAuth = Boolean(betterAuthBaseUrl)
// O modo demo aceita qualquer senha. Só liga em desenvolvimento ou com flag explícita,
// para que um build de produção sem VITE_BETTER_AUTH_URL não abra o painel para todo mundo.
const isDemo = !isBetterAuth && (import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === "true")
const isMisconfigured = !isBetterAuth && !isDemo

/** Lança em falha de rede/servidor (5xx); retorna null quando simplesmente não há sessão. */
async function betterAuthGetSession(): Promise<UserSession | null> {
  const response = await fetch(`${betterAuthBaseUrl}/get-session`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  })

  if (response.status === 401 || response.status === 403) return null
  if (!response.ok) throw new Error(`get-session respondeu ${response.status}`)

  const payload = await response.json()
  if (!payload?.session || !payload?.user) return null

  const expiresAt = new Date(payload.session.expiresAt).getTime()
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null

  return { user: payload.user, expiresAt }
}

async function betterAuthPost(path: string, body?: Record<string, string>) {
  const response = await fetch(`${betterAuthBaseUrl}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  return response.ok
}

function readDemoSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as UserSession
    if (!parsed?.user?.id || !parsed.expiresAt || parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(DEMO_STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function createDemoSession(name: string, email: string): UserSession {
  const session: UserSession = {
    user: {
      id: "demo-user",
      name: name || "Usuário EstoquePay",
      email: email || "demo@estoquepay.local",
    },
    expiresAt: Date.now() + DEMO_SESSION_TTL,
  }
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Armazenamento indisponível (modo privado/quota): a sessão vale só até recarregar.
  }
  return session
}

/** Mantém a mesma referência quando a sessão não mudou, evitando re-render a cada checagem. */
function keepIfSame(prev: UserSession | null, next: UserSession | null) {
  if (prev === next) return prev
  if (prev && next && prev.user.id === next.user.id && prev.expiresAt === next.expiresAt) return prev
  return next
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasNetworkError, setHasNetworkError] = useState(false)
  const sessionRef = useRef<UserSession | null>(null)
  const lastFocusCheck = useRef(0)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const applySession = useCallback((next: UserSession | null) => {
    setSession((prev) => keepIfSame(prev, next))
  }, [])

  const refreshSession = useCallback(async () => {
    if (isMisconfigured) {
      applySession(null)
      return null
    }

    if (isDemo) {
      const current = readDemoSession()
      applySession(current)
      return current
    }

    try {
      const current = await betterAuthGetSession()
      applySession(current)
      setHasNetworkError(false)
      return current
    } catch {
      // Falha de rede/servidor não é "sessão inválida": preserva a sessão atual e sinaliza o erro.
      setHasNetworkError(true)
      return sessionRef.current
    }
  }, [applySession])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      await refreshSession()
      if (!cancelled) setIsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [refreshSession])

  useEffect(() => {
    const onFocus = () => {
      if (Date.now() - lastFocusCheck.current < FOCUS_REFRESH_MIN_INTERVAL) return
      lastFocusCheck.current = Date.now()
      void refreshSession()
    }

    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [refreshSession])

  useEffect(() => {
    if (!session) return

    const remaining = session.expiresAt - Date.now()
    const refreshDelay = Math.max(15_000, Math.min(remaining - 60_000, 5 * 60_000))
    const timer = window.setTimeout(() => {
      void refreshSession()
    }, refreshDelay)

    return () => window.clearTimeout(timer)
  }, [session, refreshSession])

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (isMisconfigured) return false

      if (isBetterAuth) {
        if (!(await betterAuthPost("/sign-in/email", { email, password }))) return false
        const current = await betterAuthGetSession() // lança em falha de rede
        applySession(current)
        setHasNetworkError(false)
        return Boolean(current)
      }

      // Login de demonstração: o backend ainda será ligado posteriormente.
      void password
      applySession(createDemoSession("", email))
      return true
    },
    [applySession],
  )

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      if (isMisconfigured) return false

      if (isBetterAuth) {
        if (!(await betterAuthPost("/sign-up/email", { name, email, password }))) return false
        const current = await betterAuthGetSession() // lança em falha de rede
        applySession(current)
        setHasNetworkError(false)
        return Boolean(current)
      }

      applySession(createDemoSession(name, email))
      return true
    },
    [applySession],
  )

  const signOut = useCallback(async () => {
    if (isBetterAuth) {
      try {
        await betterAuthPost("/sign-out")
      } catch {
        // Sem rede: encerra a sessão local mesmo assim.
      } finally {
        setSession(null)
      }
      return
    }

    try {
      localStorage.removeItem(DEMO_STORAGE_KEY)
    } catch {
      // ignora
    }
    setSession(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      isAuthenticated: Boolean(session),
      isBetterAuth,
      isDemo,
      isMisconfigured,
      hasNetworkError,
      signIn,
      signUp,
      signOut,
      refreshSession,
    }),
    [hasNetworkError, isLoading, refreshSession, session, signIn, signOut, signUp],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
