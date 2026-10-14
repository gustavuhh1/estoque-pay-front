import { useCallback, useState } from "react"
import { Outlet } from "react-router-dom"

import DashboardHeader from "@/components/layout/DashboardHeader"
import DashboardSidebar from "@/components/layout/DashboardSidebar"

/** Moldura das telas autenticadas: sidebar + header fixos e o conteúdo da rota em <Outlet />. */
export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] lg:pl-[250px]">
      <DashboardSidebar open={sidebarOpen} onClose={closeSidebar} />
      <DashboardHeader onOpenSidebar={() => setSidebarOpen(true)} />
      <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        <Outlet />
      </main>
    </div>
  )
}
