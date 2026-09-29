import { useMemo, useState, type FormEvent, type ReactNode } from "react"
import { ArrowLeft, Boxes, CheckCircle2, KeyRound, ShieldAlert } from "lucide-react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get("token")
  const validToken = useMemo(() => token !== "expired" && token !== "invalid", [token])
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [saved, setSaved] = useState(false)
  const navigate = useNavigate()

  if (!validToken) {
    return (
      <AuthShell title="Link expirado ou inválido">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-alert-soft)] text-[var(--color-alert)]"><ShieldAlert className="h-6 w-6" /></span>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-2xl font-semibold">Não foi possível redefinir sua senha.</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-slate)]">Solicite um novo e-mail de recuperação para gerar um link válido.</p>
          <Button className="mt-6" variant="accent" onClick={() => navigate("/recuperar-senha")}>Solicitar novo link</Button>
        </div>
      </AuthShell>
    )
  }

  if (saved) {
    return (
      <AuthShell title="Senha redefinida">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-stock-green-soft)] text-[var(--color-stock-green)]"><CheckCircle2 className="h-6 w-6" /></span>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-2xl font-semibold">Tudo certo.</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-slate)]">A próxima etapa do backend será concluir a troca da credencial. No protótipo, o fluxo pode seguir para o login.</p>
          <Button className="mt-6" variant="accent" onClick={() => navigate("/login", { replace: true })}>Voltar para o login</Button>
        </div>
      </AuthShell>
    )
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (password.length >= 8 && password === confirm) setSaved(true)
  }

  return (
    <AuthShell title="Criar nova senha">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-paper)]"><KeyRound className="h-5 w-5" /></div>
      <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">Defina sua nova senha</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--color-slate)]">Use pelo menos 8 caracteres e repita a senha para confirmar.</p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        <div className="space-y-2"><Label htmlFor="new-password">Nova senha</Label><Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /></div>
        <div className="space-y-2"><Label htmlFor="confirm-password">Confirmar senha</Label><Input id="confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required /></div>
        {password && confirm && password !== confirm && <p className="text-xs font-medium text-[var(--color-alert)]">As senhas precisam ser iguais.</p>}
        <Button type="submit" className="w-full" size="lg" variant="accent">Redefinir senha</Button>
      </form>
    </AuthShell>
  )
}

function AuthShell({ children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-paper)]">
      <header className="border-b border-[var(--color-border)] bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-6"><Link to="/" className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-amber)] text-white"><Boxes className="h-5 w-5" /></span><span className="font-[family-name:var(--font-display)] text-lg font-semibold">EstoquePay</span></Link><Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-slate)] hover:text-[var(--color-ink)]"><ArrowLeft className="h-3.5 w-3.5" />Login</Link></div></header>
      <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-5xl items-center justify-center px-5 py-10 sm:px-6"><Card className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[0_16px_50px_rgba(13,28,46,0.06)] sm:p-8">{children}</Card></main>
    </div>
  )
}
