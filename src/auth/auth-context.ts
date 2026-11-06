import { createContext } from "react"

export type UserSession = {
  user: {
    id: string
    name: string
    email: string
    /** Foto (URL do Google ou data URI enviado no Meu perfil). */
    image?: string | null
  }
  expiresAt: number
}

export type AuthContextValue = {
  session: UserSession | null
  isLoading: boolean
  isAuthenticated: boolean
  /** O servidor não respondeu ao verificar a sessão (sem rede ou fora do ar): não é o mesmo que sessão encerrada. */
  connectionError: boolean
  isBetterAuth: boolean
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (name: string, email: string, password: string) => Promise<boolean>
  /** Leva ao Google; só resolve `false` quando o servidor não devolve a URL de autorização. */
  signInWithGoogle: () => Promise<boolean>
  signOut: () => Promise<void>
  refreshSession: () => Promise<UserSession | null>
  /** Modo demonstração: grava nome e foto na sessão local (com a API, use refreshSession). */
  patchDemoUser: (patch: { name?: string; image?: string | null }) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
