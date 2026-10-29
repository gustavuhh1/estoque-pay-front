import type { Customer } from "@/customers/customers"
import { digitsOf } from "@/lib/format"
import type { Sale } from "@/inventory/types"

export type CustomerStats = {
  count: number
  ticketCents: number
  /** Produto mais comprado (por quantidade). */
  favorite: string | null
  /** 1 ponto de fidelidade a cada R$ 1,00 em compras. */
  points: number
  recent: Sale[]
}

function summarize(sales: Sale[]): CustomerStats {
  const total = sales.reduce((sum, sale) => sum + sale.totalCents, 0)
  const byProduct = new Map<string, number>()
  for (const sale of sales) for (const item of sale.items) byProduct.set(item.name, (byProduct.get(item.name) ?? 0) + item.quantity)
  const favorite = [...byProduct.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  return {
    count: sales.length,
    ticketCents: sales.length ? Math.round(total / sales.length) : 0,
    favorite,
    points: Math.floor(total / 100),
    recent: [...sales].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
  }
}

/** Histórico e fidelidade de um cliente, calculados a partir das vendas concluídas com o CPF dele. */
export function customerStats(customer: Customer, sales: Sale[]): CustomerStats {
  const cpf = digitsOf(customer.cpf)
  return summarize(sales.filter((sale) => sale.status === "concluida" && sale.cpf === cpf))
}

/** Vendas concluídas sem CPF ("Consumidor não identificado"). */
export function walkInStats(sales: Sale[]): CustomerStats {
  return summarize(sales.filter((sale) => sale.status === "concluida" && !sale.cpf))
}
