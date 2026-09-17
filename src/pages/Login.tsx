import { Link } from "react-router-dom"
import { ArrowLeft, Boxes, Eye, LockKeyhole, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BarcodeStrip } from "@/components/BarcodeStrip"

export default function Login() {
  return (
    <div className="min-h-screen bg-[var(--color-paper)] md:grid md:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-[var(--color-ink)] text-white md:flex md:min-h-screen md:flex-col md:justify-between md:p-10 lg:p-12">
        <div className="absolute inset-x-0 bottom-0 h-48 bg-[radial-gradient(circle_at_center,rgba(232,163,61,0.18),transparent_65%)]" />

        <Link to="/" className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10">
            <Boxes className="h-5 w-5 text-[var(--color-amber)]" />
          </div>
          <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
            EstoquePay
          </span>
        </Link>

        <div className="relative max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-amber)]">
            Entrar
          </p>
          <p className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight lg:text-4xl">
            "Antes eu fechava o caixa comparando três planilhas. Hoje é uma tela só."
          </p>
          <p className="mt-5 text-sm text-white/60">Fernanda Alves — Loja Ponto Certo</p>

          <div className="mt-10 grid grid-cols-3 gap-3 text-xs text-white/60">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">Estoque</div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">Vendas</div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">Pagamentos</div>
          </div>
        </div>

        <BarcodeStrip className="relative opacity-30 invert" />
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
            <Link to="/" className="hidden items-center gap-2 text-xs text-[var(--color-slate)] transition-colors hover:text-[var(--color-ink)] md:flex">
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar para o início
            </Link>
          </div>

          <div className="rounded-2xl border border-[var(--color-ink)]/10 bg-white p-6 shadow-[0_16px_50px_rgba(27,42,74,0.07)] sm:p-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-paper)]">
              <LockKeyhole className="h-5 w-5 text-[var(--color-ink)]" />
            </div>
            <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">Entrar na sua conta</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-slate)]">Acesse o painel de estoque e pagamentos da sua loja.</p>

            <form className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-slate)]/70" />
                  <Input id="email" type="email" placeholder="voce@sualoja.com.br" className="pl-9" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="password">Senha</Label>
                  <Link to="/recuperar-senha" className="text-xs font-medium text-[var(--color-ink)]/70 transition-colors hover:text-[var(--color-ink)] hover:underline">
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative">
                  <Input id="password" type="password" placeholder="••••••••" className="pr-10" />
                  <Eye className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-slate)]/60" />
                </div>
              </div>

              <Button type="submit" size="lg" variant="accent" className="w-full">
                Entrar
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-[var(--color-slate)]">
            Ainda não tem conta?{" "}
            <Link to="/cadastro" className="font-semibold text-[var(--color-ink)] hover:underline">Cadastre sua loja</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
