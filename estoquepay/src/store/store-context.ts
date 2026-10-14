import { createContext } from "react"

export type StoreRole = "Owner" | "Gestor" | "Colaborador"

export type Store = {
  id: string
  name: string
  cnpj: string
  phone: string
  city: string
  state: string
  role: StoreRole
}

export type CreateStoreInput = Omit<Store, "id" | "role">

export type StoreContextValue = {
  stores: Store[]
  activeStore: Store
  activeStoreId: string
  setActiveStore: (storeId: string) => void
  createStore: (input: CreateStoreInput) => Store
}

export const StoreContext = createContext<StoreContextValue | null>(null)
