import { Pencil, Search, ShoppingBag, Ticket, UserPlus } from "lucide-react"
import { useMemo, useState } from "react"

import Avatar from "@/components/Avatar"
import CouponDialog from "@/components/customers/CouponDialog"
import CustomerDialog, { type CustomerData } from "@/components/customers/CustomerDialog"
import PageHeader from "@/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Toast, type ToastTone } from "@/components/ui/toast"
import { isActive, newCouponCode, readCoupons, writeCoupons, type Coupon } from "@/customers/coupons"
import { readCustomers, writeCustomers, type Customer } from "@/customers/customers"
import { customerStats, walkInStats } from "@/customers/metrics"
import { digitsOf, formatBRL, formatBirthDate, formatDateTime, formatSaleNumber, normalizeText } from "@/lib/format"
import { useInventory } from "@/inventory/useInventory"
import { useStores } from "@/store/useStores"

const WALK_IN = "walk-in"
const label = "text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-slate)]"
const mono = "font-[family-name:var(--font-mono)]"

export default function Customers() {
  const { activeStoreId } = useStores()
  return <CustomerManager key={activeStoreId} storeId={activeStoreId} />
}

function Badge({ active, children }: { active: boolean; children: string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${
        active ? "border border-[var(--color-green-100)] bg-[var(--color-stock-green-soft)] text-[var(--color-amber-dark)]" : "bg-[var(--color-paper-dim)] text-[var(--color-slate)]"
      }`}
    >
      {children}
    </span>
  )
}

function CustomerManager({ storeId }: { storeId: string }) {
  const { sales } = useInventory()
  const [customers, setCustomers] = useState(() => readCustomers(storeId))
  const [coupons, setCoupons] = useState(() => readCoupons(storeId))
  const [selectedId, setSelectedId] = useState<string>(() => readCustomers(storeId)[0]?.id ?? WALK_IN)
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<Customer | "new" | null>(null)
  const [issuing, setIssuing] = useState(false)
  const [deleting, setDeleting] = useState<Customer | null>(null)
  const [toast, setToast] = useState<{ title: string; tone: ToastTone } | null>(null)

  const sorted = useMemo(() => [...customers].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), [customers])
  const visible = useMemo(() => {
    const term = normalizeText(query)
    const digits = digitsOf(query)
    return sorted.filter((customer) => !term || normalizeText(customer.name).includes(term) || (digits.length > 0 && digitsOf(customer.cpf).includes(digits)))
  }, [sorted, query])

  const walkIn = useMemo(() => walkInStats(sales), [sales])
  const statsById = useMemo(() => new Map(customers.map((customer) => [customer.id, customerStats(customer, sales)])), [customers, sales])
  const activeCoupons = (customerId: string) => coupons.filter((coupon) => coupon.customerId === customerId && isActive(coupon))

  const selected = customers.find((customer) => customer.id === selectedId) ?? null
  const isWalkIn = selectedId === WALK_IN || !selected
  const stats = selected ? statsById.get(selected.id)! : walkIn

  function save(data: CustomerData) {
    const isNew = editing === "new"
    const target = isNew ? null : (editing as Customer)
    const next = isNew
      ? [...customers, { ...data, id: `cus-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, createdAt: Date.now() }]
      : customers.map((customer) => (customer.id === target?.id ? { ...customer, ...data } : customer))
    if (!writeCustomers(storeId, next)) return false
    setCustomers(next)
    if (isNew) setSelectedId(next[next.length - 1].id)
    setToast({ title: isNew ? "Cliente cadastrado." : "Dados do cliente atualizados.", tone: "success" })
    setEditing(null)
    return true
  }

  function remove() {
    if (!deleting) return
    const next = customers.filter((customer) => customer.id !== deleting.id)
    if (!writeCustomers(storeId, next)) return setToast({ title: "Não foi possível remover o cliente.", tone: "error" })
    setCustomers(next)
    if (selectedId === deleting.id) setSelectedId(next[0]?.id ?? WALK_IN)
    setDeleting(null)
    setEditing(null)
    setToast({ title: "Cliente removido. O histórico de vendas foi mantido.", tone: "info" })
  }

  function issue(customerId: string, percent: number) {
    const coupon: Coupon = { id: `cup-${Date.now().toString(36)}`, code: newCouponCode(coupons), customerId, percent, createdAt: Date.now() }
    const next = [...coupons, coupon]
    if (!writeCoupons(storeId, next)) return null
    setCoupons(next)
    return coupon
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Cadastro, histórico de compras e programa de fidelidade."
        actions={
          <>
            <Button variant="outline" onClick={() => setIssuing(true)}>
              <Ticket className="h-4 w-4" />
              Emitir cupom
            </Button>
            <Button variant="accent" onClick={() => setEditing("new")}>
              <UserPlus className="h-4 w-4" />
              Novo cliente
            </Button>
          </>
        }
      />

      <div className="mt-8 grid items-start gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-slate)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Buscar cliente por nome ou CPF"
              placeholder="Buscar por nome ou CPF..."
              className="h-12 w-full rounded-xl bg-[var(--color-nav)] pl-11 pr-4 text-sm font-medium outline-none placeholder:text-[var(--color-slate)] focus-visible:ring-2 focus-visible:ring-[var(--color-green-500)]/35"
            />
          </div>
          <Table>
            <caption className="sr-only">Clientes da loja</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Cliente</TableHead>
                <TableHead scope="col" className="text-center">
                  Compras
                </TableHead>
                <TableHead scope="col" className="whitespace-nowrap text-right">
                  Ticket médio
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Cupons
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((customer) => {
                const row = statsById.get(customer.id)!
                const count = activeCoupons(customer.id).length
                return (
                  <TableRow
                    key={customer.id}
                    onClick={() => setSelectedId(customer.id)}
                    className={`h-[72px] cursor-pointer ${selectedId === customer.id ? "bg-[var(--color-nav)]" : ""}`}
                    aria-selected={selectedId === customer.id}
                  >
                    <TableCell>
                      <button type="button" onClick={() => setSelectedId(customer.id)} className="flex min-w-0 items-center gap-3 text-left">
                        <Avatar name={customer.name} />
                        <span className="flex min-w-0 flex-col">
                          <strong className="truncate text-[15px]">{customer.name}</strong>
                          <span className={`truncate text-xs text-[#94a3b8] ${mono}`}>{customer.cpf}</span>
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="text-center font-medium tabular-nums">{row.count}</TableCell>
                    <TableCell className="text-right font-bold tabular-nums">{formatBRL(row.ticketCents)}</TableCell>
                    <TableCell className="text-right">
                      <Badge active={count > 0}>{`${count} ${count === 1 ? "ativo" : "ativos"}`}</Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
              {!query && (
                <TableRow onClick={() => setSelectedId(WALK_IN)} className={`h-[72px] cursor-pointer ${isWalkIn ? "bg-[var(--color-nav)]" : ""}`}>
                  <TableCell>
                    <button type="button" onClick={() => setSelectedId(WALK_IN)} className="flex min-w-0 items-center gap-3 text-left">
                      <Avatar name="Consumidor" />
                      <span className="flex min-w-0 flex-col">
                        <strong className="truncate text-[15px]">Consumidor não identificado</strong>
                        <span className={`text-xs text-[#94a3b8] ${mono}`}>—</span>
                      </span>
                    </button>
                  </TableCell>
                  <TableCell className="text-center font-medium tabular-nums">{walkIn.count}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{formatBRL(walkIn.ticketCents)}</TableCell>
                  <TableCell className="text-right">
                    <Badge active={false}>0 ativos</Badge>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {query && visible.length === 0 && <p className="px-6 py-10 text-center text-sm font-semibold">Nenhum cliente encontrado.</p>}
          {customers.length === 0 && !query && (
            <p className="px-6 pb-4 pt-6 text-center text-sm text-[var(--color-slate)]">Nenhum cliente cadastrado ainda. Toque em "Novo cliente" para começar.</p>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
            <div className="mb-5 flex items-center gap-4">
              <Avatar name={selected?.name ?? "Consumidor"} size={56} />
              <div className="flex min-w-0 flex-col gap-0.5">
                <h2 className="text-xl font-bold leading-tight">{selected?.name ?? "Consumidor não identificado"}</h2>
                <span className={`text-[13px] text-[var(--color-slate)] ${mono}`}>{selected?.cpf ?? "Vendas sem CPF"}</span>
              </div>
              {selected && (
                <button type="button" aria-label="Editar cliente" onClick={() => setEditing(selected)} className="ml-auto rounded-lg p-2 text-[var(--color-slate)] hover:bg-[var(--color-paper-dim)] hover:text-[var(--color-ink)]">
                  <Pencil className="h-[18px] w-[18px]" />
                </button>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-4">
              {(
                [
                  ["Telefone", selected?.phone || "—"],
                  ["Nascimento", formatBirthDate(selected?.birthDate) || "—"],
                  ["Produto favorito", stats.favorite ?? "—"],
                  ["Pontos de fidelidade", selected ? String(stats.points) : "—"],
                ] as const
              ).map(([term, value]) => (
                <div key={term} className="flex flex-col gap-1">
                  <dt className={label}>{term}</dt>
                  <dd className="text-[15px] font-bold">{value}</dd>
                </div>
              ))}
            </dl>
            {selected?.notes && (
              <p className="mt-4 rounded-xl bg-[var(--color-paper)] px-3.5 py-3 text-sm text-[var(--color-slate)]">
                <span className={label}>Observação</span>
                <br />
                {selected.notes}
              </p>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-stock-green-soft)] text-[var(--color-amber)]">
                  <ShoppingBag className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-[var(--color-paper-dim)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-slate)]">Histórico</span>
              </div>
              <p className={`mt-4 ${label}`}>Compras</p>
              <p className="text-3xl font-extrabold tabular-nums">{stats.count}</p>
            </Card>
            <Card className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-info-soft)] text-[var(--color-info)]">
                  <Ticket className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-[var(--color-info-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-info)]">Fidelidade</span>
              </div>
              <p className={`mt-4 ${label}`}>Cupons ativos</p>
              <p className="text-3xl font-extrabold tabular-nums">{selected ? activeCoupons(selected.id).length : 0}</p>
            </Card>
          </div>

          {selected && activeCoupons(selected.id).length > 0 && (
            <Card className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
              <p className={label}>Cupons para usar no PDV</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {activeCoupons(selected.id).map((coupon) => (
                  <li key={coupon.id} className={`rounded-lg border border-dashed border-[var(--color-green-500)] px-3 py-1.5 text-sm font-bold ${mono}`}>
                    {coupon.code} · {coupon.percent}%
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {stats.recent.length > 0 && (
            <Card className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
              <p className={label}>Últimas compras</p>
              <ul className="mt-3 divide-y divide-[var(--color-border)]">
                {stats.recent.map((sale) => (
                  <li key={sale.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0">
                      <strong className={mono}>{formatSaleNumber(sale.number)}</strong>
                      <span className="ml-2 text-[var(--color-slate)]">{formatDateTime(sale.createdAt)}</span>
                    </span>
                    <strong className="tabular-nums">{formatBRL(sale.totalCents)}</strong>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {editing !== null && (
        <CustomerDialog
          customer={editing === "new" ? null : editing}
          customers={customers}
          onSave={save}
          onDelete={editing === "new" ? undefined : () => setDeleting(editing)}
          onClose={() => setEditing(null)}
        />
      )}
      {issuing && <CouponDialog customers={sorted} initialCustomerId={selected?.id} onIssue={issue} onClose={() => setIssuing(false)} />}

      <Dialog open={deleting !== null} onClose={() => setDeleting(null)} title={deleting ? `Remover ${deleting.name}?` : "Remover cliente"} description="O cadastro e os cupons ainda não usados deixam de aparecer. As vendas já feitas são mantidas no histórico da loja.">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setDeleting(null)}>
            Manter cliente
          </Button>
          <Button onClick={remove}>Remover cliente</Button>
        </div>
      </Dialog>

      <Toast open={toast !== null} title={toast?.title ?? ""} tone={toast?.tone ?? "success"} onClose={() => setToast(null)} />
    </>
  )
}
