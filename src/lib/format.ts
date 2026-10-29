import type { Product } from "@/inventory/types"

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
})

export function formatBRL(cents: number) {
  return currencyFormatter.format(cents / 100)
}

export function formatDateTime(timestamp: number) {
  return dateTimeFormatter.format(timestamp)
}

export function formatSaleNumber(number: number) {
  return `#${String(number).padStart(5, "0")}`
}

export function isSameDay(timestamp: number, date = new Date()) {
  const value = new Date(timestamp)
  return (
    value.getFullYear() === date.getFullYear() &&
    value.getMonth() === date.getMonth() &&
    value.getDate() === date.getDate()
  )
}

export function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim()
}

export function parseWholeNumber(value: string) {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const number = Number(trimmed)
  return Number.isSafeInteger(number) ? number : null
}

export function parseMoneyToCents(value: string) {
  const cleaned = value.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "")
  const brazilian = /^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/
  const decimal = /^\d+(?:\.\d{1,2})?$/
  if (!brazilian.test(cleaned) && !decimal.test(cleaned)) return null

  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned
  const cents = Math.round(Number(normalized) * 100)
  return Number.isSafeInteger(cents) ? cents : null
}

export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",")
}

export function stockValueCents(products: Pick<Product, "costCents" | "stock">[]) {
  return products.reduce((total, product) => total + product.costCents * product.stock, 0)
}

const quantityFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 })

/** Quantidade em pt-BR, até 3 casas (ex.: 4,35). */
export function formatQuantity(value: number) {
  return quantityFormatter.format(value)
}

/** Lê uma quantidade digitada (aceita vírgula ou ponto, até 3 casas). Devolve null se inválida. */
export function parseQuantity(value: string) {
  const cleaned = value.trim().replace(",", ".")
  if (!/^\d+(?:\.\d{1,3})?$/.test(cleaned)) return null
  const number = Number(cleaned)
  return Number.isFinite(number) ? number : null
}

export function digitsOf(value: string) {
  return value.replace(/\D/g, "")
}

/** Aplica a máscara 000.000.000-00 enquanto o CPF é digitado. */
export function maskCpf(value: string) {
  const d = digitsOf(value).slice(0, 11)
  let out = d.slice(0, 3)
  if (d.length > 3) out += "." + d.slice(3, 6)
  if (d.length > 6) out += "." + d.slice(6, 9)
  if (d.length > 9) out += "-" + d.slice(9, 11)
  return out
}

/** Número exibido no recibo: 000.000. */
export function formatReceiptNumber(number: number) {
  const padded = String(number).padStart(6, "0")
  return `${padded.slice(0, 3)}.${padded.slice(3)}`
}
