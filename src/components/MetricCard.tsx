import type { LucideIcon } from "lucide-react"

import { Card } from "@/components/ui/card"

type Tone = "brand" | "info" | "warning" | "danger"
type BadgeTone = Tone | "neutral"

const neutralBadge = "bg-[var(--color-paper-dim)] text-[var(--color-slate)]"

const tones: Record<Tone, { icon: string; badge: string }> = {
  brand: { icon: "bg-[var(--color-stock-green-soft)] text-[var(--color-amber)]", badge: "bg-[var(--color-green-100)] text-[var(--color-amber-dark)]" },
  info: { icon: "bg-[var(--color-info-soft)] text-[var(--color-info)]", badge: "bg-[var(--color-info-soft)] text-[var(--color-info)]" },
  warning: { icon: "bg-[var(--color-warn-soft)] text-[var(--color-warn)]", badge: "bg-[var(--color-warn-soft)] text-[var(--color-warn)]" },
  danger: { icon: "bg-[var(--color-alert-soft)] text-[var(--color-alert)]", badge: "bg-[var(--color-alert-soft)] text-[var(--color-alert)]" },
}

type MetricCardProps = {
  icon: LucideIcon
  label: string
  value: string
  badge?: string
  tone?: Tone
  badgeTone?: BadgeTone
  /** `true`: sempre baixo; `"mobile"`: baixo só no celular (abaixo de sm). */
  compact?: boolean | "mobile"
}

/** Indicador do design system: ícone, selo opcional, rótulo e valor grande. */
export default function MetricCard({ icon: Icon, label, value, badge, tone = "brand", badgeTone, compact = false }: MetricCardProps) {
  const style = tones[tone]
  // Versão baixa (ícone ao lado do valor, selo vira uma linha de apoio): para telas em que a lista é o principal.
  const small = (
      <Card className={`flex min-w-0 ${compact === "mobile" ? "sm:hidden" : ""} items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 shadow-[0_10px_35px_rgba(13,28,46,0.05)]`}>
        <span className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex ${style.icon}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-slate)]">{label}</p>
          <p className="truncate text-xl font-extrabold tracking-[-0.02em] tabular-nums">{value}</p>
          {badge && <p className="truncate text-[11px] font-semibold text-[var(--color-slate)]">{badge}</p>}
        </div>
      </Card>
  )
  if (compact === true) return small
  const full = (
    <Card className={`rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_10px_35px_rgba(13,28,46,0.05)] ${compact === "mobile" ? "hidden sm:block" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${style.icon}`}>
          <Icon className="h-5 w-5" />
        </span>
        {badge && <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${badgeTone === "neutral" ? neutralBadge : badgeTone ? tones[badgeTone].badge : style.badge}`}>{badge}</span>}
      </div>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-slate)]">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-[-0.02em] tabular-nums">{value}</p>
    </Card>
  )
  // No modo "mobile" os dois existem e o breakpoint escolhe qual aparece (o escondido sai também do leitor de tela).
  return compact === "mobile" ? (
    <>
      {small}
      {full}
    </>
  ) : (
    full
  )
}
