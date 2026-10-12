export const CATEGORIES = ["Vestuário", "Calçados", "Acessórios", "Casa", "Papelaria"] as const
export type Category = (typeof CATEGORIES)[number]

export type Product = {
  id: string
  sku: string
  name: string
  category: Category
  priceCents: number
  costCents: number
  stock: number
  minStock: number
  active: boolean
  createdAt: number
}

export type ProductInput = {
  name: string
  sku: string
  category: Category
  priceCents: number
  costCents: number
  minStock: number
  stock: number
}

export type PaymentMethod = "pix" | "cartao" | "dinheiro"
export const PAYMENT_LABELS: Record<PaymentMethod, string> = { pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro" }

export type SaleItem = { productId: string; name: string; sku: string; quantity: number; unitCents: number }

export type Sale = {
  id: string
  number: number
  createdAt: number
  items: SaleItem[]
  totalCents: number
  payment: PaymentMethod
  status: "concluida" | "cancelada"
  canceledAt?: number
}

export type MovementType = "entrada" | "saida" | "ajuste" | "venda" | "cancelamento"

export type Movement = {
  id: string
  createdAt: number
  productId: string
  productName: string
  sku: string
  type: MovementType
  /** Variação do estoque (positiva ou negativa). */
  delta: number
  /** Saldo do produto depois da movimentação. */
  balance: number
  reason: string
}

export type StoreInventory = { products: Product[]; sales: Sale[]; movements: Movement[] }

export type MoveInput = {
  productId: string
  type: "entrada" | "saida" | "ajuste"
  /** Entrada/saída: quantidade movimentada. Ajuste: quantidade contada (novo saldo). */
  quantity: number
  reason: string
}

export type SaleInput = { items: { productId: string; quantity: number }[]; payment: PaymentMethod }

export type Result<T = void> = { ok: true; value: T } | { ok: false; error: string }
