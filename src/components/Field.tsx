import type { ReactNode } from "react"

import { Label } from "@/components/ui/label"

type FieldProps = { id: string; label: string; error?: string; hint?: string; children: ReactNode }

/** Rótulo + controle + mensagem de erro. O controle deve usar `id` e `aria-describedby={`${id}-msg`}`. */
export default function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {(error || hint) && (
        <p
          id={`${id}-msg`}
          className={`text-xs leading-5 ${error ? "font-medium text-[var(--color-alert-dark)]" : "text-[var(--color-slate)]"}`}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  )
}
