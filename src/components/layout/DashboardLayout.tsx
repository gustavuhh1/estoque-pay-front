import { Outlet, useLocation } from "react-router-dom"

import { CashProvider } from "@/caixa/CashProvider"
import DashboardHeader from "@/components/layout/DashboardHeader"
import DashboardSidebar from "@/components/layout/DashboardSidebar"
import { CONTENT_OFFSET, useSidebar } from "@/components/layout/useSidebar"

export default function DashboardLayout() {
  // Um layout só para todas as telas do painel: a sidebar não remonta ao trocar de tela e o estado é o mesmo em todas.
  const sidebar = useSidebar()
  const { pathname } = useLocation()
  // O PDV usa o mesmo topo, mas ocupa o resto da tela sem margens (a altura é a da janela menos o topo).
  const pdv = pathname === "/pdv"

  return (
    <CashProvider>
      <div className={`min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] transition-[padding] duration-200 ${CONTENT_OFFSET[sidebar.mode]}`}>
        <DashboardSidebar mode={sidebar.mode} open={sidebar.open} onClose={sidebar.closeDrawer} onToggle={sidebar.canToggle ? sidebar.toggle : undefined} />
        <DashboardHeader onOpenSidebar={sidebar.openDrawer} pdv={pdv} />
        <main className={pdv ? "" : "mx-auto max-w-[1400px] px-4 pb-10 pt-5 sm:px-6 sm:pt-6 lg:px-8"}>
          <Outlet />
        </main>
      </div>
    </CashProvider>
  )
}
