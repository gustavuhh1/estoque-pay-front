import type { Coupon, CouponInput, CouponUse } from "@/customers/coupons"
import type { Customer, CustomerData } from "@/customers/customers"
import type { CustomerStats } from "@/customers/metrics"
import { api } from "@/lib/api"
import { maskCpf } from "@/lib/format"
import { cents } from "@/lib/money"
import { vendaToSale, type ApiVenda } from "@/pdv/pdvApi"

type ApiCliente = {
  id: string
  nome: string
  cpf: string
  telefone?: string | null
  data_nascimento?: string | null
  observacao?: string | null
  pontos_fidelidade: number
  criado_em: string
}

type ApiCupom = {
  id: string
  cliente_id?: string | null
  cliente_nome?: string | null
  codigo: string
  tipo_desconto?: "VALOR" | "PERCENTUAL"
  valor_desconto: number
  expira_em?: string | null
  resgatado_em?: string | null
  desativado_em?: string | null
  usos?: number
  desconto_total?: number
  status: "DISPONIVEL" | "RESGATADO" | "EXPIRADO" | "DESATIVADO"
  criado_em: string
}

type ApiCupomUso = {
  id: string
  venda_id: string
  cliente_id: string
  cliente_nome?: string | null
  cpf: string
  desconto: number
  usado_em: string
}

type Page<T> = { data: T[]; total: number }

type ApiEstatisticas = {
  total_compras: number
  ticket_medio: number
  produtos_favoritos: { produto_nome: string }[]
}

function customerOf(item: ApiCliente): Customer {
  return {
    id: item.id,
    name: item.nome,
    phone: item.telefone ?? "",
    email: "", // a API não guarda e-mail do cliente
    cpf: maskCpf(item.cpf),
    // A API devolve a data com hora (meia-noite UTC): só o dia importa.
    ...(item.data_nascimento ? { birthDate: item.data_nascimento.slice(0, 10) } : {}),
    ...(item.observacao ? { notes: item.observacao } : {}),
    createdAt: Date.parse(item.criado_em),
    points: item.pontos_fidelidade,
  }
}

function couponOf(item: ApiCupom): Coupon {
  const percent = item.tipo_desconto === "PERCENTUAL"
  return {
    id: item.id,
    code: item.codigo,
    customerId: item.cliente_id ?? "",
    ...(item.cliente_nome ? { customerName: item.cliente_nome } : {}),
    percent: percent ? item.valor_desconto : 0,
    ...(percent ? {} : { valueCents: cents(item.valor_desconto) }),
    createdAt: Date.parse(item.criado_em),
    ...(item.resgatado_em ? { redeemedAt: Date.parse(item.resgatado_em) } : {}),
    ...(item.expira_em ? { expiresAt: Date.parse(item.expira_em) } : {}),
    ...(item.desativado_em ? { disabledAt: Date.parse(item.desativado_em) } : {}),
    ...(item.status === "EXPIRADO" ? { expired: true } : {}),
    usesCount: item.usos ?? (item.resgatado_em ? 1 : 0),
    discountTotalCents: cents(item.desconto_total ?? 0),
  }
}

/** Todos os clientes da loja (a API pagina em até 100 por vez). */
export async function listCustomers(): Promise<Customer[]> {
  const all: Customer[] = []
  for (let page = 1; page <= 20; page++) {
    const result = await api.get<Page<ApiCliente>>("/crm/clientes", { query: { page, limit: 100 } })
    all.push(...result.data.map(customerOf))
    if (result.data.length === 0 || all.length >= result.total) break
  }
  return all
}

/** Busca do PDV: nome (parcial) ou início do CPF. */
export async function searchCustomers(term: string): Promise<Customer[]> {
  const result = await api.get<Page<ApiCliente>>("/crm/clientes", { query: { busca: term, limit: 5 } })
  return result.data.map(customerOf)
}

/** No Free a API só aceita CPF e nome; os demais campos são Premium. */
export async function createCustomerApi(data: CustomerData, restricted: boolean): Promise<Customer> {
  const body = {
    nome: data.name,
    cpf: data.cpf,
    ...(restricted ? {} : { telefone: data.phone || undefined, data_nascimento: data.birthDate || undefined, observacao: data.notes || undefined }),
  }
  return customerOf(await api.post<ApiCliente>("/crm/clientes", body))
}

export async function updateCustomerApi(id: string, data: CustomerData, restricted: boolean): Promise<Customer> {
  const body = restricted
    ? { nome: data.name, cpf: data.cpf }
    : { nome: data.name, cpf: data.cpf, telefone: data.phone || null, data_nascimento: data.birthDate || null, observacao: data.notes || null }
  return customerOf(await api.patch<ApiCliente>(`/crm/clientes/${id}`, body))
}

export async function listCouponsApi(): Promise<Coupon[]> {
  return (await api.get<ApiCupom[]>("/crm/cupons")).map(couponOf)
}

/** Individual (com cliente) ou global; em % ou R$; validade e código opcionais (sem código, a API gera). */
export async function issueCouponApi(input: CouponInput): Promise<Coupon> {
  return couponOf(
    await api.post<ApiCupom>("/crm/cupons", {
      ...(input.customerId ? { cliente_id: input.customerId } : {}),
      ...(input.code ? { codigo: input.code } : {}),
      tipo_desconto: input.type === "percent" ? "PERCENTUAL" : "VALOR",
      valor_desconto: input.type === "percent" ? input.amount : input.amount / 100,
      ...(input.expiresAt ? { expira_em: new Date(input.expiresAt).toISOString() } : {}),
    }),
  )
}

export async function disableCouponApi(id: string): Promise<Coupon> {
  return couponOf(await api.patch<ApiCupom>(`/crm/cupons/${id}/desativar`))
}

export async function listCouponUsesApi(id: string): Promise<CouponUse[]> {
  return (await api.get<ApiCupomUso[]>(`/crm/cupons/${id}/usos`)).map((uso) => ({
    id: uso.id,
    customerId: uso.cliente_id,
    ...(uso.cliente_nome ? { customerName: uso.cliente_nome } : {}),
    cpf: uso.cpf,
    discountCents: cents(uso.desconto),
    usedAt: Date.parse(uso.usado_em),
    saleId: uso.venda_id,
  }))
}

/** Estatísticas e últimas compras de um cliente, calculadas pela API sobre todas as vendas dele. */
export async function fetchCustomerDetails(customer: Customer): Promise<CustomerStats> {
  const [stats, purchases] = await Promise.all([
    api.get<ApiEstatisticas>(`/crm/clientes/${customer.id}/estatisticas`),
    api.get<Page<ApiVenda>>(`/crm/clientes/${customer.id}/compras`, { query: { limit: 5 } }),
  ])
  return {
    count: stats.total_compras,
    ticketCents: cents(stats.ticket_medio),
    favorite: stats.produtos_favoritos[0]?.produto_nome ?? null,
    points: customer.points ?? 0,
    recent: purchases.data.filter((sale) => sale.status_pagamento === "PAGO").map(vendaToSale),
  }
}
