import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react"

import { config } from "@/config"
import { DEMO_STORE_IDS } from "@/customers/demo"
import { api } from "@/lib/api"
import { useStores } from "@/store/useStores"

export type PlanStatus = "FREE" | "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED"
export type PlanCycle = "MENSAL" | "ANUAL"

/** Assinatura da loja. Só guarda bandeira e final do cartão, nunca os dados do cartão (RNF02). */
export type Subscription = {
  status: PlanStatus
  cycle: PlanCycle
  renewsAt?: number
  trialEndsAt?: number
  card?: { brand: string; last4: string }
}

export const PRICE_CENTS: Record<PlanCycle, number> = { MENSAL: 3000, ANUAL: 29_990 }
export const TRIAL_DAYS = 7
export const FREE_LIMITS = { products: 50, members: 3 }
const DAY = 86_400_000

export type Limits = {
  premium: boolean
  /** null = sem limite. */
  maxProducts: number | null
  maxMembers: number | null
  /** NFC-e simulada disponível. */
  nfce: boolean
  /** CRM com telefone, nascimento, observação e cupons. */
  crmFull: boolean
}

/** Premium (ativa ou em teste) libera tudo; Free, inadimplente e cancelada ficam em modo restrito. */
export function limitsOf(subscription: Subscription): Limits {
  const premium = subscription.status === "TRIAL" || subscription.status === "ACTIVE"
  return {
    premium,
    maxProducts: premium ? null : FREE_LIMITS.products,
    maxMembers: premium ? null : FREE_LIMITS.members,
    nfce: premium,
    crmFull: premium,
  }
}

const key = (storeId: string) => `estoquepay.demo.plan.${storeId}`

/** Próximo dia 12 (dia de cobrança do plano de demonstração). */
function nextBillingDay() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(12)
  if (date.getTime() <= Date.now()) date.setMonth(date.getMonth() + 1)
  return date.getTime()
}

/** Lojas de exemplo: a principal já é Premium; as outras mostram o plano Free. */
function defaultFor(storeId: string): Subscription {
  if (storeId === "ponto-certo") return { status: "ACTIVE", cycle: "MENSAL", renewsAt: nextBillingDay(), card: { brand: "Visa", last4: "4242" } }
  return { status: "FREE", cycle: "MENSAL" }
}

function parse(storeId: string, raw: string): Subscription {
  if (!raw) return DEMO_STORE_IDS.has(storeId) ? defaultFor(storeId) : { status: "FREE", cycle: "MENSAL" }
  try {
    const value = JSON.parse(raw) as Subscription
    // O teste grátis termina e vira assinatura ativa (a cobrança acontece no cartão informado).
    if (value.status === "TRIAL" && value.trialEndsAt !== undefined && value.trialEndsAt <= Date.now()) {
      return { ...value, status: "ACTIVE", renewsAt: value.trialEndsAt + (value.cycle === "ANUAL" ? 365 : 30) * DAY }
    }
    return value
  } catch {
    return { status: "FREE", cycle: "MENSAL" }
  }
}

const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function writeSubscription(storeId: string, subscription: Subscription) {
  try {
    localStorage.setItem(key(storeId), JSON.stringify(subscription))
  } catch {
    return false
  }
  listeners.forEach((listener) => listener())
  return true
}

const snapshot = (storeId: string) => {
  try {
    return localStorage.getItem(key(storeId)) ?? ""
  } catch {
    return ""
  }
}

// ---------- plano vindo da API ----------
type ApiAssinatura = {
  plano: "FREE" | "PREMIUM"
  /** null = a loja nunca assinou. */
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | null
  tipo_plano: PlanCycle | null
  trial_expira_em: string | null
  periodo_atual_fim: string | null
  limites: { produtos_ativos: number | null; membros: number | null; crm_completo: boolean; nfce: boolean }
  uso: { produtos_ativos: number; membros: number }
  modo_restrito: boolean
}

export type PlanState = {
  subscription: Subscription
  limits: Limits
  /** Quanto da cota a loja já usa (produtos ativos e membros com convites). */
  usage: { products: number; members: number }
  /** Já teve assinatura, voltou ao Free e está na cota: não cadastra novos produtos nem membros (RN03). */
  restricted: boolean
}

const STATUS: Record<NonNullable<ApiAssinatura["status"]>, PlanStatus> = { TRIALING: "TRIAL", ACTIVE: "ACTIVE", PAST_DUE: "PAST_DUE", CANCELED: "CANCELED" }

