import { Banknote, Download, FileDown, FileText, Lock, LockOpen, QrCode, RotateCcw, Search, TriangleAlert, X } from "lucide-react"
import { useMemo, useState } from "react"

import CategoryScroller from "@/components/CategoryScroller"
import MetricCard from "@/components/MetricCard"
import PageHeader from "@/components/PageHeader"
import CashDialog from "@/components/sales/CashDialog"
import NoteDialog from "@/components/sales/NoteDialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Toast, type ToastTone } from "@/components/ui/toast"
import { shiftTotals } from "@/caixa/caixa"
import { useCash } from "@/caixa/useCash"
import { downloadCsv } from "@/lib/download"
import { formatBRL, formatDateTime, normalizeText, saleLabel } from "@/lib/format"
import { PAYMENT_LABELS, type Sale } from "@/inventory/types"
import { useInventory } from "@/inventory/useInventory"
import { useStores } from "@/store/useStores"

const FILTERS = ["Todas", "Pagas", "Pendentes", "Canceladas"] as const
type Filter = (typeof FILTERS)[number]

const STATUS_OF: Record<Exclude<Filter, "Todas">, Sale["status"]> = { Pagas: "concluida", Pendentes: "pendente", Canceladas: "cancelada" }

const pill = "inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em]"

const timeFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
const hourFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" })

function StatusPill({ sale }: { sale: Sale }) {
  if (sale.status === "concluida")
    return <span className={`${pill} border border-[var(--color-green-100)] bg-[var(--color-stock-green-soft)] text-[var(--color-amber-dark)]`}>Pago</span>
  if (sale.status === "pendente") return <span className={`${pill} border border-[#fde68a] bg-[var(--color-warn-soft)] text-[var(--color-warn)]`}>Pendente</span>
  return <span className={`${pill} bg-[var(--color-ink)] text-white`}>Cancelado</span>
}

type SaleActionsProps = { sale: Sale; canManage: boolean; onNote: () => void; onCancel: () => void }

function SaleActions({ sale, canManage, onNote, onCancel }: SaleActionsProps) {
  const done = sale.status === "concluida"
  const hasNote = done && sale.nfce !== false
  return (
    <span className="inline-flex gap-0.5">
      <button
        type="button"
        aria-label={`Ver nota simulada da venda ${saleLabel(sale)}`}
        title={hasNote ? "Ver nota (simulada)" : "Esta venda não gerou NFC-e"}
        disabled={!hasNote}
        onClick={onNote}
        className="rounded-lg p-2 text-[var(--color-slate)] transition hover:bg-[var(--color-paper-dim)] hover:text-[var(--color-ink)] disabled:opacity-40"
      >
        <FileDown className="h-[18px] w-[18px]" />
      </button>
      <button
        type="button"
        aria-label={`Cancelar venda ${saleLabel(sale)}`}
        title={canManage ? "Cancelar venda" : "Só Owner e Gestor cancelam vendas"}
        disabled={!done || !canManage}
        onClick={onCancel}
        className="rounded-lg p-2 text-[var(--color-alert)] transition hover:bg-[var(--color-alert-soft)] disabled:opacity-40"
      >
        <RotateCcw className="h-[18px] w-[18px]" />
      </button>
    </span>
  )
}

