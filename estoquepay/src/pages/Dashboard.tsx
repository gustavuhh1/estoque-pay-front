import { CircleDollarSign, Package, Receipt, ShoppingCart, TriangleAlert } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import { useAuth } from "@/auth/useAuth"
import PageHeader from "@/components/PageHeader"
import StatCard from "@/components/StatCard"
import { Card } from "@/components/ui/card"
import { formatBRL, formatSaleNumber, isSameDay } from "@/lib/format"
import { needsRestock, stockStatus } from "@/inventory/logic"
import { PAYMENT_LABELS } from "@/inventory/types"
import { useInventory } from "@/inventory/useInventory"
import { useStores } from "@/store/useStores"

const HOURS_IN_CHART = 8
const HOUR = 3_600_000

const shortcuts = [
  { label: "Cadastrar produto", to: "/produtos" },
  { label: "Registrar venda", to: "/vendas" },
  { label: "Conferir estoque", to: "/estoque" },
]

export default function Dashboard() {
  const { session } = useAuth()
  const { activeStore } = useStores()
  const { products, sales } = useInventory()

  const firstName = session?.user.name?.split(" ")[0] ?? "usuário"

  // "Agora" como estado: mantém o render puro e atualiza "hoje" e o gráfico a cada minuto.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const { todaySales, revenue, attention, zeroCount, chart, recent } = useMemo(() => {
    const done = sales.filter((sale) => sale.status === "concluida")
    const todaySales = done.filter((sale) => isSameDay(sale.createdAt, now))
    const attention = needsRestock(products)

    // vendas concluídas por hora, nas últimas 8 horas (a barra mais à direita é a hora atual)
    const currentHourStart = new Date(now).setMinutes(0, 0, 0)
    const buckets = Array.from({ length: HOURS_IN_CHART }, (_, index) => {
      const start = currentHourStart - (HOURS_IN_CHART - 1 - index) * HOUR
      const value = done.filter((sale) => sale.createdAt >= start && sale.createdAt < start + HOUR).length
      return { hour: `${String(new Date(start).getHours()).padStart(2, "0")}h`, value }
    })

    return {
      todaySales,
      revenue: todaySales.reduce((sum, sale) => sum + sale.totalCents, 0),
      attention,
      zeroCount: attention.filter((product) => product.stock <= 0).length,
      chart: { buckets, max: Math.max(1, ...buckets.map((bucket) => bucket.value)) },
      recent: [...sales].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4),
    }
  }, [products, sales, now])

  const activeProducts = products.filter((product) => product.active).length

  return (
    <>
      <PageHeader
        eyebrow="Visão geral"
        title={`Olá, ${firstName}. 👋`}
        description={
          <>
            Acompanhe estoque, vendas e recebimentos de{" "}
            <strong className="font-semibold text-[var(--color-ink)]">{activeStore.name}</strong> em um único lugar.
          </>
        }
        actions={
          <div className="flex items-center gap-2 text-xs text-[var(--color-slate)]">
            <span className="h-2 w-2 rounded-full bg-[var(--color-stock-green)]" />
            Operação normal
          </div>
        }
      />

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Produtos cadastrados" value={String(products.length)} meta={`${activeProducts} ativos`} icon={Package} />
        <StatCard
          label="Vendas hoje"
          value={String(todaySales.length)}
          meta={todaySales.length ? `Ticket médio ${formatBRL(Math.round(revenue / todaySales.length))}` : "Nenhuma venda hoje"}
          icon={ShoppingCart}
        />
        <StatCard
          label="Receita hoje"
          value={formatBRL(revenue)}
          meta={`${todaySales.length} vendas confirmadas`}
          icon={CircleDollarSign}
        />
        <StatCard
          label="Itens em atenção"
          value={String(attention.length)}
          meta={zeroCount ? `${zeroCount} sem estoque` : "Nenhum sem estoque"}
          icon={TriangleAlert}
          alert={attention.length > 0}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_10px_35px_rgba(13,28,46,0.05)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-slate)]">Movimentação</p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">Vendas por hora</h2>
            </div>
            <span className="hidden rounded-lg bg-[var(--color-paper)] px-3 py-2 text-[11px] font-semibold text-[var(--color-slate)] sm:inline-flex">
              Últimas {HOURS_IN_CHART}h
            </span>
          </div>

          <div
            className="mt-8 rounded-2xl bg-[var(--color-ink)] p-5 sm:p-6"
            role="img"
            aria-label="Quantidade de vendas concluídas por hora nas últimas 8 horas"
          >
            <div className="flex h-48 items-end gap-2 sm:gap-4">
              {chart.buckets.map((bucket, index) => (
                <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-[10px] font-semibold text-white/60">{bucket.value}</span>
                  <div className="flex h-32 w-full items-end">
                    <div
                      className="w-full rounded-t-md bg-[var(--color-mint)] transition hover:opacity-80"
                      style={{ height: `${Math.max((bucket.value / chart.max) * 100, 3)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-white/60">{bucket.hour}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_10px_35px_rgba(13,28,46,0.05)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-slate)]">Estoque</p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">Reposição necessária</h2>
            </div>
            <TriangleAlert className="h-5 w-5 text-[var(--color-alert-dark)]" />
          </div>

          <div className="mt-5 space-y-2.5">
            {attention.length === 0 && (
              <p className="rounded-xl bg-[var(--color-stock-green-soft)] px-3.5 py-3 text-sm text-[var(--color-stock-green)]">
                Nenhum item abaixo do estoque mínimo.
              </p>
            )}
            {attention.slice(0, 3).map((item) => {
              const critical = stockStatus(item) === "zerado" || item.stock * 2 <= item.minStock
              const label = item.stock <= 0 ? "Sem estoque" : critical ? "Crítico" : "Atenção"
              return (
                <div key={item.id} className="rounded-xl border border-[var(--color-border)] p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.name}</p>
                      <p className="mt-1 font-mono text-[10px] text-[var(--color-slate)]">{item.sku}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                        critical
                          ? "bg-[var(--color-alert-soft)] text-[var(--color-alert-dark)]"
                          : "bg-[var(--color-warn-soft)] text-[var(--color-warn)]"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-paper-dim)]">
                      <div
                        className={`h-full rounded-full ${critical ? "bg-[var(--color-alert)]" : "bg-[var(--color-brand)]"}`}
                        style={{ width: `${Math.min((item.stock / Math.max(item.minStock, 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-[var(--color-slate)]">
                      {item.stock}/{item.minStock}
                    </span>
                  </div>
                </div>
              )
            })}
            {attention.length > 3 && (
              <Link to="/estoque" className="block pt-1 text-xs font-semibold text-[var(--color-brand-dark)] hover:underline">
                Ver todos os {attention.length} itens
              </Link>
            )}
          </div>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.55fr]">
        <Card className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-slate)]">Operação</p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">Vendas recentes</h2>
            </div>
            <Link
              to="/vendas"
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-paper)]"
            >
              Ver todas
            </Link>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {recent.length === 0 && <p className="px-5 py-6 text-sm text-[var(--color-slate)] sm:px-6">Nenhuma venda registrada ainda.</p>}
            {recent.map((sale) => (
              <div key={sale.id} className="flex items-center gap-3 px-5 py-4 sm:px-6">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-stock-green-soft)] text-[var(--color-stock-green)]">
                  <Receipt className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {sale.items[0].name}
                    {sale.items.length > 1 ? ` +${sale.items.length - 1}` : ""}
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--color-slate)]">
                    {formatSaleNumber(sale.number)} • {PAYMENT_LABELS[sale.payment]}
                    {sale.status === "cancelada" ? " • Cancelada" : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold ${sale.status === "cancelada" ? "text-[var(--color-slate)] line-through" : ""}`}
                >
                  {formatBRL(sale.totalCents)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-2xl border border-[var(--color-ink)] bg-[var(--color-ink)] p-6 text-white shadow-[0_18px_50px_rgba(13,28,46,0.16)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-mint)]">Atalhos</p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold">Pronto para a próxima venda?</h2>
          <p className="mt-3 text-sm leading-6 text-white/70">
            Produtos, vendas e estoque já estão disponíveis. Pagamentos entram em uma próxima etapa.
          </p>
          <div className="mt-7 grid grid-cols-2 gap-2">
            {shortcuts.map((shortcut) => (
              <Link
                key={shortcut.label}
                to={shortcut.to}
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-left text-[11px] font-semibold text-white transition hover:bg-white/20"
              >
                {shortcut.label}
              </Link>
            ))}
            <button
              type="button"
              disabled
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left text-[11px] font-semibold text-white/50"
            >
              Consultar pagamentos
            </button>
          </div>
        </Card>
      </section>
    </>
  )
}
