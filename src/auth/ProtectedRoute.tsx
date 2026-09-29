import { Navigate, Outlet, useLocation } from "react-router-dom"
import { LoaderCircle } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/auth/AuthContext"

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-paper)] px-5">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-2 text-sm text-[var(--color-slate)]"><LoaderCircle className="h-4 w-4 animate-spin" />Verificando sua sessão...</div>
          <Skeleton className="mx-auto mt-5 h-2 w-40" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
