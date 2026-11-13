import type { ReactNode } from "react"

import { CashContext, useCashState } from "@/caixa/useCash"

export function CashProvider({ children }: { children: ReactNode }) {
  return <CashContext.Provider value={useCashState()}>{children}</CashContext.Provider>
}
