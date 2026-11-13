import { DEMO_STORE_IDS } from "@/customers/demo"
import { formatBRL } from "@/lib/format"

/** Um uso do cupom: quem usou, quanto abateu e quando. */
export type CouponUse = {
  id: string
  customerId: string
  customerName?: string
  /** Mascarado ("***.456.789-**") com a API; completo no modo demonstração. */
  cpf: string
  discountCents: number
  usedAt: number
  saleId?: string
  /** Número da venda (modo demonstração). */
  saleNumber?: number
}

/**
 * Cupom de desconto da loja.
 * - Individual (`customerId` preenchido): só aquele cliente, uma vez.
 * - Global (`customerId` vazio): qualquer cliente identificado, uma vez por CPF.
 * O desconto é em % (`percent`) ou valor fixo (`valueCents`; aí `percent` fica 0).
 */
export type Coupon = {
  id: string
  code: string
  /** "" = cupom global. */
  customerId: string
  customerName?: string
  percent: number
  /** Desconto de valor fixo, em centavos. */
  valueCents?: number
  /** Validade, quando o cupom expira. */
  expiresAt?: number
  /** Passou da validade sem ser usado. */
  expired?: boolean
  /** O dono encerrou o cupom antes da validade. */
  disabledAt?: number
  createdAt: number
  /** Cupom individual: quando foi resgatado. */
  redeemedAt?: number
  /** Número da venda em que foi resgatado. */
  saleNumber?: number
  /** Quantas vendas usaram o cupom e quanto ele já abateu no total. */
  usesCount?: number
  discountTotalCents?: number
  /** Usos guardados no modo demonstração (com a API eles vêm de `/cupons/:id/usos`). */
  uses?: CouponUse[]
}

export type CouponStatus = "ativo" | "usado" | "expirado" | "desativado"

const key = (storeId: string) => `estoquepay.demo.coupons.${storeId}`
const day = 86_400_000

const demoCoupons = (): Coupon[] => [
  { id: "seed-cup-1", code: "MARINA10", customerId: "seed-cus-marina", customerName: "Marina Duarte", percent: 10, createdAt: Date.now() - 6 * day },
  { id: "seed-cup-2", code: "JULIANA15", customerId: "seed-cus-juliana", customerName: "Juliana Paz", percent: 15, createdAt: Date.now() - 4 * day },
  { id: "seed-cup-3", code: "JULIANA5", customerId: "seed-cus-juliana", customerName: "Juliana Paz", percent: 5, createdAt: Date.now() - 2 * day },
  { id: "seed-cup-4", code: "BEMVINDO", customerId: "", percent: 0, valueCents: 500, expiresAt: Date.now() + 30 * day, createdAt: Date.now() - 1 * day },
]

export function readCoupons(storeId: string): Coupon[] {
  try {
    const raw = localStorage.getItem(key(storeId))
    if (raw === null) return DEMO_STORE_IDS.has(storeId) ? demoCoupons() : []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (coupon): coupon is Coupon =>
        Boolean(coupon && typeof coupon.id === "string" && typeof coupon.code === "string" && typeof coupon.customerId === "string" && typeof coupon.percent === "number"),
    )
  } catch {
    return []
  }
}

export function writeCoupons(storeId: string, coupons: Coupon[]) {
  try {
    localStorage.setItem(key(storeId), JSON.stringify(coupons))
    return true
  } catch {
    return false
  }
}

export const isGlobal = (coupon: Coupon) => !coupon.customerId

export function couponStatus(coupon: Coupon, now = Date.now()): CouponStatus {
  if (coupon.disabledAt !== undefined) return "desativado"
  if (coupon.redeemedAt !== undefined) return "usado"
  if (coupon.expired || (coupon.expiresAt !== undefined && coupon.expiresAt <= now)) return "expirado"
  return "ativo"
}

export const isActive = (coupon: Coupon) => couponStatus(coupon) === "ativo"

/** Texto do desconto: "10%" ou "R$ 5,00". */
export const couponDiscountLabel = (coupon: Coupon) => (coupon.valueCents !== undefined ? formatBRL(coupon.valueCents) : `${coupon.percent}%`)

/** Quanto o cupom abate de uma compra: % arredondado ao centavo ou o valor fixo, nunca acima do total. */
export const couponDiscountCents = (coupon: Coupon, totalCents: number) =>
  Math.min(coupon.valueCents !== undefined ? coupon.valueCents : Math.round((totalCents * coupon.percent) / 100), totalCents)

/** Código legível, sem caracteres ambíguos (0/O, 1/I), único entre os cupons existentes. */
export function newCouponCode(existing: Coupon[]) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  for (;;) {
    const code = "EP-" + Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("")
    if (!existing.some((coupon) => coupon.code === code)) return code
  }
}

/** Procura um cupom ainda válido pelo código digitado (sem diferenciar maiúsculas). */
export function findActiveCoupon(coupons: Coupon[], code: string) {
  const wanted = code.trim().toUpperCase()
  return wanted ? coupons.find((coupon) => coupon.code.toUpperCase() === wanted && isActive(coupon)) : undefined
}

/** Pedido de emissão vindo do formulário. */
export type CouponInput = {
  /** Vazio = cupom global. */
  customerId: string
  type: "percent" | "value"
  /** Porcentagem (1–100) ou centavos. */
  amount: number
  expiresAt?: number
  /** Vazio = o sistema gera. */
  code?: string
}
