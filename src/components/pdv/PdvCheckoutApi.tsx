import { Banknote, Check, Copy, CreditCard, LoaderCircle, Printer, QrCode, ShoppingCart, type LucideIcon } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { useAuth } from "@/auth/useAuth"
import BuyerFields from "@/components/pdv/BuyerFields"
import EspelhoReceipt from "@/components/pdv/EspelhoReceipt"
import PdvReceipt from "@/components/pdv/PdvReceipt"
import Field from "@/components/Field"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { errorMessage } from "@/lib/api"
import { formatBRL, formatReceiptNumber, parseMoneyToCents } from "@/lib/format"
import { cents } from "@/lib/money"
import { useBuyer } from "@/pdv/useBuyer"
import { fetchNota, manualToSale, payManual, pixStatus, pixToSale, simulatePix, startPix, cancelSaleApi, type Espelho, type PixPayment } from "@/pdv/pdvApi"
import type { PaymentMethod, Sale } from "@/inventory/types"
import { useInventory } from "@/inventory/useInventory"
import { useStores } from "@/store/useStores"

type CartLine = { productId: string; quantity: number }
type CardKind = "DEBITO" | "CREDITO"

const methods: { value: PaymentMethod; label: string; icon: LucideIcon }[] = [
  { value: "pix", label: "Pix", icon: QrCode },
  { value: "dinheiro", label: "Dinheiro", icon: Banknote },
  { value: "cartao", label: "Cartão", icon: CreditCard },
]

/** Taxa do Pix cobrada do consumidor (D1). A API é quem calcula; este valor é só o aviso antes de gerar o QR. */
const PIX_FEE_CENTS = 80

const paidStates = ["PAID", "APPROVED", "REDEEMED"]
const deadStates = ["EXPIRED", "CANCELLED", "FAILED", "REFUNDED"]

type PixWaitingProps = { pix: PixPayment; onPaid: () => void; onExpired: () => void; onBack: () => void }

/** QR Code do Pix e acompanhamento do pagamento: a venda só vira paga quando a API confirmar. */
function PixWaiting({ pix, onPaid, onExpired, onBack }: PixWaitingProps) {
  const [now, setNow] = useState(() => Date.now())
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const handlers = useRef({ onPaid, onExpired })
  useEffect(() => {
    handlers.current = { onPaid, onExpired }
  }, [onPaid, onExpired])

  const check = useCallback(async () => {
    try {
      const status = await pixStatus(pix.payment_id)
      if (status.status_pagamento === "PAGO" || paidStates.includes(status.status)) {
        handlers.current.onPaid()
        return true
      }
      if (status.status_pagamento === "CANCELADO" || deadStates.includes(status.status)) {
        handlers.current.onExpired()
        return true
      }
    } catch {
      // Falha passageira de rede: a próxima consulta tenta de novo.
    }
    return false
  }, [pix.payment_id])

  // Consulta o status a cada 3 s (polling) até pagar ou expirar.
  useEffect(() => {
    let stop = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const tick = async () => {
      const finished = await check()
      if (!finished && !stop) timer = setTimeout(tick, 3000)
    }
    timer = setTimeout(tick, 1500)
    return () => {
      stop = true
      if (timer) clearTimeout(timer)
    }
  }, [check])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const remaining = Math.max(0, Math.floor((Date.parse(pix.expira_em) - now) / 1000))
  const mmss = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(pix.qr_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setMessage("Não foi possível copiar. Selecione o código e copie manualmente.")
    }
  }

  async function simulate() {
    setBusy(true)
    setMessage("")
    try {
      await simulatePix(pix.payment_id)
      await check()
    } catch (failure) {
      setMessage(errorMessage(failure))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-[var(--color-nav)] p-5">
        <img src={pix.qr_code_imagem} alt="QR Code do Pix" className="h-48 w-48 rounded-xl border border-[var(--color-border)] bg-white p-2" />
        <p className="flex items-center gap-2 text-sm font-bold text-[var(--color-amber-dark)]">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Aguardando o pagamento · expira em {mmss}
        </p>
        <button
          type="button"
          onClick={() => void copy()}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-left text-xs"
          title="Copiar Pix copia e cola"
        >
          <span className="truncate font-[family-name:var(--font-mono)] text-[var(--color-slate)]">{pix.qr_code}</span>
          <span className="flex shrink-0 items-center gap-1.5 font-bold text-[var(--color-amber)]">
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copiado" : "Copiar"}
          </span>
        </button>
      </div>

      <dl className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] px-4 text-[15px]">
        <div className="flex justify-between gap-4 py-2.5">
          <dt className="text-[var(--color-slate)]">Itens</dt>
          <dd className="font-bold tabular-nums">{formatBRL(cents(pix.total_venda))}</dd>
        </div>
        <div className="flex justify-between gap-4 py-2.5">
          <dt className="text-[var(--color-slate)]">Taxa do Pix (paga pelo cliente)</dt>
          <dd className="font-bold tabular-nums">{formatBRL(cents(pix.taxa_pix))}</dd>
        </div>
        <div className="flex justify-between gap-4 py-2.5">
          <dt className="font-bold">Total a cobrar</dt>
          <dd className="text-lg font-extrabold tabular-nums text-[var(--color-amber)]">{formatBRL(cents(pix.total_cobrado))}</dd>
        </div>
      </dl>
      <p className="text-xs text-[var(--color-slate)]">A venda só é dada como paga e o estoque só baixa depois que o Pix for confirmado.</p>

      {message && (
        <p role="alert" className="rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium text-[var(--color-alert-dark)]">
          {message}
        </p>
      )}

      <div className="flex flex-col-reverse justify-between gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row">
        <Button variant="outline" onClick={onBack}>
          Cancelar cobrança
        </Button>
        <Button variant="outline" onClick={() => void simulate()} disabled={busy} title="Só funciona com a AbacatePay em modo de testes">
          Simular pagamento (modo de testes)
        </Button>
      </div>
    </div>
  )
}

