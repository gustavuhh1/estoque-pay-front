import { Link } from "react-router-dom"
import { ArrowLeft, Boxes, KeyRound, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BarcodeStrip } from "@/components/BarcodeStrip"

export default function ForgotPassword() {
  return (
    <div className="min-h-screen bg-[var(--color-paper)] md:grid md:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-[var(--color-ink)] text-white md:flex md:min-h-screen md:flex-col md:justify-between md:p-10 lg:p-12">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10">
            <Boxes className="h-5 w-5 text-[var(--color-amber)]" />
          </div>
          <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">EstoquePay</span>
        </Link>

        <div className="max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-amber)]">Recuperar acesso</p>
          <p className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight lg:text-4xl">
            Você não precisa começar o cadastro novamente.
          </p>
          <p className="mt-5 text-sm leading-6 text-white/60">
            Esta tela mantém o mesmo visual do Login e do Cadastro para o fluxo continuar consistente.
          </p>
        </div>

        <BarcodeStrip className="opacity-30 invert" />
      </aside>

      <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 md:px-10 lg:px-16">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 md:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--color-ink)]">
                <Boxes className="h-5 w-5 text-[var(--color-amber)]" />
              </div>
              <span className="font-[family-name:var(--font-display)] text-lg font-semibold">EstoquePay</span>
            </Link>
            <Link to="/login" className="hidden items-center gap-2 text-xs text-[var(--color-slate)] transition-colors hover:text-[var(--color-ink)] md:flex">
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar para entrar
            </Link>
          </div>

          <div className="rounded-2xl border border-[var(--color-ink)]/10 bg-white p-6 shadow-[0_16px_50px_rgba(27,42,74,0.07)] sm:p-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-paper)]">
              <KeyRound className="h-5 w-5 text-[var(--color-ink)]" />
            </div>
            <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">Recuperar senha</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-slate)]">
              Informe o e-mail da conta para receber as instruções de recuperação.
            </p>

            <form className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="recovery-email">E-mail</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-slate)]/70" />
                  <Input id="recovery-email" type="email" placeholder="voce@sualoja.com.br" className="pl-9" />
                </div>
              </div>

              <Button type="submit" size="lg" variant="accent" className="w-full">Enviar instruções</Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-[var(--color-slate)]">
            Lembrou da senha?{" "}
            <Link to="/login" className="font-semibold text-[var(--color-ink)] hover:underline">Voltar para o login</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
