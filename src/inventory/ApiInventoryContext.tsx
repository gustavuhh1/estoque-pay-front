import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"

import { ApiError, api, errorMessage } from "@/lib/api"
import { cents } from "@/lib/money"
import { cancelSaleApi, paymentOf } from "@/pdv/pdvApi"
import { InventoryContext, type InventoryContextValue } from "@/inventory/inventory-context"
import { NO_CATEGORY, type Movement, type MoveInput, type Product, type ProductInput, type Result, type Sale, type StoreInventory, type Unit } from "@/inventory/types"
import { useStores } from "@/store/useStores"

// ---------- formato da API ----------
type ApiProduto = {
  id: string
  nome: string
  ean_gtin?: string | null
  tipo_medida: "UNIDADE" | "FRACIONADO_KG"
  preco_custo: number
  preco_venda: number
  quantidade_atual: number
  quantidade_minima: number
  ncm?: string | null
  cfop?: string | null
  ativo: boolean
  criado_em: string
}
type ApiCategoria = { id: string; nome: string; produtos: { id: string; nome: string }[] }
type ApiMovimentacao = {
  id: string
  produto_id: string
  produto_nome: string
  quantidade: number
  tipo: "ENTRADA" | "SAIDA"
  motivo: "REABASTECIMENTO" | "VENDA" | "ESTORNO_VENDA" | "DESCARTE" | "PERDA" | "VENCIMENTO" | "AJUSTE_MANUAL"
  observacao?: string | null
  criado_em: string
}
type ApiVenda = {
  id: string
  total_venda: number
  taxa_split?: number | null
  metodo_pagamento: string
  status_pagamento: "PENDENTE" | "PAGO" | "CANCELADO"
  itens: { produto_id: string; produto_nome: string; quantidade: number; preco_unitario: number }[]
  criada_em: string
  cancelada_em?: string | null
  nfe_numero?: number | null
}
type Raw = { produtos: ApiProduto[]; categorias: ApiCategoria[]; movimentacoes: ApiMovimentacao[]; vendas: ApiVenda[] }

const MOVEMENT_PAGE = 100
const REASON_LABEL: Record<ApiMovimentacao["motivo"], string> = {
  REABASTECIMENTO: "Reabastecimento",
  VENDA: "Venda",
  ESTORNO_VENDA: "Estorno de venda",
  DESCARTE: "Descarte",
  PERDA: "Perda",
  VENCIMENTO: "Vencimento",
  AJUSTE_MANUAL: "Ajuste manual",
}

const unitOf = (tipo: ApiProduto["tipo_medida"]): Unit => (tipo === "FRACIONADO_KG" ? "KG" : "UN")