export default function Sales() {
  const { activeStore } = useStores()
  const { sales, cancelSale } = useInventory()
  // Cancelar venda é ação de Owner e Gestor. Abrir e fechar o caixa vale para qualquer cargo (API #54).
  const canManage = activeStore.role !== "Colaborador"

  const cashState = useCash()
  const [filter, setFilter] = useState<Filter>("Todas")
  const [query, setQuery] = useState("")
  const [noteOf, setNoteOf] = useState<Sale | null>(null)
  const [canceling, setCanceling] = useState<Sale | null>(null)
  const [cancelError, setCancelError] = useState("")
  const [cashDialog, setCashDialog] = useState<"open" | "close" | null>(null)
  const [toast, setToast] = useState<{ title: string; message?: string; tone: ToastTone } | null>(null)

  const shift = cashState.shift
  const totals = useMemo(() => (shift ? shiftTotals(sales, shift) : null), [sales, shift])
  const canceledCount = sales.filter((sale) => sale.status === "cancelada" && (!shift || sale.createdAt >= shift.openedAt)).length
  const simulated = sales.filter((sale) => sale.status === "concluida" && sale.nfce !== false).length

  // Vendas que batem com a busca (antes da situação): base da lista e da contagem em cada situação.
  const matching = useMemo(() => {
    const term = normalizeText(query).replace(/^#/, "")
    return [...sales]
      .sort((a, b) => b.createdAt - a.createdAt)
      .filter((sale) => !term || normalizeText(`${saleLabel(sale)} ${sale.customerName ?? ""} ${sale.items.map((item) => item.name).join(" ")}`).includes(term))
  }, [sales, query])
  const counts = useMemo(() => {
    const result: Record<string, number> = { Todas: matching.length }
    for (const item of FILTERS) if (item !== "Todas") result[item] = matching.filter((sale) => sale.status === STATUS_OF[item]).length
    return result
  }, [matching])
  const rows = useMemo(() => (filter === "Todas" ? matching : matching.filter((sale) => sale.status === STATUS_OF[filter])), [matching, filter])
  const actionsFor = (sale: Sale) => ({
    sale,
    canManage,
    onNote: () => setNoteOf(sale),
    onCancel: () => {
      setCancelError("")
      setCanceling(sale)
    },
  })

  async function openCash(openingCents: number) {
    const result = await cashState.open(openingCents)
    if (!result.ok) return setToast({ title: "Não foi possível abrir o caixa", message: result.error, tone: "error" })
    setCashDialog(null)
    setToast({ title: "Caixa aberto", tone: "success" })
  }

  async function closeCash(countedCents: number) {
    const result = await cashState.close(countedCents)
    if (!result.ok) return setToast({ title: "Não foi possível fechar o caixa", message: result.error, tone: "error" })
    setCashDialog(null)
    setToast({ title: "Caixa fechado", tone: "success" })
  }

  async function confirmCancel() {
    if (!canceling) return
    const result = await cancelSale(canceling.id)
    if (!result.ok) return setCancelError(result.error)
    setToast({ title: "Venda cancelada", message: `${saleLabel(canceling)} — os itens voltaram ao estoque.`, tone: "info" })
    setCanceling(null)
  }

  function exportCsv() {
    downloadCsv("vendas.csv", [
      ["Venda", "Data", "Operador", "Cliente", "CPF", "Itens", "Método", "Desconto", "Total", "Situação"],
      ...rows.map((sale) => [
        saleLabel(sale),
        formatDateTime(sale.createdAt),
        sale.operator ?? "",
        sale.customerName ?? "Consumidor não identificado",
        sale.cpf ?? "",
        sale.items.length,
        PAYMENT_LABELS[sale.payment],
        ((sale.discountCents ?? 0) / 100).toFixed(2).replace(".", ","),
        (sale.totalCents / 100).toFixed(2).replace(".", ","),
        sale.status === "concluida" ? "Paga" : sale.status === "pendente" ? "Pendente" : "Cancelada",
      ]),
    ])
  }

  return (
    <>
      <PageHeader
        title="Vendas"
        description={
          <p className="flex items-center gap-1.5">
            <span className={`h-2 w-2 shrink-0 rounded-full ${shift ? "bg-[var(--color-green-500)]" : "bg-[#f59e0b]"}`} />
            {shift ? (
              <span className="truncate">
                <span className="sm:hidden">Aberto às</span>
                <span className="hidden sm:inline">Caixa aberto desde</span> {hourFormatter.format(shift.openedAt)}
              </span>
            ) : (
              "Caixa fechado"
            )}
          </p>
        }
        actions={
          <>
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0} aria-label="Exportar CSV" title="Exportar as vendas da lista em CSV" className="px-3 sm:px-5">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </Button>
          {shift ? (
            <Button variant="outline" onClick={() => setCashDialog("close")} className="px-4 sm:px-5">
              <Lock className="h-4 w-4" />
              Fechar caixa
            </Button>
          ) : (
            <Button variant="accent" onClick={() => setCashDialog("open")} className="px-4 sm:px-5">
              <LockOpen className="h-4 w-4" />
              Abrir caixa
            </Button>
          )}
          </>
        }
      />

      <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4" aria-label="Resumo do turno">
        <MetricCard compact icon={Banknote} label="Faturamento" value={formatBRL(totals?.totalCents ?? 0)} badge={shift ? "Turno aberto" : "Caixa fechado"} tone={shift ? "brand" : "warning"} />
        <MetricCard compact icon={QrCode} tone="info" label="Pix recebido" value={formatBRL(totals?.byMethod.pix ?? 0)} badge="Taxa R$ 0,80 do cliente" />
        <MetricCard compact icon={FileText} tone="warning" label="NFC-e simuladas" value={`${simulated} ${simulated === 1 ? "nota" : "notas"}`} badge="Sem valor fiscal" />
        <MetricCard compact icon={RotateCcw} tone="danger" label="Cancelamentos" value={`${canceledCount} ${canceledCount === 1 ? "venda" : "vendas"}`} badge="Estornado" />
      </section>

      {!shift && (
        <p role="alert" className="mt-4 flex items-center gap-3 rounded-xl border border-[#fde68a] bg-[var(--color-warn-soft)] px-4 py-2.5 text-sm text-[var(--color-ink)]">
          <TriangleAlert className="h-4 w-4 shrink-0 text-[var(--color-warn)]" />
          <span className="min-w-0 flex-1">
            <strong className="text-[var(--color-warn)]">Caixa fechado:</strong> o PDV só registra vendas com o caixa aberto.
          </span>
          <button type="button" onClick={() => setCashDialog("open")} className="shrink-0 font-bold text-[var(--color-warn)] hover:underline">
            Abrir caixa
          </button>
        </p>
      )}

      {/* Busca e situação: no desktop numa linha; no celular a situação rola na horizontal. */}
      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 lg:w-80 lg:shrink-0">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-slate)]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar venda"
            placeholder="Buscar por código, cliente ou produto"
            className="h-11 border-[var(--color-border)] bg-white pl-10 pr-10"
          />
          {query && (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[var(--color-slate)] hover:bg-[var(--color-paper-dim)] hover:text-[var(--color-ink)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <CategoryScroller label="Situação" items={FILTERS} counts={counts} active={filter} onSelect={(item) => setFilter(item as Filter)} />
        </div>
      </div>

      <Card className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white p-0 shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
        {sales.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-[var(--color-slate)]">Nenhuma venda registrada. Registre a primeira venda no PDV para ver o histórico aqui.</p>
        ) : rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm font-semibold">Nenhuma venda encontrada com esses filtros.</p>
        ) : (
          <>
            {/* Celular: lista compacta, sem rolagem lateral. */}
            <ul className="divide-y divide-[var(--color-border)] md:hidden" aria-label="Histórico de vendas">
              {rows.map((sale) => {
                const done = sale.status === "concluida"
                return (
                  <li key={sale.id} data-row className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2">
                        <span className="font-[family-name:var(--font-mono)] text-sm font-bold">{saleLabel(sale)}</span>
                        <StatusPill sale={sale} />
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[var(--color-slate)]">
                        {timeFormatter.format(sale.createdAt)} · {PAYMENT_LABELS[sale.payment]} · {sale.items.length} {sale.items.length === 1 ? "item" : "itens"}
                      </p>
                      <p className="truncate text-xs text-[var(--color-slate)]">{sale.customerName ?? sale.operator ?? "Consumidor não identificado"}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <strong className={`pr-2 text-base font-extrabold tabular-nums ${done ? "" : "text-[var(--color-slate)] line-through"}`}>{formatBRL(sale.totalCents)}</strong>
                      <SaleActions {...actionsFor(sale)} />
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="hidden md:block">
              <Table>
                <caption className="sr-only">Histórico de vendas</caption>
                <TableHeader>
                  <TableRow className="bg-[var(--color-paper)]/60 hover:bg-[var(--color-paper)]/60">
                    <TableHead scope="col" className="pl-5">
                      Venda
                    </TableHead>
                    <TableHead scope="col" className="hidden lg:table-cell">
                      Cliente
                    </TableHead>
                    <TableHead scope="col" className="text-center">
                      Método
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Total
                    </TableHead>
                    <TableHead scope="col" className="text-center">
                      Situação
                    </TableHead>
                    <TableHead scope="col" className="pr-5 text-right">
                      <span className="sr-only">Ações</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((sale) => {
                    const done = sale.status === "concluida"
                    return (
                      <TableRow key={sale.id} data-row>
                        <TableCell className="py-2.5 pl-5">
                          <p className="font-[family-name:var(--font-mono)] font-bold">{saleLabel(sale)}</p>
                          <p className="max-w-[220px] truncate text-[13px] text-[#94a3b8]">
                            {timeFormatter.format(sale.createdAt)} · {sale.operator ?? "—"}
                            <span className="lg:hidden"> · {sale.customerName ?? "Consumidor não identificado"}</span>
                          </p>
                        </TableCell>
                        <TableCell className="hidden max-w-[220px] truncate py-2.5 lg:table-cell">{sale.customerName ?? "Consumidor não identificado"}</TableCell>
                        <TableCell className="py-2.5 text-center">
                          <span className={`${pill} bg-[var(--color-paper-dim)] text-[var(--color-slate)]`}>{PAYMENT_LABELS[sale.payment]}</span>
                        </TableCell>
                        <TableCell className="py-2.5 text-right">
                          <p className={`text-[17px] font-bold tabular-nums ${done ? "" : "text-[var(--color-slate)] line-through"}`}>{formatBRL(sale.totalCents)}</p>
                          <p className="text-xs text-[var(--color-slate)]">
                            {sale.items.length} {sale.items.length === 1 ? "item" : "itens"}
                          </p>
                        </TableCell>
                        <TableCell className="py-2.5 text-center">
                          <span className="inline-flex flex-wrap items-center justify-center gap-1">
                            <StatusPill sale={sale} />
                            {done && sale.nfce !== false && <span className={`${pill} bg-[var(--color-info-soft)] text-[var(--color-info)]`}>NFC-e</span>}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5 pr-5 text-right">
                          <SaleActions {...actionsFor(sale)} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      {noteOf && <NoteDialog sale={noteOf} onClose={() => setNoteOf(null)} />}
      {cashDialog === "open" && <CashDialog mode="open" onConfirm={openCash} onClose={() => setCashDialog(null)} />}
      {cashDialog === "close" && shift && totals && <CashDialog mode="close" shift={shift} totals={totals} onConfirm={closeCash} onClose={() => setCashDialog(null)} />}

      <Dialog
        open={canceling !== null}
        onClose={() => setCanceling(null)}
        title={canceling ? `Cancelar venda ${saleLabel(canceling)}?` : "Cancelar venda"}
        description="Os itens voltam ao estoque e a venda deixa de contar no faturamento. Essa ação não pode ser desfeita."
      >
        {canceling && (
          <div>
            {cancelError && (
              <p role="alert" className="mb-4 rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium text-[var(--color-alert-dark)]">
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

      <Toast open={toast !== null} title={toast?.title ?? ""} message={toast?.message} tone={toast?.tone ?? "success"} onClose={() => setToast(null)} />
    </>
  )
}
