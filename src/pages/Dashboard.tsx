import { Boxes, DollarSign, Package, Plus, ShoppingCart, TrendingUp, TriangleAlert } from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"

import MetricCard from "@/components/MetricCard"
import PageHeader from "@/components/PageHeader"
import Panel from "@/components/Panel"
import { Button } from "@/components/ui/button"
import { PERIOD_LABEL, dashboardMetrics, type Period } from "@/dashboard/metrics"
import { formatBRL, formatDateTime, formatQuantity, saleLabel } from "@/lib/format"
import { needsRestock, stockStatus, stockValueCents } from "@/inventory/logic"
import { PAYMENT_LABELS, type MovementType, type PaymentMethod, type Product } from "@/inventory/types"
import { useInventory } from "@/inventory/useInventory"
import { useStores } from "@/store/useStores"

const PAYMENT_COLOR: Record<PaymentMethod, string> = {
  pix: "var(--color-amber)",
  cartao: "var(--color-info)",
  dinheiro: "#94a3b8",
}

const MOVEMENT_REASON: Record<MovementType, { label: string; className: string }> = {
  venda: { label: "Venda", className: "bg-[var(--color-paper-dim)] text-[var(--color-slate)]" },
  entrada: { label: "Reabastecimento", className: "bg-[var(--color-info-soft)] text-[var(--color-info)]" },
  saida: { label: "Saída", className: "bg-[var(--color-alert-soft)] text-[var(--color-alert)]" },
  ajuste: { label: "Ajuste manual", className: "bg-[var(--color-info-soft)] text-[var(--color-info)]" },
  cancelamento: { label: "Cancelamento", className: "bg-[var(--color-info-soft)] text-[var(--color-info)]" },
}

const eyebrow = "text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-slate)]"
const pill = "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em]"
const timeOnly = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" })

const percent = (value: number) => `${value.toFixed(1).replace(".", ",")}%`

function Thumb({ product, size = 44 }: { product?: Product; size?: number }) {
  return (
    <span style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-paper-dim)] text-[var(--color-slate)]">
      {product?.image ? <img src={product.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package className="h-4 w-4" />}
    </span>
  )
}

