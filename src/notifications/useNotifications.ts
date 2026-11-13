import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"

import { readShifts, shiftTotals, type Shift } from "@/caixa/caixa"
import { useCash } from "@/caixa/useCash"
import { config } from "@/config"
import { api, errorMessage } from "@/lib/api"
import { formatBRL, formatQuantity, saleLabel } from "@/lib/format"
import type { Product, Sale } from "@/inventory/types"
import { useInventory } from "@/inventory/useInventory"
import { NOTIFICATIONS_REFRESH_EVENT } from "@/notifications/events"
import { useStores } from "@/store/useStores"

/** Tipos da API, mais o "Pix aguardando" que só existe no modo demonstração. */
export type NotificationType = "ESTOQUE_BAIXO" | "ESTOQUE_ZERADO" | "VENDA_CANCELADA" | "PIX_CONFIRMADO" | "CAIXA_DIFERENCA" | "PIX_PENDENTE"

export type AppNotification = {
  id: string
  type: NotificationType
  title: string
  message: string
  /** Rota do painel aberta ao clicar (ex.: "/estoque"). */
  link: string | null
  read: boolean
  createdAt: number
}

export type Notifications = {
  items: AppNotification[]
  unread: number
  /** Primeira carga ainda em andamento. */
  isLoading: boolean
  error: string | null
  markRead: (id: string) => void
  markAllRead: () => void
  reload: () => void
}

/** Intervalo do polling com a aba visível. */
const POLL_MS = 30_000
/** Quantas notificações o sininho mostra. */
const LIMIT = 30

// ============================== API ==============================

type ApiNotificacao = {
  id: string
  tipo: Exclude<NotificationType, "PIX_PENDENTE">
  titulo: string
  mensagem: string
  link: string | null
  lida: boolean
  criada_em: string
}

type ApiLista = { itens: ApiNotificacao[]; nao_lidas: number }

const fromApi = (item: ApiNotificacao): AppNotification => ({
  id: item.id,
  type: item.tipo,
  title: item.titulo,
  message: item.mensagem,
  link: item.link,
  read: item.lida,
  createdAt: Date.parse(item.criada_em),
})

function useApiNotifications(enabled: boolean): Notifications {
  const { activeStoreId } = useStores()
  const [state, setState] = useState<{ storeId: string; items: AppNotification[]; unread: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const load = useCallback((): Promise<void> => {
    if (!enabled || !activeStoreId) return Promise.resolve()
    const id = ++requestId.current
    return api.get<ApiLista>("/notificacao", { query: { limite: LIMIT } }).then(
      (data) => {
        // Resposta atrasada de outra loja (ou de uma busca anterior) não sobrescreve a atual.
        if (id !== requestId.current) return
        setState({ storeId: activeStoreId, items: data.itens.map(fromApi), unread: data.nao_lidas })
        setError(null)
      },
      (failure: unknown) => {
        if (id === requestId.current) setError(errorMessage(failure))
      },
    )
  }, [activeStoreId, enabled])

  // Ao montar e ao trocar de loja; depois, polling a cada 30 s que pausa com a aba oculta.
  useEffect(() => {
    if (!enabled) return
    void load()
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load()
    }, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === "visible") void load()
    }
    // Ações que geram aviso (venda, cancelamento...) pedem recarga; o atraso curto junta pedidos em sequência.
    let debounce: number | undefined
    const onRefresh = () => {
      window.clearTimeout(debounce)
      debounce = window.setTimeout(() => void load(), 400)
    }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh)
    return () => {
      window.clearInterval(timer)
      window.clearTimeout(debounce)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh)
    }
  }, [enabled, load])

  const current = state && state.storeId === activeStoreId ? state : null

  const markRead = useCallback(
    (id: string) => {
      setState((previous) => {
        if (!previous) return previous
        const target = previous.items.find((item) => item.id === id)
        if (!target || target.read) return previous
        return { ...previous, items: previous.items.map((item) => (item.id === id ? { ...item, read: true } : item)), unread: Math.max(0, previous.unread - 1) }
      })
      api.patch(`/notificacao/${id}/lida`).catch(() => void load())
    },
    [load],
  )

  const markAllRead = useCallback(() => {
    setState((previous) => (previous ? { ...previous, items: previous.items.map((item) => ({ ...item, read: true })), unread: 0 } : previous))
    api.patch("/notificacao/lidas").catch(() => void load())
  }, [load])

  return {
    items: current?.items ?? [],
    unread: current?.unread ?? 0,
    isLoading: enabled && !current && !error,
    error,
    markRead,
    markAllRead,
    reload: () => void load(),
  }
}

// ======================= Modo demonstração =======================

