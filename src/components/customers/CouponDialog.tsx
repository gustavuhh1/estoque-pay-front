import { Check, Ticket, User, Users } from "lucide-react"
import { useState, type FormEvent, type ReactNode } from "react"

import Field from "@/components/Field"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { MoneyInput } from "@/components/ui/money-input"
import { Select } from "@/components/ui/select"
import { couponDiscountLabel, type Coupon, type CouponInput } from "@/customers/coupons"
import type { Customer } from "@/customers/customers"
import type { Result } from "@/inventory/types"
import { formatBRL, parseMoneyToCents } from "@/lib/format"

const PERCENTS = [5, 10, 15, 20, 30]

type Scope = "individual" | "global"
type Validity = "none" | "7" | "30" | "date"

type CouponDialogProps = {
  customers: Customer[]
  initialCustomerId?: string
  onIssue: (input: CouponInput) => Promise<Result<Coupon>>
  onClose: () => void
}

/** Botões lado a lado em que só um fica marcado (para quem / tipo / validade). */
function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (value: T) => void; options: { value: T; label: ReactNode }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-xl bg-[var(--color-paper-dim)] p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition ${
            value === option.value ? "bg-white text-[var(--color-ink)] shadow-[0_1px_3px_rgba(13,28,46,0.12)]" : "text-[var(--color-slate)] hover:text-[var(--color-ink)]"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** Fim do dia escolhido no horário local ("2026-12-31" → 31/12 às 23:59:59). */
const endOfDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime()
}

/** Fim do dia daqui a `days` dias, no horário local. */
const inDays = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(23, 59, 59, 999)
  return date.getTime()
}

const dateLabel =new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })

