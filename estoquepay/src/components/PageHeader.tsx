import type { ReactNode } from "react"

type PageHeaderProps = { eyebrow: string; title: string; description: ReactNode; actions?: ReactNode }

export default function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-dark)]">{eyebrow}</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-slate)]">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </section>
  )
}
