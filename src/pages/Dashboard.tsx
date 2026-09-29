import { CircleDollarSign, Package, Receipt, ShoppingCart, TriangleAlert } from "lucide-react"
import { useState } from "react"

import DashboardHeader from "@/components/layout/DashboardHeader"
import DashboardSidebar from "@/components/layout/DashboardSidebar"
import { useAuth } from "@/auth/AuthContext"
import { Card } from "@/components/ui/card"

const movements = [
  { hour: "08h", value: 38 },
  { hour: "09h", value: 52 },
  { hour: "10h", value: 44 },
  { hour: "11h", value: 68 },
  { hour: "12h", value: 58 },
  { hour: "13h", value: 82 },
  { hour: "14h", value: 72 },
  { hour: "15h", value: 94 },
]

const lowStock = [
  { name: "Tênis Corrida 42", sku: "TEN-023", stock: 3, limit: 10, status: "Crítico" },
  { name: "Caneca Cerâmica", sku: "CAN-014", stock: 12, limit: 15, status: "Atenção" },
  { name: "Caderno Executivo", sku: "CAD-019", stock: 8, limit: 12, status: "Atenção" },
]

const recentSales = [
  { id: "#00482", item: "Camiseta Básica P", channel: "Balcão", total: "R$ 129,90" },
  { id: "#00481", item: "Tênis Corrida 42", channel: "Online", total: "R$ 349,90" },
  { id: "#00480", item: "Caneca Cerâmica", channel: "Balcão", total: "R$ 54,90" },
  { id: "#00479", item: "Mochila Urbana", channel: "Online", total: "R$ 219,90" },
]

const shortcuts = ["Cadastrar produto", "Registrar venda", "Conferir estoque", "Consultar pagamentos"]

export default function Dashboard() {
  const { session } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const firstName = session?.user.name?.split(" ")[0] ?? "usuário"

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] lg:pl-[250px]">
      <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <DashboardHeader onOpenSidebar={() => setSidebarOpen(true)} />

      <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        <section className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-amber-dark)]">Visão geral</p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">Olá, {firstName}. 👋</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-slate)]">Acompanhe estoque, vendas e recebimentos da sua loja em um único lugar.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-slate)]">
            <span className="h-2 w-2 rounded-full bg-[var(--color-stock-green)]" />
            Operação normal
          </div>
        </section>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Produtos cadastrados", value: "248", meta: "+12 este mês", icon: Package },
            { label: "Vendas hoje", value: "84", meta: "+8,4% vs. ontem", icon: ShoppingCart },
            { label: "Receita hoje", value: "R$ 8.420", meta: "42 vendas confirmadas", icon: CircleDollarSign },
            { label: "Itens em atenção", value: "3", meta: "2 com reposição próxima", icon: TriangleAlert, alert: true },
          ].map(({ label, value, meta, icon: Icon, alert }) => (
            <Card key={label} className={`rounded-2xl border bg-white p-5 shadow-[0_10px_35px_rgba(13,28,46,0.05)] ${alert ? "border-[var(--color-alert)]/20" : "border-[var(--color-border)]"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-[var(--color-slate)]">{label}</p>
                  <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">{value}</p>
                  <p className={`mt-2 text-[11px] ${alert ? "text-[var(--color-alert)]" : "text-[var(--color-stock-green)]"}`}>{meta}</p>
                </div>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${alert ? "bg-[var(--color-alert-soft)] text-[var(--color-alert)]" : "bg-[var(--color-stock-green-soft)] text-[var(--color-stock-green)]"}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </Card>
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <Card className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_10px_35px_rgba(13,28,46,0.05)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-slate)]">Movimentação</p>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">Vendas ao longo do dia</h2>
              </div>
              <span className="hidden rounded-lg bg-[var(--color-paper)] px-3 py-2 text-[11px] font-semibold text-[var(--color-slate)] sm:inline-flex">Hoje</span>
            </div>

            <div className="mt-8 rounded-2xl bg-[var(--color-ink)] p-5 sm:p-6">
              <div className="flex h-48 items-end gap-2 sm:gap-4">
                {movements.map((movement) => (
                  <div key={movement.hour} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-[10px] font-semibold text-white/45">{movement.value}</span>
                    <div className="flex h-32 w-full items-end">
                      <div className="w-full rounded-t-md bg-[var(--color-amber)] transition hover:opacity-80" style={{ height: `${movement.value}%` }} />
                    </div>
                    <span className="text-[10px] text-white/45">{movement.hour}</span>
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
              <TriangleAlert className="h-5 w-5 text-[var(--color-alert)]" />
            </div>

            <div className="mt-5 space-y-2.5">
              {lowStock.map((item) => (
                <div key={item.sku} className="rounded-xl border border-[var(--color-border)] p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.name}</p>
                      <p className="mt-1 font-mono text-[10px] text-[var(--color-slate)]">{item.sku}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.status === "Crítico" ? "bg-[var(--color-alert-soft)] text-[var(--color-alert)]" : "bg-[var(--color-paper-dim)] text-[var(--color-slate)]"}`}>{item.status}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-paper-dim)]">
                      <div className={`h-full rounded-full ${item.status === "Crítico" ? "bg-[var(--color-alert)]" : "bg-[var(--color-amber)]"}`} style={{ width: `${Math.min((item.stock / item.limit) * 100, 100)}%` }} />
                    </div>
                    <span className="text-[10px] font-semibold text-[var(--color-slate)]">{item.stock}/{item.limit}</span>
                  </div>
                </div>
              ))}
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
              <button type="button" disabled className="hidden rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-ink)] opacity-60 sm:inline-flex">Ver todas</button>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center gap-3 px-5 py-4 sm:px-6">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-stock-green-soft)] text-[var(--color-stock-green)]"><Receipt className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{sale.item}</p>
                    <p className="mt-1 text-[10px] text-[var(--color-slate)]">{sale.id} • {sale.channel}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">{sale.total}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-2xl border border-[var(--color-ink)] bg-[var(--color-ink)] p-6 text-white shadow-[0_18px_50px_rgba(13,28,46,0.16)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-amber)]">Atalhos</p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold">Pronto para a próxima venda?</h2>
            <p className="mt-3 text-sm leading-6 text-white/60">Os módulos de estoque, vendas e pagamentos já têm espaço reservado no layout para entrar nas próximas sprints.</p>
            <div className="mt-7 grid grid-cols-2 gap-2">
              {shortcuts.map((action) => (
                <button key={action} type="button" disabled className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left text-[11px] font-semibold text-white/50">{action}</button>
              ))}
            </div>
          </Card>
        </section>
      </main>
    </div>
  )
}
