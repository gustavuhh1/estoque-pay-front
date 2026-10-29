import { CircleAlert, TriangleAlert } from "lucide-react"

type AlertBannerProps = {
  tone?: "danger" | "warning"
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

const tones = {
  danger: { box: "border-[#fecaca] bg-[var(--color-alert-soft)]", icon: "bg-[var(--color-alert)]", title: "text-[var(--color-alert)]", Icon: CircleAlert },
  warning: { box: "border-[#fde68a] bg-[var(--color-warn-soft)]", icon: "bg-[#f59e0b]", title: "text-[var(--color-warn)]", Icon: TriangleAlert },
}

/** Faixa de aviso com ação opcional (ex.: "Checklist", "Corrigir"). */
export default function AlertBanner({ tone = "danger", title, description, actionLabel, onAction }: AlertBannerProps) {
  const { box, icon, title: titleTone, Icon } = tones[tone]
  return (
    <div role="alert" className={`flex items-center gap-4 rounded-2xl border px-5 py-4 ${box}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${icon}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-base font-bold ${titleTone}`}>{title}</p>
        <p className="text-sm text-[var(--color-ink)]">{description}</p>
      </div>
      {actionLabel && (
        <button type="button" onClick={onAction} className={`shrink-0 text-sm font-bold ${titleTone} hover:underline`}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
