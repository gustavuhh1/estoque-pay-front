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
  /** Switch da NFC-e (Ajustes › Fiscal). Quando ausente, vale como ligado (se o plano permitir). */
  nfceEnabled?: boolean
  /** Inscrição estadual. */
  ie?: string
  /** Endereço completo (rua, número, bairro). */
  address?: string
  /** Logo da loja (data URL, até 150 KB). */
  logo?: string
  /** CFOP sugerido ao cadastrar produtos. */
  cfopDefault?: string
  /** Nome do arquivo do certificado A1 informado (o conteúdo nunca é guardado). */
  certificateName?: string
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
