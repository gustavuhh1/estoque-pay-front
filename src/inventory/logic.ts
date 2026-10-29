import { DEMO_CUSTOMERS, DEMO_STORE_IDS } from "@/customers/demo"
import { normalizeText, parseMoneyToCents, parseQuantity, parseWholeNumber } from "@/lib/format"
import {
  CATEGORIES,
  NO_CATEGORY,
  UNITS,
  isFractionalUnit,
  type Category,
  type Movement,
  type MoveInput,
  type PaymentMethod,
  type Product,
  type ProductInput,
  type Sale,
  type SaleInput,
  type StoreInventory,
  type Unit,
} from "@/inventory/types"

export const EMPTY_INVENTORY: StoreInventory = { products: [], sales: [], movements: [], categories: [...CATEGORIES] }

/** Arredonda para 3 casas (milésimos), a precisão das quantidades fracionadas. */
export const roundQty = (value: number) => Math.round(value * 1000) / 1000

/** Total de uma linha de venda em centavos (a quantidade pode ser fracionada). */
export const lineTotalCents = (unitCents: number, quantity: number) => Math.round(unitCents * quantity)

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
  ean: string
  unit: string
  category: string
  cost: string
  price: string
  ncm: string
  cfop: string
  minStock: string
  active: boolean
}
export type ProductFormErrors = Partial<Record<Exclude<keyof RawProductForm, "active">, string>>

const MAX_CENTS = 100_000_000
const MAX_UNITS = 1_000_000

/** Quantidade válida: finita, entre 0 e o limite, com no máximo 3 casas decimais. */
const isQuantity = (value: number) => Number.isFinite(value) && value >= 0 && value <= MAX_UNITS && roundQty(value) === value

/** Produto sem NCM ou CFOP: não pode ficar ativo enquanto a NFC-e estiver ligada. */
export const missingFiscal = (product: Pick<Product, "ncm" | "cfop">) => !product.ncm.trim() || !product.cfop.trim()

/** SKU automático no formato ABC-DEF-001, único dentro da loja. */
export function generateSku(name: string, products: Product[]) {
  const words = normalizeText(name).toUpperCase().replace(/[^A-Z0-9 ]/g, " ").split(/\s+/).filter((word) => word.length >= 3)
  const first = (words[0] ?? "PRD").slice(0, 3).padEnd(3, "X")
  const second = (words[1] ?? "GEN").slice(0, 3).padEnd(3, "X")
  for (let n = 1; ; n++) {
    const sku = `${first}-${second}-${String(n).padStart(3, "0")}`
    if (!products.some((product) => product.sku === sku)) return sku
  }
}

export function validateProductForm(
  raw: RawProductForm,
  products: Product[],
  options: { editingId?: string; sku?: string; nfceEnabled: boolean },
): { errors: ProductFormErrors; input: Omit<ProductInput, "stock"> | null; fiscalLocked: boolean } {
  const errors: ProductFormErrors = {}

  const name = raw.name.trim()
  if (name.length < 2) errors.name = "Informe o nome do produto."
  else if (name.length > 80) errors.name = "Use no máximo 80 caracteres."

  const ean = raw.ean.trim()
  if (ean && !/^\d{8,14}$/.test(ean)) errors.ean = "O código de barras deve ter de 8 a 14 dígitos."
  else if (ean && products.some((product) => product.ean === ean && product.id !== options.editingId))
    errors.ean = "Este código de barras já está em uso em outro produto."

  const unit = raw.unit as Unit
  if (!UNITS.includes(unit)) errors.unit = "Escolha o tipo de medida."

  const category = raw.category.trim()
  if (!category) errors.category = "Escolha uma categoria."

  const priceCents = parseMoneyToCents(raw.price)
  if (priceCents === null) errors.price = "Informe um preço válido (ex.: 129,90)."
  else if (priceCents <= 0) errors.price = "O preço deve ser maior que zero."
  else if (priceCents > MAX_CENTS) errors.price = "Valor acima do permitido."

  const costCents = raw.cost.trim() === "" ? 0 : parseMoneyToCents(raw.cost)
  if (costCents === null) errors.cost = "Informe um custo válido (ex.: 58,00) ou deixe em branco."
  else if (costCents > MAX_CENTS) errors.cost = "Valor acima do permitido."
  else if (priceCents !== null && priceCents > 0 && priceCents < costCents) errors.price = "A trava anti-prejuízo não permite preço abaixo do custo."

  const digits = raw.ncm.replace(/\D/g, "")
  if (raw.ncm.trim() && digits.length !== 8) errors.ncm = "O NCM tem 8 dígitos (ex.: 0901.21.00)."
  const ncm = digits.length === 8 ? `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}` : ""

  const cfop = raw.cfop.trim()
  if (cfop && !/^\d{4}$/.test(cfop)) errors.cfop = "O CFOP tem 4 dígitos (ex.: 5102)."

  const minRaw = raw.minStock.trim() === "" ? "0" : raw.minStock
  const minStock = UNITS.includes(unit) && isFractionalUnit(unit) ? parseQuantity(minRaw) : parseWholeNumber(minRaw)
  if (minStock === null || minStock > MAX_UNITS) errors.minStock = "Informe uma quantidade mínima válida (0 ou mais)."

  if (Object.keys(errors).length > 0) return { errors, input: null, fiscalLocked: false }

  const fiscalLocked = options.nfceEnabled && missingFiscal({ ncm, cfop })
  return {
    errors,
    fiscalLocked,
    input: {
      name,
      sku: options.sku ?? generateSku(name, products),
      category,
      priceCents: priceCents!,
      costCents: costCents!,
      minStock: minStock!,
      ean,
      unit,
      ncm,
      cfop,
      active: raw.active && !fiscalLocked,
    },
  }
}

