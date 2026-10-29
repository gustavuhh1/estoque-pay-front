import { DEMO_STORE_IDS } from "@/customers/demo"
import { formatBRL } from "@/lib/format"

/** Cupom de desconto emitido para um cliente. Uso único. Percentual no modo demonstração, valor fixo com a API. */
export type Coupon = {
  id: string
  code: string
  customerId: string
  percent: number
  /** Desconto de valor fixo, em centavos (cupons da API; `percent` fica 0). */
  valueCents?: number
  /** Validade, quando o cupom expira. */
  expiresAt?: number
  /** Passou da validade sem ser usado. */
  expired?: boolean
  createdAt: number
  redeemedAt?: number
  /** Número da venda em que foi resgatado. */
  saleNumber?: number
}

const key = (storeId: string) => `estoquepay.demo.coupons.${storeId}`
const day = 86_400_000

const demoCoupons = (): Coupon[] => [
  { id: "seed-cup-1", code: "MARINA10", customerId: "seed-cus-marina", percent: 10, createdAt: Date.now() - 6 * day },
  { id: "seed-cup-2", code: "JULIANA15", customerId: "seed-cus-juliana", percent: 15, createdAt: Date.now() - 4 * day },
  { id: "seed-cup-3", code: "JULIANA5", customerId: "seed-cus-juliana", percent: 5, createdAt: Date.now() - 2 * day },
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

export const isActive = (coupon: Coupon) => coupon.redeemedAt === undefined && !coupon.expired

/** Texto do desconto: "10%" ou "R$ 5,00". */
export const couponDiscountLabel = (coupon: Coupon) => (coupon.valueCents !== undefined ? formatBRL(coupon.valueCents) : `${coupon.percent}%`)

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