function fromApi(data: ApiAssinatura): PlanState {
  const subscription: Subscription = {
    status: data.status ? STATUS[data.status] : "FREE",
    cycle: data.tipo_plano ?? "MENSAL",
    ...(data.periodo_atual_fim ? { renewsAt: Date.parse(data.periodo_atual_fim) } : {}),
    ...(data.trial_expira_em ? { trialEndsAt: Date.parse(data.trial_expira_em) } : {}),
  }
  return {
    subscription,
    limits: {
      premium: data.plano === "PREMIUM",
      maxProducts: data.limites.produtos_ativos,
      maxMembers: data.limites.membros,
      nfce: data.limites.nfce,
      crmFull: data.limites.crm_completo,
    },
    usage: { products: data.uso.produtos_ativos, members: data.uso.membros },
    restricted: data.modo_restrito,
  }
}

const FREE_STATE: PlanState = { subscription: { status: "FREE", cycle: "MENSAL" }, limits: limitsOf({ status: "FREE", cycle: "MENSAL" }), usage: { products: 0, members: 0 }, restricted: false }

// Cache por loja, compartilhado por todas as telas que usam o plano (uma consulta, não uma por componente).
const apiCache = new Map<string, PlanState>()
const inflight = new Set<string>()

async function loadApiPlan(storeId: string) {
  if (inflight.has(storeId)) return
  inflight.add(storeId)
  try {
    apiCache.set(storeId, fromApi(await api.get<ApiAssinatura>("/billing/assinatura")))
    listeners.forEach((listener) => listener())
  } catch {
    // Sem resposta, a loja segue com o plano que já estava no cache (ou Free): o erro aparece nas telas que dependem dele.
  } finally {
    inflight.delete(storeId)
  }
}

/** Assinatura e limites da loja ativa; atualiza sozinho quando a assinatura muda. */
export function usePlan() {
  const { activeStore } = useStores()
  const storeId = activeStore.id
  const raw = useSyncExternalStore(subscribe, () => (config.useApi ? "" : snapshot(storeId)))
  const apiState = useSyncExternalStore(subscribe, () => (config.useApi ? apiCache.get(storeId) : undefined))

  useEffect(() => {
    if (config.useApi && storeId && !apiCache.has(storeId)) void loadApiPlan(storeId)
  }, [storeId])

  const demo = useMemo(() => {
    const subscription = parse(storeId, raw)
    return { subscription, limits: limitsOf(subscription) }
  }, [storeId, raw])

  const refresh = useCallback(() => loadApiPlan(storeId), [storeId])

  const current: PlanState = config.useApi ? (apiState ?? FREE_STATE) : { ...demo, usage: { products: 0, members: 0 }, restricted: false }
  return {
    ...current,
    /** Com a API: a primeira consulta do plano ainda não voltou. */
    isLoading: config.useApi && Boolean(storeId) && apiState === undefined,
    /** NFC-e simulada realmente ligada: exige plano Premium e o switch ligado em Ajustes › Fiscal. */
    nfceOn: current.limits.nfce && (activeStore.nfceEnabled ?? true),
    save: (next: Subscription) => (config.useApi ? false : writeSubscription(storeId, next)),
    refresh,
  }
}

// ---------- cartão (a tokenização real é feita pelo gateway; aqui só se valida o formato) ----------
export function cardBrand(number: string) {
  const d = number.replace(/\D/g, "")
  if (/^4/.test(d)) return "Visa"
  if (/^(5[1-5]|2[2-7])/.test(d)) return "Mastercard"
  if (/^3[47]/.test(d)) return "Amex"
  if (/^(636368|438935|504175|451416|636297|5067|4576|4011)/.test(d)) return "Elo"
  return "Cartão"
}

export function isValidCardNumber(number: string) {
  const d = number.replace(/\D/g, "")
  if (d.length < 13 || d.length > 19) return false
  let sum = 0
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i])
    if (i % 2 === 1) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
  }
  return sum % 10 === 0
}

/** MM/AA no futuro (ou no mês atual). */
export function isValidExpiry(value: string) {
  const match = /^(\d{2})\/(\d{2})$/.exec(value)
  if (!match) return false
  const month = Number(match[1])
  const year = 2000 + Number(match[2])
  if (month < 1 || month > 12) return false
  const now = new Date()
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)
}

export const addDays = (timestamp: number, days: number) => timestamp + days * DAY
