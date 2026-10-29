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
  /** Switch da NFC-e (Ajustes › Fiscal). Quando ausente, vale como ligado. */
  nfceEnabled?: boolean
}

export type CreateStoreInput = Omit<Store, "id" | "role">

export type StoreContextValue = {
  stores: Store[]
  activeStore: Store
  activeStoreId: string
  setActiveStore: (storeId: string) => void
  createStore: (input: CreateStoreInput) => Store
  updateStore: (storeId: string, input: CreateStoreInput) => void
}

export const StoreContext = createContext<StoreContextValue | null>(null)
