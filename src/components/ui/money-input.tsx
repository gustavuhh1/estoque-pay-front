import * as React from "react"

import { Input } from "@/components/ui/input"
import { formatMoneyInput, moneyInputFromDigits, parseMoneyToCents } from "@/lib/format"
import { cn } from "@/lib/utils"

type MoneyInputProps = Omit<React.ComponentProps<"input">, "value" | "onChange" | "type" | "inputMode"> & {
  /** Valor no formato do formulário ("12,90"; "" = vazio), o mesmo que o parseMoneyToCents lê. */
  value: string
  onValueChange: (value: string) => void
}

/**
 * Campo em R$ como nos apps de banco: o valor é preenchido pelos centavos.
 * Digitar 1, 2, 9, 0 mostra 0,01 → 0,12 → 1,29 → 12,90; o Backspace apaga o último dígito.
 * O cursor fica sempre no fim; colar "12,90" ou "12.5" entende o valor como está escrito.
 */
export function MoneyInput({ value, onValueChange, className, onFocus, onClick, onPaste, ...props }: MoneyInputProps) {
  const ref = React.useRef<HTMLInputElement>(null)
  const cents = value.trim() ? parseMoneyToCents(value) : null
  // Mostra sempre normalizado (ex.: o "1290,00" vindo do cadastro vira "1.290,00").
  const shown = cents === null ? value : formatMoneyInput(cents)

  const caretToEnd = () => {
    const input = ref.current
    if (input && document.activeElement === input) input.setSelectionRange(input.value.length, input.value.length)
  }
  // Depois de cada digitação o valor é reformatado; o cursor volta para o fim, onde entram os próximos dígitos.
  React.useLayoutEffect(caretToEnd, [shown])

  return (
    <div className="relative">
      <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--color-slate)]">
        R$
      </span>
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={shown}
        onChange={(event) => {
          const next = moneyInputFromDigits(event.target.value)
          if (next !== null) onValueChange(next)
        }}
        onPaste={(event) => {
          onPaste?.(event)
          const pasted = parseMoneyToCents(event.clipboardData.getData("text"))
          if (pasted === null) return
          event.preventDefault()
          onValueChange(formatMoneyInput(pasted))
        }}
        onFocus={(event) => {
          onFocus?.(event)
          requestAnimationFrame(caretToEnd)
        }}
        onClick={(event) => {
          onClick?.(event)
          caretToEnd()
        }}
        className={cn("pl-11 font-[family-name:var(--font-mono)] tabular-nums", className)}
      />
    </div>
  )
}
