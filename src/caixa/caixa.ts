import { DEMO_STORE_IDS } from "@/customers/demo"
import type { PaymentMethod, Sale } from "@/inventory/types"

/** Turno de caixa: abre com um fundo de troco e fecha com a contagem do dinheiro. */
export type Shift = {
  id: string
  openedAt: number
  openingCents: number
  operator: string
  closedAt?: number
  /** Dinheiro contado no fechamento. */
  countedCents?: number
  /** Dinheiro esperado no fechamento (fundo + vendas em dinheiro). */
  expectedCents?: number
}

const key = (storeId: string) => `estoquepay.demo.caixa.${storeId}`

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/** Turnos da loja. As lojas de exemplo começam com o caixa aberto desde o início do dia. */
export function readShifts(storeId: string): Shift[] {
  const demo = (): Shift[] =>
    DEMO_STORE_IDS.has(storeId) ? [{ id: "seed-shift", openedAt: startOfToday(), openingCents: 20_000, operator: "Carlos Santos" }] : []
  try {
    const raw = localStorage.getItem(key(storeId))
    if (raw === null) return demo()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((shift): shift is Shift => Boolean(shift && typeof shift.id === "string" && typeof shift.openedAt === "number" && typeof shift.openingCents === "number"))
  } catch {
    return demo()
  }
}

export function writeShifts(storeId: string, shifts: Shift[]) {
  try {
    localStorage.setItem(key(storeId), JSON.stringify(shifts))
    return true
  } catch {
    return false
  }
}

/** Turno em andamento (sem fechamento), se houver. */
export const openShift = (shifts: Shift[]) => shifts.find((shift) => shift.closedAt === undefined)

export type ShiftTotals = {
  count: number
  totalCents: number
  byMethod: Record<PaymentMethod, number>
  /** Dinheiro esperado na gaveta: fundo de troco + vendas em dinheiro. */
  expectedCashCents: number
}

/** Totais das vendas concluídas durante o turno (canceladas não entram). */
export function shiftTotals(sales: Sale[], shift: Shift): ShiftTotals {
  const end = shift.closedAt ?? Number.POSITIVE_INFINITY
  const mine = sales.filter((sale) => sale.status === "concluida" && sale.createdAt >= shift.openedAt && sale.createdAt <= end)
  const byMethod: Record<PaymentMethod, number> = { pix: 0, cartao: 0, dinheiro: 0 }
  for (const sale of mine) byMethod[sale.payment] += sale.totalCents
  return {
    count: mine.length,
    totalCents: mine.reduce((sum, sale) => sum + sale.totalCents, 0),
    byMethod,
    expectedCashCents: shift.openingCents + byMethod.dinheiro,
  }
}
