import { useContext } from "react"

import { StoreTransitionContext } from "@/components/layout/store-transition"

export function useStoreSwitch() {
  const context = useContext(StoreTransitionContext)
  if (!context) throw new Error("useStoreSwitch precisa estar dentro de StoreTransitionProvider")
  return context
}
