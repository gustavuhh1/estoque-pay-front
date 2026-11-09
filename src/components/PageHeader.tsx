import type { ReactNode } from "react"

type PageHeaderProps = { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }

/**
 * Linha de título de todas as telas do painel: título e uma linha de apoio à esquerda, ações à direita.
 * Em telas estreitas as ações descem para a linha de baixo quando não cabem.
 */
export default function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-amber-dark)]">{eyebrow}</p>}
        <h1 className="font-[family-name:var(--font-display)] text-[26px] font-bold leading-tight tracking-[-0.02em] sm:text-[30px]">{title}</h1>
        {description && <div className="mt-0.5 text-sm text-[var(--color-slate)]">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </section>
  )
}
