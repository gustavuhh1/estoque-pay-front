import { CircleHelp } from "lucide-react"
import { Link } from "react-router-dom"

import ErrorPage from "@/components/ErrorPage"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <ErrorPage
      tone="neutral"
      icon={<CircleHelp className="h-6 w-6" />}
      eyebrow="404"
      title="Página não encontrada."
      description="O endereço não corresponde a nenhuma tela disponível no EstoquePay."
    >
      <Button asChild variant="accent">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </ErrorPage>
  )
}