type PdvCheckoutApiProps = {
  cart: CartLine[]
  totalCents: number
  onClose: () => void
  /** Chamado quando o operador encerra a venda concluída (nova venda ou impressão). */
  onFinish: () => void
}

type Phase = { kind: "form" } | { kind: "pix"; pix: PixPayment } | { kind: "done"; sale: Sale; espelho: Espelho | null }

/** Pagamento da venda do PDV com a API: dinheiro, cartão e Pix (QR Code real, com a taxa à vista). */
export default function PdvCheckoutApi({ cart, totalCents, onClose, onFinish }: PdvCheckoutApiProps) {
  const { session } = useAuth()
  const { activeStore } = useStores()
  const { reload } = useInventory()
  const operator = session?.user.name ?? "Operador"
  const nfceOn = activeStore.nfceEnabled === true

  const [method, setMethod] = useState<PaymentMethod>("dinheiro")
  const [cardKind, setCardKind] = useState<CardKind>("DEBITO")
  const [received, setReceived] = useState("")
  const [phase, setPhase] = useState<Phase>({ kind: "form" })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const buyer = useBuyer(totalCents)
  const payableCents = totalCents - buyer.discountCents
  const receivedCents = received.trim() ? parseMoneyToCents(received) : null
  const changeCents = Math.max(0, (receivedCents ?? 0) - payableCents)

  /** Venda confirmada pela API: recarrega estoque e histórico e busca o espelho da NFC-e, se a loja emite. */
  async function conclude(paid: Sale) {
    // O cliente anexado aparece no comprovante; a API já guardou o vínculo.
    const sale: Sale = buyer.customer ? { ...paid, customerName: buyer.customer.name, cpf: buyer.customer.cpf.replace(/D/g, "") } : paid
    await reload()
    let espelho: Espelho | null = null
    if (nfceOn) {
      try {
        espelho = (await fetchNota(sale.id)).espelho
      } catch {
        espelho = null // sem nota (plano, chave desligada ou ainda não emitida): sai o comprovante não fiscal
      }
    }
    setPhase({ kind: "done", sale: espelho ? { ...sale, nfce: true } : { ...sale, nfce: false }, espelho })
  }

  async function confirm() {
    setError("")
    if (buyer.couponError) return setError(buyer.couponError)
    if (method === "dinheiro" && received.trim() && (receivedCents === null || receivedCents < payableCents)) {
      return setError("O valor recebido precisa ser igual ou maior que o total.")
    }
    const who = { customerId: buyer.customerId, couponCode: buyer.couponCode }
    setBusy(true)
    try {
      if (method === "pix") {
        const pix = await startPix(cart, who)
        setPhase({ kind: "pix", pix })
        return
      }
      const payment = await payManual(cart, method === "dinheiro" ? "DINHEIRO" : cardKind, method === "dinheiro" ? (receivedCents ?? payableCents) / 100 : undefined, who)
      await conclude(manualToSale(payment, operator, nfceOn))
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      setBusy(false)
    }
  }

  async function pixPaid(pix: PixPayment) {
    await conclude(pixToSale(pix, operator, nfceOn))
  }

  function leavePix(pix: PixPayment) {
    // Melhor esforço: a venda pendente é cancelada; se a API recusar, ela expira sozinha.
    void cancelSaleApi(pix.venda_id).catch(() => undefined)
    setPhase({ kind: "form" })
  }

  function finish(print: boolean) {
    if (print) window.print()
    onFinish()
  }

  if (phase.kind === "done") {
    const { sale, espelho } = phase
    return (
      <Dialog
        open
        onClose={() => finish(false)}
        title="Venda concluída"
        description={espelho ? `NFC-e (simulado) nº ${formatReceiptNumber(espelho.numero)} · ${formatBRL(cents(espelho.total_cobrado))}` : `Comprovante ${sale.code ?? ""} · ${formatBRL(sale.totalCents + (sale.pixFeeCents ?? 0))}`}
        widthClass="max-w-[620px]"
      >
        <div className="flex flex-col gap-[18px]">
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-green-100)] bg-[var(--color-stock-green-soft)] px-[18px] py-3.5 text-[var(--color-amber-dark)]">
            <Check className="h-[22px] w-[22px]" />
            <span className="text-[15px] font-bold">Pagamento recebido e estoque baixado.</span>
          </div>
          {espelho ? <EspelhoReceipt espelho={espelho} /> : <PdvReceipt sale={sale} store={activeStore} operator={operator} />}
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

  if (phase.kind === "pix") {
    const { pix } = phase
    return (
      <Dialog open onClose={() => leavePix(pix)} title="Pagamento via Pix" description="Mostre o QR Code ao cliente ou envie o código copia e cola." widthClass="max-w-[520px]">
        <PixWaiting
          pix={pix}
          onPaid={() => void pixPaid(pix)}
          onExpired={() => {
            setError("O QR Code expirou sem pagamento. Gere um novo para tentar de novo.")
            setPhase({ kind: "form" })
          }}
          onBack={() => leavePix(pix)}
        />
      </Dialog>
    )
  }

  return (
    <Dialog open onClose={onClose} title="Pagamento" description={`Total dos itens ${formatBRL(totalCents)}`} widthClass="max-w-[560px]">
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
          <div className="flex flex-col gap-3 rounded-2xl bg-[var(--color-nav)] p-5">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white">
                <QrCode className="h-9 w-9" />
              </span>
              <span className="flex flex-col gap-1">
                <strong className="text-[15px]">Gerar o QR Code do Pix</strong>
                <span className="text-[13px] text-[var(--color-slate)]">A venda fica pendente e só é aprovada quando o Pix cair.</span>
              </span>
            </div>
            <dl className="divide-y divide-[var(--color-border)] rounded-xl bg-white px-3.5 text-sm">
              <div className="flex justify-between py-2">
                <dt className="text-[var(--color-slate)]">Itens</dt>
                <dd className="font-bold tabular-nums">{formatBRL(totalCents)}</dd>
              </div>
              {buyer.discountCents > 0 && (
                <div className="flex justify-between py-2">
                  <dt className="text-[var(--color-slate)]">Desconto do cupom</dt>
                  <dd className="font-bold tabular-nums">−{formatBRL(buyer.discountCents)}</dd>
                </div>
              )}
              <div className="flex justify-between py-2">
                <dt className="text-[var(--color-slate)]">Taxa do Pix (paga pelo cliente)</dt>
                <dd className="font-bold tabular-nums">{formatBRL(PIX_FEE_CENTS)}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="font-bold">Total a cobrar</dt>
                <dd className="font-extrabold tabular-nums text-[var(--color-amber)]">{formatBRL(payableCents + PIX_FEE_CENTS)}</dd>
              </div>
            </dl>
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
          <div className="flex flex-col gap-3 rounded-2xl bg-[var(--color-nav)] p-4 text-[15px] text-[var(--color-slate)]">
            <div role="radiogroup" aria-label="Tipo de cartão" className="flex gap-2">
              {(["DEBITO", "CREDITO"] as CardKind[]).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  role="radio"
                  aria-checked={cardKind === kind}
                  onClick={() => setCardKind(kind)}
                  className={`h-10 flex-1 rounded-xl text-xs font-bold uppercase tracking-[0.08em] ${cardKind === kind ? "bg-white text-[var(--color-ink)] shadow-sm" : "text-[var(--color-slate)]"}`}
                >
                  {kind === "DEBITO" ? "Débito" : "Crédito"}
                </button>
              ))}
            </div>
            Passe o cartão na maquininha e confirme aqui para dar baixa no estoque.
          </div>
        )}

        <BuyerFields buyer={buyer} />

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
        <Button variant="accent" size="lg" onClick={() => void confirm()} disabled={busy}>
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {method === "pix" ? "Gerar QR Code" : "Confirmar venda"}
        </Button>
      </div>
    </Dialog>
  )
}
