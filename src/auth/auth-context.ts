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
  isBetterAuth: boolean
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (name: string, email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  refreshSession: () => Promise<UserSession | null>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
