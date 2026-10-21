import type { LucideIcon } from "lucide-react"

import { Card } from "@/components/ui/card"

type StatCardProps = {
  label: string
  value: string
  meta: string
  icon: LucideIcon
  alert?: boolean
}

export default function StatCard({ label, value, meta, icon: Icon, alert = false }: StatCardProps) {
  return (
    <Card
      className={`rounded-2xl border bg-white p-5 shadow-[0_10px_35px_rgba(13,28,46,0.05)] ${
        alert ? "border-[var(--color-alert)]/20" : "border-[var(--color-border)]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[var(--color-slate)]">{label}</p>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">{value}</p>
          <p className={`mt-2 text-[11px] ${alert ? "text-[var(--color-alert)]" : "text-[var(--color-stock-green)]"}`}>{meta}</p>
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            alert ? "bg-[var(--color-alert-soft)] text-[var(--color-alert)]" : "bg-[var(--color-stock-green-soft)] text-[var(--color-stock-green)]"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  )
}