type DemoState = {
  /** Ids já lidos. Some daqui quando o aviso deixa de valer, para voltar como novo se a situação se repetir. */
  read: string[]
  /** Quando cada aviso apareceu pela primeira vez (para o "há 5 min" dos avisos sem data própria). */
  seen: Record<string, number>
}

const demoKey = (storeId: string) => `estoquepay.demo.notificacoes.${storeId}`

function parseDemoState(raw: string): DemoState {
  try {
    const parsed = JSON.parse(raw || "null") as Partial<DemoState> | null
    return { read: Array.isArray(parsed?.read) ? parsed.read : [], seen: parsed?.seen && typeof parsed.seen === "object" ? parsed.seen : {} }
  } catch {
    return { read: [], seen: {} }
  }
}

/** Avisa as instâncias do hook (o mesmo armazenamento) que a leitura mudou. */
const DEMO_EVENT = "estoquepay:notificacoes-demo"

function writeDemoState(storeId: string, state: DemoState) {
  try {
    localStorage.setItem(demoKey(storeId), JSON.stringify(state))
  } catch {
    // Armazenamento indisponível: a leitura vale só até recarregar.
  }
  window.dispatchEvent(new Event(DEMO_EVENT))
}

function subscribeDemo(onChange: () => void) {
  window.addEventListener(DEMO_EVENT, onChange)
  window.addEventListener("storage", onChange)
  return () => {
    window.removeEventListener(DEMO_EVENT, onChange)
    window.removeEventListener("storage", onChange)
  }
}

function readDemoRaw(storeId: string) {
  try {
    return localStorage.getItem(demoKey(storeId)) ?? ""
  } catch {
    return ""
  }
}

type DerivedNotification = Omit<AppNotification, "read" | "createdAt"> & { createdAt?: number }

const DAY = 24 * 60 * 60 * 1000

const unitLabel = (product: Product, quantity: number) =>
  product.unit === "UN" ? `${formatQuantity(quantity)} ${quantity === 1 ? "unidade" : "unidades"}` : `${formatQuantity(quantity)} ${product.unit.toLowerCase()}`

/** Os mesmos avisos que a API daria, derivados dos dados de exemplo da loja. */
function deriveDemo(products: Product[], sales: Sale[], lastMovement: Map<string, number>, closedShifts: Shift[]): DerivedNotification[] {
  const list: DerivedNotification[] = []

  for (const product of products) {
    if (!product.active) continue
    if (product.stock <= 0) {
      list.push({ id: `estoque-zerado:${product.id}`, type: "ESTOQUE_ZERADO", title: `${product.name} esgotou`, message: `O estoque de ${product.name} chegou a zero. Reponha para não perder vendas.`, link: "/estoque", createdAt: lastMovement.get(product.id) })
    } else if (product.minStock > 0 && product.stock <= product.minStock) {
      list.push({ id: `estoque-baixo:${product.id}`, type: "ESTOQUE_BAIXO", title: `Estoque baixo: ${product.name}`, message: `Restam ${unitLabel(product, product.stock)} (mínimo: ${unitLabel(product, product.minStock)}).`, link: "/estoque", createdAt: lastMovement.get(product.id) })
    }
  }

  const now = Date.now()
  // Ids pela numeração da venda: os ids das vendas de exemplo mudam a cada carga, o número não.
  for (const sale of sales) {
    if (sale.status === "cancelada") {
      const items = sale.items.length
      list.push({ id: `venda-cancelada:${sale.number}`, type: "VENDA_CANCELADA", title: "Venda cancelada", message: `A venda ${saleLabel(sale)} de ${formatBRL(sale.totalCents)} (${items} ${items === 1 ? "item" : "itens"}) foi cancelada e os produtos voltaram ao estoque.`, link: "/vendas", createdAt: sale.canceledAt ?? sale.createdAt })
    } else if (sale.payment === "pix" && sale.status === "pendente") {
      list.push({ id: `pix-pendente:${sale.number}`, type: "PIX_PENDENTE", title: "Pix aguardando pagamento", message: `A venda ${saleLabel(sale)} de ${formatBRL(sale.totalCents)} ainda não teve o Pix confirmado.`, link: "/vendas", createdAt: sale.createdAt })
    } else if (sale.payment === "pix" && sale.status === "concluida" && now - sale.createdAt < DAY) {
      list.push({ id: `pix-confirmado:${sale.number}`, type: "PIX_CONFIRMADO", title: "Pix confirmado", message: `Pagamento de ${formatBRL(sale.totalCents)} recebido via Pix (venda ${saleLabel(sale)}).`, link: "/vendas", createdAt: sale.createdAt })
    }
  }

  for (const shift of closedShifts) {
    if (shift.closedAt === undefined || shift.countedCents === undefined) continue
    const expected = shift.expectedCents ?? shiftTotals(sales, shift).expectedCashCents
    const diff = shift.countedCents - expected
    if (diff === 0) continue
    const surplus = diff > 0
    list.push({ id: `caixa-diferenca:${shift.id}`, type: "CAIXA_DIFERENCA", title: surplus ? "Sobra no fechamento do caixa" : "Falta no fechamento do caixa", message: `Esperado ${formatBRL(expected)}, contado ${formatBRL(shift.countedCents)}: ${surplus ? "sobra" : "falta"} de ${formatBRL(Math.abs(diff))}.`, link: "/vendas", createdAt: shift.closedAt })
  }

  return list
}

