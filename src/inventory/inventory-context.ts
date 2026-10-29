import { createContext } from "react"

import type { Movement, MoveInput, Product, ProductInput, Result, Sale, SaleInput, StoreInventory } from "@/inventory/types"

export type InventoryContextValue = StoreInventory & {
  createProduct: (input: ProductInput) => Result<Product>
  updateProduct: (id: string, input: Omit<ProductInput, "stock">) => Result<Product>
  setProductActive: (id: string, active: boolean) => Result<Product>
  moveStock: (input: MoveInput) => Result<Movement>
  registerSale: (input: SaleInput) => Result<Sale>
  cancelSale: (saleId: string) => Result<Sale>
  addCategory: (name: string) => Result<string>
  renameCategory: (from: string, to: string) => Result<string>
  /** Devolve quantos produtos passaram para "Sem categoria". */
  removeCategory: (name: string) => Result<number>
}

export const InventoryContext = createContext<InventoryContextValue | null>(null)
