import { useCallback, useEffect, useMemo, useState } from "react"

import { config } from "@/config"
import { newCouponCode, readCoupons, writeCoupons, type Coupon, type CouponInput, type CouponUse } from "@/customers/coupons"
import { readCustomers, writeCustomers, type Customer, type CustomerData } from "@/customers/customers"
import { createCustomerApi, disableCouponApi, issueCouponApi, listCouponUsesApi, listCouponsApi, listCustomers, updateCustomerApi } from "@/customers/customersApi"
import type { Result } from "@/inventory/types"
import { errorMessage } from "@/lib/api"

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
  issue: (input: CouponInput) => Promise<Result<Coupon>>
  /** Encerra o cupom antes da validade; os usos continuam no histórico. */
  disable: (id: string) => Promise<Result<null>>
  /** Quem usou o cupom, mais recentes primeiro. */
  uses: (id: string) => Promise<Result<CouponUse[]>>
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
    async (input: CouponInput): Promise<Result<Coupon>> => {
      if (config.useApi) {
        try {
          const coupon = await issueCouponApi(input)
          setRemote(await fetchAll())
          return { ok: true, value: coupon }
        } catch (failure) {
          return fail(failure)
        }
      }
      // O localStorage pode ter mudado no PDV (resgates) desde que a tela abriu.
      const current = readCoupons(storeId)
      const code = input.code?.trim().toUpperCase() || newCouponCode(current)
      if (current.some((coupon) => coupon.code === code)) return { ok: false, error: "Já existe um cupom com este código nesta loja." }
      const owner = demoCustomers.find((customer) => customer.id === input.customerId)
      const coupon: Coupon = {
        id: `cup-${Date.now().toString(36)}`,
        code,
        customerId: input.customerId,
        ...(owner ? { customerName: owner.name } : {}),
        percent: input.type === "percent" ? input.amount : 0,
        ...(input.type === "value" ? { valueCents: input.amount } : {}),
        ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
        createdAt: Date.now(),
      }
      const next = [...current, coupon]
      if (!writeCoupons(storeId, next)) return { ok: false, error: NOT_SAVED }
      setDemoCoupons(next)
      return { ok: true, value: coupon }
    },
    [demoCustomers, fetchAll, storeId],
  )

  const disable = useCallback(
    async (id: string): Promise<Result<null>> => {
      if (config.useApi) {
        try {
          await disableCouponApi(id)
          setRemote(await fetchAll())
          return { ok: true, value: null }
        } catch (failure) {
          return fail(failure)
        }
      }
      const next = readCoupons(storeId).map((coupon) => (coupon.id === id ? { ...coupon, disabledAt: Date.now() } : coupon))
      if (!writeCoupons(storeId, next)) return { ok: false, error: NOT_SAVED }
      setDemoCoupons(next)
      return { ok: true, value: null }
    },
    [fetchAll, storeId],
  )

  const uses = useCallback(
    async (id: string): Promise<Result<CouponUse[]>> => {
      if (!config.useApi) return { ok: true, value: [...(readCoupons(storeId).find((coupon) => coupon.id === id)?.uses ?? [])].reverse() }
      try {
        return { ok: true, value: await listCouponUsesApi(id) }
      } catch (failure) {
        return fail(failure)
      }
    },
    [storeId],
  )

  return useMemo(
    () => ({ customers, coupons, isLoading: config.useApi && !loaded && !error, error, canRemove: !config.useApi, save, remove, issue, disable, uses }),
    [coupons, customers, disable, error, issue, loaded, remove, save, uses],
  )
}
