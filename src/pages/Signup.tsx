import { useState } from "react"
import { ArrowLeft, Boxes, Building2, CheckCircle2, LockKeyhole, UserRound } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BarcodeStrip } from "@/components/BarcodeStrip"
import { useAuth } from "@/auth/AuthContext"

export default function Signup() {
  const navigate = useNavigate()
  const { isBetterAuth, signUp } = useAuth()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  return (
    <div className="min-h-screen bg-[var(--color-paper)] md:grid md:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-[var(--color-ink)] text-white md:flex md:min-h-screen md:flex-col md:justify-between md:p-10 lg:p-12">
        <Link to="/" className="flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10"><Boxes className="h-5 w-5 text-[var(--color-amber)]" /></div><span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">EstoquePay</span></Link>
        <div className="max-w-md"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-amber)]">Criar conta</p><p className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight lg:text-4xl">Leva poucos passos para colocar sua loja no ar.</p><div className="mt-8 space-y-3">{["Controle de estoque em tempo real","Pagamentos e repasses no mesmo painel","Alertas antes de faltar produto"].map((item) => <div key={item} className="flex items-start gap-2.5 text-sm text-white/75"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-amber)]" /><span>{item}</span></div>)}</div></div>
        <BarcodeStrip className="opacity-30 invert" />
      </aside>

      <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 md:px-10 lg:px-16"><div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between"><Link to="/" className="flex items-center gap-2.5 md:hidden"><div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--color-amber)]"><Boxes className="h-5 w-5 text-white" /></div><span className="font-[family-name:var(--font-display)] text-lg font-semibold">EstoquePay</span></Link><Link to="/" className="hidden items-center gap-2 text-xs text-[var(--color-slate)] transition-colors hover:text-[var(--color-ink)] md:flex"><ArrowLeft className="h-3.5 w-3.5" />Voltar para o início</Link></div>
        <div className="rounded-2xl border border-[var(--color-ink)]/10 bg-white p-6 shadow-[0_16px_50px_rgba(13,28,46,0.07)] sm:p-8"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-paper)]"><UserRound className="h-5 w-5 text-[var(--color-ink)]" /></div><h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">Criar sua conta</h1><p className="mt-2 text-sm leading-6 text-[var(--color-slate)]">Cadastre sua conta e siga para configurar seu estabelecimento.</p>
          <form className="mt-8 space-y-5" onSubmit={async (event) => { event.preventDefault(); setError(""); setLoading(true); const form = event.currentTarget; const fd = new FormData(form); const success = await signUp(String(fd.get("name") ?? ""), String(fd.get("email") ?? ""), String(fd.get("password") ?? "")); setLoading(false); if (success) navigate("/onboarding", { replace: true }); else setError("Não foi possível criar a conta. Verifique os dados e tente novamente.") }}>
            <div className="space-y-2"><Label htmlFor="store">Nome da loja</Label><div className="relative"><Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-slate)]/70" /><Input id="store" name="store" placeholder="Loja Ponto Certo" className="pl-9" /></div></div>
            <div className="space-y-2"><Label htmlFor="name">Seu nome</Label><Input id="name" name="name" placeholder="Nome completo" required /></div>
            <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" placeholder="voce@sualoja.com.br" required /></div>
            <div className="space-y-2"><Label htmlFor="password">Senha</Label><div className="relative"><Input id="password" name="password" type="password" placeholder="Mínimo 8 caracteres" minLength={8} required /><LockKeyhole className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-slate)]/60" /></div></div>
            {error && <p className="rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium leading-5 text-[var(--color-alert)]">{error}</p>}
            <Button disabled={loading} type="submit" size="lg" variant="accent" className="w-full">{loading ? "Criando..." : "Criar conta"}</Button>
          </form>
          {!isBetterAuth && <p className="mt-4 rounded-xl bg-[var(--color-paper)] px-3 py-2 text-center text-[11px] leading-5 text-[var(--color-slate)]">Prévia de cadastro: a criação de conta usa a sessão local enquanto o Better Auth não estiver configurado.</p>}
          <p className="mt-6 text-xs leading-5 text-[var(--color-slate)]">Ao continuar, você concorda com os <Link to="/termos" className="font-medium text-[var(--color-ink)] underline underline-offset-2">Termos de Uso</Link> e a <Link to="/privacidade" className="font-medium text-[var(--color-ink)] underline underline-offset-2">Política de Privacidade</Link>.</p>
        </div>
        <p className="mt-6 text-center text-sm text-[var(--color-slate)]">Já tem conta? <Link to="/login" className="font-semibold text-[var(--color-ink)] hover:underline">Entrar</Link></p>
      </div></main>
    </div>
  )
}