export default function Dashboard() {
  const { activeStore } = useStores()
  const { products, sales, movements } = useInventory()
  const [period, setPeriod] = useState<Period>("hoje")

  const metrics = useMemo(() => dashboardMetrics(sales, products, period), [sales, products, period])
  const active = useMemo(() => products.filter((product) => product.active), [products])
  const restock = useMemo(() => needsRestock(active), [active])
  const recentSales = useMemo(() => [...sales].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4), [sales])
  const productById = (id: string) => products.find((product) => product.id === id)

  const peak = Math.max(...metrics.series.map((bar) => bar.totalCents), 1)
  const label = PERIOD_LABEL[period].toLowerCase()
  const delta = metrics.deltaPercent

  return (
    <>
      <PageHeader
        title="Painel de Indicadores"
        description={`Visão geral da loja ${activeStore.name} em tempo real.`}
        actions={
          <>
            <div role="group" aria-label="Período" className="flex gap-1 rounded-full bg-[var(--color-paper-dim)] p-1">
              {(Object.keys(PERIOD_LABEL) as Period[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={period === key}
                  onClick={() => setPeriod(key)}
                  className={`rounded-full px-[18px] py-2 text-[13px] font-bold transition ${period === key ? "bg-white text-[var(--color-ink)] shadow-sm" : "text-[var(--color-slate)]"}`}
                >
                  {PERIOD_LABEL[key]}
                </button>
              ))}
            </div>
            <Button asChild variant="outline">
              <Link to="/pdv">
                <ShoppingCart className="h-4 w-4" />
                Abrir PDV
              </Link>
            </Button>
          </>
        }
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={DollarSign}
          label={`Vendas totais (${label})`}
          value={formatBRL(metrics.salesCents)}
          badge={delta === null ? (metrics.salesCents > 0 ? "Novo" : "Sem base") : `${delta >= 0 ? "+" : ""}${percent(delta)}`}
          tone={delta !== null && delta < 0 ? "danger" : "brand"}
        />
        <MetricCard icon={TrendingUp} tone="info" label={`Lucro bruto (${label})`} value={formatBRL(metrics.profitCents)} badge={`${percent(metrics.marginPercent)} margem`} />
        <MetricCard icon={TriangleAlert} tone="warning" label="Baixo estoque" value={`${restock.length} ${restock.length === 1 ? "item" : "itens"}`} badge="Alerta" />
        <MetricCard icon={Boxes} tone="danger" label="Capital imobilizado" value={formatBRL(stockValueCents(active))} badge="Estoque" badgeTone="neutral" />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Panel title="Faturamento" note={`${metrics.count} ${metrics.count === 1 ? "venda" : "vendas"} · ticket médio ${formatBRL(metrics.ticketCents)}`}>
          <div className="flex h-[220px] items-end gap-3.5 border-b border-[var(--color-border)] px-1 pt-2" role="img" aria-label={`Faturamento ${label}`}>
            {metrics.series.map((bar) => {
              const top = bar.totalCents === peak && peak > 1
              return (
                <div key={bar.label} title={formatBRL(bar.totalCents)} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                  <span className={`whitespace-nowrap ${eyebrow} ${top ? "!text-[var(--color-amber-dark)]" : ""}`}>{top ? formatBRL(bar.totalCents) : ""}</span>
                  <span
                    className={`w-full max-w-14 rounded-t-lg transition-[height] ${top ? "bg-[var(--color-amber)]" : "bg-[var(--color-green-200)]"}`}
                    style={{ height: `${Math.max(2, (bar.totalCents / peak) * 170)}px` }}
                  />
                </div>
              )
            })}
          </div>
          <div className="flex gap-3.5 px-1 pt-2.5">
            {metrics.series.map((bar) => (
              <span key={bar.label} className={`flex-1 text-center ${eyebrow}`}>
                {bar.label}
              </span>
            ))}
          </div>
        </Panel>

        <Panel title="Formas de pagamento">
          <div className="flex h-3.5 overflow-hidden rounded-full bg-[var(--color-paper-dim)]" aria-hidden="true">
            {metrics.payments.map((share) => (
              <span key={share.method} style={{ width: `${share.percent}%`, background: PAYMENT_COLOR[share.method] }} />
            ))}
          </div>
          <ul className="mt-[18px] flex flex-col gap-[18px]">
            {[...metrics.payments]
              .sort((a, b) => b.totalCents - a.totalCents)
              .map((share) => (
                <li key={share.method} className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: PAYMENT_COLOR[share.method] }} />
                  <span className="flex-1 text-[15px]">{PAYMENT_LABELS[share.method]}</span>
                  <span className="text-[13px] text-[var(--color-slate)]">{formatBRL(share.totalCents)}</span>
                  <strong className="w-11 text-right">{share.percent}%</strong>
                </li>
              ))}
          </ul>
        </Panel>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.05fr_1fr]">
        <Panel title="Top Vendidos" action={{ label: "Ver tudo", to: "/estoque" }}>
          {metrics.top.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--color-slate)]">Nenhuma venda no período.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {metrics.top.map((entry) => {
                const product = productById(entry.productId)
                const status = product ? stockStatus(product) : "normal"
                return (
                  <li key={entry.productId} className="flex h-[72px] items-center gap-3.5">
                    <Thumb product={product} />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-[15px]">{entry.name}</strong>
                      <span className="font-[family-name:var(--font-mono)] text-xs text-[#94a3b8]">{entry.sales} {entry.sales === 1 ? "venda" : "vendas"}</span>
                    </span>
                    <strong className="tabular-nums">{product ? formatBRL(product.priceCents) : "—"}</strong>
                    <span
                      className={`${pill} ${
                        status === "zerado"
                          ? "bg-[var(--color-ink)] text-white"
                          : status === "baixo"
                            ? "border border-[#fde68a] bg-[var(--color-warn-soft)] text-[var(--color-warn)]"
                            : "border border-[var(--color-green-100)] bg-[var(--color-stock-green-soft)] text-[var(--color-amber-dark)]"
                      }`}
                    >
                      {status === "zerado" ? "Sem estoque" : status === "baixo" ? "Baixo" : "Em estoque"}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Reposição necessária" action={{ label: "Ir ao estoque", to: "/estoque" }}>
          {restock.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--color-slate)]">Tudo em ordem: nenhum produto abaixo do mínimo.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {restock.slice(0, 4).map((product) => (
                <li key={product.id} className="flex items-center gap-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper)] px-3.5 py-3">
                  <Thumb product={product} />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-[15px]">{product.name}</strong>
                    <span className="font-[family-name:var(--font-mono)] text-xs text-[#94a3b8]">
                      Mínimo {formatQuantity(product.minStock)} {product.unit}
                    </span>
                  </span>
                  <span className={`${pill} ${product.stock <= 0 ? "bg-[var(--color-ink)] text-white" : "border border-[#fde68a] bg-[var(--color-warn-soft)] text-[var(--color-warn)]"}`}>
                    {product.stock <= 0 ? "Zerado" : `${formatQuantity(product.stock)} ${product.unit}`}
                  </span>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/estoque">
                      <Plus className="h-3.5 w-3.5" />
                      Repor
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.05fr_1fr]">
        <Panel title="Últimas vendas" action={{ label: "Histórico", to: "/vendas" }}>
          {recentSales.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--color-slate)]">Nenhuma venda registrada ainda.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {recentSales.map((sale) => {
                const done = sale.status === "concluida"
                const note = !done ? "Cancelada" : sale.nfce === false ? "Sem nota" : "Simulada"
                return (
                  <li key={sale.id} className="flex h-16 items-center gap-3">
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate">{sale.customerName ?? "Consumidor não identificado"}</strong>
                      <span className="font-[family-name:var(--font-mono)] text-xs text-[#94a3b8]">
                        {saleLabel(sale)} · {timeOnly.format(sale.createdAt)} · {PAYMENT_LABELS[sale.payment].toUpperCase()}
                      </span>
                    </span>
                    <strong className={`tabular-nums ${done ? "" : "text-[var(--color-slate)] line-through"}`}>{formatBRL(sale.totalCents)}</strong>
                    <span
                      className={`${pill} ${!done ? "bg-[var(--color-ink)] text-white" : note === "Simulada" ? "bg-[var(--color-info-soft)] text-[var(--color-info)]" : "bg-[var(--color-paper-dim)] text-[var(--color-slate)]"}`}
                    >
                      {note}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Movimentação recente" action={{ label: "Auditoria", to: "/estoque" }}>
          {movements.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--color-slate)]">Nenhuma movimentação registrada ainda.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {movements.slice(0, 4).map((movement) => {
                const reason = MOVEMENT_REASON[movement.type]
                return (
                  <li key={movement.id} className="flex h-16 items-center gap-3">
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate">{movement.productName}</strong>
                      <span className="font-[family-name:var(--font-mono)] text-xs text-[#94a3b8]">{formatDateTime(movement.createdAt)}</span>
                    </span>
                    <strong className={`w-24 text-center tabular-nums ${movement.delta < 0 ? "text-[var(--color-alert)]" : "text-[var(--color-amber)]"}`}>
                      {movement.delta > 0 ? "+" : ""}
                      {formatQuantity(movement.delta)} {productById(movement.productId)?.unit ?? ""}
                    </strong>
                    <span className={`${pill} ${reason.className}`}>{reason.label}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </section>
    </>
  )
}
