import { useState, type ReactNode } from "react"
import { Outlet, useLocation } from "react-router-dom"

import DashboardHeader from "@/components/layout/DashboardHeader"
import DashboardSidebar from "@/components/layout/DashboardSidebar"

export default function DashboardLayout({ children }: { children?: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  // O PDV ocupa a tela toda, sem o cabeçalho do painel; o botão de menu fica na barra do próprio PDV.
  const fullBleed = pathname === "/pdv"

  return (
    <div className={`min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] ${fullBleed ? "lg:pl-[84px]" : "lg:pl-[260px]"}`}>
      <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} compact={fullBleed} />
      {fullBleed ? (
        <main>{children ?? <Outlet context={{ openSidebar: () => setSidebarOpen(true) }} />}</main>
      ) : (
        <>
          <DashboardHeader onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="mx-auto max-w-[1260px] px-4 py-8 sm:px-6 lg:px-10">{children ?? <Outlet />}</main>
        </>
      )}
    </div>
  )
}
