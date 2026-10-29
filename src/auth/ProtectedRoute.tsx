import { Navigate, Outlet, useLocation } from "react-router-dom"
import { LoaderCircle, WifiOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/auth/useAuth"
import { config } from "@/config"
import { useStores } from "@/store/useStores"

function Screen({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-[var(--color-paper)] px-5">{children}</div>
}

function Loading({ message }: { message: string }) {
  return (
    <Screen>
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-[var(--color-slate)]">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          {message}
        </div>
        <Skeleton className="mx-auto mt-5 h-2 w-40" />
        {config.useApi && <p className="mt-4 text-xs text-[var(--color-slate)]">O servidor gratuito hiberna quando fica parado: a primeira abertura pode levar até 1 minuto.</p>}
      </div>
    </Screen>
  )
}

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const { isLoading: storesLoading, loadError, stores, reload } = useStores()
  const location = useLocation()

  if (isLoading) return <Loading message="Verificando sua sessão..." />

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // Com a API, as lojas do usuário vêm do servidor: só depois disso as telas podem renderizar.
  if (config.useApi) {
    if (storesLoading) return <Loading message="Carregando suas lojas..." />
    if (loadError) {
      return (
        <Screen>
          <div className="w-full max-w-md text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-alert-soft)] text-[var(--color-alert)]">
              <WifiOff className="h-6 w-6" />
            </span>
            <h1 className="mt-5 text-2xl font-bold">Não foi possível carregar suas lojas</h1>
            <p className="mt-2 text-sm text-[var(--color-slate)]">{loadError}</p>
            <Button className="mt-6" variant="accent" onClick={() => void reload()}>
              Tentar de novo
            </Button>
          </div>
        </Screen>
      )
    }
    // Conta nova, sem nenhuma loja: o primeiro passo é criar a loja.
    if (stores.length === 0 && location.pathname !== "/onboarding") return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