/** Emissão de cupom: individual (um cliente, uma vez) ou global (cada CPF uma vez), em % ou R$, com validade opcional. */
export default function CouponDialog({ customers, initialCustomerId, onIssue, onClose }: CouponDialogProps) {
  const [scope, setScope] = useState<Scope>(initialCustomerId ? "individual" : "global")
  const [customerId, setCustomerId] = useState(initialCustomerId ?? customers[0]?.id ?? "")
  const [type, setType] = useState<CouponInput["type"]>("percent")
  const [percent, setPercent] = useState("10")
  const [value, setValue] = useState("")
  const [validity, setValidity] = useState<Validity>("30")
  const [date, setDate] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [issued, setIssued] = useState<Coupon | null>(null)
  const [error, setError] = useState("")

  const percentNumber = Number(percent.replace(",", "."))
  const valueCents = parseMoneyToCents(value)
  const expiresAt = validity === "none" ? undefined : validity === "date" ? (date ? endOfDay(date) : undefined) : inDays(Number(validity))
  const customer = customers.find((item) => item.id === customerId)
  const discountText = type === "percent" ? `${Number.isFinite(percentNumber) && percentNumber > 0 ? percentNumber.toLocaleString("pt-BR") : "—"}%` : valueCents ? formatBRL(valueCents) : "R$ —"
  const ruleText = scope === "individual" ? `Só ${customer?.name ?? "o cliente escolhido"} pode usar, uma única vez.` : "Qualquer cliente cadastrado pode usar, uma vez por CPF."
  const [today] = useState(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10))

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (scope === "individual" && !customerId) return setError("Cadastre um cliente antes de emitir um cupom individual.")
    if (type === "percent" && (!Number.isFinite(percentNumber) || percentNumber <= 0 || percentNumber > 100)) return setError("A porcentagem precisa estar entre 1% e 100%.")
    if (type === "value" && (valueCents === null || valueCents <= 0)) return setError("Informe o valor do desconto em reais (ex.: 5,00).")
    if (validity === "date" && !date) return setError("Escolha a data de validade.")
    const typed = code.trim().toUpperCase()
    if (typed && !/^[A-Z0-9-]{4,30}$/.test(typed)) return setError("O código usa de 4 a 30 letras, números ou hífen.")
    setBusy(true)
    setError("")
    const result = await onIssue({
      customerId: scope === "individual" ? customerId : "",
      type,
      amount: type === "percent" ? Math.round(percentNumber * 100) / 100 : valueCents!,
      ...(expiresAt ? { expiresAt } : {}),
      ...(typed ? { code: typed } : {}),
    })
    setBusy(false)
    if (!result.ok) return setError(result.error)
    setIssued(result.value)
  }

  return (
    <Dialog open onClose={onClose} title="Emitir cupom" description="O cliente informa o código no PDV, na tela de pagamento." widthClass="max-w-[520px]">
      {issued ? (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-green-100)] bg-[var(--color-stock-green-soft)] px-[18px] py-3.5 text-[var(--color-amber-dark)]">
            <Check className="h-5 w-5" />
            <span className="text-[15px] font-bold">{issued.customerId ? `Cupom emitido para ${customer?.name}.` : "Cupom global emitido."}</span>
          </div>
          <div className="rounded-2xl border border-dashed border-[var(--color-green-500)] bg-white px-5 py-6 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-slate)]">{couponDiscountLabel(issued)} de desconto</p>
            <p className="mt-2 font-[family-name:var(--font-mono)] text-3xl font-bold tracking-[0.08em]" data-testid="coupon-code">
              {issued.code}
            </p>
            <p className="mt-2 text-xs text-[var(--color-slate)]">
              {ruleText}
              {issued.expiresAt ? ` Válido até ${dateLabel.format(issued.expiresAt)}.` : " Sem validade."}
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
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase leading-[1.4] tracking-[0.08em] text-[var(--color-ink)]">Quem pode usar</p>
            <Segmented
              label="Quem pode usar"
              value={scope}
              onChange={setScope}
              options={[
                { value: "global", label: <><Users className="h-4 w-4" />Todos os clientes</> },
                { value: "individual", label: <><User className="h-4 w-4" />Um cliente</> },
              ]}
            />
          </div>

          {scope === "individual" && (
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
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase leading-[1.4] tracking-[0.08em] text-[var(--color-ink)]">Tipo de desconto</p>
              <Segmented label="Tipo de desconto" value={type} onChange={setType} options={[{ value: "percent", label: "%" }, { value: "value", label: "R$" }]} />
            </div>
            {type === "percent" ? (
              <Field id="coupon-percent" label="Porcentagem">
                <div className="relative">
                  <Input id="coupon-percent" value={percent} onChange={(event) => setPercent(event.target.value.replace(/[^\d,.]/g, ""))} inputMode="decimal" className="pr-9" />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-slate)]">%</span>
                </div>
              </Field>
            ) : (
              <Field id="coupon-value" label="Valor">
                <MoneyInput id="coupon-value" value={value} onValueChange={setValue} placeholder="5,00" />
              </Field>
            )}
          </div>
          {type === "percent" && (
            <div className="-mt-1 flex flex-wrap gap-1.5">
              {PERCENTS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPercent(String(option))}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${percentNumber === option ? "bg-[var(--color-amber)] text-white" : "bg-[var(--color-paper-dim)] text-[var(--color-slate)] hover:text-[var(--color-ink)]"}`}
                >
                  {option}%
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase leading-[1.4] tracking-[0.08em] text-[var(--color-ink)]">Validade</p>
            <Segmented
              label="Validade"
              value={validity}
              onChange={setValidity}
              options={[
                { value: "7", label: "7 dias" },
                { value: "30", label: "30 dias" },
                { value: "date", label: "Escolher" },
                { value: "none", label: "Sem" },
              ]}
            />
            {validity === "date" && (
              <input
                type="date"
                aria-label="Válido até"
                min={today}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-11 w-full cursor-pointer rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm font-semibold outline-none focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/20"
              />
            )}
          </div>

          <Field id="coupon-code" label="Código (opcional)" hint="Deixe vazio para gerar um código automático.">
            <Input id="coupon-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Ex.: NATAL10" className="font-[family-name:var(--font-mono)] uppercase" maxLength={30} />
          </Field>

          {/* Prévia do cupom como o cliente vai receber. */}
          <div className="flex items-center gap-4 rounded-2xl border border-dashed border-[var(--color-green-500)] bg-[var(--color-stock-green-soft)] px-4 py-3">
            <Ticket className="h-8 w-8 shrink-0 text-[var(--color-amber)]" />
            <div className="min-w-0">
              <p className="text-lg font-extrabold text-[var(--color-amber-dark)]">{discountText} de desconto</p>
              <p className="text-xs text-[var(--color-ink)]">
                {ruleText} {expiresAt ? `Válido até ${dateLabel.format(expiresAt)}.` : "Sem validade."}
              </p>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium text-[var(--color-alert-dark)]">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="accent" disabled={busy || (scope === "individual" && customers.length === 0)}>
              <Ticket className="h-4 w-4" />
              {busy ? "Emitindo…" : "Emitir cupom"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  )
}
