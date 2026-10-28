import { stockStatus, type StockStatus } from "@/inventory/logic"
import type { MovementType, Product, Sale } from "@/inventory/types"

const base = "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold"

const stockStyles: Record<StockStatus, { label: string; className: string }> = {
  normal: { label: "Normal", className: "bg-[var(--color-stock-green-soft)] text-[var(--color-stock-green)]" },
  baixo: { label: "Estoque baixo", className: "bg-[var(--color-warn-soft)] text-[var(--color-warn)]" },
  zerado: { label: "Sem estoque", className: "bg-[var(--color-alert-soft)] text-[var(--color-alert-dark)]" },
}

export function StockBadge({ product }: { product: Pick<Product, "stock" | "minStock"> }) {
  const { label, className } = stockStyles[stockStatus(product)]
  return <span className={`${base} ${className}`}>{label}</span>
}

export function SaleBadge({ status }: { status: Sale["status"] }) {
  return status === "concluida" ? (
    <span className={`${base} bg-[var(--color-stock-green-soft)] text-[var(--color-stock-green)]`}>Concluída</span>
  ) : (
    <span className={`${base} bg-[var(--color-alert-soft)] text-[var(--color-alert-dark)]`}>Cancelada</span>
  )
}

const movementLabels: Record<MovementType, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste",
  venda: "Venda",
  cancelamento: "Cancelamento",
}

export function MovementBadge({ type }: { type: MovementType }) {
  return <span className={`${base} bg-[var(--color-paper-dim)] text-[var(--color-ink)]`}>{movementLabels[type]}</span>
}
