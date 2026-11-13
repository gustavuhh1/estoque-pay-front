import { useEffect, useState } from "react"

import { couponDiscountCents, couponStatus, isGlobal, type Coupon } from "@/customers/coupons"
import type { Customer } from "@/customers/customers"
import { listCouponsApi, searchCustomers } from "@/customers/customersApi"
import { digitsOf, maskCpf } from "@/lib/format"

/** Cliente e cupom anexados à venda do PDV com a API. O servidor valida o cupom de novo ao cobrar. */
export function useBuyer(totalCents: number) {
  const [cpf, setCpfText] = useState("")
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [found, setFound] = useState<{ term: string; customers: Customer[] }>({ term: "", customers: [] })
  const [coupon, setCoupon] = useState("")
  const [coupons, setCoupons] = useState<Coupon[] | null>(null)

  const digits = digitsOf(cpf)

  // Cupons da loja, para mostrar o desconto antes de cobrar.
  useEffect(() => {
    let cancelled = false
    listCouponsApi().then(
      (list) => {
        if (!cancelled) setCoupons(list)
      },
      () => undefined, // sem a lista a prévia some, mas a API ainda valida o cupom ao cobrar
    )
    return () => {
      cancelled = true
    }
  }, [])

  // Busca o cliente pelo início do CPF enquanto o operador digita.
  useEffect(() => {
    if (customer || digits.length < 5) return
    let cancelled = false
    const timer = setTimeout(() => {
      searchCustomers(digits).then(
        (customers) => {
          if (!cancelled) setFound({ term: digits, customers })
        },
        () => undefined,
      )
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [customer, digits])

  const match = !customer && digits.length >= 5 && found.term === digits ? (found.customers.find((item) => digitsOf(item.cpf).startsWith(digits)) ?? null) : null
  const isUnknownCpf = !customer && !match && digits.length === 11 && found.term === digits

  const code = coupon.trim().toUpperCase()
  const known = code && coupons ? coupons.find((item) => item.code === code) : undefined
  const status = known ? couponStatus(known) : null
  const couponError = !code
    ? ""
    : coupons && !known
      ? "Cupom não encontrado nesta loja."
      : status === "desativado"
        ? "Este cupom foi desativado pela loja."
        : status === "usado" || status === "expirado"
          ? "Este cupom já foi usado ou expirou."
          : known?.customerId && customer && customer.id !== known.customerId
            ? "Este cupom pertence a outro cliente."
            : ""
  // Cupom global vale uma vez por CPF: sem o cliente identificado o servidor recusa, então avisa antes.
  const needsCustomer = Boolean(known && isGlobal(known) && !couponError && !customer)
  const discountCents = known && !couponError && !needsCustomer ? couponDiscountCents(known, totalCents) : 0

  return {
    cpf,
    customer,
    match,
    isUnknownCpf,
    coupon,
    couponError: couponError || (needsCustomer ? "Cupom para todos os clientes: informe o CPF do cliente acima para usar (1 vez por CPF)." : ""),
    discountCents,
    /** Código do cupom reconhecido e válido (vazio enquanto não houver prévia). */
    appliedCode: known && !couponError && !needsCustomer ? known.code : "",
    setCpf: (value: string) => {
      setCpfText(maskCpf(value))
      if (customer) setCustomer(null)
    },
    attach: (item: Customer) => {
      setCustomer(item)
      setCpfText(maskCpf(item.cpf))
    },
    detach: () => {
      setCustomer(null)
      setCpfText("")
    },
    setCoupon,
    /** Cliente enviado à API: o escolhido, ou o dono do cupom nominal. */
    customerId: customer?.id ?? (discountCents > 0 ? known?.customerId || undefined : undefined),
    /** Código enviado à API, também quando a lista de cupons não carregou (o servidor decide). */
    couponCode: couponError ? undefined : code || undefined,
  }
}
