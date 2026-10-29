import { Check, Ticket } from "lucide-react"
import { useState, type FormEvent } from "react"

import Field from "@/components/Field"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Select } from "@/components/ui/select"
import type { Coupon } from "@/customers/coupons"
import type { Customer } from "@/customers/customers"

const PERCENTS = [5, 10, 15, 20, 25]

type CouponDialogProps = {
  customers: Customer[]
  initialCustomerId?: string
  /** Emite o cupom. Devolve o cupom criado ou null se não foi possível salvar. */
  onIssue: (customerId: string, percent: number) => Coupon | null
  onClose: () => void
}

/** Emissão de cupom de desconto para um cliente (resgatado no PDV). */
export default function CouponDialog({ customers, initialCustomerId, onIssue, onClose }: CouponDialogProps) {
  const [customerId, setCustomerId] = useState(initialCustomerId ?? customers[0]?.id ?? "")
  const [percent, setPercent] = useState(10)
  const [issued, setIssued] = useState<Coupon | null>(null)
  const [error, setError] = useState("")

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!customerId) return setError("Cadastre um cliente antes de emitir um cupom.")
    const coupon = onIssue(customerId, percent)
    if (!coupon) return setError("Não foi possível salvar o cupom neste navegador.")
    setIssued(coupon)
  }

  const customer = customers.find((item) => item.id === customerId)

  return (
    <Dialog open onClose={onClose} title="Emitir cupom" description="O cliente usa o código no PDV, no campo de cupom da tela de pagamento. Uso único." widthClass="max-w-[480px]">
      {issued ? (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-green-100)] bg-[var(--color-stock-green-soft)] px-[18px] py-3.5 text-[var(--color-amber-dark)]">
            <Check className="h-5 w-5" />
            <span className="text-[15px] font-bold">Cupom emitido para {customer?.name}.</span>
          </div>
          <div className="rounded-2xl border border-dashed border-[var(--color-green-500)] bg-white px-5 py-6 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-slate)]">{issued.percent}% de desconto</p>
            <p className="mt-2 font-[family-name:var(--font-mono)] text-3xl font-bold tracking-[0.08em]" data-testid="coupon-code">
              {issued.code}
            </p>
          </div>
          <div className="flex justify-end border-t border-[var(--color-border)] pt-5">
            <Button variant="accent" onClick={onClose}>
              Concluir
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field id="coupon-customer" label="Cliente">
            <Select id="coupon-customer" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
              {customers.length === 0 && <option value="">Nenhum cliente cadastrado</option>}
              {customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} — {item.cpf}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="coupon-percent" label="Desconto">
            <Select id="coupon-percent" value={percent} onChange={(event) => setPercent(Number(event.target.value))}>
              {PERCENTS.map((value) => (
                <option key={value} value={value}>
                  {value}%
                </option>
              ))}
            </Select>
          </Field>
          {error && (
            <p role="alert" className="rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium text-[var(--color-alert-dark)]">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="accent" disabled={customers.length === 0}>
              <Ticket className="h-4 w-4" />
              Emitir cupom
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  )
}
