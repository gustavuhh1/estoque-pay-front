import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"

import { AuthContext, type AuthContextValue, type UserSession } from "@/auth/auth-context"
import { config } from "@/config"
import { UNAUTHORIZED_EVENT } from "@/lib/api"

const DEMO_STORAGE_KEY = "estoquepay.demo.session"
const DEMO_SESSION_TTL = 30 * 60 * 1000

const betterAuthBaseUrl = config.authUrl
const isBetterAuthConfigured = Boolean(betterAuthBaseUrl)
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function betterAuthGetSession() {
  const response = await fetch(`${betterAuthBaseUrl}/get-session`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  })

  // Servidor com problema não é sessão encerrada: quem chama decide mostrar o erro de conexão.
  if (response.status >= 500) throw new Error(`get-session ${response.status}`)
  if (!response.ok) return null
  const payload = await response.json()
  if (!payload?.session || !payload?.user) return null

  const expiresAt = new Date(payload.session.expiresAt).getTime()
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null

  return {
    user: payload.user,
    expiresAt,
  } satisfies UserSession
}

async function betterAuthSignIn(email: string, password: string) {
  const response = await fetch(`${betterAuthBaseUrl}/sign-in/email`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  })
  return response.ok
}

async function betterAuthSignUp(name: string, email: string, password: string) {
  const response = await fetch(`${betterAuthBaseUrl}/sign-up/email`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ name, email, password }),
  })
  return response.ok
}

async function betterAuthSignOut() {
  await fetch(`${betterAuthBaseUrl}/sign-out`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    // O servidor recusa JSON sem corpo (400): sem isso a sessão não é encerrada.
    body: "{}",
  })
}

function readDemoSession() {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as UserSession
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(DEMO_STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    localStorage.removeItem(DEMO_STORAGE_KEY)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [connectionError, setConnectionError] = useState(false)

  const refreshSession = useCallback(async () => {
    if (!isBetterAuthConfigured) {
      const current = readDemoSession()
      setSession(current)
      return current
    }

    try {
      const current = await betterAuthGetSession()
      setSession(current)
      setConnectionError(false)
      return current
    } catch {
      // Sem resposta do servidor: quem já estava logado continua; sem sessão carregada, o ProtectedRoute mostra o erro.
      setConnectionError(true)
      return null
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      setIsLoading(true)
      const current = await refreshSession()
      if (!cancelled) {
        if (current) setSession(current)
        setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [refreshSession])

  // A API respondeu 401 em qualquer chamada: a sessão acabou e o ProtectedRoute leva ao login.
  useEffect(() => {
    const onUnauthorized = () => setSession(null)
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  useEffect(() => {
    const onFocus = () => {
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

  const signIn = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim()
    if (!EMAIL_PATTERN.test(normalizedEmail) || !password.trim()) return false

    if (isBetterAuthConfigured) {
      const signedIn = await betterAuthSignIn(normalizedEmail, password)
      if (!signedIn) return false
      const current = await refreshSession()
      return Boolean(current)
    }

    // Login visual/de demonstração: o backend ainda será ligado posteriormente.
    void password
    const nextSession: UserSession = {
      user: {
        id: "demo-user",
        name: "Usuário EstoquePay",
        email: normalizedEmail,
      },
      expiresAt: Date.now() + DEMO_SESSION_TTL,
    }
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
    return true
  }, [refreshSession])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const normalizedName = name.trim()
    const normalizedEmail = email.trim()
    if (normalizedName.length < 2 || !EMAIL_PATTERN.test(normalizedEmail) || password.length < 8) return false

    if (isBetterAuthConfigured) {
      const signedUp = await betterAuthSignUp(normalizedName, normalizedEmail, password)
      if (!signedUp) return false
      const current = await refreshSession()
      return Boolean(current)
    }

    const nextSession: UserSession = {
      user: {
        id: `demo-user-${Date.now()}`,
        name: normalizedName,
        email: normalizedEmail,
      },
      expiresAt: Date.now() + DEMO_SESSION_TTL,
    }
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
    return true
  }, [refreshSession])

  const signOut = useCallback(async () => {
    if (isBetterAuthConfigured) {
      try {
        await betterAuthSignOut()
      } finally {
        setSession(null)
      }
      return
    }

    localStorage.removeItem(DEMO_STORAGE_KEY)
    setSession(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      isAuthenticated: Boolean(session),
      connectionError,
      isBetterAuth: isBetterAuthConfigured,
      signIn,
      signUp,
      signOut,
      refreshSession,
    }),
    [connectionError, isLoading, refreshSession, session, signIn, signOut, signUp],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
