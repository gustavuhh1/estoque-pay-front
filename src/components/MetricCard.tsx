import type { LucideIcon } from "lucide-react"

import { Card } from "@/components/ui/card"

type Tone = "brand" | "info" | "warning" | "danger"

const tones: Record<Tone, { icon: string; badge: string }> = {
  brand: { icon: "bg-[var(--color-stock-green-soft)] text-[var(--color-amber)]", badge: "bg-[var(--color-green-100)] text-[var(--color-amber-dark)]" },
  info: { icon: "bg-[var(--color-info-soft)] text-[var(--color-info)]", badge: "bg-[var(--color-info-soft)] text-[var(--color-info)]" },
  warning: { icon: "bg-[var(--color-warn-soft)] text-[var(--color-warn)]", badge: "bg-[var(--color-warn-soft)] text-[var(--color-warn)]" },
  danger: { icon: "bg-[var(--color-alert-soft)] text-[var(--color-alert)]", badge: "bg-[var(--color-alert-soft)] text-[var(--color-alert)]" },
}

type MetricCardProps = { icon: LucideIcon; label: string; value: string; badge?: string; tone?: Tone }

/** Indicador do design system: ícone, selo opcional, rótulo e valor grande. */
export default function MetricCard({ icon: Icon, label, value, badge, tone = "brand" }: MetricCardProps) {
  const style = tones[tone]
  return (
    <Card className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
      <div className="flex items-center justify-between gap-2">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${style.icon}`}>
          <Icon className="h-5 w-5" />
        </span>
        {badge && <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${style.badge}`}>{badge}</span>}
      </div>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-slate)]">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-[-0.02em] tabular-nums">{value}</p>
    </Card>
  )
}
