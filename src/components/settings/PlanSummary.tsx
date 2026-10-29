import { ArrowRight } from "lucide-react"

import { Card } from "@/components/ui/card"
import { FREE_LIMITS, PRICE_CENTS, type Limits, type Subscription } from "@/billing/plan"
import { formatBRL } from "@/lib/format"

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" })

function footer(subscription: Subscription) {
  switch (subscription.status) {
    case "ACTIVE":
      return `Renova em ${dateFormat.format(subscription.renewsAt ?? 0)} · Cartão final ${subscription.card?.last4 ?? "—"}`
    case "TRIAL":
      return `Teste grátis até ${dateFormat.format(subscription.trialEndsAt ?? 0)} · depois ${formatBRL(PRICE_CENTS[subscription.cycle])}`
    case "PAST_DUE":
      return "Pagamento recusado · modo restrito"
    case "CANCELED":
      return "Assinatura cancelada · modo restrito"
    default:
      return `Plano gratuito · ${FREE_LIMITS.products} produtos e ${FREE_LIMITS.members} membros`
  }
}

/** Coluna direita de Ajustes: plano atual, uso de membros e ajuda. */
export default function PlanSummary({ subscription, limits, members }: { subscription: Subscription; limits: Limits; members: number }) {
  const percent = limits.maxMembers === null ? 100 : Math.min(100, Math.round((members / limits.maxMembers) * 100))
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-gradient-to-br from-[var(--color-green-500)] to-[var(--color-green-400)] p-6 text-white shadow-[0_8px_20px_rgba(0,108,73,0.25)]">
        <h3 className="text-xl font-bold">Plano Atual</h3>
        <p className="mt-0.5 text-xs font-bold uppercase tracking-[0.08em] text-white/85">{limits.premium ? "EstoquePay Premium" : "EstoquePay Free"}</p>
        <div className="mt-5 flex items-center justify-between text-[15px] font-bold">
          <span>Membros da equipe</span>
          <span>{limits.maxMembers === null ? members : `${members}/${limits.maxMembers}`}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/30" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-white" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-4 text-[13px] text-white/90">{footer(subscription)}</p>
      </div>
      <Card className="rounded-2xl border-0 bg-[var(--color-nav)] p-6 shadow-none">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-slate)]">Precisa de ajuda?</span>
        <p className="mb-3.5 mt-2.5 text-[15px]">Contate nosso gerente de sucesso para ajuda com personalização do sistema.</p>
        <a href="mailto:suporte@estoquepay.com" className="inline-flex items-center gap-2 font-bold text-[var(--color-amber)] hover:underline">
          Abrir suporte técnico <ArrowRight className="h-4 w-4" />
        </a>
      </Card>
    </div>
  )
}
