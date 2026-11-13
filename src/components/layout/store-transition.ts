import { createContext } from "react"

export type StoreTransitionValue = {
  /** Troca a loja ativa com a animação de "saí de uma loja e entrei em outra". */
  switchStore: (storeId: string) => void
  /** Animação em andamento (a troca ainda não terminou). */
  switching: boolean
}

export const StoreTransitionContext = createContext<StoreTransitionValue | null>(null)
