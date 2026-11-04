import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { ArrowRight, Lock, Mail } from "lucide-react"

import AuthShell, { AuthFooterLink } from "@/components/auth/AuthShell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/auth/useAuth"

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isBetterAuth, signIn } = useAuth()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const from = (location.state as { from?: string } | null)?.from ?? "/painel"

  return (
    <AuthShell footer={<AuthFooterLink text="Não tem acesso?" to="/cadastro" label="Criar loja" />}>
      <form
        className="flex flex-col gap-5"
        onSubmit={async (event) => {
          event.preventDefault()
          setError("")
          setLoading(true)

          try {
            const data = new FormData(event.currentTarget)
            const email = String(data.get("email") ?? "").trim()
            const password = String(data.get("password") ?? "")
            const success = await signIn(email, password)
            if (success) {
              navigate(from, { replace: true })
            } else {
              setError("Não foi possível entrar. Confira seu e-mail e senha e tente novamente.")
            }
          } catch {
            setError("Não foi possível conectar ao serviço de autenticação. Tente novamente.")
          } finally {
            setLoading(false)
          }
        }}
      >
        <div className="space-y-3">
          <Label htmlFor="email">E-mail corporativo</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--color-slate)]" />
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="voce@sualoja.com.br" className="pl-11" required />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="password">Senha</Label>
            <Link to="/recuperar-senha" className="text-[13px] font-bold text-[var(--color-amber)] hover:underline">
              Esqueceu a senha?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--color-slate)]" />
            <Input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" className="pl-11" required />
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium leading-5 text-[var(--color-alert)]">
            {error}
          </p>
        )}

        <Button type="submit" variant="gradient" className="h-12 w-full justify-start px-4 text-[17px]" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
          {!loading && <ArrowRight />}
        </Button>
      </form>

      {!isBetterAuth && (
        <p className="rounded-xl bg-[var(--color-paper)] px-3 py-2 text-center text-[11px] leading-5 text-[var(--color-slate)]">
          Modo demonstração: qualquer e-mail e senha entram com dados locais.
        </p>
      )}
    </AuthShell>
  )
}
