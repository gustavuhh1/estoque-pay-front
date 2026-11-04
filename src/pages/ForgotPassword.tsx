import { useState, type FormEvent } from "react"
import { ArrowRight, Mail, Send } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { requestPasswordReset } from "@/auth/passwordApi"
import AuthShell, { AuthFooterLink } from "@/components/auth/AuthShell"
import { Button } from "@/components/ui/button"
import { config } from "@/config"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Sem servidor configurado (demonstração), o envio é simulado.
    if (!config.authUrl) return setSent(true)
    setBusy(true)
    setError("")
    const failure = await requestPasswordReset(String(new FormData(event.currentTarget).get("email") ?? "").trim())
    setBusy(false)
    if (failure) return setError(failure)
    setSent(true)
  }

  return (
    <AuthShell
      backTo="/login"
      backLabel="Voltar para entrar"
      subtitle="Recuperar o acesso à sua conta"
      footer={sent ? undefined : <AuthFooterLink text="Lembrou da senha?" to="/login" label="Entrar" />}
    >
      {sent ? (
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-stock-green-soft)] text-[var(--color-stock-green)]">
            <Send className="h-5 w-5" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">Instruções enviadas</h1>
          {config.authUrl ? (
            <p className="mt-2 text-sm leading-6 text-[var(--color-slate)]">
              Se existir uma conta com este e-mail, enviamos um link para criar uma nova senha. Ele vale por 1 hora. Confira também a caixa de spam.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm leading-6 text-[var(--color-slate)]">No modo demonstração, o botão abaixo faz o papel do link que chegaria por e-mail.</p>
              <Button className="mt-6 h-12 w-full" variant="gradient" onClick={() => navigate("/redefinir-senha?token=demo")}>
                Abrir redefinição de senha
              </Button>
            </>
          )}
          <Link className="mt-5 inline-block text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--color-amber)] hover:underline" to="/login">
            Voltar ao login
          </Link>
        </div>
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Recuperar senha</h1>
            <p className="mt-1.5 text-sm leading-6 text-[var(--color-slate)]">Informe o e-mail da conta para receber o link de redefinição.</p>
          </div>
          <form className="flex flex-col gap-5" onSubmit={(event) => void submit(event)}>
            <div className="space-y-3">
              <Label htmlFor="recovery-email">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--color-slate)]" />
                <Input id="recovery-email" name="email" type="email" placeholder="voce@sualoja.com.br" className="pl-11" required />
              </div>
            </div>
            {error && (
              <p role="alert" className="rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium text-[var(--color-alert-dark)]">
                {error}
              </p>
            )}
            <Button type="submit" variant="gradient" className="h-12 w-full justify-start px-4 text-[17px]" disabled={busy}>
              {busy ? "Enviando..." : "Enviar instruções"}
              {!busy && <ArrowRight />}
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  )
}
