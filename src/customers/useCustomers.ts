import { useCallback, useEffect, useMemo, useState } from "react"

import { config } from "@/config"
import { newCouponCode, readCoupons, writeCoupons, type Coupon } from "@/customers/coupons"
import { readCustomers, writeCustomers, type Customer, type CustomerData } from "@/customers/customers"
import { createCustomerApi, issueCouponApi, listCouponsApi, listCustomers, updateCustomerApi } from "@/customers/customersApi"
import type { Result } from "@/inventory/types"
import { errorMessage } from "@/lib/api"

/** Desconto do cupom: percentual no modo demonstração, valor fixo em centavos com a API. */
export type CouponDiscount = { percent: number } | { valueCents: number }

export type CustomersState = {
  customers: Customer[]
  coupons: Coupon[]
  /** Clientes ainda sendo carregados da API (sempre false no modo demonstração). */
  isLoading: boolean
  error: string | null
  /** A API não tem remoção de cliente. */
  canRemove: boolean
  /** `id` null cadastra. `restricted` (plano Free) limita o cadastro a CPF e nome. */
  save: (id: string | null, data: CustomerData, restricted: boolean) => Promise<Result<Customer>>
  remove: (id: string) => Promise<Result<null>>
  issue: (customerId: string, discount: CouponDiscount) => Promise<Result<Coupon>>
}

const fail = (error: unknown): { ok: false; error: string } => ({ ok: false, error: errorMessage(error) })
const NOT_SAVED = "O navegador não permitiu salvar os dados."

/** Clientes e cupons da loja: pela API (`/clientes`, `/cupons`) ou, no modo demonstração, do armazenamento local. */
export function useCustomers(storeId: string): CustomersState {
  const [demoCustomers, setDemoCustomers] = useState<Customer[]>(() => (config.useApi ? [] : readCustomers(storeId)))
  const [demoCoupons, setDemoCoupons] = useState<Coupon[]>(() => (config.useApi ? [] : readCoupons(storeId)))
  const [remote, setRemote] = useState<{ storeId: string; customers: Customer[]; coupons: Coupon[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    const [customers, coupons] = await Promise.all([listCustomers(), listCouponsApi().catch(() => [] as Coupon[])])
    return { storeId, customers, coupons }
  }, [storeId])

  useEffect(() => {
    if (!config.useApi || !storeId) return
    let cancelled = false
    fetchAll().then(
      (data) => {
        if (cancelled) return
        setRemote(data)
        setError(null)
      },
      (failure: unknown) => {
        if (!cancelled) setError(errorMessage(failure))
      },
    )
    return () => {
      cancelled = true
    }
  }, [fetchAll, storeId])

  const loaded = remote?.storeId === storeId
  const customers = useMemo(() => (config.useApi ? (loaded ? remote.customers : []) : demoCustomers), [demoCustomers, loaded, remote])
  const coupons = useMemo(() => (config.useApi ? (loaded ? remote.coupons : []) : demoCoupons), [demoCoupons, loaded, remote])

  const save = useCallback(
    async (id: string | null, data: CustomerData, restricted: boolean): Promise<Result<Customer>> => {
      if (config.useApi) {
        try {
          const saved = id ? await updateCustomerApi(id, data, restricted) : await createCustomerApi(data, restricted)
          setRemote(await fetchAll())
          return { ok: true, value: saved }
        } catch (failure) {
          return fail(failure)
        }
      }
      const saved: Customer = id
        ? { ...demoCustomers.find((customer) => customer.id === id)!, ...data }
        : { ...data, id: `cus-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, createdAt: Date.now() }
      const next = id ? demoCustomers.map((customer) => (customer.id === id ? saved : customer)) : [...demoCustomers, saved]
      if (!writeCustomers(storeId, next)) return { ok: false, error: NOT_SAVED }
      setDemoCustomers(next)
      return { ok: true, value: saved }
    },
    [demoCustomers, fetchAll, storeId],
  )

  const remove = useCallback(
    async (id: string): Promise<Result<null>> => {
      if (config.useApi) return { ok: false, error: "A API não permite remover clientes." }
      const next = demoCustomers.filter((customer) => customer.id !== id)
      if (!writeCustomers(storeId, next)) return { ok: false, error: NOT_SAVED }
      setDemoCustomers(next)
      return { ok: true, value: null }
    },
    [demoCustomers, storeId],
  )

  const issue = useCallback(
    async (customerId: string, discount: CouponDiscount): Promise<Result<Coupon>> => {
      if (config.useApi) {
        if (!("valueCents" in discount)) return { ok: false, error: "Informe o valor do desconto." }
        try {
          const coupon = await issueCouponApi(customerId, discount.valueCents)
          setRemote(await fetchAll())
          return { ok: true, value: coupon }
        } catch (failure) {
          return fail(failure)
        }
      }
      if (!("percent" in discount)) return { ok: false, error: "Informe o percentual do desconto." }
      const coupon: Coupon = { id: `cup-${Date.now().toString(36)}`, code: newCouponCode(demoCoupons), customerId, percent: discount.percent, createdAt: Date.now() }
      const next = [...demoCoupons, coupon]
      if (!writeCoupons(storeId, next)) return { ok: false, error: NOT_SAVED }
      setDemoCoupons(next)
      return { ok: true, value: coupon }
    },
    [demoCoupons, fetchAll, storeId],
  )

  return useMemo(
    () => ({ customers, coupons, isLoading: config.useApi && !loaded && !error, error, canRemove: !config.useApi, save, remove, issue }),
    [coupons, customers, error, issue, loaded, remove, save],
  )
}
