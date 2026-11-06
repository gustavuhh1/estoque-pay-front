import { AlertCircle, CheckCircle2, Info } from "lucide-react"

export type ToastTone = "success" | "error" | "info"

type ToastProps = {
  open: boolean
  title: string
  message?: string
  tone?: ToastTone
  onClose?: () => void
  /** Tempo na tela (ms) até fechar sozinho; 0 deixa aberto. Erros ficam um pouco mais. Pausa com o mouse em cima. */
  duration?: number
}

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

export function Toast({ open, title, message, tone = "info", onClose, duration = tone === "error" ? 7000 : 4500 }: ToastProps) {
  if (!open) return null
  const Icon = icons[tone]
  const toneClass = tone === "success" ? "text-[var(--color-stock-green)] bg-[var(--color-stock-green-soft)]" : tone === "error" ? "text-[var(--color-alert)] bg-[var(--color-alert-soft)]" : "text-[var(--color-ink)] bg-[var(--color-paper)]"
  const barClass = tone === "success" ? "bg-[var(--color-stock-green)]" : tone === "error" ? "bg-[var(--color-alert)]" : "bg-[var(--color-slate)]"
  const autoClose = Boolean(onClose) && duration > 0
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className="toast-enter group fixed bottom-4 right-4 z-[90] w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[0_18px_55px_rgba(13,28,46,0.16)]"
    >
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClass}`}><Icon className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--color-ink)]">{title}</p>
          {message && <p className="mt-1 text-xs leading-5 text-[var(--color-slate)]">{message}</p>}
        </div>
        {onClose && <button type="button" onClick={onClose} className="text-xs font-semibold text-[var(--color-slate)]">Fechar</button>}
      </div>
      {autoClose && (
        // A barra encolhe até zero e fecha o aviso no fim da animação; a key reinicia a contagem quando o texto muda.
        <span
          key={`${title}|${message ?? ""}`}
          aria-hidden
          className={`toast-progress absolute bottom-0 left-0 h-[3px] w-full origin-left opacity-60 group-hover:[animation-play-state:paused] ${barClass}`}
          style={{ animationDuration: `${duration}ms` }}
          onAnimationEnd={onClose}
        />
      )}
    </div>
  )
}
