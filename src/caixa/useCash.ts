import { useCallback, useEffect, useMemo, useState } from "react"

import { useAuth } from "@/auth/useAuth"
import { openShift, readShifts, writeShifts, type Shift } from "@/caixa/caixa"
import { config } from "@/config"
import { ApiError, api, errorMessage } from "@/lib/api"
import { cents } from "@/lib/money"
import type { Result } from "@/inventory/types"
import { useStores } from "@/store/useStores"

type ApiTurno = {
  id: string
  status: "ABERTO" | "FECHADO"
  valor_abertura: number
  valor_fechamento?: number | null
  aberto_por_nome?: string | null
  aberto_em: string
  fechado_em?: string | null
}

const toShift = (turno: ApiTurno): Shift => ({
  id: turno.id,
  openedAt: Date.parse(turno.aberto_em),
  openingCents: cents(turno.valor_abertura),
  operator: turno.aberto_por_nome ?? "—",
  ...(turno.fechado_em ? { closedAt: Date.parse(turno.fechado_em) } : {}),
  ...(turno.valor_fechamento != null ? { countedCents: cents(turno.valor_fechamento) } : {}),
})

/** Turno atual da loja ativa (null = caixa fechado), pela API ou, no modo demonstração, do armazenamento local. */
async function fetchCurrent(): Promise<Shift | null> {
  try {
    const turno = await api.get<ApiTurno>("/caixa/turno/atual")
    return turno.status === "ABERTO" ? toShift(turno) : null
  } catch (error) {
    // Sem turno aberto a API responde 404: é o caixa fechado, não uma falha.
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export type Cash = {
  shift: Shift | null
  /** Ainda perguntando à API se há turno aberto. */
  isLoading: boolean
  error: string | null
  open: (openingCents: number) => Promise<Result<Shift>>
  /** Fecha o turno com o dinheiro contado na gaveta. */
  close: (countedCents: number) => Promise<Result<null>>
}

export function useCash(): Cash {
  const { activeStore } = useStores()
  const { session } = useAuth()
  const storeId = activeStore.id
  const operator = session?.user.name ?? "Operador"

  // O turno fica amarrado à loja que o carregou: ao trocar de loja os dados antigos deixam de valer.
  const [state, setState] = useState<{ storeId: string; shift: Shift | null } | null>(() =>
    config.useApi ? null : { storeId, shift: openShift(readShifts(storeId)) ?? null },
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!config.useApi || !storeId) return
    let cancelled = false
    fetchCurrent().then(
      (shift) => {
        if (cancelled) return
        setState({ storeId, shift })
        setError(null)
      },
      (failure: unknown) => {
        if (!cancelled) setError(errorMessage(failure))
      },
    )
    return () => {
      cancelled = true
    }
  }, [storeId])

  const loaded = state !== null && state.storeId === storeId
  const shift = loaded ? state.shift : null

  const open = useCallback(
    async (openingCents: number): Promise<Result<Shift>> => {
      if (!config.useApi) {
        const next: Shift = { id: `shift-${Date.now().toString(36)}`, openedAt: Date.now(), openingCents, operator }
        const all = readShifts(storeId)
        if (!writeShifts(storeId, [...all, next])) return { ok: false, error: "O navegador não permitiu salvar o caixa." }
        setState({ storeId, shift: next })
        return { ok: true, value: next }
      }
      try {
        const next = toShift(await api.post<ApiTurno>("/caixa/turno", { valor_abertura: openingCents / 100 }))
        setState({ storeId, shift: next })
        return { ok: true, value: next }
      } catch (failure) {
        return { ok: false, error: errorMessage(failure) }
      }
    },
    [operator, storeId],
  )

  const close = useCallback(
    async (countedCents: number): Promise<Result<null>> => {
      if (!config.useApi) {
        const all = readShifts(storeId)
        const current = openShift(all)
        if (!current) return { ok: false, error: "Não há caixa aberto." }
        const closed: Shift = { ...current, closedAt: Date.now(), countedCents }
        if (!writeShifts(storeId, all.map((item) => (item.id === current.id ? closed : item)))) return { ok: false, error: "O navegador não permitiu salvar o caixa." }
        setState({ storeId, shift: null })
        return { ok: true, value: null }
      }
      try {
        await api.patch("/caixa/turno/atual", { valor_fechamento: countedCents / 100 })
        setState({ storeId, shift: null })
        return { ok: true, value: null }
      } catch (failure) {
        return { ok: false, error: errorMessage(failure) }
      }
    },
    [storeId],
  )

  return useMemo(() => ({ shift, isLoading: config.useApi && !loaded && !error, error, open, close }), [close, error, loaded, open, shift])
}
