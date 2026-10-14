export const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const

export const onlyDigits = (value: string) => value.replace(/\D/g, "")

export function maskCnpj(value: string) {
  const d = onlyDigits(value).slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
}

export function maskPhone(value: string) {
  const d = onlyDigits(value).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ""
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export const isCnpjComplete = (value: string) => onlyDigits(value).length === 14
export const isPhoneComplete = (value: string) => [10, 11].includes(onlyDigits(value).length)

// ---------- dinheiro, datas e texto ----------
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const shortDateTime = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })

/** Valores monetários são guardados em centavos (inteiros) para evitar erro de ponto flutuante. */
export const formatBRL = (cents: number) => brl.format(cents / 100)
export const formatDateTime = (timestamp: number) => shortDateTime.format(new Date(timestamp))
export const formatSaleNumber = (value: number) => `#${String(value).padStart(5, "0")}`

export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",")
}

/** Aceita "129,90", "129.90", "1.234,56" e "R$ 12". Retorna centavos ou null se inválido. */
export function parseMoneyToCents(input: string): number | null {
  const text = input.replace(/R\$|\s/g, "")
  if (!text) return null
  let normalized: string
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(text)) normalized = text.replace(/\./g, "").replace(",", ".")
  else if (/^\d+([.,]\d{1,2})?$/.test(text)) normalized = text.replace(",", ".")
  else return null
  const cents = Math.round(Number(normalized) * 100)
  return Number.isSafeInteger(cents) ? cents : null
}

/** Inteiro não negativo ("12"); retorna null para vazio, decimal ou negativo. */
export function parseWholeNumber(input: string): number | null {
  const text = input.trim()
  if (!/^\d{1,9}$/.test(text)) return null
  return Number(text)
}

export const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

export function isSameDay(timestamp: number, now = Date.now()) {
  const a = new Date(timestamp)
  const b = new Date(now)
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
