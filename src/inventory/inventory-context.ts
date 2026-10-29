import { createContext } from "react"

import type { Movement, MoveInput, Product, ProductInput, Result, Sale, SaleInput, StoreInventory } from "@/inventory/types"

export type InventoryContextValue = StoreInventory & {
  /** Dados da loja ainda sendo carregados da API (sempre false no modo demonstração). */
  isLoading: boolean
  /** Mensagem quando não foi possível carregar (API fora do ar, cold start que estourou). */
  error: string | null
  reload: () => Promise<void>
  createProduct: (input: ProductInput) => Promise<Result<Product>>
  updateProduct: (id: string, input: Omit<ProductInput, "stock">) => Promise<Result<Product>>
  setProductActive: (id: string, active: boolean) => Promise<Result<Product>>
  moveStock: (input: MoveInput) => Promise<Result<Movement>>
  registerSale: (input: SaleInput) => Promise<Result<Sale>>
  cancelSale: (saleId: string) => Promise<Result<Sale>>
  addCategory: (name: string) => Promise<Result<string>>
  renameCategory: (from: string, to: string) => Promise<Result<string>>
  /** Devolve quantos produtos passaram para "Sem categoria". */
  removeCategory: (name: string) => Promise<Result<number>>
}

export const InventoryContext = createContext<InventoryContextValue | null>(null)
