import * as React from "react"
import { X } from "lucide-react"

type DialogProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
}

/** Usa o <dialog> nativo: Esc, foco preso no modal e fundo inerte vêm do navegador. */
export function Dialog({ open, onClose, title, description, children }: DialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null)
  const titleId = React.useId()

  React.useEffect(() => {
    const element = ref.current
    if (!element) return
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // Clique no backdrop: o alvo é o próprio <dialog> (o conteúdo fica no div interno).
        if (event.target === event.currentTarget) onClose()
      }}
      className="m-auto w-full max-w-lg overflow-visible rounded-2xl border border-[var(--color-border)] bg-white p-0 text-[var(--color-ink)] shadow-[0_24px_70px_rgba(13,28,46,0.18)] backdrop:bg-[var(--color-ink)]/35 backdrop:backdrop-blur-sm"
    >
      {open && (
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="font-[family-name:var(--font-display)] text-xl font-semibold">
                {title}
              </h2>
              {description && <p className="mt-2 text-sm leading-6 text-[var(--color-slate)]">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-[var(--color-slate)] transition hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-6">{children}</div>
        </div>
      )}
    </dialog>
  )
}
