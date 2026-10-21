import { ArrowRight, CircleDollarSign, Package, Receipt, ShoppingCart, TriangleAlert } from "lucide-react"
import { useMemo } from "react"
import { Link } from "react-router-dom"

import { useAuth } from "@/auth/useAuth"
import PageHeader from "@/components/PageHeader"
import StatCard from "@/components/StatCard"
import { SaleBadge, StockBadge } from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { needsRestock } from "@/inventory/logic"
import { useInventory } from "@/inventory/useInventory"
import { formatBRL, formatDateTime, formatSaleNumber, isSameDay } from "@/lib/format"

export default function Dashboard() {
  const { session } = useAuth()
  const { products, sales } = useInventory()

  const firstName = session?.user.name?.split(" ")[0] ?? "usuário"
  const activeProducts = useMemo(() => products.filter((product) => product.active), [products])
  const todaySales = useMemo(
    () => sales.filter((sale) => sale.status === "concluida" && isSameDay(sale.createdAt)),
    [sales],
  )
  const revenueToday = todaySales.reduce((total, sale) => total + sale.totalCents, 0)
  const restock = useMemo(() => needsRestock(activeProducts), [activeProducts])
  const recentSales = useMemo(() => [...sales].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5), [sales])
  const currentHour = new Date().getHours()
  const hourlyRevenue = useMemo(() => {
    const firstHour = Math.max(0, currentHour - 7)
    const earlierSales = firstHour > 0
      ? todaySales.filter((sale) => new Date(sale.createdAt).getHours() < firstHour)
      : []
    const earlierTotal = earlierSales.reduce((total, sale) => total + sale.totalCents, 0)
    const recentHours = Array.from({ length: currentHour - firstHour + 1 }, (_, index) => {
      const hour = firstHour + index
      const totalCents = todaySales
        .filter((sale) => new Date(sale.createdAt).getHours() === hour)
        .reduce((total, sale) => total + sale.totalCents, 0)
      return { label: `${String(hour).padStart(2, "0")}h`, totalCents }
    })
    return firstHour > 0
      ? [{ label: `00–${String(firstHour - 1).padStart(2, "0")}h`, totalCents: earlierTotal }, ...recentHours]
      : recentHours
  }, [currentHour, todaySales])
  const peakHourRevenue = Math.max(...hourlyRevenue.map((entry) => entry.totalCents), 1)

  return (
    <>
      <PageHeader
        eyebrow="Painel da loja"
        title={`Olá, ${firstName}`}
        description="Acompanhe os resultados de hoje e resolva o que precisa de atenção na operação."
        actions={
          <Button asChild variant="accent">
            <Link to="/pdv">
              <ShoppingCart className="h-4 w-4" />
              Registrar venda
            </Link>
          </Button>
        }
      />

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Produtos ativos" value={String(activeProducts.length)} meta="Disponíveis no catálogo" icon={Package} />
        <StatCard
          label="Vendas hoje"
          value={String(todaySales.length)}
          meta={todaySales.length ? "Concluídas hoje" : "Nenhuma venda hoje"}
          icon={ShoppingCart}
        />
        <StatCard
          label="Faturamento hoje"
          value={formatBRL(revenueToday)}
          meta="Somente vendas concluídas"
          icon={CircleDollarSign}
        />
        <StatCard
          label="Precisa de reposição"
          value={String(restock.length)}
          meta="Estoque baixo ou zerado"
          icon={TriangleAlert}
          alert={restock.length > 0}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_10px_35px_rgba(13,28,46,0.05)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-slate)]">Desempenho</p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">Faturamento por hora</h2>
              <p className="mt-1 text-xs text-[var(--color-slate)]">Faturamento acumulado de hoje até agora</p>
            </div>
            <span className="rounded-full bg-[var(--color-stock-green-soft)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-stock-green)]">
              Hoje
            </span>
          </div>

          {todaySales.length === 0 ? (
            <div className="mt-6 flex min-h-48 items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-paper)] px-4 text-center text-sm text-[var(--color-slate)]">
              O faturamento por hora aparecerá aqui quando uma venda for concluída.
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-xl bg-[var(--color-paper)] p-4 sm:p-5">
              <div className="flex min-w-[560px] items-end gap-3">
                {hourlyRevenue.map(({ label, totalCents }) => (
                  <div
                    key={label}
                    className="flex min-h-44 flex-1 flex-col items-center justify-end gap-2"
                    title={`${label} — ${formatBRL(totalCents)}`}
                  >
                    <span className="text-center text-[10px] font-semibold tabular-nums text-[var(--color-slate)]">
                      {formatBRL(totalCents)}
                    </span>
                    <div className="flex h-28 w-full items-end rounded-t-md bg-[var(--color-paper-dim)]">
                      <div
                        className="w-full rounded-t-md bg-[var(--color-stock-green)] transition-[height] duration-300"
                        style={{ height: `${totalCents ? Math.max((totalCents / peakHourRevenue) * 100, 6) : 2}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-[var(--color-slate)]">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_10px_35px_rgba(13,28,46,0.05)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-slate)]">Estoque</p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">Itens para revisar</h2>
            </div>
            <TriangleAlert className={`h-5 w-5 ${restock.length ? "text-[var(--color-alert)]" : "text-[var(--color-stock-green)]"}`} />
          </div>

          {restock.length === 0 ? (
            <div className="mt-5 rounded-xl bg-[var(--color-stock-green-soft)] px-4 py-5 text-sm text-[var(--color-stock-green)]">
              Estoque em dia. Nenhum produto precisa de reposição.
            </div>
          ) : (
            <div className="mt-5 divide-y divide-[var(--color-border)]">
              {restock.slice(0, 4).map((product) => (
                <div key={product.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{product.name}</p>
                    <p className="mt-1 font-mono text-[10px] text-[var(--color-slate)]">{product.sku}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <StockBadge product={product} />
                    <span className="text-[10px] tabular-nums text-[var(--color-slate)]">
                      {product.stock} / {product.minStock} un.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Link
            to="/estoque"
            className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-stock-green)] hover:underline"
          >
            Ver estoque
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.55fr]">
        <Card className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-slate)]">Operação</p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">Vendas recentes</h2>
            </div>
            <Link to="/vendas" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-stock-green)] hover:underline">
              Ver vendas
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recentSales.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Receipt className="mx-auto h-8 w-8 text-[var(--color-slate)]" />
              <p className="mt-3 text-sm font-semibold">Nenhuma venda registrada</p>
              <p className="mt-1 text-xs text-[var(--color-slate)]">As vendas concluídas no PDV aparecerão aqui.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center gap-3 px-5 py-4 sm:px-6">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-stock-green-soft)] text-[var(--color-stock-green)]">
                    <Receipt className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {sale.items[0]?.name ?? "Venda sem itens"}
                      {sale.items.length > 1 ? ` +${sale.items.length - 1}` : ""}
                    </p>
                    <p className="mt-1 text-[10px] text-[var(--color-slate)]">
                      {formatSaleNumber(sale.number)} · {formatDateTime(sale.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-sm font-semibold tabular-nums">{formatBRL(sale.totalCents)}</span>
                    <SaleBadge status={sale.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="rounded-2xl border border-[var(--color-ink)] bg-[var(--color-ink)] p-6 text-white shadow-[0_18px_50px_rgba(13,28,46,0.16)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-amber)]">Acesso rápido</p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold">Continue a operação</h2>
          <p className="mt-3 text-sm leading-6 text-white/65">Abra uma área da loja para registrar vendas ou atualizar produtos e estoque.</p>
          <div className="mt-6 grid gap-2">
            {[
              { label: "Abrir PDV", to: "/pdv" },
              { label: "Gerenciar produtos", to: "/produtos" },
              { label: "Conferir estoque", to: "/estoque" },
            ].map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {label}
                <ArrowRight className="h-4 w-4 text-white/60" />
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </>
  )
}
