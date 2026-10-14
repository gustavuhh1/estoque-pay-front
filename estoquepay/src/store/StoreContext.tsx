import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { useAuth } from "@/auth/useAuth"
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

function safeGet(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Armazenamento indisponível (modo privado/quota): o estado vale só até recarregar.
  }
}

function isStore(value: unknown): value is Store {
  const store = value as Store
  return Boolean(store && typeof store.id === "string" && typeof store.name === "string")
}

function readStores() {
  try {
    const parsed: unknown = JSON.parse(safeGet(STORAGE_KEY) ?? "null")
    return Array.isArray(parsed) && parsed.length > 0 && parsed.every(isStore) ? parsed : defaultStores
  } catch {
    return defaultStores
  }
}

function readActiveId(stores: Store[]) {
  const saved = safeGet(ACTIVE_STORAGE_KEY)
  return stores.find((store) => store.id === saved)?.id ?? stores[0].id
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [stores, setStores] = useState<Store[]>(() => readStores())
  const [activeStoreId, setActiveStoreId] = useState(() => readActiveId(readStores()))
  const wasAuthenticated = useRef(false)

  const activeStore = stores.find((store) => store.id === activeStoreId) ?? stores[0]

  // Ao sair (logout ou sessão expirada) o contexto de lojas volta ao padrão,
  // para o próximo usuário do mesmo navegador não herdar as lojas do anterior.
  useEffect(() => {
    if (wasAuthenticated.current && !isAuthenticated) {
      setStores(defaultStores)
      setActiveStoreId(defaultStores[0].id)
    }
    wasAuthenticated.current = isAuthenticated
  }, [isAuthenticated])

  useEffect(() => {
    safeSet(STORAGE_KEY, JSON.stringify(stores))
  }, [stores])

  useEffect(() => {
    safeSet(ACTIVE_STORAGE_KEY, activeStoreId)
  }, [activeStoreId])

  const createStore = useCallback((input: CreateStoreInput) => {
    const id = `${slugify(input.name) || "nova-loja"}-${Date.now()}`
    const created: Store = { ...input, id, role: "Owner" }
    setStores((current) => [...current, created])
    setActiveStoreId(created.id)
    return created
  }, [])

  const value = useMemo(
    () => ({ stores, activeStore, activeStoreId, setActiveStore: setActiveStoreId, createStore }),
    [activeStore, activeStoreId, createStore, stores],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
