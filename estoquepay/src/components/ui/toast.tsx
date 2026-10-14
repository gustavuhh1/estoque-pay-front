import { useEffect } from "react"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"

export type ToastTone = "success" | "error" | "info"

type ToastProps = {
  open: boolean
  title: string
  message?: string
  tone?: ToastTone
  onClose?: () => void
  /** Fecha sozinho após N ms (precisa de onClose). Use 0 para desativar. */
  duration?: number
}

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

const toneClasses: Record<ToastTone, string> = {
  success: "text-[var(--color-stock-green)] bg-[var(--color-stock-green-soft)]",
  error: "text-[var(--color-alert-dark)] bg-[var(--color-alert-soft)]",
  info: "text-[var(--color-ink)] bg-[var(--color-paper)]",
}

export function Toast({ open, title, message, tone = "info", onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (!open || !onClose || duration <= 0) return
    const timer = window.setTimeout(onClose, duration)
    return () => window.clearTimeout(timer)
  }, [open, onClose, duration])

  if (!open) return null
  const Icon = icons[tone]

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className="fixed bottom-4 right-4 z-[90] w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[0_18px_55px_rgba(13,28,46,0.16)]"
    >
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--color-ink)]">{title}</p>
          {message && <p className="mt-1 text-xs leading-5 text-[var(--color-slate)]">{message}</p>}
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="text-xs font-semibold text-[var(--color-slate)]">
            Fechar
          </button>
        )}
      </div>
    </div>
  )
}
