import type { ReactNode } from "react"

import { Label } from "@/components/ui/label"

type FieldProps = { id: string; label: string; error?: string; hint?: string; required?: boolean; children: ReactNode }

/**
 * Rótulo + controle + mensagem de erro. O controle deve usar `id` e `aria-describedby={`${id}-msg`}`.
 * `required` mostra o asterisco no rótulo (o leitor de tela ouve "obrigatório"); o controle deve ter `aria-required`.
 */
export default function Field({ id, label, error, hint, required = false, children }: FieldProps) {
  return (
    <div className="space-y-3">
      <Label htmlFor={id}>
        {label}
        {required && (
          <>
            <span aria-hidden="true" className="ml-0.5 text-[var(--color-alert)]">
              *
            </span>
            <span className="sr-only"> (obrigatório)</span>
          </>
        )}
      </Label>
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
