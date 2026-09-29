import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

type DialogProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
}

export function Dialog({ open, onClose, title, description, children }: DialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button aria-label="Fechar modal" type="button" className="absolute inset-0 bg-[var(--color-ink)]/35 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[0_24px_70px_rgba(13,28,46,0.18)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="dialog-title" className="font-[family-name:var(--font-display)] text-xl font-semibold">{title}</h2>
            {description && <p className="mt-2 text-sm leading-6 text-[var(--color-slate)]">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-[var(--color-slate)] transition hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className={cn("mt-6")}>{children}</div>
      </div>
    </div>
  )
}
