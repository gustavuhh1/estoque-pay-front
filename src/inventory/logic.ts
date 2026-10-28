import { parseMoneyToCents, parseWholeNumber } from "@/lib/format"
import {
  CATEGORIES,
  type Category,
  type Movement,
  type MoveInput,
  type PaymentMethod,
  type Product,
  type ProductInput,
  type Sale,
  type SaleInput,
  type StoreInventory,
} from "@/inventory/types"

export const EMPTY_INVENTORY: StoreInventory = { products: [], sales: [], movements: [] }

export type Outcome<T> = { ok: true; inventory: StoreInventory; value: T } | { ok: false; error: string }
const fail = (error: string) => ({ ok: false as const, error })

let counter = 0
/** Id local único (não depende de crypto.randomUUID, que não existe em contextos http). */
export const uid = () => `${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`

// ---------- situação do estoque ----------
export type StockStatus = "zerado" | "baixo" | "normal"

export function stockStatus(product: Pick<Product, "stock" | "minStock">): StockStatus {
  if (product.stock <= 0) return "zerado"
  if (product.stock <= product.minStock) return "baixo"
  return "normal"
}

/** Itens que precisam de reposição, do mais crítico para o menos crítico (somente ativos). */
export function needsRestock(products: Product[]) {
  return products
    .filter((product) => product.active && stockStatus(product) !== "normal")
    .sort((a, b) => a.stock / Math.max(a.minStock, 1) - b.stock / Math.max(b.minStock, 1))
}

// ---------- validação de formulário de produto ----------
export type RawProductForm = {
  name: string
  sku: string
  category: string
  price: string
  cost: string
  minStock: string
  stock: string
}
export type ProductFormErrors = Partial<Record<keyof RawProductForm, string>>

const MAX_CENTS = 100_000_000
const MAX_UNITS = 1_000_000

export function validateProductForm(
  raw: RawProductForm,
  products: Product[],
  options: { editingId?: string; requireStock: boolean },
): { errors: ProductFormErrors; input: ProductInput | null } {
  const errors: ProductFormErrors = {}

  const name = raw.name.trim()
  if (name.length < 2) errors.name = "Informe o nome do produto."
  else if (name.length > 80) errors.name = "Use no máximo 80 caracteres."

  const sku = raw.sku.trim().toUpperCase()
  if (!/^[A-Z0-9][A-Z0-9._-]{1,31}$/.test(sku)) errors.sku = "Use de 2 a 32 caracteres: letras, números, ponto, hífen ou _."
  else if (products.some((product) => product.sku === sku && product.id !== options.editingId))
    errors.sku = "Já existe um produto com este SKU."

  if (!CATEGORIES.includes(raw.category as Category)) errors.category = "Escolha uma categoria."

  const priceCents = parseMoneyToCents(raw.price)
  if (priceCents === null) errors.price = "Informe um preço válido (ex.: 129,90)."
  else if (priceCents <= 0) errors.price = "O preço deve ser maior que zero."
  else if (priceCents > MAX_CENTS) errors.price = "Valor acima do permitido."

  const costCents = raw.cost.trim() === "" ? 0 : parseMoneyToCents(raw.cost)
  if (costCents === null) errors.cost = "Informe um custo válido (ex.: 58,00) ou deixe em branco."
  else if (costCents > MAX_CENTS) errors.cost = "Valor acima do permitido."

  const minStock = parseWholeNumber(raw.minStock === "" ? "0" : raw.minStock)
  if (minStock === null || minStock > MAX_UNITS) errors.minStock = "Informe um número inteiro (0 ou mais)."

  let stock = 0
  if (options.requireStock) {
    const parsed = parseWholeNumber(raw.stock === "" ? "0" : raw.stock)
    if (parsed === null || parsed > MAX_UNITS) errors.stock = "Informe um número inteiro (0 ou mais)."
    else stock = parsed
  }

  if (Object.keys(errors).length > 0) return { errors, input: null }
  return {
    errors,
    input: { name, sku, category: raw.category as Category, priceCents: priceCents!, costCents: costCents!, minStock: minStock!, stock },
  }
}

// ---------- operações (puras: recebem o inventário e devolvem o próximo) ----------
function movement(product: Product, type: Movement["type"], delta: number, reason: string, at: number): Movement {
  return {
    id: uid(),
    createdAt: at,
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    type,
    delta,
    balance: product.stock,
    reason,
  }
}

export function createProduct(inv: StoreInventory, input: ProductInput, at = Date.now()): Outcome<Product> {
  if (inv.products.some((product) => product.sku === input.sku)) return fail("Já existe um produto com este SKU.")
  const product: Product = { id: uid(), ...input, active: true, createdAt: at }
  const movements = input.stock > 0 ? [movement(product, "entrada", input.stock, "Estoque inicial", at), ...inv.movements] : inv.movements
  return { ok: true, inventory: { ...inv, products: [...inv.products, product], movements }, value: product }
}

