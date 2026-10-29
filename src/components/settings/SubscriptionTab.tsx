import { CreditCard } from "lucide-react"
import { useState, type FormEvent } from "react"

import Field from "@/components/Field"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import {
  PRICE_CENTS,
  TRIAL_DAYS,
  addDays,
  cardBrand,
  isValidCardNumber,
  isValidExpiry,
  type PlanCycle,
  type Subscription,
} from "@/billing/plan"
import { digitsOf, formatBRL } from "@/lib/format"

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" })
const mono = "font-[family-name:var(--font-mono)]"

const maskCard = (value: string) => digitsOf(value).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ")
const maskExpiry = (value: string) => {
  const d = digitsOf(value).slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}

type CardMode = "trial" | "card"

/** Cartão para o teste grátis ou para atualizar a forma de pagamento. Nada do cartão é guardado. */
function CardDialog({ mode, cycle: initialCycle, onSubmit, onClose }: { mode: CardMode; cycle: PlanCycle; onSubmit: (cycle: PlanCycle, card: { brand: string; last4: string }) => void; onClose: () => void }) {
  const [cycle, setCycle] = useState(initialCycle)
  const [number, setNumber] = useState("")
  const [holder, setHolder] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvv, setCvv] = useState("")
  const [errors, setErrors] = useState<Partial<Record<"number" | "holder" | "expiry" | "cvv", string>>>({})

  function submit(event: FormEvent) {
    event.preventDefault()
    const found: typeof errors = {}
    if (!isValidCardNumber(number)) found.number = "Número de cartão inválido."
    if (holder.trim().length < 3) found.holder = "Informe o nome impresso no cartão."
    if (!isValidExpiry(expiry)) found.expiry = "Validade inválida (MM/AA)."
    if (!/^\d{3,4}$/.test(cvv)) found.cvv = "CVV inválido."
    setErrors(found)
    if (Object.keys(found).length > 0) return
    // Simula a tokenização: só bandeira e final seguem adiante; número, validade e CVV são descartados.
    onSubmit(cycle, { brand: cardBrand(number), last4: digitsOf(number).slice(-4) })
  }

  const clear = (key: keyof typeof errors) => setErrors((current) => ({ ...current, [key]: undefined }))

  return (
    <Dialog
      open
      onClose={onClose}
      title={mode === "trial" ? `Teste grátis por ${TRIAL_DAYS} dias` : "Atualizar cartão"}
      description={mode === "trial" ? "Nada é cobrado hoje. A assinatura só aceita cartão e a cobrança começa ao fim do teste." : "O novo cartão passa a valer para as próximas cobranças."}
      widthClass="max-w-[520px]"
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {mode === "trial" && (
          <Field id="card-cycle" label="Plano">
            <Select id="card-cycle" value={cycle} onChange={(event) => setCycle(event.target.value as PlanCycle)}>
              <option value="MENSAL">Mensal — {formatBRL(PRICE_CENTS.MENSAL)}/mês</option>
              <option value="ANUAL">Anual — {formatBRL(PRICE_CENTS.ANUAL)}/ano</option>
            </Select>
          </Field>
        )}
        <Field id="card-number" label="Número do cartão" error={errors.number}>
          <Input id="card-number" value={number} onChange={(event) => { setNumber(maskCard(event.target.value)); clear("number") }} inputMode="numeric" autoComplete="off" placeholder="0000 0000 0000 0000" className={mono} autoFocus />
        </Field>
        <Field id="card-holder" label="Nome no cartão" error={errors.holder}>
          <Input id="card-holder" value={holder} onChange={(event) => { setHolder(event.target.value); clear("holder") }} autoComplete="off" placeholder="Como está impresso" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field id="card-expiry" label="Validade" error={errors.expiry}>
            <Input id="card-expiry" value={expiry} onChange={(event) => { setExpiry(maskExpiry(event.target.value)); clear("expiry") }} inputMode="numeric" autoComplete="off" placeholder="MM/AA" className={mono} />
          </Field>
          <Field id="card-cvv" label="CVV" error={errors.cvv}>
            <Input id="card-cvv" value={cvv} onChange={(event) => { setCvv(digitsOf(event.target.value).slice(0, 4)); clear("cvv") }} inputMode="numeric" autoComplete="off" placeholder="000" className={mono} />
          </Field>
        </div>
        <p className="rounded-xl bg-[var(--color-paper)] px-3.5 py-3 text-xs text-[var(--color-slate)]">
          Os dados do cartão não ficam salvos no EstoquePay: guardamos apenas a bandeira e os 4 últimos dígitos. A tokenização real será feita pelo AbacatePay.
        </p>
        <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="accent">
            <CreditCard className="h-4 w-4" />
            {mode === "trial" ? "Começar teste grátis" : "Salvar cartão"}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

type SubscriptionTabProps = {
  subscription: Subscription
  isOwner: boolean
  onSave: (next: Subscription) => boolean
  onNotify: (message: string, tone?: "success" | "error" | "info") => void
}

export default function SubscriptionTab({ subscription, isOwner, onSave, onNotify }: SubscriptionTabProps) {
  const [dialog, setDialog] = useState<{ mode: CardMode; cycle: PlanCycle } | null>(null)
  const [canceling, setCanceling] = useState(false)

  const premium = subscription.status === "TRIAL" || subscription.status === "ACTIVE"
  const current = premium || subscription.status === "PAST_DUE" ? subscription.cycle : null

  function startTrial(cycle: PlanCycle, card: { brand: string; last4: string }) {
    const trialEndsAt = addDays(Date.now(), TRIAL_DAYS)
    if (!onSave({ status: "TRIAL", cycle, trialEndsAt, renewsAt: trialEndsAt, card })) return onNotify("Não foi possível salvar a assinatura.", "error")
    setDialog(null)
    onNotify(`Teste grátis ativado por ${TRIAL_DAYS} dias. Premium liberado.`)
  }

  function updateCard(_cycle: PlanCycle, card: { brand: string; last4: string }) {
    const status = subscription.status === "PAST_DUE" ? "ACTIVE" : subscription.status
    if (!onSave({ ...subscription, status, card })) return onNotify("Não foi possível salvar o cartão.", "error")
    setDialog(null)
    onNotify("Cartão atualizado.")
  }

  function switchCycle(cycle: PlanCycle) {
    if (!onSave({ ...subscription, cycle })) return onNotify("Não foi possível trocar o plano.", "error")
    onNotify(`Plano ${cycle === "ANUAL" ? "anual" : "mensal"} selecionado.`)
  }

  function cancel() {
    if (!onSave({ status: "CANCELED", cycle: subscription.cycle, card: subscription.card })) return onNotify("Não foi possível cancelar.", "error")
    setCanceling(false)
    onNotify("Assinatura cancelada. A loja voltou ao modo restrito (plano Free).", "info")
  }

  // Simulação dos webhooks do gateway no modo de desenvolvimento.
  function simulate(status: "PAST_DUE" | "ACTIVE") {
    if (!onSave({ ...subscription, status, renewsAt: subscription.renewsAt ?? addDays(Date.now(), 30) })) return
    onNotify(status === "PAST_DUE" ? "Webhook simulado: pagamento recusado. Loja em modo restrito." : "Webhook simulado: pagamento aprovado.", status === "PAST_DUE" ? "error" : "success")
  }

  const plans: { cycle: PlanCycle; title: string; price: number; detail: string }[] = [
    { cycle: "MENSAL", title: "Mensal", price: PRICE_CENTS.MENSAL, detail: "Cobrado todo mês no cartão via AbacatePay" },
    { cycle: "ANUAL", title: "Anual", price: PRICE_CENTS.ANUAL, detail: `Equivale a ${formatBRL(Math.round(PRICE_CENTS.ANUAL / 12))} por mês` },
  ]

  return (
    <Card className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
      <h2 className="mb-4 text-xl font-bold">Assinatura</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => {
          const on = current === plan.cycle
          return (
            <div key={plan.cycle} className={`rounded-2xl border p-5 ${on ? "border-[var(--color-green-100)] bg-[var(--color-stock-green-soft)]" : "border-[var(--color-border)] bg-white"}`}>
              <span className={`text-[11px] font-bold uppercase tracking-[0.08em] ${on ? "text-[var(--color-amber-dark)]" : "text-[var(--color-slate)]"}`}>{plan.title}</span>
              <div className="my-1.5 text-2xl font-bold">{formatBRL(plan.price)}</div>
              <p className="text-[13px] text-[var(--color-slate)]">{plan.detail}</p>
              {on ? (
                <span className="mt-3 inline-flex rounded-full border border-[var(--color-green-100)] bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--color-amber-dark)]">Plano atual</span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  disabled={!isOwner}
                  onClick={() => (premium ? switchCycle(plan.cycle) : setDialog({ mode: "trial", cycle: plan.cycle }))}
                >
                  {premium ? `Trocar para ${plan.title.toLowerCase()}` : `Testar ${TRIAL_DAYS} dias grátis`}
                </Button>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-5 rounded-2xl bg-[var(--color-paper)] px-5 py-4 text-sm">
        {subscription.status === "FREE" && <p>Você está no plano <strong>Free</strong>: até 50 produtos ativos, 3 membros, CRM só com CPF e nome e sem NFC-e. Teste o Premium por {TRIAL_DAYS} dias, só com cartão.</p>}
        {subscription.status === "TRIAL" && <p>Teste grátis até <strong>{dateFormat.format(subscription.trialEndsAt ?? 0)}</strong>. Depois, {formatBRL(PRICE_CENTS[subscription.cycle])} no cartão final {subscription.card?.last4}. Cancele antes para não ser cobrado.</p>}
        {subscription.status === "ACTIVE" && <p>Próxima cobrança em <strong>{dateFormat.format(subscription.renewsAt ?? 0)}</strong> no cartão {subscription.card?.brand} final {subscription.card?.last4}.</p>}
        {subscription.status === "PAST_DUE" && <p className="font-semibold text-[var(--color-warn)]">Pagamento recusado. A loja está em modo restrito: NFC-e desligada e bloqueio de novos cadastros acima do limite Free. Atualize o cartão para voltar ao Premium.</p>}
        {subscription.status === "CANCELED" && <p className="font-semibold text-[var(--color-slate)]">Assinatura cancelada. A loja está em modo restrito (plano Free). Você pode testar o Premium de novo.</p>}
      </div>

      {isOwner && (
        <div className="mt-4 flex flex-wrap gap-3">
          {(subscription.status === "FREE" || subscription.status === "CANCELED") && (
            <Button variant="accent" onClick={() => setDialog({ mode: "trial", cycle: subscription.cycle })}>
              <CreditCard className="h-4 w-4" />
              Começar teste grátis de {TRIAL_DAYS} dias
            </Button>
          )}
          {(subscription.status === "PAST_DUE" || subscription.status === "ACTIVE" || subscription.status === "TRIAL") && (
            <Button variant={subscription.status === "PAST_DUE" ? "accent" : "outline"} onClick={() => setDialog({ mode: "card", cycle: subscription.cycle })}>
              <CreditCard className="h-4 w-4" />
              Atualizar cartão
            </Button>
          )}
          {subscription.status !== "FREE" && subscription.status !== "CANCELED" && (
            <Button variant="ghost" onClick={() => setCanceling(true)}>
              Cancelar assinatura
            </Button>
          )}
        </div>
      )}
      {!isOwner && <p className="mt-4 text-sm text-[var(--color-slate)]">Só o Owner altera a assinatura.</p>}

      <p className="mt-5 text-[13px] text-[var(--color-slate)]">A taxa fixa de R$ 0,80 por transação Pix no PDV é mantida em qualquer plano. Cartões ficam sob custódia do AbacatePay.</p>

      {isOwner && subscription.card && subscription.status !== "CANCELED" && (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-dashed border-[var(--color-border)] pt-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-slate)]">Simulação (modo dev)</span>
          <Button size="sm" variant="outline" onClick={() => simulate("PAST_DUE")}>
            Pagamento recusado
          </Button>
          <Button size="sm" variant="outline" onClick={() => simulate("ACTIVE")}>
            Pagamento aprovado
          </Button>
        </div>
      )}

      {dialog && <CardDialog mode={dialog.mode} cycle={dialog.cycle} onSubmit={dialog.mode === "trial" ? startTrial : updateCard} onClose={() => setDialog(null)} />}

      <Dialog open={canceling} onClose={() => setCanceling(false)} title="Cancelar assinatura?" description="A loja volta ao plano Free em modo restrito: NFC-e desligada e limites de 50 produtos ativos e 3 membros.">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setCanceling(false)}>
            Manter assinatura
          </Button>
          <Button onClick={cancel}>Cancelar assinatura</Button>
        </div>
      </Dialog>
    </Card>
  )
}
