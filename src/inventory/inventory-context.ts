import { createContext } from "react"

import type { Movement, MoveInput, Product, ProductInput, Result, Sale, SaleInput, StoreInventory } from "@/inventory/types"

export type InventoryContextValue = StoreInventory & {
  createProduct: (input: ProductInput) => Result<Product>
  updateProduct: (id: string, input: Omit<ProductInput, "stock">) => Result<Product>
  setProductActive: (id: string, active: boolean) => Result<Product>
  moveStock: (input: MoveInput) => Result<Movement>
  registerSale: (input: SaleInput) => Result<Sale>
  cancelSale: (saleId: string) => Result<Sale>
}

export const InventoryContext = createContext<InventoryContextValue | null>(null)
