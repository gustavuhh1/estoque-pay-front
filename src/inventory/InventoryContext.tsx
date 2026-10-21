import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { useAuth } from "@/auth/useAuth"
import { InventoryContext, type InventoryContextValue } from "@/inventory/inventory-context"
import * as logic from "@/inventory/logic"
import type { StoreInventory } from "@/inventory/types"
import { useStores } from "@/store/useStores"

const STORAGE_KEY = "estoquepay.demo.inventory"

type InventoryMap = Record<string, StoreInventory>

function isInventory(value: unknown): value is StoreInventory {
  const inv = value as StoreInventory
  return Boolean(inv && Array.isArray(inv.products) && Array.isArray(inv.sales) && Array.isArray(inv.movements))
}

function readData(): InventoryMap {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => isInventory(value)))
  } catch {
    return {}
  }
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const { activeStoreId } = useStores()
  const [data, setData] = useState<InventoryMap>(() => readData())
  const wasAuthenticated = useRef(false)

  // Dados de demonstração da loja ativa (estáveis enquanto a loja não muda).
  const seeded = useMemo(() => logic.seedFor(activeStoreId), [activeStoreId])
  const current = data[activeStoreId] ?? seeded
  const currentRef = useRef(current)
  useEffect(() => {
    currentRef.current = current
  }, [current])

  // Ao sair (logout ou sessão expirada) o inventário volta ao estado de demonstração.
  useEffect(() => {
    if (wasAuthenticated.current && !isAuthenticated) setData({})
    wasAuthenticated.current = isAuthenticated
  }, [isAuthenticated])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Armazenamento indisponível: os dados valem só até recarregar.
    }
  }, [data])

  const run = useCallback(
    <T,>(operation: (inventory: StoreInventory) => logic.Outcome<T>) => {
      const outcome = operation(currentRef.current)
      if (!outcome.ok) return { ok: false as const, error: outcome.error }
      currentRef.current = outcome.inventory // chamadas seguidas no mesmo tick enxergam o resultado anterior
      setData((previous) => ({ ...previous, [activeStoreId]: outcome.inventory }))
      return { ok: true as const, value: outcome.value }
    },
    [activeStoreId],
  )

  const value = useMemo<InventoryContextValue>(
    () => ({
      ...current,
      createProduct: (input) => run((inv) => logic.createProduct(inv, input)),
      updateProduct: (id, input) => run((inv) => logic.updateProduct(inv, id, input)),
      setProductActive: (id, active) => run((inv) => logic.setProductActive(inv, id, active)),
      moveStock: (input) => run((inv) => logic.moveStock(inv, input)),
      registerSale: (input) => run((inv) => logic.registerSale(inv, input)),
      cancelSale: (saleId) => run((inv) => logic.cancelSale(inv, saleId)),
    }),
    [current, run],
  )

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
}
