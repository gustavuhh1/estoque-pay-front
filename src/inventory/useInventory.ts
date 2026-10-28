import { useContext } from "react"

import { InventoryContext } from "@/inventory/inventory-context"

export function useInventory() {
  const context = useContext(InventoryContext)
  if (!context) throw new Error("useInventory precisa estar dentro de InventoryProvider")
  return context
}
