import { Bell, Menu } from "lucide-react"

import UserMenu from "@/components/layout/UserMenu"
import StoreSwitcher from "@/components/layout/StoreSwitcher"
import { useAuth } from "@/auth/AuthContext"

type DashboardHeaderProps = {
  onOpenSidebar: () => void
}

export default function DashboardHeader({ onOpenSidebar }: DashboardHeaderProps) {
  const { isBetterAuth } = useAuth()

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-paper)]/95 backdrop-blur">
      <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="rounded-xl border border-[var(--color-border)] bg-white p-2.5 lg:hidden"
            onClick={onOpenSidebar}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <StoreSwitcher />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {!isBetterAuth && (
            <span className="hidden rounded-full border border-[var(--color-amber)]/20 bg-[var(--color-stock-green-soft)] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-stock-green)] md:inline-flex">
              Modo demonstração
            </span>
          )}
          <button
            type="button"
            aria-label="Notificações"
            className="hidden h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-slate)] transition hover:border-[var(--color-amber)]/30 hover:text-[var(--color-ink)] sm:flex"
          >
            <Bell className="h-4 w-4" />
          </button>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