/** Converte as respostas da API no modelo que as telas já usam (centavos, categoria única, SKU de exibição). */
function build(raw: Raw): StoreInventory {
  const categoryOf = new Map<string, string>()
  for (const categoria of raw.categorias) for (const produto of categoria.produtos) if (!categoryOf.has(produto.id)) categoryOf.set(produto.id, categoria.nome)

  const products: Product[] = raw.produtos.map((item) => ({
    id: item.id,
    // A API não tem SKU: o código mostrado é o código de barras ou o início do identificador.
    sku: item.ean_gtin || item.id.slice(0, 8).toUpperCase(),
    ean: item.ean_gtin ?? "",
    name: item.nome,
    category: categoryOf.get(item.id) ?? NO_CATEGORY,
    unit: unitOf(item.tipo_medida),
    priceCents: cents(item.preco_venda),
    costCents: cents(item.preco_custo),
    ncm: item.ncm ?? "",
    cfop: item.cfop ?? "",
    stock: item.quantidade_atual,
    minStock: item.quantidade_minima,
    active: item.ativo,
    createdAt: Date.parse(item.criado_em),
  }))

  // A API não devolve o saldo de cada movimentação: ele é refeito de trás para frente a partir do saldo atual.
  const running = new Map(products.map((product) => [product.id, product.stock]))
  const movements: Movement[] = [...raw.movimentacoes]
    .sort((a, b) => Date.parse(b.criado_em) - Date.parse(a.criado_em))
    .map((item) => {
      const delta = item.tipo === "ENTRADA" ? item.quantidade : -item.quantidade
      const balance = running.get(item.produto_id) ?? 0
      running.set(item.produto_id, Math.round((balance - delta) * 1000) / 1000)
      return {
        id: item.id,
        createdAt: Date.parse(item.criado_em),
        productId: item.produto_id,
        productName: item.produto_nome,
        sku: products.find((product) => product.id === item.produto_id)?.sku ?? "",
        type: item.motivo === "VENDA" ? "venda" : item.motivo === "ESTORNO_VENDA" ? "cancelamento" : item.motivo === "AJUSTE_MANUAL" ? "ajuste" : item.tipo === "ENTRADA" ? "entrada" : "saida",
        delta,
        balance,
        reason: item.observacao?.trim() || REASON_LABEL[item.motivo],
      }
    })

  const sales: Sale[] = raw.vendas.map((item) => ({
    id: item.id,
    number: item.nfe_numero ?? 0,
    code: item.id.slice(0, 8).toUpperCase(),
    createdAt: Date.parse(item.criada_em),
    items: item.itens.map((line) => ({
      productId: line.produto_id,
      name: line.produto_nome,
      sku: line.produto_id.slice(0, 8).toUpperCase(),
      quantity: line.quantidade,
      unitCents: cents(line.preco_unitario),
    })),
    totalCents: cents(item.total_venda),
    payment: paymentOf(item.metodo_pagamento),
    status: item.status_pagamento === "PAGO" ? "concluida" : item.status_pagamento === "CANCELADO" ? "cancelada" : "pendente",
    ...(item.cancelada_em ? { canceledAt: Date.parse(item.cancelada_em) } : {}),
    ...(item.taxa_split ? { pixFeeCents: cents(item.taxa_split) } : {}),
    // Só há número de nota quando a NFC-e simulada foi emitida para a venda.
    nfce: item.nfe_numero != null,
  }))

  return { products, sales, movements, categories: raw.categorias.map((categoria) => categoria.nome) }
}

async function fetchAll(): Promise<Raw> {
  const [produtos, categorias, movimentacoes, vendas] = await Promise.allSettled([
    api.get<ApiProduto[]>("/produto"),
    api.get<ApiCategoria[]>("/categoria"),
    api.get<{ data: ApiMovimentacao[] }>("/estoque/movimentacoes", { query: { limit: MOVEMENT_PAGE } }),
    api.get<{ itens: ApiVenda[] }>("/venda", { query: { limite: 100 } }),
  ])
  // O Caixa não tem acesso à gestão de produtos (403): ele vende pela busca do PDV, então aqui fica vazio.
  const forbidden = (result: PromiseSettledResult<unknown>) => result.status === "rejected" && result.reason instanceof ApiError && result.reason.status === 403
  for (const result of [produtos, categorias, movimentacoes]) {
    if (result.status === "rejected" && !forbidden(result)) throw result.reason
  }
  return {
    produtos: produtos.status === "fulfilled" ? produtos.value : [],
    categorias: categorias.status === "fulfilled" ? categorias.value : [],
    movimentacoes: movimentacoes.status === "fulfilled" ? movimentacoes.value.data : [],
    // A listagem de vendas é nova na API: se ela não existir ou o cargo não puder ver, o histórico fica vazio.
    vendas: vendas.status === "fulfilled" ? vendas.value.itens : [],
  }
}

const fail = (error: unknown) => ({ ok: false as const, error: errorMessage(error) })

