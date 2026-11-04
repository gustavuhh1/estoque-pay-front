import { useMemo, useState, type FormEvent } from "react"
import { ArrowRight, CheckCircle2, Lock, ShieldAlert } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { resetPassword } from "@/auth/passwordApi"
import AuthShell from "@/components/auth/AuthShell"
import { config } from "@/config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const iconClass = "pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--color-slate)]"

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get("token")
  // Com o servidor, o link do e-mail volta com ?error=INVALID_TOKEN quando o token venceu ou já foi usado.
  const validToken = useMemo(() => (config.authUrl ? Boolean(token) && !params.get("error") : token !== "expired" && token !== "invalid"), [params, token])
  const [invalidated, setInvalidated] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [saved, setSaved] = useState(false)
  const navigate = useNavigate()

  if (!validToken || invalidated) {
    return (
      <AuthShell backTo="/login" backLabel="Voltar para entrar" subtitle="Redefinição de senha">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-alert-soft)] text-[var(--color-alert)]"><ShieldAlert className="h-6 w-6" /></span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">Link expirado ou inválido</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-slate)]">Solicite um novo e-mail de recuperação para gerar um link válido.</p>
          <Button className="mt-6 h-12 w-full" variant="gradient" onClick={() => navigate("/recuperar-senha")}>Solicitar novo link</Button>
        </div>
      </AuthShell>
    )
  }

  if (saved) {
    return (
      <AuthShell backTo="/login" backLabel="Voltar para entrar" subtitle="Redefinição de senha">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-stock-green-soft)] text-[var(--color-stock-green)]"><CheckCircle2 className="h-6 w-6" /></span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">Senha redefinida</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-slate)]">{config.authUrl ? "Sua senha foi alterada. Entre com a nova senha." : "No modo demonstração a troca é simulada. Siga para o login."}</p>
          <Button className="mt-6 h-12 w-full" variant="gradient" onClick={() => navigate("/login", { replace: true })}>Voltar para o login</Button>
        </div>
      </AuthShell>
    )
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (password.length < 8 || password !== confirm) return
    if (!config.authUrl) return setSaved(true)
    setBusy(true)
    setError("")
    const result = await resetPassword(token ?? "", password)
    setBusy(false)
    if (result.ok) return setSaved(true)
    if (result.invalidToken) return setInvalidated(true)
    setError(result.error)
  }

  const mismatch = Boolean(password && confirm && password !== confirm)

  return (
    <AuthShell backTo="/login" backLabel="Voltar para entrar" subtitle="Redefinição de senha">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Defina sua nova senha</h1>
        <p className="mt-1.5 text-sm leading-6 text-[var(--color-slate)]">Use pelo menos 8 caracteres e repita a senha para confirmar.</p>
      </div>
      <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
        <div className="space-y-3">
          <Label htmlFor="new-password">Nova senha</Label>
          <div className="relative"><Lock className={iconClass} /><Input id="new-password" type="password" className="pl-11" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /></div>
        </div>
        <div className="space-y-3">
          <Label htmlFor="confirm-password">Confirmar senha</Label>
          <div className="relative"><Lock className={iconClass} /><Input id="confirm-password" type="password" className="pl-11" aria-invalid={mismatch} value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required /></div>
        </div>
        {mismatch && <p className="text-xs font-medium text-[var(--color-alert)]">As senhas precisam ser iguais.</p>}
        {error && <p role="alert" className="rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium text-[var(--color-alert-dark)]">{error}</p>}
        <Button type="submit" className="h-12 w-full justify-start px-4 text-[17px]" variant="gradient" disabled={busy}>
          {busy ? "Salvando..." : "Redefinir senha"}
          {!busy && <ArrowRight />}
        </Button>
      </form>
    </AuthShell>
  )
}
