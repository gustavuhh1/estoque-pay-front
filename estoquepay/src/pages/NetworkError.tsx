import { useState } from "react"
import { WifiOff } from "lucide-react"
import { useNavigate } from "react-router-dom"

import ErrorPage from "@/components/ErrorPage"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/auth/useAuth"

export default function NetworkError() {
  const navigate = useNavigate()
  const { refreshSession } = useAuth()
  const [retrying, setRetrying] = useState(false)

  async function retry() {
    setRetrying(true)
    await refreshSession()
    setRetrying(false)
    // O ProtectedRoute decide o destino: painel (ok), login (sem sessão) ou volta para cá (rede ainda fora).
    navigate("/painel", { replace: true })
  }

  return (
    <ErrorPage
      tone="neutral"
      icon={<WifiOff className="h-6 w-6" />}
      eyebrow="Erro de rede"
      title="Não conseguimos atualizar seus dados."
      description="Confira sua conexão e tente novamente."
    >
      <Button variant="accent" onClick={retry} disabled={retrying}>
        {retrying ? "Tentando..." : "Tentar novamente"}
      </Button>
    </ErrorPage>
  )
}
