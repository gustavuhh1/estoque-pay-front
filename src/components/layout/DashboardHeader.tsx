import { Bell, Menu, ShoppingCart } from "lucide-react"
import { Link } from "react-router-dom"

import CashStatus from "@/components/layout/CashStatus"
import GlobalSearch from "@/components/layout/GlobalSearch"
import StoreSwitcher from "@/components/layout/StoreSwitcher"
import { useAuth } from "@/auth/useAuth"

type DashboardHeaderProps = {
  onOpenSidebar: () => void
  /**
   * No PDV a busca global e o "Nova Venda" saem: o PDV tem a própria busca, e o leitor global
   * mandaria para o Estoque um código bipado durante a cobrança.
   */
  pdv?: boolean
}

/** Topo de todas as telas do painel (64 px, mesma altura da área do logo na sidebar). */
export default function DashboardHeader({ onOpenSidebar, pdv = false }: DashboardHeaderProps) {
  const { isBetterAuth } = useAuth()

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-white/95 backdrop-blur">
      {/* 63 px + 1 px de borda = 64 px, a mesma altura da área do logo na sidebar. */}
      <div className="flex h-[63px] items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white md:hidden"
            onClick={onOpenSidebar}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          {/* No celular o seletor de loja encolhe (nome truncado) para o resto caber. */}
          <div className="min-w-0 sm:shrink-0">
            <StoreSwitcher />
          </div>
          {!pdv && <GlobalSearch />}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {!isBetterAuth && (
            <span className="hidden rounded-full border border-[var(--color-amber)]/20 bg-[var(--color-stock-green-soft)] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-stock-green)] xl:inline-flex">
              Modo demonstração
            </span>
          )}
          {!pdv && (
            <Link
              to="/pdv"
              aria-label="Nova Venda"
              title="Nova Venda"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-amber)] px-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(0,108,73,0.25)] transition hover:bg-[var(--color-amber-dark)] xl:px-5"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden xl:inline">Nova Venda</span>
            </Link>
          )}
          <button
            type="button"
            aria-label="Notificações"
            className="relative hidden h-10 w-10 items-center justify-center rounded-xl text-[var(--color-slate)] transition hover:bg-[var(--color-nav)] sm:flex"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-[var(--color-alert)]" />
          </button>
          {/* Nome, cargo e foto já estão na sidebar; aqui fica a situação do caixa. */}
          <div className="border-[var(--color-border)] sm:border-l sm:pl-4">
            <CashStatus />
          </div>
        </div>
      </div>
    </header>
  )
}