function useDemoNotifications(enabled: boolean): Notifications {
  const { activeStoreId } = useStores()
  const { products, sales, movements } = useInventory()
  // O caixa muda (abre/fecha) pelo useCash: é a deixa para reler os turnos fechados guardados.
  const { shift } = useCash()
  // Leitura guardada no navegador, lida como "sistema externo": a string só muda quando alguém grava.
  const raw = useSyncExternalStore(subscribeDemo, () => readDemoRaw(activeStoreId))
  const demo = useMemo(() => parseDemoState(raw), [raw])
  const [mountedAt] = useState(() => Date.now())

  const lastMovement = useMemo(() => {
    const map = new Map<string, number>()
    for (const movement of movements) map.set(movement.productId, Math.max(map.get(movement.productId) ?? 0, movement.createdAt))
    return map
  }, [movements])

  const closedShifts = useMemo(
    // `shift` muda quando o caixa abre ou fecha: é quando um turno fechado novo pode ter aparecido.
    () => (shift === undefined ? [] : readShifts(activeStoreId).filter((item) => item.closedAt !== undefined)),
    [activeStoreId, shift],
  )

  const derived = useMemo(
    () => (enabled ? deriveDemo(products, sales, lastMovement, closedShifts) : []),
    [enabled, products, sales, lastMovement, closedShifts],
  )

  // Registra quando cada aviso apareceu e esquece a leitura dos que deixaram de valer (só grava no armazenamento).
  useEffect(() => {
    if (!enabled) return
    const ids = new Set(derived.map((item) => item.id))
    const base = parseDemoState(readDemoRaw(activeStoreId))
    const now = Date.now()
    const seen: Record<string, number> = {}
    for (const item of derived) seen[item.id] = base.seen[item.id] ?? now
    const read = base.read.filter((id) => ids.has(id))
    const changed = read.length !== base.read.length || Object.keys(seen).length !== Object.keys(base.seen).length || derived.some((item) => base.seen[item.id] === undefined)
    if (changed) writeDemoState(activeStoreId, { read, seen })
  }, [activeStoreId, derived, enabled])

  const items = useMemo(() => {
    const read = new Set(demo.read)
    return derived
      .map((item) => ({ ...item, read: read.has(item.id), createdAt: item.createdAt ?? demo.seen[item.id] ?? mountedAt }))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, LIMIT)
  }, [demo, derived, mountedAt])

  const markRead = useCallback(
    (id: string) => {
      const state = parseDemoState(readDemoRaw(activeStoreId))
      if (!state.read.includes(id)) writeDemoState(activeStoreId, { ...state, read: [...state.read, id] })
    },
    [activeStoreId],
  )
  const markAllRead = useCallback(() => {
    const state = parseDemoState(readDemoRaw(activeStoreId))
    writeDemoState(activeStoreId, { ...state, read: [...new Set([...state.read, ...derived.map((item) => item.id)])] })
  }, [activeStoreId, derived])

  return { items, unread: items.filter((item) => !item.read).length, isLoading: false, error: null, markRead, markAllRead, reload: () => {} }
}

/**
 * Notificações da loja ativa para o sininho do topo. Com a API: busca ao montar, ao trocar de loja, a cada 30 s com a
 * aba visível e logo depois de ações que geram aviso. No modo demonstração: avisos derivados dos dados de exemplo
 * (estoque baixo, vendas canceladas, Pix, diferença de caixa), com a leitura guardada no navegador.
 */
export function useNotifications(): Notifications {
  // Os dois hooks rodam sempre (regra dos hooks); só um fica ligado, conforme a configuração.
  const fromApi = useApiNotifications(config.useApi)
  const fromDemo = useDemoNotifications(!config.useApi)
  return config.useApi ? fromApi : fromDemo
}

/** "agora", "há 5 min", "há 2 h", "ontem", "há 3 dias" ou a data. */
export function formatRelativeTime(timestamp: number, now = Date.now()) {
  const diff = Math.max(0, now - timestamp)
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "agora"
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return "ontem"
  if (days < 7) return `há ${days} dias`
  return new Date(timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}
