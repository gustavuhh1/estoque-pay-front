import { useState, type ReactNode } from "react"
import { Outlet } from "react-router-dom"

import DashboardHeader from "@/components/layout/DashboardHeader"
import DashboardSidebar from "@/components/layout/DashboardSidebar"

export default function DashboardLayout({ children }: { children?: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] lg:pl-[260px]">
      <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <DashboardHeader onOpenSidebar={() => setSidebarOpen(true)} />
      <main className="mx-auto max-w-[1260px] px-4 py-8 sm:px-6 lg:px-10">
        {children ?? <Outlet />}
      </main>
    </div>
  )
}
