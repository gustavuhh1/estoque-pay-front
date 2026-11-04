import { useCallback, useEffect, useState } from "react"

import { useAuth } from "@/auth/useAuth"
import { config } from "@/config"
import type { Result } from "@/inventory/types"
import { api, errorMessage } from "@/lib/api"
import type { StoreRole } from "@/store/store-context"
import { useStores } from "@/store/useStores"

type ApiRole = "ADMIN" | "OWNER" | "MANAGER" | "CASHIER"
type ApiPerfil = {
  id: string
  nome: string | null
  email: string
  email_verificado: boolean
  foto: string | null
  metodos_login: ("EMAIL" | "GOOGLE")[]
  foto_google_disponivel: boolean
  criado_em: string
  lojas: { id: string; nome: string; cnpj: string; cargo: ApiRole }[]
}

export type Profile = {
  name: string
  email: string
  photo: string | null
  methods: ("EMAIL" | "GOOGLE")[]
  googlePhotoAvailable: boolean
  createdAt: number | null
  stores: { id: string; name: string; cnpj: string; role: StoreRole }[]
}

const FROM_API: Record<ApiRole, StoreRole> = { ADMIN: "Owner", OWNER: "Owner", MANAGER: "Gestor", CASHIER: "Colaborador" }

function fromApi(p: ApiPerfil): Profile {
  return {
    name: p.nome ?? "",
    email: p.email,
    photo: p.foto,
    methods: p.metodos_login,
    googlePhotoAvailable: p.foto_google_disponivel,
    createdAt: Date.parse(p.criado_em),
    stores: p.lojas.map((loja) => ({ id: loja.id, name: loja.nome, cnpj: loja.cnpj, role: FROM_API[loja.cargo] })),
  }
}

/** Meu perfil (RF01.7): pela API (`/perfil`) ou, no modo demonstração, da sessão local. */
export function useProfile() {
  const { session, refreshSession, patchDemoUser } = useAuth()
  const { stores } = useStores()
  const [remote, setRemote] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!config.useApi) return
    const controller = new AbortController()
    api
      .get<ApiPerfil>("/perfil", { tenant: false, signal: controller.signal })
      .then((p) => setRemote(fromApi(p)))
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(e))
      })
    return () => controller.abort()
  }, [])

  const demo: Profile | null = session
    ? {
        name: session.user.name,
        email: session.user.email,
        photo: session.user.image ?? null,
        methods: ["EMAIL"],
        googlePhotoAvailable: false,
        createdAt: null,
        stores: stores.map((store) => ({ id: store.id, name: store.name, cnpj: store.cnpj, role: store.role })),
      }
    : null

  const apply = useCallback(
    async (call: () => Promise<ApiPerfil>, demoPatch: { name?: string; image?: string | null }): Promise<Result<null>> => {
      try {
        if (!config.useApi) {
          patchDemoUser(demoPatch)
          return { ok: true, value: null }
        }
        setRemote(fromApi(await call()))
        // Cabeçalho e barra lateral leem nome e foto da sessão.
        await refreshSession()
        return { ok: true, value: null }
      } catch (e) {
        return { ok: false, error: errorMessage(e) }
      }
    },
    [patchDemoUser, refreshSession],
  )

  return {
    profile: config.useApi ? remote : demo,
    isLoading: config.useApi && remote === null && error === null,
    error,
    save: (input: { name: string }) => apply(() => api.patch<ApiPerfil>("/perfil", { nome: input.name }, { tenant: false }), { name: input.name }),
    setPhoto: (photo: string | null) => apply(() => api.patch<ApiPerfil>("/perfil", { foto: photo }, { tenant: false }), { image: photo }),
    applyGooglePhoto: () => apply(() => api.post<ApiPerfil>("/perfil/foto/google", undefined, { tenant: false }), {}),
  }
}