// ---------- categorias ----------
export function addCategory(inv: StoreInventory, name: string): Outcome<string> {
  const value = name.trim()
  if (value.length < 2) return fail("Informe o nome da categoria (mínimo 2 caracteres).")
  if (value.length > 40) return fail("Use no máximo 40 caracteres.")
  if (inv.categories.some((category) => normalizeText(category) === normalizeText(value))) return fail("Já existe uma categoria com este nome.")
  return { ok: true, inventory: { ...inv, categories: [...inv.categories, value] }, value }
}

export function renameCategory(inv: StoreInventory, from: string, to: string): Outcome<string> {
  const value = to.trim()
  if (value.length < 2) return fail("Informe o nome da categoria (mínimo 2 caracteres).")
  if (value.length > 40) return fail("Use no máximo 40 caracteres.")
  if (!inv.categories.includes(from)) return fail("Categoria não encontrada.")
  if (inv.categories.some((category) => category !== from && normalizeText(category) === normalizeText(value))) return fail("Já existe uma categoria com este nome.")
  return {
    ok: true,
    inventory: {
      ...inv,
      categories: inv.categories.map((category) => (category === from ? value : category)),
      products: inv.products.map((product) => (product.category === from ? { ...product, category: value } : product)),
    },
    value,
  }
}

