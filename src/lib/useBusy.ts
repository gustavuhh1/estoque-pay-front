import { useCallback, useRef, useState } from "react"

/**
 * Trava de envio: enquanto uma ação assíncrona roda, novas chamadas são ignoradas.
 * Evita a requisição em dobro do duplo clique ou do Enter repetido (ex.: a mesma entrada de estoque gravada duas vezes).
 * A trava é o ref (vale já no segundo clique, antes de o React redesenhar); `busy` serve para desabilitar o botão.
 */
export function useBusy() {
  const running = useRef(false)
  const [busy, setBusy] = useState(false)
  const run = useCallback(async (action: () => Promise<unknown>) => {
    if (running.current) return
    running.current = true
    setBusy(true)
    try {
      await action()
    } finally {
      running.current = false
      setBusy(false)
    }
  }, [])
  return { busy, run }
}
