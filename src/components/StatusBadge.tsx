import type { MovementType } from "@/inventory/types"

const base = "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold"

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