/** Excluir uma categoria nunca apaga produtos: eles passam para "Sem categoria". */
export function removeCategory(inv: StoreInventory, name: string): Outcome<number> {
  if (!inv.categories.includes(name)) return fail("Categoria não encontrada.")
  const affected = inv.products.filter((product) => product.category === name).length
  const categories = inv.categories.filter((category) => category !== name)
  if (affected > 0 && !categories.includes(NO_CATEGORY)) categories.push(NO_CATEGORY)
  return {
    ok: true,
    inventory: {
      ...inv,
      categories,
      products: inv.products.map((product) => (product.category === name ? { ...product, category: NO_CATEGORY } : product)),
    },
    value: affected,
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
  if (input.ean && inv.products.some((product) => product.ean === input.ean)) return fail("Este código de barras já está em uso em outro produto.")
  const { ean = "", unit = "UN", ncm = "", cfop = "", active = true, ...rest } = input
  const product: Product = { id: uid(), ...rest, ean, unit, ncm, cfop, active, createdAt: at }
  const movements = input.stock > 0 ? [movement(product, "entrada", input.stock, "Estoque inicial", at), ...inv.movements] : inv.movements
  return { ok: true, inventory: { ...inv, products: [...inv.products, product], movements }, value: product }
}

export function updateProduct(inv: StoreInventory, id: string, input: Omit<ProductInput, "stock">): Outcome<Product> {
  const current = inv.products.find((product) => product.id === id)
  if (!current) return fail("Produto não encontrado.")
  if (inv.products.some((product) => product.sku === input.sku && product.id !== id)) return fail("Já existe um produto com este SKU.")
  if (input.ean && inv.products.some((product) => product.ean === input.ean && product.id !== id))
    return fail("Este código de barras já está em uso em outro produto.")
  const { ean, unit, ncm, cfop, active, ...rest } = input
  const updated: Product = {
    ...current,
    ...rest,
    active: active ?? current.active,
    ean: ean ?? current.ean,
    unit: unit ?? current.unit,
    ncm: ncm ?? current.ncm,
    cfop: cfop ?? current.cfop,
  }
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
  if (!isQuantity(quantity)) return fail("Informe uma quantidade válida (até 3 casas decimais).")
  if (!isFractionalUnit(product.unit) && !Number.isInteger(quantity)) return fail("Este produto é vendido por unidade: use um número inteiro.")

  let delta: number
  if (type === "entrada") {
    if (quantity <= 0) return fail("A quantidade deve ser maior que zero.")
    delta = quantity
  } else if (type === "saida") {
    if (quantity <= 0) return fail("A quantidade deve ser maior que zero.")
    if (quantity > product.stock) return fail(`Saída maior que o estoque disponível (${product.stock}).`)
    delta = -quantity
  } else {
    delta = roundQty(quantity - product.stock)
    if (delta === 0) return fail("A contagem é igual ao estoque atual.")
  }

  const reason = input.reason.trim() || (type === "entrada" ? "Entrada de mercadoria" : "")
  if (!reason) return fail("Informe o motivo da movimentação.")

  const updated = { ...product, stock: roundQty(product.stock + delta) }
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
    if (!isQuantity(line.quantity) || line.quantity <= 0) return fail("Quantidade inválida na venda.")
    wanted.set(line.productId, roundQty((wanted.get(line.productId) ?? 0) + line.quantity))
  }

  const items: Sale["items"] = []
  let products = inv.products
  let movements = inv.movements
  const number = Math.max(firstNumber, inv.sales.reduce((max, sale) => Math.max(max, sale.number), 0) + 1)

  for (const [productId, quantity] of wanted) {
    const product = products.find((p) => p.id === productId)
    if (!product || !product.active) return fail("Um dos produtos não está disponível para venda.")
    if (quantity > product.stock) return fail(`Estoque insuficiente para "${product.name}" (disponível: ${product.stock}).`)
    if (!isFractionalUnit(product.unit) && !Number.isInteger(quantity)) return fail(`"${product.name}" é vendido por unidade: use um número inteiro.`)
    const updated = { ...product, stock: roundQty(product.stock - quantity) }
    products = products.map((p) => (p.id === productId ? updated : p))
    movements = [movement(updated, "venda", -quantity, `Venda #${String(number).padStart(5, "0")}`, at), ...movements]
    items.push({ productId, name: product.name, sku: product.sku, unit: product.unit, quantity, unitCents: product.priceCents })
  }

  const subtotalCents = items.reduce((sum, item) => sum + lineTotalCents(item.unitCents, item.quantity), 0)
  const discountCents = Math.min(Math.max(0, Math.round(input.discountCents ?? 0)), subtotalCents)
  const totalCents = subtotalCents - discountCents
  const sale: Sale = { id: uid(), number, createdAt: at, items, totalCents, payment: input.payment, status: "concluida" }
  const cpf = input.cpf?.replace(/\D/g, "")
  if (cpf) sale.cpf = cpf
  if (input.customerName) sale.customerName = input.customerName
  if (input.operator) sale.operator = input.operator
  if (input.nfce === false) sale.nfce = false
  if (discountCents > 0) {
    sale.discountCents = discountCents
    if (input.couponCode) sale.couponCode = input.couponCode
  }
  if (input.payment === "dinheiro" && input.receivedCents !== undefined) {
    if (input.receivedCents < totalCents) return fail("O valor recebido é menor que o total da venda.")
    sale.receivedCents = input.receivedCents
    sale.changeCents = input.receivedCents - totalCents
  }
  return { ok: true, inventory: { ...inv, products, movements, sales: [sale, ...inv.sales] }, value: sale }
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
    const updated = { ...product, stock: roundQty(product.stock + item.quantity) }
    products = products.map((p) => (p.id === product.id ? updated : p))
    movements = [
      movement(updated, "cancelamento", item.quantity, `Cancelamento da venda #${String(sale.number).padStart(5, "0")}`, at),
      ...movements,
    ]
  }
  const canceled: Sale = { ...sale, status: "cancelada", canceledAt: at }
  return { ok: true, inventory: { ...inv, products, movements, sales: inv.sales.map((s) => (s.id === saleId ? canceled : s)) }, value: canceled }
}

// ---------- indicadores ----------
export function stockValueCents(products: Product[]) {
  return products.reduce((sum, product) => sum + product.stock * product.costCents, 0)
}

// ---------- dados de demonstração (derivados pelas mesmas regras, então ficam coerentes) ----------

