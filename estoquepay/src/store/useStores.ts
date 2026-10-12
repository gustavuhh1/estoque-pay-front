import { useContext } from "react"

import { StoreContext } from "@/store/store-context"

export function useStores() {
  const context = useContext(StoreContext)
  if (!context) throw new Error("useStores precisa estar dentro de StoreProvider")
  return context
}