export function updateProduct(inv: StoreInventory, id: string, input: Omit<ProductInput, "stock">): Outcome<Product> {
  const current = inv.products.find((product) => product.id === id)
  if (!current) return fail("Produto não encontrado.")
  if (inv.products.some((product) => product.sku === input.sku && product.id !== id)) return fail("Já existe um produto com este SKU.")
  const updated: Product = { ...current, ...input }
  return { ok: true, inventory: { ...inv, products: inv.products.map((p) => (p.id === id ? updated : p)) }, value: updated }
}

export function setProductActive(inv: StoreInventory, id: string, active: boolean): Outcome<Product> {
  const current = inv.products.find((product) => product.id === id)
  if (!current) return fail("Produto não encontrado.")
  const updated = { ...current, active }
  return { ok: true, inventory: { ...inv, products: inv.products.map((p) => (p.id === id ? updated : p)) }, value: updated }
}

export function moveStock(inv: StoreInventory, input: MoveInput, at = Date.now()): Outcome<Movement> {
  const product = inv.products.find((item) => item.id === input.productId)
  if (!product) return fail("Selecione um produto.")
  const { quantity, type } = input
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_UNITS) return fail("Informe uma quantidade inteira válida.")

  let delta: number
  if (type === "entrada") {
    if (quantity <= 0) return fail("A quantidade deve ser maior que zero.")
    delta = quantity
  } else if (type === "saida") {
    if (quantity <= 0) return fail("A quantidade deve ser maior que zero.")
    if (quantity > product.stock) return fail(`Saída maior que o estoque disponível (${product.stock}).`)
    delta = -quantity
  } else {
    delta = quantity - product.stock
    if (delta === 0) return fail("A contagem é igual ao estoque atual.")
  }

  const reason = input.reason.trim() || (type === "entrada" ? "Entrada de mercadoria" : "")
  if (!reason) return fail("Informe o motivo da movimentação.")

  const updated = { ...product, stock: product.stock + delta }
  const entry = movement(updated, type, delta, reason, at)
  return {
    ok: true,
    inventory: { ...inv, products: inv.products.map((p) => (p.id === product.id ? updated : p)), movements: [entry, ...inv.movements] },
    value: entry,
  }
}

export function registerSale(inv: StoreInventory, input: SaleInput, at = Date.now(), firstNumber = 1): Outcome<Sale> {
  if (!["pix", "cartao", "dinheiro"].includes(input.payment)) return fail("Escolha a forma de pagamento.")
  if (input.items.length === 0) return fail("Adicione ao menos um produto à venda.")

  // agrupa linhas repetidas do mesmo produto
  const wanted = new Map<string, number>()
  for (const line of input.items) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) return fail("Quantidade inválida na venda.")
    wanted.set(line.productId, (wanted.get(line.productId) ?? 0) + line.quantity)
  }

  const items: Sale["items"] = []
  let products = inv.products
  let movements = inv.movements
  const number = Math.max(firstNumber, inv.sales.reduce((max, sale) => Math.max(max, sale.number), 0) + 1)

  for (const [productId, quantity] of wanted) {
    const product = products.find((p) => p.id === productId)
    if (!product || !product.active) return fail("Um dos produtos não está disponível para venda.")
    if (quantity > product.stock) return fail(`Estoque insuficiente para "${product.name}" (disponível: ${product.stock}).`)
    const updated = { ...product, stock: product.stock - quantity }
    products = products.map((p) => (p.id === productId ? updated : p))
    movements = [movement(updated, "venda", -quantity, `Venda #${String(number).padStart(5, "0")}`, at), ...movements]
    items.push({ productId, name: product.name, sku: product.sku, quantity, unitCents: product.priceCents })
  }

  const totalCents = items.reduce((sum, item) => sum + item.unitCents * item.quantity, 0)
  const sale: Sale = { id: uid(), number, createdAt: at, items, totalCents, payment: input.payment, status: "concluida" }
  return { ok: true, inventory: { products, movements, sales: [sale, ...inv.sales] }, value: sale }
}

export function cancelSale(inv: StoreInventory, saleId: string, at = Date.now()): Outcome<Sale> {
  const sale = inv.sales.find((item) => item.id === saleId)
  if (!sale) return fail("Venda não encontrada.")
  if (sale.status === "cancelada") return fail("Esta venda já foi cancelada.")

  let products = inv.products
  let movements = inv.movements
  for (const item of sale.items) {
    const product = products.find((p) => p.id === item.productId)
    if (!product) continue
    const updated = { ...product, stock: product.stock + item.quantity }
    products = products.map((p) => (p.id === product.id ? updated : p))
    movements = [
      movement(updated, "cancelamento", item.quantity, `Cancelamento da venda #${String(sale.number).padStart(5, "0")}`, at),
      ...movements,
    ]
  }
  const canceled: Sale = { ...sale, status: "cancelada", canceledAt: at }
  return { ok: true, inventory: { products, movements, sales: inv.sales.map((s) => (s.id === saleId ? canceled : s)) }, value: canceled }
}