type SeedProduct = {
  sku: string
  ean: string
  name: string
  category: Category
  unit: Unit
  price: number
  cost: number
  /** Saldo atual (depois das vendas de demonstração). */
  stock: number
  min: number
  ncm: string
  cfop: string
  image?: string
  active?: boolean
}
const SEED_PRODUCTS: SeedProduct[] = [
  { sku: "CAF-BRB-001", ean: "7891000315507", name: "Café Bourbon Special", category: "Cafés", unit: "UN", price: 42.9, cost: 24.9, stock: 45, min: 10, ncm: "0901.21.00", cfop: "5102", image: "/produtos/cafe-bourbon.jpg" },
  { sku: "AZE-EXT-012", ean: "7891000100224", name: "Azeite Extra Virgem", category: "Despensa", unit: "UN", price: 58, cost: 31, stock: 8, min: 12, ncm: "1509.10.00", cfop: "5102", image: "/produtos/azeite-extra-virgem.jpg" },
  { sku: "CHO-AMR-70", ean: "7891000244418", name: "Chocolate Amargo 70%", category: "Chocolates", unit: "UN", price: 18.5, cost: 9.8, stock: 0, min: 6, ncm: "1806.32.10", cfop: "5102", image: "/produtos/chocolate-amargo.jpg" },
  { sku: "LEI-ORG-A2", ean: "7891000530012", name: "Leite Orgânico A2", category: "Laticínios", unit: "LT", price: 9.9, cost: 5.4, stock: 12, min: 6, ncm: "0401.20.10", cfop: "5102", image: "/produtos/leite-organico.jpg" },
  { sku: "QUE-MIN-500", ean: "", name: "Queijo Minas Curado", category: "Frios", unit: "KG", price: 69.9, cost: 38, stock: 4.35, min: 2, ncm: "0406.90.20", cfop: "5102", image: "/produtos/queijo-minas.jpg" },
  { sku: "IOG-GRE-100", ean: "7891000612345", name: "Iogurte Grego Natural", category: "Laticínios", unit: "UN", price: 6.9, cost: 3.2, stock: 27, min: 10, ncm: "0403.20.00", cfop: "", image: "/produtos/iogurte-grego.jpg", active: false },
]

// [minutos atrás, itens [sku, qtd][], pagamento, cancelada?, cliente (id dos clientes de demonstração)?]
const SEED_SALES: [number, [string, number][], PaymentMethod, boolean?, string?][] = [
  [27 * 60, [["CAF-BRB-001", 2], ["LEI-ORG-A2", 3]], "cartao", false, "seed-cus-marina"],
  [22 * 60, [["QUE-MIN-500", 0.35]], "pix", false, "seed-cus-juliana"],
  [9 * 60, [["AZE-EXT-012", 2]], "dinheiro"],
  [6 * 60, [["CHO-AMR-70", 4], ["CAF-BRB-001", 1]], "cartao", false, "seed-cus-ricardo"],
  [5 * 60, [["LEI-ORG-A2", 2]], "pix", false, "seed-cus-marina"],
  [3 * 60, [["CAF-BRB-001", 1]], "pix", true],
  [2 * 60, [["CHO-AMR-70", 2], ["AZE-EXT-012", 1]], "dinheiro", false, "seed-cus-juliana"],
  [60, [["QUE-MIN-500", 0.25]], "cartao"],
  [25, [["CAF-BRB-001", 1], ["AZE-EXT-012", 1]], "pix", false, "seed-cus-marina"],
]

export function seedFor(storeId: string, now = Date.now()): StoreInventory {
  if (!DEMO_STORE_IDS.has(storeId)) return EMPTY_INVENTORY
  const minute = 60_000

  // O estoque inicial é "estoque atual + o que as vendas de demonstração consumiram",
  // e as vendas são registradas pelas funções reais: o histórico fecha com o saldo atual.
  const sold = new Map<string, number>()
  for (const [, items, , canceled] of SEED_SALES) if (!canceled) for (const [sku, qty] of items) sold.set(sku, roundQty((sold.get(sku) ?? 0) + qty))

  let inv: StoreInventory = {
    products: SEED_PRODUCTS.map((seed, index) => ({
      id: `seed-${seed.sku.toLowerCase()}`,
      sku: seed.sku,
      ean: seed.ean,
      name: seed.name,
      category: seed.category,
      unit: seed.unit,
      priceCents: Math.round(seed.price * 100),
      costCents: Math.round(seed.cost * 100),
      ncm: seed.ncm,
      cfop: seed.cfop,
      image: seed.image,
      stock: roundQty(seed.stock + (sold.get(seed.sku) ?? 0)),
      minStock: seed.min,
      active: seed.active ?? true,
      createdAt: now - (72 * 60 + index) * minute,
    })),
    sales: [],
    movements: [],
    categories: [...CATEGORIES],
  }
  inv.movements = inv.products
    .filter((p) => p.stock > 0)
    .map((p) => movement(p, "entrada", p.stock, "Estoque inicial", now - 72 * 60 * minute))

  for (const [index, [ago, items, payment, canceled, customerId]] of SEED_SALES.entries()) {
    const customer = DEMO_CUSTOMERS.find((item) => item.id === customerId)
    const at = now - ago * minute
    const outcome = registerSale(
      inv,
      { items: items.map(([sku, quantity]) => ({ productId: `seed-${sku.toLowerCase()}`, quantity })), payment, cpf: customer?.cpf, customerName: customer?.name, operator: index % 3 === 2 ? "Ana Lima" : "Carlos Santos" },
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
