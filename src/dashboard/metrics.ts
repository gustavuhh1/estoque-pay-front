import type { PaymentMethod, Product, Sale } from "@/inventory/types"

export type Period = "hoje" | "semana" | "mes"
export const PERIOD_LABEL: Record<Period, string> = { hoje: "Hoje", semana: "7 dias", mes: "30 dias" }
const PERIOD_DAYS: Record<Period, number> = { hoje: 1, semana: 7, mes: 30 }

const DAY = 86_400_000
const startOfDay = (timestamp: number) => {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function periodBounds(period: Period, now: number) {
  const days = PERIOD_DAYS[period]
  const start = startOfDay(now) - (days - 1) * DAY
  return { start, end: startOfDay(now) + DAY, prevStart: start - days * DAY, days }
}

export type Bar = { label: string; totalCents: number }

const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short" })

/** Barras do gráfico de faturamento: por hora (hoje), por dia (7 dias) ou por semana (30 dias). */
function buildSeries(sales: Sale[], period: Period, start: number): Bar[] {
  if (period === "hoje") {
    const hours = sales.map((sale) => new Date(sale.createdAt).getHours())
    const first = Math.min(8, ...hours)
    const last = Math.max(15, ...hours)
    return Array.from({ length: last - first + 1 }, (_, index) => {
      const hour = first + index
      return {
        label: `${String(hour).padStart(2, "0")}h`,
        totalCents: sales.filter((sale) => new Date(sale.createdAt).getHours() === hour).reduce((sum, sale) => sum + sale.totalCents, 0),
      }
    })
  }
  if (period === "semana") {
    return Array.from({ length: 7 }, (_, index) => {
      const day = start + index * DAY
      const name = weekday.format(day).replace(".", "")
      return {
        label: name.charAt(0).toUpperCase() + name.slice(1),
        totalCents: sales.filter((sale) => sale.createdAt >= day && sale.createdAt < day + DAY).reduce((sum, sale) => sum + sale.totalCents, 0),
      }
    })
  }
  const bucket = (timestamp: number) => Math.min(3, Math.floor(((timestamp - start) / (30 * DAY)) * 4))
  return Array.from({ length: 4 }, (_, index) => ({
    label: `Sem ${index + 1}`,
    totalCents: sales.filter((sale) => bucket(sale.createdAt) === index).reduce((sum, sale) => sum + sale.totalCents, 0),
  }))
}

export type PaymentShare = { method: PaymentMethod; totalCents: number; percent: number }

export type DashboardMetrics = {
  salesCents: number
  count: number
  ticketCents: number
  /** Lucro bruto: preço de venda menos o custo atual dos produtos, já descontados os cupons. */
  profitCents: number
  marginPercent: number
  /** Variação do faturamento contra o período anterior de mesmo tamanho (null quando não há base). */
  deltaPercent: number | null
  series: Bar[]
  payments: PaymentShare[]
  top: { productId: string; name: string; sales: number; units: number }[]
}

export function dashboardMetrics(sales: Sale[], products: Product[], period: Period, now = Date.now()): DashboardMetrics {
  const { start, end, prevStart } = periodBounds(period, now)
  const done = sales.filter((sale) => sale.status === "concluida")
  const current = done.filter((sale) => sale.createdAt >= start && sale.createdAt < end)
  const previous = done.filter((sale) => sale.createdAt >= prevStart && sale.createdAt < start)

  const salesCents = current.reduce((sum, sale) => sum + sale.totalCents, 0)
  const previousCents = previous.reduce((sum, sale) => sum + sale.totalCents, 0)
  const costOf = (sale: Sale) =>
    sale.items.reduce((sum, item) => sum + Math.round((products.find((product) => product.id === item.productId)?.costCents ?? 0) * item.quantity), 0)
  const profitCents = salesCents - current.reduce((sum, sale) => sum + costOf(sale), 0)

  const methods: PaymentMethod[] = ["pix", "cartao", "dinheiro"]
  const payments = methods.map((method) => {
    const totalCents = current.filter((sale) => sale.payment === method).reduce((sum, sale) => sum + sale.totalCents, 0)
    return { method, totalCents, percent: salesCents > 0 ? Math.round((totalCents / salesCents) * 100) : 0 }
  })

  const ranking = new Map<string, { productId: string; name: string; sales: number; units: number }>()
  for (const sale of current) {
    for (const item of sale.items) {
      const entry = ranking.get(item.productId) ?? { productId: item.productId, name: item.name, sales: 0, units: 0 }
      entry.sales += 1
      entry.units += item.quantity
      ranking.set(item.productId, entry)
    }
  }

  return {
    salesCents,
    count: current.length,
    ticketCents: current.length ? Math.round(salesCents / current.length) : 0,
    profitCents,
    marginPercent: salesCents > 0 ? (profitCents / salesCents) * 100 : 0,
    deltaPercent: previousCents > 0 ? ((salesCents - previousCents) / previousCents) * 100 : null,
    series: buildSeries(current, period, start),
    payments,
    top: [...ranking.values()].sort((a, b) => b.units - a.units).slice(0, 4),
  }
}

