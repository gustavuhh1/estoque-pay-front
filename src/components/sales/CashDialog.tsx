import { Lock, LockOpen } from "lucide-react"
import { useState, type FormEvent } from "react"

import Field from "@/components/Field"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { Shift, ShiftTotals } from "@/caixa/caixa"
import { formatBRL, formatDateTime, parseMoneyToCents } from "@/lib/format"

type CashDialogProps =
  | { mode: "open"; onConfirm: (openingCents: number) => void; onClose: () => void }
  | { mode: "close"; shift: Shift; totals: ShiftTotals; onConfirm: (countedCents: number) => void; onClose: () => void }

const row = "flex items-center justify-between gap-4 py-2.5 text-[15px]"

/** Abertura (fundo de troco) e fechamento (conferência do dinheiro) do caixa. */
export default function CashDialog(props: CashDialogProps) {
  const [value, setValue] = useState(props.mode === "open" ? "200,00" : "")
  const [error, setError] = useState("")

  const cents = value.trim() ? parseMoneyToCents(value) : null
  const expected = props.mode === "close" ? props.totals.expectedCashCents : 0
  const difference = props.mode === "close" && cents !== null ? cents - expected : null

  function submit(event: FormEvent) {
    event.preventDefault()
    if (cents === null || cents < 0) return setError(props.mode === "open" ? "Informe o fundo de troco (ex.: 200,00)." : "Informe o dinheiro contado na gaveta (ex.: 350,00).")
    props.onConfirm(cents)
  }

  if (props.mode === "open") {
    return (
      <Dialog open onClose={props.onClose} title="Abrir caixa" description="Informe o fundo de troco que está na gaveta para começar o turno." widthClass="max-w-[460px]">
        <form onSubmit={submit} noValidate className="space-y-4">
          <Field id="cash-opening" label="Fundo de troco (R$)" error={error || undefined}>
            <Input id="cash-opening" value={value} onChange={(event) => { setValue(event.target.value); setError("") }} inputMode="decimal" className="font-[family-name:var(--font-mono)]" autoFocus />
          </Field>
          <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="accent">
              <LockOpen className="h-4 w-4" />
              Abrir caixa
            </Button>
          </div>
        </form>
      </Dialog>
    )
  }

  const { shift, totals } = props
  return (
    <Dialog open onClose={props.onClose} title="Fechar caixa" description={`Turno aberto em ${formatDateTime(shift.openedAt)} por ${shift.operator}.`} widthClass="max-w-[520px]">
      <form onSubmit={submit} noValidate>
        <dl className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] px-4">
          <div className={row}>
            <dt className="text-[var(--color-slate)]">Fundo de troco</dt>
            <dd className="font-bold tabular-nums">{formatBRL(shift.openingCents)}</dd>
          </div>
          <div className={row}>
            <dt className="text-[var(--color-slate)]">Dinheiro</dt>
            <dd className="font-bold tabular-nums">{formatBRL(totals.byMethod.dinheiro)}</dd>
          </div>
          <div className={row}>
            <dt className="text-[var(--color-slate)]">Cartão</dt>
            <dd className="font-bold tabular-nums">{formatBRL(totals.byMethod.cartao)}</dd>
          </div>
          <div className={row}>
            <dt className="text-[var(--color-slate)]">Pix</dt>
            <dd className="font-bold tabular-nums">{formatBRL(totals.byMethod.pix)}</dd>
          </div>
          <div className={row}>
            <dt className="font-bold">Faturamento do turno ({totals.count} {totals.count === 1 ? "venda" : "vendas"})</dt>
            <dd className="font-extrabold tabular-nums">{formatBRL(totals.totalCents)}</dd>
          </div>
        </dl>

        <div className="mt-5 grid items-end gap-4 sm:grid-cols-2">
          <Field id="cash-counted" label="Dinheiro contado (R$)" error={error || undefined} hint={`Esperado na gaveta: ${formatBRL(expected)}`}>
            <Input id="cash-counted" value={value} onChange={(event) => { setValue(event.target.value); setError("") }} inputMode="decimal" placeholder="0,00" className="font-[family-name:var(--font-mono)]" autoFocus />
          </Field>
          <div
            className={`rounded-xl border px-4 py-3 ${
              difference === null || difference === 0
                ? "border-[var(--color-green-100)] bg-[var(--color-stock-green-soft)] text-[var(--color-amber-dark)]"
                : "border-[#fde68a] bg-[var(--color-warn-soft)] text-[var(--color-warn)]"
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-[0.08em]">Diferença</span>
            <div className="text-xl font-bold tabular-nums">
              {difference === null ? "—" : difference === 0 ? "Confere" : `${difference > 0 ? "Sobra" : "Falta"} ${formatBRL(Math.abs(difference))}`}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={props.onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="accent">
            <Lock className="h-4 w-4" />
            Fechar caixa
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
