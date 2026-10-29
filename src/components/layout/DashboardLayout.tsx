import { useState, type ReactNode } from "react"
import { Outlet, useLocation } from "react-router-dom"

import DashboardHeader from "@/components/layout/DashboardHeader"
import DashboardSidebar from "@/components/layout/DashboardSidebar"

export default function DashboardLayout({ children }: { children?: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  // O PDV ocupa a tela toda e tem a própria barra superior (relógio, venda em andamento).
  const fullBleed = pathname === "/pdv"

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] lg:pl-[260px]">
      <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {fullBleed ? (
        <main>{children ?? <Outlet />}</main>
      ) : (
        <>
          <DashboardHeader onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="mx-auto max-w-[1260px] px-4 py-8 sm:px-6 lg:px-10">{children ?? <Outlet />}</main>
        </>
      )}
    </div>
  )
}