// ---------- indicadores ----------
export function stockValueCents(products: Product[]) {
  return products.reduce((sum, product) => sum + product.stock * product.costCents, 0)
}

// ---------- dados de demonstração (derivados pelas mesmas regras, então ficam coerentes) ----------
const SEEDED_STORE_IDS = new Set(["ponto-certo", "centro", "shopping"])

type SeedProduct = [sku: string, name: string, category: Category, price: number, cost: number, stock: number, min: number]
const SEED_PRODUCTS: SeedProduct[] = [
  ["CAM-007", "Camiseta Básica P", "Vestuário", 129.9, 58, 34, 10],
  ["CAM-008", "Camiseta Básica M", "Vestuário", 129.9, 58, 22, 10],
  ["CAL-011", "Calça Jeans 40", "Vestuário", 189.9, 92, 15, 8],
  ["TEN-023", "Tênis Corrida 42", "Calçados", 349.9, 190, 3, 10],
  ["TEN-031", "Tênis Casual 40", "Calçados", 279.9, 150, 0, 6],
  ["SAN-005", "Sandália Conforto 37", "Calçados", 119.9, 55, 18, 6],
  ["MOC-002", "Mochila Urbana", "Acessórios", 219.9, 110, 11, 5],
  ["BON-004", "Boné Aba Curva", "Acessórios", 69.9, 28, 40, 12],
  ["CAN-014", "Caneca Cerâmica", "Casa", 54.9, 21, 12, 15],
  ["GAR-009", "Garrafa Térmica 500ml", "Casa", 99.9, 45, 26, 10],
  ["CAD-019", "Caderno Executivo", "Papelaria", 39.9, 17, 8, 12],
  ["PAP-003", "Caneta Gel (caixa com 12)", "Papelaria", 34.9, 15, 60, 20],
]

// [minutos atrás, itens [sku, qtd][], pagamento, cancelada?]
const SEED_SALES: [number, [string, number][], PaymentMethod, boolean?][] = [
  [
    27 * 60,
    [
      ["CAM-008", 2],
      ["BON-004", 1],
    ],
    "cartao",
  ],
  [22 * 60, [["TEN-031", 3]], "pix"],
  [9 * 60, [["GAR-009", 2]], "dinheiro"],
  [
    6 * 60,
    [
      ["TEN-023", 1],
      ["MOC-002", 1],
    ],
    "cartao",
  ],
  [5 * 60, [["CAN-014", 3]], "pix"],
  [3 * 60, [["CAM-007", 1]], "pix", true],
  [
    2 * 60,
    [
      ["CAD-019", 4],
      ["PAP-003", 2],
    ],
    "dinheiro",
  ],
  [60, [["TEN-023", 1]], "cartao"],
  [
    25,
    [
      ["MOC-002", 1],
      ["CAM-007", 1],
    ],
    "pix",
  ],
]

export function seedFor(storeId: string, now = Date.now()): StoreInventory {
  if (!SEEDED_STORE_IDS.has(storeId)) return EMPTY_INVENTORY
  const minute = 60_000

  // O estoque inicial é "estoque atual + o que as vendas de demonstração consumiram",
  // e as vendas são registradas pelas funções reais: o histórico fecha com o saldo atual.
  const sold = new Map<string, number>()
  for (const [, items, , canceled] of SEED_SALES) if (!canceled) for (const [sku, qty] of items) sold.set(sku, (sold.get(sku) ?? 0) + qty)

  let inv: StoreInventory = {
    products: SEED_PRODUCTS.map(([sku, name, category, price, cost, stock, min], index) => ({
      id: `seed-${sku.toLowerCase()}`,
      sku,
      name,
      category,
      priceCents: Math.round(price * 100),
      costCents: Math.round(cost * 100),
      stock: stock + (sold.get(sku) ?? 0),
      minStock: min,
      active: true,
      createdAt: now - (72 * 60 + index) * minute,
    })),
    sales: [],
    movements: [],
  }
  inv.movements = inv.products
    .filter((p) => p.stock > 0)
    .map((p) => movement(p, "entrada", p.stock, "Estoque inicial", now - 72 * 60 * minute))

  for (const [ago, items, payment, canceled] of SEED_SALES) {
    const at = now - ago * minute
    const outcome = registerSale(
      inv,
      { items: items.map(([sku, quantity]) => ({ productId: `seed-${sku.toLowerCase()}`, quantity })), payment },
      at,
      474,
    )
    if (!outcome.ok) throw new Error(`seed inválido: ${outcome.error}`)
    inv = outcome.inventory
    if (canceled) {
      const undone = cancelSale(inv, outcome.value.id, at + 30 * minute)
      if (!undone.ok) throw new Error(`seed inválido: ${undone.error}`)
      inv = undone.inventory
    }
  }
  return inv
}
