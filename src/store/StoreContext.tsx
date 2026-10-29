import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"

import { config } from "@/config"
import { ApiStoreProvider } from "@/store/ApiStoreContext"
import { StoreContext, type CreateStoreInput, type Store } from "@/store/store-context"

const STORAGE_KEY = "estoquepay.demo.stores"
const ACTIVE_STORAGE_KEY = "estoquepay.demo.active-store"

const defaultStores: Store[] = [
  {
    id: "ponto-certo",
    name: "Loja Ponto Certo",
    cnpj: "12.345.678/0001-00",
    phone: "(85) 3333-2200",
    city: "Fortaleza",
    state: "CE",
    role: "Owner",
  },
  {
    id: "centro",
    name: "Ponto Certo Centro",
    cnpj: "12.345.678/0002-81",
    phone: "(85) 3333-2211",
    city: "Fortaleza",
    state: "CE",
    role: "Gestor",
  },
  {
    id: "shopping",
    name: "Ponto Certo Shopping",
    cnpj: "12.345.678/0003-62",
    phone: "(85) 3333-2222",
    city: "Fortaleza",
    state: "CE",
    role: "Colaborador",
  },
]

function readStores() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultStores
    const parsed = JSON.parse(raw) as Store[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultStores
  } catch {
    return defaultStores
  }
}

function readActiveId(stores: Store[]) {
  const saved = localStorage.getItem(ACTIVE_STORAGE_KEY)
  return stores.some((store) => store.id === saved) ? saved! : stores[0].id
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

/** Lojas de demonstração em localStorage (modo sem API). */
function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [stores, setStores] = useState<Store[]>(() => readStores())
  const [activeStoreId, setActiveStoreId] = useState(() => readActiveId(stores))

  const activeStore = stores.find((store) => store.id === activeStoreId) ?? stores[0] ?? defaultStores[0]

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stores))
  }, [stores])

  useEffect(() => {
    localStorage.setItem(ACTIVE_STORAGE_KEY, activeStoreId)
  }, [activeStoreId])

  const setActiveStore = useCallback((storeId: string) => {
    setActiveStoreId((current) => {
      if (current === storeId) return current
      return storeId
    })
  }, [])

  const createStore = useCallback((input: CreateStoreInput) => {
    const baseId = slugify(input.name) || "nova-loja"
    const id = `${baseId}-${Date.now()}`
    const created: Store = { ...input, id, role: "Owner" }
    setStores((current) => [...current, created])
    setActiveStoreId(created.id)
    return Promise.resolve(created)
  }, [])

  const updateStore = useCallback((storeId: string, input: CreateStoreInput) => {
    setStores((current) =>
      current.map((store) => (store.id === storeId ? { ...store, ...input } : store)),
    )
    return Promise.resolve()
  }, [])
  const reload = useCallback(() => Promise.resolve(), [])

  const value = useMemo(
    () => ({
      stores,
      activeStore,
      activeStoreId,
      isLoading: false,
      loadError: null,
      reload,
      setActiveStore,
      createStore,
      updateStore,
    }),
    [activeStore, activeStoreId, createStore, reload, setActiveStore, stores, updateStore],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

/** Com a API configurada usa as lojas reais; sem ela, as de demonstração. */
export function StoreProvider({ children }: { children: ReactNode }) {
  return config.useApi ? <ApiStoreProvider>{children}</ApiStoreProvider> : <DemoStoreProvider>{children}</DemoStoreProvider>
}
