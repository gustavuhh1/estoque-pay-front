import { AlertCircle, CheckCircle2, Info } from "lucide-react"

export type ToastTone = "success" | "error" | "info"

type ToastProps = {
  open: boolean
  title: string
  message?: string
  tone?: ToastTone
  onClose?: () => void
}

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

export function Toast({ open, title, message, tone = "info", onClose }: ToastProps) {
  if (!open) return null
  const Icon = icons[tone]
  const toneClass = tone === "success" ? "text-[var(--color-stock-green)] bg-[var(--color-stock-green-soft)]" : tone === "error" ? "text-[var(--color-alert)] bg-[var(--color-alert-soft)]" : "text-[var(--color-ink)] bg-[var(--color-paper)]"
  return (
    <div className="fixed bottom-4 right-4 z-[90] w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[0_18px_55px_rgba(13,28,46,0.16)]">
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClass}`}><Icon className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--color-ink)]">{title}</p>
          {message && <p className="mt-1 text-xs leading-5 text-[var(--color-slate)]">{message}</p>}
        </div>
        {onClose && <button type="button" onClick={onClose} className="text-xs font-semibold text-[var(--color-slate)]">Fechar</button>}
      </div>
    </div>
  )
}
