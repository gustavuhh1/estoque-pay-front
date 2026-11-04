import { useState } from "react"
import { ArrowRight, Building2, Lock, Mail, UserRound } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import AuthShell, { AuthFooterLink } from "@/components/auth/AuthShell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/auth/useAuth"

const iconClass = "pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--color-slate)]"

export default function Signup() {
  const navigate = useNavigate()
  const { isBetterAuth, signUp } = useAuth()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  return (
    <AuthShell
      subtitle="Crie sua conta e configure a loja em poucos passos"
      footer={<AuthFooterLink text="Já tem conta?" to="/login" label="Entrar" />}
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={async (event) => {
          event.preventDefault()
          setError("")
          setLoading(true)

          const formData = new FormData(event.currentTarget)
          const storeName = String(formData.get("store") ?? "").trim()
          const name = String(formData.get("name") ?? "").trim()
          const email = String(formData.get("email") ?? "").trim()
          const password = String(formData.get("password") ?? "")

          if (!storeName || !name) {
            setError("Informe o nome da loja e seu nome completo.")
            setLoading(false)
            return
          }

          try {
            const success = await signUp(name, email, password)
            if (success) {
              navigate("/onboarding", { replace: true, state: { storeName } })
            } else {
              setError("Não foi possível criar a conta. Verifique os dados e tente novamente.")
            }
          } catch {
            setError("Não foi possível conectar ao serviço de autenticação. Tente novamente.")
          } finally {
            setLoading(false)
          }
        }}
      >
        <div className="space-y-3">
          <Label htmlFor="store">Nome da loja</Label>
          <div className="relative">
            <Building2 className={iconClass} />
            <Input id="store" name="store" placeholder="Loja Ponto Certo" className="pl-11" minLength={2} autoComplete="organization" required />
          </div>
        </div>
        <div className="space-y-3">
          <Label htmlFor="name">Seu nome</Label>
          <div className="relative">
            <UserRound className={iconClass} />
            <Input id="name" name="name" placeholder="Nome completo" className="pl-11" minLength={2} autoComplete="name" required />
          </div>
        </div>
        <div className="space-y-3">
          <Label htmlFor="email">E-mail</Label>
          <div className="relative">
            <Mail className={iconClass} />
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="voce@sualoja.com.br" className="pl-11" required />
          </div>
        </div>
        <div className="space-y-3">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Lock className={iconClass} />
            <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" className="pl-11" minLength={8} required />
          </div>
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium leading-5 text-[var(--color-alert)]">
            {error}
          </p>
        )}
        <Button disabled={loading} type="submit" variant="gradient" className="h-12 w-full justify-start px-4 text-[17px]">
          {loading ? "Criando..." : "Criar conta"}
          {!loading && <ArrowRight />}
        </Button>
      </form>

      {!isBetterAuth && (
        <p className="rounded-xl bg-[var(--color-paper)] px-3 py-2 text-center text-[11px] leading-5 text-[var(--color-slate)]">
          Modo demonstração: a conta fica só neste navegador, com dados locais.
        </p>
      )}
      <p className="text-xs leading-5 text-[var(--color-slate)]">
        Ao continuar, você concorda com os{" "}
        <Link to="/termos" className="font-semibold text-[var(--color-amber)] hover:underline">Termos de Uso</Link> e a{" "}
        <Link to="/privacidade" className="font-semibold text-[var(--color-amber)] hover:underline">Política de Privacidade</Link>.
      </p>
    </AuthShell>
  )
}
