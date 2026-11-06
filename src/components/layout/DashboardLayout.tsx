import { Outlet, useLocation } from "react-router-dom"

import DashboardHeader from "@/components/layout/DashboardHeader"
import DashboardSidebar from "@/components/layout/DashboardSidebar"
import { CONTENT_OFFSET, useSidebar } from "@/components/layout/useSidebar"

export default function DashboardLayout() {
  // Um layout só para todas as telas do painel: a sidebar não remonta ao trocar de tela e o estado é o mesmo em todas.
  const sidebar = useSidebar()
  const { pathname } = useLocation()
  // O PDV ocupa a tela toda, sem o cabeçalho do painel; o botão de menu fica na barra do próprio PDV.
  const fullBleed = pathname === "/pdv"

  return (
    <div className={`min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] transition-[padding] duration-200 ${CONTENT_OFFSET[sidebar.mode]}`}>
      <DashboardSidebar mode={sidebar.mode} open={sidebar.open} onClose={sidebar.closeDrawer} onToggle={sidebar.canToggle ? sidebar.toggle : undefined} />
      {fullBleed ? (
        <main>
          <Outlet context={{ openSidebar: sidebar.openDrawer }} />
        </main>
      ) : (
        <>
          <DashboardHeader onOpenSidebar={sidebar.openDrawer} />
          <main className="mx-auto max-w-[1260px] px-4 py-8 sm:px-6 lg:px-10">
            <Outlet />
          </main>
        </>
      )}
    </div>
  )
}
