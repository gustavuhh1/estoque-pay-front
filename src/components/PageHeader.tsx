import type { ReactNode } from "react"

type PageHeaderProps = { eyebrow?: string; title: string; description: ReactNode; actions?: ReactNode }

export default function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div>
        {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-amber-dark)]">{eyebrow}</p>}
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-[-0.02em] sm:text-[34px]">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-6 text-[var(--color-slate)]">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </section>
  )
}
