import { Ban, CircleDollarSign, Plus, Receipt, Search, ShoppingCart } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import PageHeader from "@/components/PageHeader"
import StatCard from "@/components/StatCard"
import { SaleBadge } from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Toast, type ToastTone } from "@/components/ui/toast"
import { formatBRL, formatDateTime, formatQuantity, formatSaleNumber, isSameDay, normalizeText } from "@/lib/format"
import { PAYMENT_LABELS, type Sale } from "@/inventory/types"
import { useInventory } from "@/inventory/useInventory"

export default function Sales() {
  const { sales, products, cancelSale } = useInventory()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("todas")
  const [canceling, setCanceling] = useState<Sale | null>(null)
  const [cancelError, setCancelError] = useState("")
  const [toast, setToast] = useState<{ title: string; message?: string; tone: ToastTone } | null>(null)
  const closeToast = useCallback(() => setToast(null), [])

  const today = useMemo(() => sales.filter((sale) => sale.status === "concluida" && isSameDay(sale.createdAt)), [sales])
  const revenue = today.reduce((sum, sale) => sum + sale.totalCents, 0)

  const filtered = useMemo(() => {
    const term = normalizeText(query).replace(/^#/, "")
    return [...sales]
      .sort((a, b) => b.createdAt - a.createdAt)
      .filter((sale) => {
        if (status === "concluidas" && sale.status !== "concluida") return false
        if (status === "canceladas" && sale.status !== "cancelada") return false
        if (!term) return true
        const haystack = normalizeText(`${formatSaleNumber(sale.number)} ${sale.items.map((item) => `${item.name} ${item.sku}`).join(" ")}`)
        return haystack.includes(term)
      })
  }, [sales, query, status])

  function confirmCancel() {
    if (!canceling) return
    const result = cancelSale(canceling.id)
    if (!result.ok) return setCancelError(result.error)
    setToast({ title: "Venda cancelada", message: `${formatSaleNumber(canceling.number)} — os itens voltaram ao estoque.`, tone: "info" })
    setCanceling(null)
  }

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Vendas"
        description="Acompanhe o faturamento e o histórico de vendas. Cancele uma venda quando necessário."
        actions={
          <Button asChild variant="accent">
            <Link to="/pdv">
              <Plus className="h-4 w-4" />
              Nova venda
            </Link>
          </Button>
        }
      />

      <section className="mt-7 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Vendas hoje"
          value={String(today.length)}
          meta={today.length ? "Concluídas hoje" : "Nenhuma venda hoje"}
          icon={ShoppingCart}
        />
        <StatCard label="Faturamento hoje" value={formatBRL(revenue)} meta="Somente vendas concluídas" icon={CircleDollarSign} />
        <StatCard
          label="Ticket médio hoje"
          value={formatBRL(today.length ? Math.round(revenue / today.length) : 0)}
          meta={today.length ? "Faturamento ÷ vendas" : "Sem vendas para calcular"}
          icon={Receipt}
        />
      </section>

      <Card className="mt-6 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
        <div className="grid gap-3 border-b border-[var(--color-border)] p-4 sm:grid-cols-[1fr_200px] sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-slate)]" />
            <Input
              aria-label="Buscar venda"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por número ou produto"
              className="pl-9"
            />
          </div>
          <Select aria-label="Filtrar por status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="todas">Todos os status</option>
            <option value="concluidas">Concluídas</option>
            <option value="canceladas">Canceladas</option>
          </Select>
        </div>

        {sales.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Receipt className="mx-auto h-9 w-9 text-[var(--color-slate)]" />
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-semibold">Nenhuma venda registrada</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-slate)]">
              {products.length === 0
                ? "Cadastre produtos antes de registrar a primeira venda."
                : "Registre a primeira venda no PDV para ver o histórico aqui."}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm font-semibold">Nenhuma venda encontrada com esses filtros.</p>
        ) : (
          <Table>
            <caption className="sr-only">Histórico de vendas</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Venda</TableHead>
                <TableHead scope="col">Data</TableHead>
                <TableHead scope="col">Itens</TableHead>
                <TableHead scope="col">Pagamento</TableHead>
                <TableHead scope="col" className="text-right">
                  Total
                </TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col" className="text-right">
                  Ação
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-mono text-xs font-semibold">{formatSaleNumber(sale.number)}</TableCell>
                  <TableCell className="whitespace-nowrap text-[var(--color-slate)]">{formatDateTime(sale.createdAt)}</TableCell>
                  <TableCell>
                    <p
                      className="max-w-[260px] truncate font-semibold"
                      title={sale.items.map((item) => `${item.quantity}× ${item.name}`).join(", ")}
                    >
                      {sale.items[0].name}
                      {sale.items.length > 1 ? ` +${sale.items.length - 1}` : ""}
                    </p>
                    <p className="text-[11px] text-[var(--color-slate)]">
                      {sale.items.map((item) => `${formatQuantity(item.quantity)} ${(item.unit ?? "UN").toLowerCase()}`).join(" · ")}
                    </p>
                  </TableCell>
                  <TableCell>{PAYMENT_LABELS[sale.payment]}</TableCell>
                  <TableCell
                    className={`text-right font-semibold tabular-nums ${sale.status === "cancelada" ? "text-[var(--color-slate)] line-through" : ""}`}
                  >
                    {formatBRL(sale.totalCents)}
                  </TableCell>
                  <TableCell>
                    <SaleBadge status={sale.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {sale.status === "concluida" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCancelError("")
                          setCanceling(sale)
                        }}
                        aria-label={`Cancelar venda ${formatSaleNumber(sale.number)}`}
                      >
                        <Ban className="h-3.5 w-3.5" />
                        Cancelar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog
        open={canceling !== null}
        onClose={() => setCanceling(null)}
        title={canceling ? `Cancelar venda ${formatSaleNumber(canceling.number)}?` : "Cancelar venda"}
        description="Os itens voltam ao estoque e a venda deixa de contar no faturamento. Essa ação não pode ser desfeita."
      >
        {canceling && (
          <div>
            {cancelError && (
              <p
                role="alert"
                className="mb-4 rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium text-[var(--color-alert-dark)]"
              >
                {cancelError}
              </p>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setCanceling(null)}>
                Manter venda
              </Button>
              <Button variant="default" onClick={confirmCancel}>
                Cancelar venda
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <Toast
        open={toast !== null}
        title={toast?.title ?? ""}
        message={toast?.message}
        tone={toast?.tone ?? "success"}
        onClose={closeToast}
      />
    </>
  )
}
