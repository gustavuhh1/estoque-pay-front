import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

import selo from "@/assets/brand/selo-estoquepay.jpg"
import logo from "@/assets/brand/logo-estoquepay.jpg"

type AuthShellProps = {
  /** Destino do link do canto superior (padrão: o site). */
  backTo?: string
  backLabel?: string
  subtitle?: string
  /** Conteúdo do card central. */
  children: ReactNode
  /** Pílula abaixo do card, ex.: "Não tem acesso? Criar loja". */
  footer?: ReactNode
}

/** Layout das telas de acesso (Figma "02 — Login / Default"): marca centralizada, card único e links legais. */
export default function AuthShell({
  backTo = "/",
  backLabel = "Voltar ao site",
  subtitle = "Acesso à gestão de estoque e PDV",
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-7 bg-[var(--color-paper)] px-6 pb-10 pt-20">
      <Link
        to={backTo}
        className="absolute left-6 top-6 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--color-amber)] hover:underline sm:left-8"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <Link to="/" className="flex flex-col items-center gap-2.5" aria-label="EstoquePay">
        <img src={selo} alt="" width={56} height={56} className="h-14 w-14 rounded-[14px]" />
        <img src={logo} alt="EstoquePay" width={136} height={34} className="h-[34px] w-[136px]" />
      </Link>
      <p className="-mt-4 text-[15px] font-medium leading-[1.55] text-[var(--color-slate)]">{subtitle}</p>

      <div className="flex w-full max-w-[440px] flex-col gap-5 rounded-[20px] bg-white p-6 shadow-[0_12px_32px_rgba(11,28,48,0.1)] sm:p-8">
        {children}
      </div>

      {footer && (
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-[22px] bg-[var(--color-nav)] px-[22px] py-3.5 text-xs uppercase leading-[1.4] tracking-[0.08em]">
          {footer}
        </div>
      )}

      <nav className="flex gap-6 text-[11px] font-bold uppercase leading-[1.4] tracking-[0.08em] text-[var(--color-faint)]">
        <Link to="/termos" className="hover:text-[var(--color-ink)]">Termos de uso</Link>
        <Link to="/privacidade" className="hover:text-[var(--color-ink)]">Privacidade</Link>
      </nav>
    </div>
  )
}

/** Texto e link da pílula do rodapé (ex.: "Não tem acesso?" + "Criar loja"). */
export function AuthFooterLink({ text, to, label }: { text: string; to: string; label: string }) {
  return (
    <>
      <span className="font-bold text-[var(--color-slate)]">{text}</span>
      <Link to={to} className="font-extrabold text-[var(--color-amber)] hover:underline">{label}</Link>
    </>
  )
}
