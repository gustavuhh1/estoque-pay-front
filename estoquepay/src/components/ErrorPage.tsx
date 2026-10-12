import type { ReactNode } from "react"

type ErrorPageProps = {
  icon: ReactNode
  eyebrow: string
  title: string
  description: string
  tone?: "alert" | "neutral"
  children: ReactNode // ação principal (botão/link)
}

export default function ErrorPage({ icon, eyebrow, title, description, tone = "alert", children }: ErrorPageProps) {
  const toneClass =
    tone === "alert"
      ? "bg-[var(--color-alert-soft)] text-[var(--color-alert-dark)]"
      : "bg-[var(--color-paper-dim)] text-[var(--color-ink)]"

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-paper)] px-5 py-10">
      <div className="w-full max-w-xl text-center">
        <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${toneClass}`}>{icon}</span>
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-dark)]">{eyebrow}</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-slate)]">{description}</p>
        <div className="mt-7">{children}</div>
      </div>
    </div>
  )
}
