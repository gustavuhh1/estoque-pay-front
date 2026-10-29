import { createContext } from "react"

export type StoreRole = "Owner" | "Gestor" | "Colaborador"

export type Store = {
  id: string
  name: string
  cnpj: string
  /** Telefone, cidade e UF só existem no modo demonstração: a API de lojas não guarda esses dados. */
  phone?: string
  city?: string
  state?: string
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
  /** Lojas ainda sendo carregadas da API (sempre false no modo demonstração). */
  isLoading: boolean
  /** Mensagem quando não foi possível carregar as lojas (API fora do ar, cold start que estourou). */
  loadError: string | null
  reload: () => Promise<void>
  setActiveStore: (storeId: string) => void
  createStore: (input: CreateStoreInput) => Promise<Store>
  updateStore: (storeId: string, input: CreateStoreInput) => Promise<void>
}

export const StoreContext = createContext<StoreContextValue | null>(null)
