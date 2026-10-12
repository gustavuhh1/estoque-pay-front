import { createContext } from "react"

export type UserSession = {
  user: {
    id: string
    name: string
    email: string
  }
  expiresAt: number
}

export type AuthContextValue = {
  session: UserSession | null
  isLoading: boolean
  isAuthenticated: boolean
  /** Backend Better Auth configurado (VITE_BETTER_AUTH_URL). */
  isBetterAuth: boolean
  /** Sessão local de demonstração (apenas em dev ou com VITE_DEMO_MODE=true). */
  isDemo: boolean
  /** Sem Better Auth e sem modo demo: o app não tem como autenticar. */
  isMisconfigured: boolean
  /** A última checagem de sessão falhou por rede/servidor (não por credencial). */
  hasNetworkError: boolean
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (name: string, email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  refreshSession: () => Promise<UserSession | null>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
