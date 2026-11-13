import type { ReactNode } from "react"

import HelpTip from "@/components/HelpTip"
import { Label } from "@/components/ui/label"

type FieldProps = { id: string; label: string; error?: string; hint?: string; help?: ReactNode; required?: boolean; children: ReactNode }

/**
 * Rótulo + controle + mensagem de erro. O controle deve usar `id` e `aria-describedby={`${id}-msg`}`.
 * `required` mostra o asterisco no rótulo (o leitor de tela ouve "obrigatório"); o controle deve ter `aria-required`.
 * `help` põe um ícone "?" ao lado do rótulo com uma explicação curta para quem não conhece o termo (ver HelpTip).
 */
export default function Field({ id, label, error, hint, help, required = false, children }: FieldProps) {
  const labelEl = (
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
  )

  return (
    <div className="space-y-3">
      {help ? (
        <div className="flex items-center gap-1">
          {labelEl}
          <HelpTip label={label}>{help}</HelpTip>
        </div>
      ) : (
        labelEl
      )}
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
