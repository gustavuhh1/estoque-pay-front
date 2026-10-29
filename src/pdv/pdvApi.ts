import { api } from "@/lib/api"
import { cents } from "@/lib/money"
import type { PaymentMethod, Product, Sale, SaleItem } from "@/inventory/types"

// ---------- formato da API ----------
export type ApiItem = { produto_id: string; produto_nome: string; quantidade: number; preco_unitario: number; subtotal: number }

export type ManualMethod = "DINHEIRO" | "DEBITO" | "CREDITO"

export type ManualPayment = {
  venda_id: string
  subtotal: number
  desconto: number
  total_venda: number
  metodo_pagamento: ManualMethod
  valor_pago?: number | null
  troco?: number | null
  itens: ApiItem[]
  criada_em: string
}

export type PixPayment = {
  venda_id: string
  subtotal: number
  desconto: number
  total_venda: number
  /** D1: taxa do Pix paga pelo consumidor. */
  taxa_pix: number
  /** O que o consumidor paga no QR Code: itens + taxa. */
  total_cobrado: number
  status_pagamento: "PENDENTE" | "PAGO" | "CANCELADO"
  payment_id: string
  /** Pix copia e cola. */
  qr_code: string
  /** Data URI da imagem do QR Code. */
  qr_code_imagem: string
  expira_em: string
  itens: ApiItem[]
  criada_em: string
}

export type PixStatus = {
  payment_id: string
  status: string
  pago: boolean
  expira_em?: string | null
  venda_id: string
  status_pagamento: "PENDENTE" | "PAGO" | "CANCELADO"
  total_cobrado: number
}

/** Espelho da NFC-e simulada devolvido pela API. Sempre vem com o aviso de que não tem valor fiscal. */
export type Espelho = {
  simulada: true
  aviso: string
  numero: number
  serie: number
  /** Chave FICTÍCIA (começa com SIMULADO). */
  chave_de_acesso: string
  emitida_em: string
  venda_id: string
  estabelecimento: { nome: string; cnpj: string; ie: string | null }
  consumidor: { identificado: boolean; nome: string | null; cpf: string | null }
  itens: { nome: string; quantidade: number; preco_unitario: number; total: number }[]
  subtotal_itens: number
  desconto: number
  total_venda: number
  taxa_pix: number | null
  total_cobrado: number
  forma_pagamento: "PIX" | "DINHEIRO" | "DEBITO" | "CREDITO"
  pago_em: string | null
}

type ItemInput = { productId: string; quantity: number }
const itens = (items: ItemInput[]) => items.map((item) => ({ produto_id: item.productId, quantidade: item.quantity }))

// ---------- chamadas ----------
export const payManual = (items: ItemInput[], method: ManualMethod, paid?: number) =>
  api.post<ManualPayment>("/pagamento", { itens: itens(items), metodo_pagamento: method, ...(method === "DINHEIRO" ? { valor_pago: paid } : {}) })

/** A venda Pix nasce PENDENTE: só vira paga quando a API confirmar (webhook ou polling). */
export const startPix = (items: ItemInput[]) => api.post<PixPayment>("/pagamento/pix", { itens: itens(items) })

export const pixStatus = (paymentId: string) => api.get<PixStatus>(`/pagamento/pix/${paymentId}/status`)

/** Só funciona com a AbacatePay em modo de desenvolvimento. */
export const simulatePix = (paymentId: string) => api.post(`/pagamento/pix/${paymentId}/simular-pagamento`)

export const cancelSaleApi = (saleId: string) => api.post(`/venda/${saleId}/cancelar`)

export const fetchNota = (saleId: string) => api.get<{ venda_id: string; numero: number; status: string; espelho: Espelho }>(`/nfce/vendas/${saleId}`)

type ApiProdutoBusca = { id: string; nome: string; ean_gtin?: string | null; tipo_medida: "UNIDADE" | "FRACIONADO_KG"; preco_venda: number; quantidade_atual: number }

/** Busca do PDV por código de barras ou nome (é a rota que o Caixa pode usar). */
export async function searchProducts(term: string): Promise<Product[]> {
  const found = await api.get<ApiProdutoBusca[]>("/venda/buscar", { query: { termo: term } })
  return found.map((item) => ({
    id: item.id,
    sku: item.ean_gtin || item.id.slice(0, 8).toUpperCase(),
    ean: item.ean_gtin ?? "",
    name: item.nome,
    category: "",
    unit: item.tipo_medida === "FRACIONADO_KG" ? "KG" : "UN",
    priceCents: cents(item.preco_venda),
    costCents: 0,
    ncm: "",
    cfop: "",
    stock: item.quantidade_atual,
    minStock: 0,
    active: true,
    createdAt: 0,
  }))
}

// ---------- conversão para o modelo das telas ----------
const METHODS: Record<string, PaymentMethod> = { PIX_ABACATEPAY: "pix", PIX: "pix", DINHEIRO: "dinheiro", DEBITO: "cartao", CREDITO: "cartao" }
export const paymentOf = (method: string): PaymentMethod => METHODS[method] ?? "cartao"

const toItems = (list: ApiItem[]): SaleItem[] =>
  list.map((item) => ({ productId: item.produto_id, name: item.produto_nome, sku: item.produto_id.slice(0, 8).toUpperCase(), quantity: item.quantidade, unitCents: cents(item.preco_unitario) }))

/** Venda paga em dinheiro ou cartão, pronta para o recibo não fiscal. */
export function manualToSale(payment: ManualPayment, operator: string, nfce: boolean): Sale {
  return {
    id: payment.venda_id,
    number: 0,
    code: payment.venda_id.slice(0, 8).toUpperCase(),
    createdAt: Date.parse(payment.criada_em),
    items: toItems(payment.itens),
    totalCents: cents(payment.total_venda),
    payment: paymentOf(payment.metodo_pagamento),
    status: "concluida",
    operator,
    nfce,
    ...(payment.desconto > 0 ? { discountCents: cents(payment.desconto) } : {}),
    ...(payment.metodo_pagamento === "DINHEIRO" && payment.valor_pago != null ? { receivedCents: cents(payment.valor_pago), changeCents: cents(payment.troco ?? 0) } : {}),
  }
}

/** Venda Pix (total dos itens e taxa separados, como a API devolve). */
export function pixToSale(payment: PixPayment, operator: string, nfce: boolean): Sale {
  return {
    id: payment.venda_id,
    number: 0,
    code: payment.venda_id.slice(0, 8).toUpperCase(),
    createdAt: Date.parse(payment.criada_em),
    items: toItems(payment.itens),
    totalCents: cents(payment.total_venda),
    payment: "pix",
    status: "concluida",
    operator,
    nfce,
    pixFeeCents: cents(payment.taxa_pix),
    ...(payment.desconto > 0 ? { discountCents: cents(payment.desconto) } : {}),
  }
}
