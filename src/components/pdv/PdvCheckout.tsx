import { Banknote, Check, CreditCard, Printer, QrCode, ShoppingCart, UserPlus, X, ChevronRight, type LucideIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { useAuth } from "@/auth/useAuth"
import PdvReceipt from "@/components/pdv/PdvReceipt"
import Field from "@/components/Field"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { findActiveCoupon, readCoupons, writeCoupons } from "@/customers/coupons"
import { readCustomers } from "@/customers/customers"
import { formatBRL, digitsOf, formatReceiptNumber, maskCpf, parseMoneyToCents } from "@/lib/format"
import type { PaymentMethod, Sale } from "@/inventory/types"
import { useInventory } from "@/inventory/useInventory"
import { useStores } from "@/store/useStores"

type CartLine = { productId: string; quantity: number }

const methods: { value: PaymentMethod; label: string; icon: LucideIcon }[] = [
  { value: "pix", label: "Pix", icon: QrCode },
  { value: "dinheiro", label: "Dinheiro", icon: Banknote },
  { value: "cartao", label: "Cartão", icon: CreditCard },
]

type PdvCheckoutProps = {
  cart: CartLine[]
  totalCents: number
  onClose: () => void
  /** Chamado quando o operador encerra a venda concluída (nova venda ou impressão). */
  onFinish: () => void
}

/** Pagamento da venda do PDV e, depois da confirmação, o recibo. */
export default function PdvCheckout({ cart, totalCents, onClose, onFinish }: PdvCheckoutProps) {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { activeStore } = useStores()
  const { registerSale } = useInventory()
  const customers = useMemo(() => readCustomers(activeStore.id), [activeStore.id])
  const [coupons, setCoupons] = useState(() => readCoupons(activeStore.id))

  const [method, setMethod] = useState<PaymentMethod>("pix")
  const [received, setReceived] = useState("")
  const [cpf, setCpf] = useState("")
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [coupon, setCoupon] = useState("")
  const [error, setError] = useState("")
  const [sale, setSale] = useState<Sale | null>(null)

  const digits = digitsOf(cpf)
  const customer = customers.find((item) => item.id === customerId) ?? null
  const match = !customer && digits.length >= 5 ? customers.find((item) => digitsOf(item.cpf).length === 11 && digitsOf(item.cpf).startsWith(digits)) : null
  const isNewCpf = !customer && !match && digits.length === 11

  // Cupom: precisa existir, estar ativo e pertencer ao cliente da venda (se já houver um).
  const couponCode = coupon.trim()
  const found = findActiveCoupon(coupons, couponCode)
  const couponOwner = found ? (customers.find((item) => item.id === found.customerId) ?? null) : null
  const couponError = !couponCode
    ? ""
    : !found
      ? "Cupom não encontrado ou já utilizado."
      : customer && customer.id !== found.customerId
        ? `Este cupom pertence a ${couponOwner?.name ?? "outro cliente"}.`
        : ""
  const discountCents = found && !couponError ? Math.round((totalCents * found.percent) / 100) : 0
  const payableCents = totalCents - discountCents

  const receivedCents = received.trim() ? parseMoneyToCents(received) : null
  const changeCents = Math.max(0, (receivedCents ?? 0) - payableCents)
  const operator = session?.user.name ?? "Operador"

  function confirm() {
    if (couponError) return setError(couponError)
    if (method === "dinheiro" && received.trim() && (receivedCents === null || receivedCents < payableCents)) {
      return setError("O valor recebido precisa ser igual ou maior que o total.")
    }
    // O cupom identifica o cliente quando ele ainda não foi anexado à venda.
    const buyer = customer ?? (discountCents > 0 ? couponOwner : null)
    const result = registerSale({
      items: cart,
      payment: method,
      cpf: buyer ? buyer.cpf : digits.length === 11 ? digits : undefined,
      customerName: buyer?.name,
      receivedCents: method === "dinheiro" ? (receivedCents ?? payableCents) : undefined,
      discountCents,
      couponCode: discountCents > 0 ? found?.code : undefined,
    })
    if (!result.ok) return setError(result.error)
    if (found && discountCents > 0) {
      const next = coupons.map((item) => (item.id === found.id ? { ...item, redeemedAt: Date.now(), saleNumber: result.value.number } : item))
      if (writeCoupons(activeStore.id, next)) setCoupons(next)
    }
    setError("")
    setSale(result.value)
  }

  function finish(print: boolean) {
    if (print) window.print()
    onFinish()
  }

  if (sale) {
    return (
      <Dialog open onClose={() => finish(false)} title="Venda concluída" description={`NFC-e (simulado) nº ${formatReceiptNumber(sale.number)} · ${formatBRL(sale.totalCents)}`} widthClass="max-w-[620px]">
        <div className="flex flex-col gap-[18px]">
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-green-100)] bg-[var(--color-stock-green-soft)] px-[18px] py-3.5 text-[var(--color-amber-dark)]">
            <Check className="h-[22px] w-[22px]" />
            <span className="text-[15px] font-bold">Pagamento recebido e estoque baixado.</span>
          </div>
          <PdvReceipt sale={sale} store={activeStore} operator={operator} />
          {sale.cpf && !sale.customerName && (
            <button
              type="button"
              onClick={() => navigate("/clientes")}
              className="flex w-full items-center gap-3.5 rounded-2xl border border-[var(--color-border)] bg-white px-[18px] py-3.5 text-left shadow-xs transition hover:border-[var(--color-green-500)]/40"
            >
              <UserPlus className="h-5 w-5 text-[var(--color-amber)]" />
              <span className="flex flex-1 flex-col gap-0.5">
                <strong className="text-[15px]">Completar cadastro de {maskCpf(sale.cpf)}</strong>
                <span className="text-[13px] text-[var(--color-slate)]">Se o cliente quiser, adicione nome, telefone, e-mail e nascimento.</span>
              </span>
              <ChevronRight className="h-5 w-5 text-[var(--color-slate)]" />
            </button>
          )}
        </div>
        <div className="mt-6 flex flex-col-reverse justify-end gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row">
          <Button variant="outline" onClick={() => finish(false)}>
            <ShoppingCart className="h-4 w-4" />
            Nova venda
          </Button>
          <Button variant="accent" size="lg" onClick={() => finish(true)}>
            <Printer className="h-4 w-4" />
            Imprimir comprovante
          </Button>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog open onClose={onClose} title="Pagamento" description={`Total a receber ${formatBRL(payableCents)}`} widthClass="max-w-[560px]">
      <div className="flex flex-col gap-5">
        <div role="tablist" aria-label="Forma de pagamento" className="flex gap-1 rounded-2xl bg-[var(--color-nav)] p-1.5">
          {methods.map(({ value, label, icon: Icon }) => {
            const active = method === value
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setMethod(value)
                  setError("")
                }}
                className={`flex h-11 items-center gap-2 rounded-xl px-5 text-xs font-bold uppercase tracking-[0.08em] transition ${
                  active ? "bg-[var(--color-amber)] text-white" : "text-[var(--color-slate)] hover:text-[var(--color-ink)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            )
          })}
        </div>

        {method === "pix" && (
          <div className="flex items-center gap-5 rounded-2xl bg-[var(--color-nav)] p-5">
            <span className="flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white">
              <QrCode className="h-[54px] w-[54px]" />
            </span>
            <span className="flex flex-col gap-1.5">
              <strong className="text-[15px]">Mostre o QR Code para o cliente</strong>
              <span className="text-[13px] text-[var(--color-slate)]">
                A venda é aprovada sozinha assim que o Pix cair. Taxa fixa de R$ 0,80 retida no split.
              </span>
            </span>
          </div>
        )}

        {method === "dinheiro" && (
          <div className="grid grid-cols-2 items-end gap-4">
            <Field id="pdv-received" label="Valor recebido">
              <Input
                id="pdv-received"
                value={received}
                onChange={(event) => {
                  setReceived(event.target.value)
                  setError("")
                }}
                placeholder="0,00"
                inputMode="decimal"
                className="h-12 font-[family-name:var(--font-mono)] text-base"
              />
            </Field>
            <div className="rounded-xl border border-[var(--color-green-100)] bg-[var(--color-stock-green-soft)] px-4 py-3 text-[var(--color-amber-dark)]">
              <span className="text-xs font-bold uppercase tracking-[0.08em]">Troco</span>
              <div className="text-xl font-bold">{formatBRL(changeCents)}</div>
            </div>
          </div>
        )}

        {method === "cartao" && (
          <div className="rounded-2xl bg-[var(--color-nav)] p-4 text-[15px] text-[var(--color-slate)]">
            Passe o cartão na maquininha e confirme aqui para dar baixa no estoque.
          </div>
        )}

        <div>
          {customer && (
            <div className="mb-2.5 flex items-center gap-3 rounded-xl border border-[var(--color-green-100)] bg-[var(--color-stock-green-soft)] px-4 py-3 text-[var(--color-amber-dark)]">
              <Check className="h-[18px] w-[18px]" />
              <span className="flex-1 text-[15px] font-bold">{customer.name} anexado à venda</span>
              <button
                type="button"
                aria-label="Remover cliente"
                onClick={() => {
                  setCustomerId(null)
                  setCpf("")
                }}
                className="p-2"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>
          )}
          {match && (
            <button
              type="button"
              onClick={() => {
                setCustomerId(match.id)
                setCpf(maskCpf(match.cpf))
              }}
              className="mb-2.5 flex w-full items-center gap-3 rounded-xl border border-[var(--color-green-100)] bg-white px-4 py-3 text-left shadow-sm"
            >
              <UserPlus className="h-[18px] w-[18px] text-[var(--color-amber)]" />
              <span className="flex flex-1 flex-col gap-0.5">
                <strong className="text-[15px]">{match.name} já está no CRM</strong>
                <span className="font-[family-name:var(--font-mono)] text-[13px] text-[var(--color-slate)]">{match.cpf}</span>
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-amber-dark)]">Anexar</span>
            </button>
          )}
          <Field
            id="pdv-cpf"
            label="CPF na nota (opcional)"
            hint={isNewCpf ? "CPF novo: gravamos só o número agora e você completa o cadastro depois da venda." : "Digite o CPF para buscar o cliente e colocá-lo na nota."}
          >
            <Input
              id="pdv-cpf"
              value={cpf}
              onChange={(event) => {
                setCpf(maskCpf(event.target.value))
                if (customerId) setCustomerId(null)
              }}
              placeholder="000.000.000-00"
              inputMode="numeric"
              className="h-12 font-[family-name:var(--font-mono)] text-base"
            />
          </Field>
        </div>

        <Field
          id="pdv-coupon"
          label="Cupom de desconto (opcional)"
          error={couponError || undefined}
          hint={found && !couponError ? `Cupom ${found.code}: ${found.percent}% de desconto (−${formatBRL(discountCents)}).` : undefined}
        >
          <Input
            id="pdv-coupon"
            value={coupon}
            onChange={(event) => {
              setCoupon(event.target.value)
              setError("")
            }}
            placeholder="Digite o código do cupom"
            className="font-[family-name:var(--font-mono)]"
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium text-[var(--color-alert-dark)]">
            {error}
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-col-reverse justify-end gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row">
        <Button variant="outline" onClick={onClose}>
          Voltar
        </Button>
        <Button variant="accent" size="lg" onClick={confirm}>
          <Check className="h-4 w-4" />
          Confirmar venda
        </Button>
      </div>
    </Dialog>
  )
}
