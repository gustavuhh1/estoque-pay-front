import { ShieldX } from "lucide-react"
import { Link } from "react-router-dom"

import ErrorPage from "@/components/ErrorPage"
import { Button } from "@/components/ui/button"

export default function Forbidden() {
  return (
    <ErrorPage
      icon={<ShieldX className="h-6 w-6" />}
      eyebrow="403"
      title="Você não tem acesso a esta área."
      description="O layout já prevê a resposta visual para acessos bloqueados. A autorização definitiva virá do backend."
    >
      <Button asChild variant="accent">
        <Link to="/painel">Voltar ao Dashboard</Link>
      </Button>
    </ErrorPage>
  )
}
