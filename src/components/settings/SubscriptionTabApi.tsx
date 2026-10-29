import { CreditCard, RefreshCw } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { PRICE_CENTS, TRIAL_DAYS, type PlanCycle, type Subscription } from "@/billing/plan"
import { api, errorMessage } from "@/lib/api"
import { formatBRL } from "@/lib/format"

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" })

type SubscriptionTabApiProps = {
  subscription: Subscription
  restricted: boolean
  isOwner: boolean
  isLoading: boolean
  refresh: () => Promise<void>
  onNotify: (message: string, tone?: "success" | "error" | "info") => void
}

/** Assinatura pela API: o cartão é informado na página da AbacatePay e o plano só muda quando o webhook chega. */
export default function SubscriptionTabApi({ subscription, restricted, isOwner, isLoading, refresh, onNotify }: SubscriptionTabApiProps) {
  const [busy, setBusy] = useState<PlanCycle | "cancel" | "refresh" | null>(null)
  const [canceling, setCanceling] = useState(false)

  const premium = subscription.status === "TRIAL" || subscription.status === "ACTIVE"
  const current = premium || subscription.status === "PAST_DUE" ? subscription.cycle : null

  async function subscribe(cycle: PlanCycle) {
    setBusy(cycle)
    try {
      const checkout = await api.post<{ checkout_url: string }>("/billing/assinatura", { tipo_plano: cycle })
      // O cartão nunca passa pelo EstoquePay: o cliente informa na página segura da AbacatePay.
      window.location.assign(checkout.checkout_url)
    } catch (failure) {
      onNotify(errorMessage(failure), "error")
      setBusy(null)
    }
  }

  async function cancel() {
    setBusy("cancel")
    try {
      await api.post("/billing/assinatura/cancelar")
      await refresh()
      setCanceling(false)
      onNotify("Assinatura cancelada. A loja voltou ao plano Free.", "info")
    } catch (failure) {
      onNotify(errorMessage(failure), "error")
    } finally {
      setBusy(null)
    }
  }

  async function update() {
    setBusy("refresh")
    await refresh()
    setBusy(null)
  }

  const plans: { cycle: PlanCycle; title: string; price: number; detail: string }[] = [
    { cycle: "MENSAL", title: "Mensal", price: PRICE_CENTS.MENSAL, detail: "Cobrado todo mês no cartão via AbacatePay" },
    { cycle: "ANUAL", title: "Anual", price: PRICE_CENTS.ANUAL, detail: `Equivale a ${formatBRL(Math.round(PRICE_CENTS.ANUAL / 12))} por mês` },
  ]

  return (
    <Card className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Assinatura</h2>
        <Button size="sm" variant="outline" onClick={() => void update()} disabled={busy === "refresh" || isLoading}>
          <RefreshCw className={`h-3.5 w-3.5 ${busy === "refresh" ? "animate-spin" : ""}`} />
          Atualizar status
        </Button>
      </div>

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
                !premium && (
                  <Button size="sm" variant="outline" className="mt-3" disabled={!isOwner || busy !== null} onClick={() => void subscribe(plan.cycle)}>
                    <CreditCard className="h-3.5 w-3.5" />
                    {busy === plan.cycle ? "Abrindo checkout..." : `Testar ${TRIAL_DAYS} dias grátis`}
                  </Button>
                )
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-5 rounded-2xl bg-[var(--color-paper)] px-5 py-4 text-sm">
        {subscription.status === "FREE" && (
          <p>
            Você está no plano <strong>Free</strong>: até 50 produtos ativos, 3 membros, CRM só com CPF e nome e sem NFC-e. Teste o Premium por {TRIAL_DAYS} dias, só com cartão. O cartão é informado na página da AbacatePay e o plano aparece aqui assim que ela confirmar.
          </p>
        )}
        {subscription.status === "TRIAL" && (
          <p>
            Teste grátis até <strong>{dateFormat.format(subscription.trialEndsAt ?? subscription.renewsAt ?? 0)}</strong>. Depois, {formatBRL(PRICE_CENTS[subscription.cycle])} no cartão cadastrado. Cancele antes para não ser cobrado.
          </p>
        )}
        {subscription.status === "ACTIVE" && (
          <p>
            Próxima cobrança em <strong>{dateFormat.format(subscription.renewsAt ?? 0)}</strong> no cartão cadastrado.
          </p>
        )}
        {subscription.status === "PAST_DUE" && <p className="font-semibold text-[var(--color-warn)]">Pagamento recusado. A loja está em modo restrito: NFC-e desligada e bloqueio de novos cadastros acima do limite Free.</p>}
        {subscription.status === "CANCELED" && <p className="font-semibold text-[var(--color-slate)]">Assinatura cancelada. A loja está no plano Free. Você pode testar o Premium de novo.</p>}
        {restricted && <p className="mt-2 font-semibold text-[var(--color-warn)]">Modo restrito: a loja não perde o acesso, mas não cadastra novos produtos nem membros acima do limite Free.</p>}
      </div>

      {isOwner && premium && (
        <div className="mt-4">
          <Button variant="ghost" onClick={() => setCanceling(true)}>
            Cancelar assinatura
          </Button>
        </div>
      )}
      {!isOwner && <p className="mt-4 text-sm text-[var(--color-slate)]">Só o Owner altera a assinatura.</p>}

      <p className="mt-5 text-[13px] text-[var(--color-slate)]">
        A taxa fixa de R$ 0,80 por transação Pix no PDV é paga pelo consumidor, em qualquer plano. O EstoquePay não guarda dados de cartão.
      </p>

      <Dialog open={canceling} onClose={() => setCanceling(false)} title="Cancelar assinatura?" description="A loja volta ao plano Free: NFC-e desligada e limites de 50 produtos ativos e 3 membros.">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setCanceling(false)}>
            Manter assinatura
          </Button>
          <Button onClick={() => void cancel()} disabled={busy === "cancel"}>
            Cancelar assinatura
          </Button>
        </div>
      </Dialog>
    </Card>
  )
}