/** Motivo da movimentação da API a partir do tipo da tela e do texto livre do motivo. */
function motive(input: MoveInput): { tipo: "ENTRADA" | "SAIDA"; motivo: string } {
  if (input.type === "entrada") return { tipo: "ENTRADA", motivo: "REABASTECIMENTO" }
  if (input.type === "ajuste") return { tipo: "ENTRADA", motivo: "AJUSTE_MANUAL" }
  if (/vencim|venc\.|validade/i.test(input.reason)) return { tipo: "SAIDA", motivo: "VENCIMENTO" }
  if (/descart/i.test(input.reason)) return { tipo: "SAIDA", motivo: "DESCARTE" }
  return { tipo: "SAIDA", motivo: "PERDA" }
}

/** Produtos, categorias e estoque reais da loja ativa. Vendas ainda não vêm daqui. */
export function ApiInventoryProvider({ children }: { children: ReactNode }) {
  const { activeStore } = useStores()
  const storeId = activeStore.id
  const [state, setState] = useState<{ storeId: string; raw: Raw } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loaded = state !== null && state.storeId === storeId
  const inventory = useMemo(() => (loaded ? build(state.raw) : { products: [], sales: [], movements: [], categories: [] }), [loaded, state])

  // Carga inicial e a cada troca de loja (o setState só acontece depois da resposta).
  useEffect(() => {
    if (!storeId) return
    let cancelled = false
    fetchAll().then(
      (raw) => {
        if (cancelled) return
        setState({ storeId, raw })
        setError(null)
      },
      (failure: unknown) => {
        if (!cancelled) setError(errorMessage(failure))
      },
    )
    return () => {
      cancelled = true
    }
  }, [storeId])

  /** Recarrega tudo da API e devolve o inventário novo (as operações usam isso para montar o retorno). */
  const refresh = useCallback(async () => {
    const raw = await fetchAll()
    setState({ storeId, raw })
    setError(null)
    return build(raw)
  }, [storeId])

  const reload = useCallback(async () => {
    try {
      await refresh()
    } catch (failure) {
      setError(errorMessage(failure))
    }
  }, [refresh])

  const categorias = state?.raw.categorias
  const categoryId = useCallback((name: string) => categorias?.find((categoria) => categoria.nome === name)?.id, [categorias])

  const value = useMemo<InventoryContextValue>(() => {
    const body = (input: Omit<ProductInput, "stock" | "active">) => ({
      nome: input.name,
      tipo_medida: input.unit === "UN" || input.unit === undefined ? "UNIDADE" : "FRACIONADO_KG",
      preco_custo: (input.costCents ?? 0) / 100,
      preco_venda: input.priceCents / 100,
      quantidade_minima: input.minStock,
    })

    async function link(productId: string, name: string, previous?: string) {
      const target = categoryId(name)
      const old = previous ? categoryId(previous) : undefined
      if (old && old !== target) await api.delete(`/categoria/${old}/produtos`, { body: { produto_ids: [productId] } })
      if (target && target !== old) await api.post(`/categoria/${target}/produtos`, { produto_ids: [productId] })
    }

    const find = (inv: StoreInventory, id: string) => inv.products.find((product) => product.id === id)

    return {
      ...inventory,
      isLoading: Boolean(storeId) && !loaded && !error,
      error,
      reload,

      async createProduct(input) {
        try {
          const created = await api.post<ApiProduto>("/produto", {
            ...body(input),
            ...(input.ean ? { ean_gtin: input.ean } : {}),
            ...(input.ncm ? { ncm: input.ncm } : {}),
            ...(input.cfop ? { cfop: input.cfop } : {}),
            quantidade_atual: input.stock,
          })
          if (input.active === false && created.ativo) await api.patch(`/produto/${created.id}/inativar`)
          if (input.category && input.category !== NO_CATEGORY) await link(created.id, input.category)
          const inv = await refresh()
          const product = find(inv, created.id)
          return product ? { ok: true, value: product } : fail(new Error("Produto criado, mas não foi possível recarregar a lista."))
        } catch (failure) {
          return fail(failure)
        }
      },

      async updateProduct(id, input) {
        try {
          const current = inventory.products.find((product) => product.id === id)
          await api.patch(`/produto/${id}`, {
            ...body(input),
            ean_gtin: input.ean || null,
            ncm: input.ncm || null,
            cfop: input.cfop || null,
          })
          if (input.active !== undefined && current && input.active !== current.active) await api.patch(`/produto/${id}/${input.active ? "reativar" : "inativar"}`)
          if (current && input.category !== current.category) await link(id, input.category, current.category === NO_CATEGORY ? undefined : current.category)
          const inv = await refresh()
          const product = find(inv, id)
          return product ? { ok: true, value: product } : fail(new Error("Produto salvo, mas não foi possível recarregar a lista."))
        } catch (failure) {
          return fail(failure)
        }
      },

      async setProductActive(id, active) {
        try {
          await api.patch(`/produto/${id}/${active ? "reativar" : "inativar"}`)
          const inv = await refresh()
          const product = find(inv, id)
          return product ? { ok: true, value: product } : fail(new Error("Não foi possível recarregar o produto."))
        } catch (failure) {
          return fail(failure)
        }
      },

      async moveStock(input) {
        const product = inventory.products.find((item) => item.id === input.productId)
        if (!product) return fail(new Error("Selecione um produto."))
        try {
          let { tipo, motivo } = motive(input)
          let quantidade = input.quantity
          if (input.type === "ajuste") {
            // Ajuste de contagem: a tela informa o saldo contado, a API recebe a diferença.
            const difference = Math.round((input.quantity - product.stock) * 1000) / 1000
            if (difference === 0) return fail(new Error("A contagem é igual ao estoque atual."))
            tipo = difference > 0 ? "ENTRADA" : "SAIDA"
            quantidade = Math.abs(difference)
          }
          await api.post("/estoque/movimentacao", {
            produto_id: input.productId,
            tipo,
            quantidade,
            motivo,
            ...(input.reason.trim() ? { observacao: input.reason.trim() } : {}),
          })
          const inv = await refresh()
          const entry = inv.movements.find((movement) => movement.productId === input.productId)
          return entry ? { ok: true, value: entry } : fail(new Error("Movimentação registrada, mas não foi possível recarregar o histórico."))
        } catch (failure) {
          return fail(failure)
        }
      },

      // Com a API a venda é registrada pelo checkout do PDV (dinheiro, cartão ou Pix), que depois recarrega este contexto.
      registerSale: () => Promise.resolve(fail(new Error("Use o PDV para registrar vendas."))),
      async cancelSale(saleId) {
        const previous = inventory.sales.find((sale) => sale.id === saleId)
        try {
          await cancelSaleApi(saleId)
          const inv = await refresh()
          const sale = inv.sales.find((item) => item.id === saleId) ?? (previous ? { ...previous, status: "cancelada" as const } : undefined)
          return sale ? { ok: true, value: sale } : fail(new Error("Venda cancelada, mas não foi possível recarregar o histórico."))
        } catch (failure) {
          return fail(failure)
        }
      },

      async addCategory(name) {
        try {
          await api.post("/categoria", { nome: name.trim() })
          await refresh()
          return { ok: true, value: name.trim() }
        } catch (failure) {
          return fail(failure)
        }
      },

      async renameCategory(from, to) {
        const id = categoryId(from)
        if (!id) return fail(new Error("Categoria não encontrada."))
        try {
          await api.patch(`/categoria/${id}`, { nome: to.trim() })
          await refresh()
          return { ok: true, value: to.trim() }
        } catch (failure) {
          return fail(failure)
        }
      },

      async removeCategory(name) {
        const id = categoryId(name)
        if (!id) return fail(new Error("Categoria não encontrada."))
        const affected = inventory.products.filter((product) => product.category === name).length
        try {
          await api.delete(`/categoria/${id}`)
          await refresh()
          return { ok: true, value: affected } satisfies Result<number>
        } catch (failure) {
          return fail(failure)
        }
      },
    }
  }, [categoryId, error, inventory, loaded, refresh, reload, storeId])

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
}
