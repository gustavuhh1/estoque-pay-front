import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { useAuth } from "@/auth/useAuth"
import { InventoryContext, type InventoryContextValue } from "@/inventory/inventory-context"
import * as logic from "@/inventory/logic"
import { CATEGORIES, type Product, type StoreInventory } from "@/inventory/types"
import { useStores } from "@/store/useStores"

const STORAGE_KEY = "estoquepay.demo.inventory"

type InventoryMap = Record<string, StoreInventory>

function isInventory(value: unknown): value is StoreInventory {
  const inv = value as StoreInventory
  return Boolean(inv && Array.isArray(inv.products) && Array.isArray(inv.sales) && Array.isArray(inv.movements))
}

function withDefaults(product: Product): Product {
  const saved: Partial<Product> = product
  return { ...product, unit: saved.unit ?? "UN", ean: saved.ean ?? "", ncm: saved.ncm ?? "", cfop: saved.cfop ?? "" }
}

function withInventoryDefaults(inv: StoreInventory): StoreInventory {
  const products = inv.products.map(withDefaults)
  const saved: Partial<StoreInventory> = inv
  const categories = saved.categories ?? [...new Set([...CATEGORIES, ...products.map((product) => product.category)])]
  return { ...inv, products, categories }
}

function readData(): InventoryMap {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    const valid = Object.entries(parsed).filter((entry): entry is [string, StoreInventory] => isInventory(entry[1]))
    // Dados salvos antes dos campos de EAN, unidade e fiscais ganham valores padrão.
    return Object.fromEntries(
      valid.map(([storeId, inv]) => [
        storeId,
        withInventoryDefaults(inv),
      ]),
    )
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
      addCategory: (name) => run((inv) => logic.addCategory(inv, name)),
      renameCategory: (from, to) => run((inv) => logic.renameCategory(inv, from, to)),
      removeCategory: (name) => run((inv) => logic.removeCategory(inv, name)),
    }),
    [current, run],
  )

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
}
