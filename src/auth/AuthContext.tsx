import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

export type UserSession = {
  user: {
    id: string
    name: string
    email: string
  }
  expiresAt: number
}

type AuthContextValue = {
  session: UserSession | null
  isLoading: boolean
  isAuthenticated: boolean
  isBetterAuth: boolean
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (name: string, email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  refreshSession: () => Promise<UserSession | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const DEMO_STORAGE_KEY = "estoquepay.demo.session"
const DEMO_SESSION_TTL = 30 * 60 * 1000

const betterAuthBaseUrl = import.meta.env.VITE_BETTER_AUTH_URL?.replace(/\/$/, "") ?? ""
const isBetterAuthConfigured = Boolean(betterAuthBaseUrl)

async function betterAuthGetSession() {
  const response = await fetch(`${betterAuthBaseUrl}/get-session`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  })

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

  const refreshSession = useCallback(async () => {
    if (!isBetterAuthConfigured) {
      const current = readDemoSession()
      setSession(current)
      return current
    }

    try {
      const current = await betterAuthGetSession()
      setSession(current)
      return current
    } catch {
      setSession(null)
      return null
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      setIsLoading(true)
      const current = await refreshSession()
      if (!cancelled) {
        setSession(current)
        setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [refreshSession])

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
    if (isBetterAuthConfigured) {
      const signedIn = await betterAuthSignIn(email, password)
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
        email: email || "demo@estoquepay.local",
      },
      expiresAt: Date.now() + DEMO_SESSION_TTL,
    }
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
    return true
  }, [refreshSession])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    if (isBetterAuthConfigured) {
      const signedUp = await betterAuthSignUp(name, email, password)
      if (!signedUp) return false
      const current = await refreshSession()
      return Boolean(current)
    }

    const nextSession: UserSession = {
      user: {
        id: `demo-user-${Date.now()}`,
        name: name || "Usuário EstoquePay",
        email: email || "demo@estoquepay.local",
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
      isBetterAuth: isBetterAuthConfigured,
      signIn,
      signUp,
      signOut,
      refreshSession,
    }),
    [isLoading, refreshSession, session, signIn, signOut, signUp],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth precisa estar dentro de AuthProvider")
  return context
}
