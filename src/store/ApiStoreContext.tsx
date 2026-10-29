import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react"

import { useAuth } from "@/auth/useAuth"
import { api, errorMessage, setTenant } from "@/lib/api"
import { maskCnpj } from "@/lib/format"
import { StoreContext, type CreateStoreInput, type Store, type StoreRole } from "@/store/store-context"

const ACTIVE_KEY = "estoquepay.active-store"

type ApiRole = "ADMIN" | "OWNER" | "MANAGER" | "CASHIER"
type ApiStore = { id: string; nome: string; cnpj: string; ie?: string | null; emite_nfce: boolean; role?: ApiRole }

const ROLES: Record<ApiRole, StoreRole> = { ADMIN: "Owner", OWNER: "Owner", MANAGER: "Gestor", CASHIER: "Colaborador" }

const toStore = (item: ApiStore, role?: ApiRole): Store => ({
  id: item.id,
  name: item.nome,
  cnpj: maskCnpj(item.cnpj),
  ie: item.ie ?? undefined,
  nfceEnabled: item.emite_nfce,
  role: ROLES[item.role ?? role ?? "CASHIER"],
})

const fetchStores = async () => (await api.get<ApiStore[]>("/estabelecimento", { tenant: false })).map((item) => toStore(item))

/** Placeholder enquanto não há loja (carregando ou sem nenhuma): as telas protegidas nunca renderizam com ele. */
const NO_STORE: Store = { id: "", name: "", cnpj: "", role: "Colaborador" }

/** Lojas do usuário vindas da API. A loja ativa vira o header `x-estabelecimento-id` de todas as outras chamadas. */
export function ApiStoreProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id ?? null
  // As lojas ficam amarradas ao usuário que as carregou: ao trocar de conta, os dados antigos deixam de valer.
  const [data, setData] = useState<{ userId: string; stores: Store[] } | null>(null)
  const [activeId, setActiveId] = useState(() => localStorage.getItem(ACTIVE_KEY) ?? "")
  const [loadError, setLoadError] = useState<string | null>(null)

  const loaded = data !== null && data.userId === userId
  const stores = useMemo(() => (loaded ? data.stores : []), [data, loaded])

  const reload = useCallback(async () => {
    if (!userId) return
    try {
      setData({ userId, stores: await fetchStores() })
      setLoadError(null)
    } catch (error) {
      setLoadError(errorMessage(error))
    }
  }, [userId])

  // Carga inicial (e a cada troca de usuário). O setState só acontece depois da resposta, nunca direto no effect.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    fetchStores().then(
      (list) => {
        if (cancelled) return
        setData({ userId, stores: list })
        setLoadError(null)
      },
      (error: unknown) => {
        if (!cancelled) setLoadError(errorMessage(error))
      },
    )
    return () => {
      cancelled = true
    }
  }, [userId])

  const activeStore = stores.find((store) => store.id === activeId) ?? stores[0] ?? NO_STORE

  // Layout effect: roda antes dos effects das telas, então a primeira chamada já sai com a loja certa.
  useLayoutEffect(() => {
    setTenant(activeStore.id || null)
    if (activeStore.id) {
      try {
        localStorage.setItem(ACTIVE_KEY, activeStore.id)
      } catch {
        // Sem armazenamento: a loja ativa volta para a primeira ao recarregar.
      }
    }
  }, [activeStore.id])

  const createStore = useCallback(
    async (input: CreateStoreInput) => {
      const response = await api.post<{ estabelecimento: ApiStore; membro: { role: ApiRole } }>(
        "/estabelecimento",
        { nome: input.name.trim(), cnpj: input.cnpj, ...(input.ie?.trim() ? { ie: input.ie.trim() } : {}) },
        { tenant: false },
      )
      const created = toStore(response.estabelecimento, response.membro.role)
      if (userId) setData((current) => ({ userId, stores: [...(current?.userId === userId ? current.stores : []), created] }))
      setActiveId(created.id)
      return created
    },
    [userId],
  )

  const updateStore = useCallback(
    async (storeId: string, input: CreateStoreInput) => {
      // PATCH /estabelecimento/ativo atua na loja do header; só nome, CNPJ e IE existem na API.
      if (storeId !== activeStore.id) throw new Error("Troque para a loja antes de editar os dados dela.")
      await api.patch("/estabelecimento/ativo", { nome: input.name.trim(), cnpj: input.cnpj, ie: input.ie?.trim() || null })
      await reload()
    },
    [activeStore.id, reload],
  )

  const value = useMemo(
    () => ({
      stores,
      activeStore,
      activeStoreId: activeStore.id,
      isLoading: userId !== null && !loaded && !loadError,
      loadError,
      reload,
      setActiveStore: setActiveId,
      createStore,
      updateStore,
    }),
    [activeStore, createStore, loadError, loaded, reload, stores, updateStore, userId],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
