/** Categorias iniciais de uma loja nova; o cadastro de produtos aceita qualquer categoria. */
export const CATEGORIES = ["Cafés", "Despensa", "Chocolates", "Laticínios", "Frios"]
export type Category = string

export type Unit = "UN" | "KG" | "LT"
export const UNITS: Unit[] = ["UN", "KG", "LT"]
/** Unidades vendidas a granel aceitam quantidade fracionada (até 3 casas decimais). */
export const isFractionalUnit = (unit: Unit) => unit !== "UN"

export type Product = {
  id: string
  sku: string
  /** Código de barras (EAN/GTIN). Vazio quando o produto não tem. */
  ean: string
  name: string
  category: Category
  unit: Unit
  priceCents: number
  costCents: number
  /** Dados fiscais: obrigatórios apenas enquanto a NFC-e estiver ligada. */
  ncm: string
  cfop: string
  /** Foto do produto (caminho público). Sem foto, a interface mostra um ícone. */
  image?: string
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
  ean?: string
  unit?: Unit
  ncm?: string
  cfop?: string
  /** Padrão: ativo. A trava fiscal pode forçar inativo. */
  active?: boolean
}

export type PaymentMethod = "pix" | "cartao" | "dinheiro"
export const PAYMENT_LABELS: Record<PaymentMethod, string> = { pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro" }

export type SaleItem = {
  productId: string
  name: string
  sku: string
  unit?: Unit
  /** Pode ser fracionada para produtos vendidos por KG ou LT. */
  quantity: number
  unitCents: number
}

export type Sale = {
  id: string
  number: number
  createdAt: number
  items: SaleItem[]
  totalCents: number
  payment: PaymentMethod
  status: "concluida" | "cancelada"
  canceledAt?: number
  /** Apenas dígitos. Ausente quando o consumidor não foi identificado. */
  cpf?: string
  customerName?: string
  /** Pagamento em dinheiro: valor entregue pelo cliente e troco devolvido. */
  receivedCents?: number
  changeCents?: number
  /** Desconto de cupom aplicado sobre o subtotal dos itens. */
  discountCents?: number
  couponCode?: string
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

export type StoreInventory = { products: Product[]; sales: Sale[]; movements: Movement[]; categories: Category[] }

/** Categoria atribuída aos produtos de uma categoria excluída. */
export const NO_CATEGORY = "Sem categoria"

export type MoveInput = {
  productId: string
  type: "entrada" | "saida" | "ajuste"
  /** Entrada/saída: quantidade movimentada. Ajuste: quantidade contada (novo saldo). */
  quantity: number
  reason: string
}

export type SaleInput = {
  items: { productId: string; quantity: number }[]
  payment: PaymentMethod
  cpf?: string
  customerName?: string
  receivedCents?: number
  discountCents?: number
  couponCode?: string
}

export type Result<T = void> = { ok: true; value: T } | { ok: false; error: string }
