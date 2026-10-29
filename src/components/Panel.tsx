import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { Card } from "@/components/ui/card"

type PanelProps = {
  title: string
  /** Texto pequeno à direita do título. */
  note?: string
  /** Link de ação à direita do título. */
  action?: { label: string; to: string }
  children: ReactNode
}

/** Cartão com título e ação (padrão dos blocos do Painel). */
export default function Panel({ title, note, action, children }: PanelProps) {
  return (
    <Card className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{title}</h2>
        {note && <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-slate)]">{note}</span>}
        {action && (
          <Link to={action.to} className="text-sm font-bold text-[var(--color-amber)] hover:underline">
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </Card>
  )
}
