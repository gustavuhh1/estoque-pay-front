import { useCallback, useEffect, useState, useSyncExternalStore } from "react"

const STORAGE_KEY = "estoquepay.sidebar.recolhida"
const TABLET = "(min-width: 768px)"
const DESKTOP = "(min-width: 1024px)"

/**
 * Como a sidebar aparece:
 * - `drawer`: celular (abaixo de md), menu por cima aberto pelo botão ☰;
 * - `rail`: só ícones (84 px), fixo no tablet e no desktop quando recolhida;
 * - `full`: completa (260 px), desktop expandido.
 */
export type SidebarMode = "drawer" | "rail" | "full"

/** Largura da sidebar em cada modo e o afastamento do conteúdo correspondente (no celular ela fica por cima). */
export const SIDEBAR_WIDTH: Record<SidebarMode, string> = { drawer: "w-[260px]", rail: "w-[84px]", full: "w-[260px]" }
export const CONTENT_OFFSET: Record<SidebarMode, string> = { drawer: "", rail: "pl-[84px]", full: "pl-[260px]" }

function useMedia(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query)
      media.addEventListener("change", onChange)
      return () => media.removeEventListener("change", onChange)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

/** Estado único da sidebar para todas as telas do painel; a escolha de recolher fica salva neste navegador. */
export function useSidebar() {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [open, setOpen] = useState(false)
  const tablet = useMedia(TABLET)
  const desktop = useMedia(DESKTOP)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0")
    } catch {
      // Sem armazenamento (aba anônima bloqueada etc.): vale só para esta visita.
    }
  }, [collapsed])

  // Ao passar do celular para uma tela maior, o menu por cima não fica aberto por trás.
  if (tablet && open) setOpen(false)

  const mode: SidebarMode = !tablet ? "drawer" : !desktop || collapsed ? "rail" : "full"
  return {
    mode,
    collapsed,
    /** O botão de recolher/expandir só existe no desktop: no tablet a sidebar é sempre de ícones. */
    canToggle: desktop,
    toggle: useCallback(() => setCollapsed((value) => !value), []),
    open,
    openDrawer: useCallback(() => setOpen(true), []),
    closeDrawer: useCallback(() => setOpen(false), []),
  }
}
