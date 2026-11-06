import { Bell, Menu, ShoppingCart } from "lucide-react"
import { Link } from "react-router-dom"

import Avatar from "@/components/Avatar"
import GlobalSearch from "@/components/layout/GlobalSearch"
import StoreSwitcher from "@/components/layout/StoreSwitcher"
import { useAuth } from "@/auth/useAuth"
import { useStores } from "@/store/useStores"

type DashboardHeaderProps = {
  onOpenSidebar: () => void
}

export default function DashboardHeader({ onOpenSidebar }: DashboardHeaderProps) {
  const { isBetterAuth, session } = useAuth()
  const { activeStore } = useStores()

  const name = session?.user.name ?? "Usuário"

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-white/95 backdrop-blur">
      <div className="flex h-[84px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            className="rounded-xl border border-[var(--color-border)] bg-white p-2.5 lg:hidden"
            onClick={onOpenSidebar}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="shrink-0">
            <StoreSwitcher />
          </div>
          <GlobalSearch />
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {!isBetterAuth && (
            <span className="hidden rounded-full border border-[var(--color-amber)]/20 bg-[var(--color-stock-green-soft)] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-stock-green)] xl:inline-flex">
              Modo demonstração
            </span>
          )}
          <Link
            to="/pdv"
            className="hidden h-11 items-center gap-2 rounded-xl bg-[var(--color-amber)] px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(0,108,73,0.25)] transition hover:bg-[var(--color-amber-dark)] sm:inline-flex"
          >
            <ShoppingCart className="h-4 w-4" />
            Nova Venda
          </Link>
          <button
            type="button"
            aria-label="Notificações"
            className="relative hidden h-10 w-10 items-center justify-center rounded-xl text-[var(--color-slate)] transition hover:bg-[var(--color-nav)] sm:flex"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-[var(--color-alert)]" />
          </button>
          <Link to="/perfil" aria-label="Meu perfil" className="flex items-center gap-3 rounded-xl border-l border-[var(--color-border)] pl-4 transition hover:opacity-80">
            <div className="hidden text-right sm:block">
              <p className="max-w-[160px] truncate text-sm font-bold">{name}</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-slate)]">{activeStore.role}</p>
            </div>
            <Avatar name={name} src={session?.user.image} size={44} />
          </Link>
        </div>
      </div>
    </header>
  )
}
