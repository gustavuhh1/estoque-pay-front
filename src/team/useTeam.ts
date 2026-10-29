import { useCallback, useEffect, useMemo, useState } from "react"

import { config } from "@/config"
import { api, errorMessage } from "@/lib/api"
import type { Result } from "@/inventory/types"
import type { StoreRole } from "@/store/store-context"
import { createInvite, readMembers, writeMembers, type Member } from "@/team/team"

type ApiRole = "ADMIN" | "OWNER" | "MANAGER" | "CASHIER"
type ApiMembro = { id: string; userId: string; nome?: string | null; email: string; role: ApiRole; criadoEm?: string | null }
type ApiConvite = { id: string; email: string; role: Exclude<ApiRole, "ADMIN">; criadoEm: string }
type ApiEquipe = { membros: ApiMembro[]; convitesPendentes: ApiConvite[] }

const FROM_API: Record<ApiRole, StoreRole> = { ADMIN: "Owner", OWNER: "Owner", MANAGER: "Gestor", CASHIER: "Colaborador" }
const TO_API: Record<StoreRole, Exclude<ApiRole, "ADMIN">> = { Owner: "OWNER", Gestor: "MANAGER", Colaborador: "CASHIER" }

function fromApi(data: ApiEquipe): Member[] {
  const members: Member[] = data.membros.map((item) => ({
    id: item.id,
    name: item.nome?.trim() || item.email.split("@")[0],
    email: item.email,
    role: FROM_API[item.role],
    linkedAt: item.criadoEm ? Date.parse(item.criadoEm) : 0,
    status: "ativo",
  }))
  const invites: Member[] = data.convitesPendentes.map((item) => ({
    id: item.id,
    name: item.email.split("@")[0],
    email: item.email,
    role: FROM_API[item.role],
    linkedAt: Date.parse(item.criadoEm),
    status: "convite",
  }))
  return [...members, ...invites]
}

export type Team = {
  members: Member[]
  /** Equipe ainda sendo carregada da API (sempre false no modo demonstração). */
  isLoading: boolean
  error: string | null
  add: (input: { name: string; email: string; role: StoreRole }) => Promise<Result<null>>
  changeRole: (id: string, role: StoreRole) => Promise<Result<null>>
  remove: (id: string) => Promise<Result<null>>
}

const ok: Result<null> = { ok: true, value: null }
const fail = (error: unknown): Result<null> => ({ ok: false, error: errorMessage(error) })

/** Equipe da loja: pela API (`/equipe`) ou, no modo demonstração, do armazenamento local. */
export function useTeam(storeId: string, self: { name: string; email: string; role: StoreRole }): Team {
  const [demo, setDemo] = useState<Member[]>(() => (config.useApi ? [] : readMembers(storeId, self)))
  const [remote, setRemote] = useState<{ storeId: string; members: Member[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loaded = !config.useApi || remote?.storeId === storeId
  const members = useMemo(() => (config.useApi ? (remote?.storeId === storeId ? remote.members : []) : demo), [demo, remote, storeId])

  useEffect(() => {
    if (!config.useApi || !storeId) return
    let cancelled = false
    api.get<ApiEquipe>("/equipe").then(
      (data) => {
        if (cancelled) return
        setRemote({ storeId, members: fromApi(data) })
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

  const reload = useCallback(async () => {
    setRemote({ storeId, members: fromApi(await api.get<ApiEquipe>("/equipe")) })
  }, [storeId])

  const add = useCallback(
    async (input: { name: string; email: string; role: StoreRole }): Promise<Result<null>> => {
      if (!config.useApi) {
        const next = [...demo, createInvite(input)]
        if (!writeMembers(storeId, next)) return fail(new Error("O navegador não permitiu salvar a equipe."))
        setDemo(next)
        return ok
      }
      try {
        await api.post("/equipe", { email: input.email, role: TO_API[input.role] })
        await reload()
        return ok
      } catch (failure) {
        return fail(failure)
      }
    },
    [demo, reload, storeId],
  )

  const changeRole = useCallback(
    async (id: string, role: StoreRole): Promise<Result<null>> => {
      if (!config.useApi) {
        const next = demo.map((member) => (member.id === id ? { ...member, role } : member))
        if (!writeMembers(storeId, next)) return fail(new Error("O navegador não permitiu salvar a equipe."))
        setDemo(next)
        return ok
      }
      try {
        await api.patch(`/equipe/${id}`, { role: TO_API[role] })
        await reload()
        return ok
      } catch (failure) {
        return fail(failure)
      }
    },
    [demo, reload, storeId],
  )

  const remove = useCallback(
    async (id: string): Promise<Result<null>> => {
      if (!config.useApi) {
        const next = demo.filter((member) => member.id !== id)
        if (!writeMembers(storeId, next)) return fail(new Error("O navegador não permitiu salvar a equipe."))
        setDemo(next)
        return ok
      }
      try {
        await api.delete(`/equipe/${id}`)
        await reload()
        return ok
      } catch (failure) {
        return fail(failure)
      }
    },
    [demo, reload, storeId],
  )

  return useMemo(() => ({ members, isLoading: config.useApi && !loaded && !error, error, add, changeRole, remove }), [add, changeRole, error, loaded, members, remove])
}
