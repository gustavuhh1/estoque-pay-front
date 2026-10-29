import { Ban, CircleDollarSign, Plus, Receipt, Search, ShoppingCart, Trash2 } from "lucide-react"
import { useCallback, useMemo, useState } from "react"

import Field from "@/components/Field"
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
import { formatBRL, formatDateTime, formatSaleNumber, isSameDay, normalizeText, parseWholeNumber } from "@/lib/format"
import { PAYMENT_LABELS, type PaymentMethod, type Sale } from "@/inventory/types"
import { useInventory } from "@/inventory/useInventory"

type CartLine = { productId: string; quantity: number }

function NewSaleForm({ onDone, onCancel }: { onDone: (sale: Sale) => void; onCancel: () => void }) {
  const { products, registerSale } = useInventory()
  const available = useMemo(() => products.filter((product) => product.active && product.stock > 0), [products])
  const [productId, setProductId] = useState(available[0]?.id ?? "")
  const [quantity, setQuantity] = useState("1")
  const [cart, setCart] = useState<CartLine[]>([])
  const [payment, setPayment] = useState<PaymentMethod>("pix")
  const [error, setError] = useState("")

  const byId = (id: string) => products.find((product) => product.id === id)
  const total = cart.reduce((sum, line) => sum + (byId(line.productId)?.priceCents ?? 0) * line.quantity, 0)

  function addToCart() {
    const product = byId(productId)
    const qty = parseWholeNumber(quantity)
    if (!product) return setError("Selecione um produto.")
    if (qty === null || qty <= 0) return setError("Informe uma quantidade inteira maior que zero.")
    const inCart = cart.find((line) => line.productId === productId)?.quantity ?? 0
    if (inCart + qty > product.stock) return setError(`Quantidade acima do estoque de "${product.name}" (disponível: ${product.stock}).`)
    setError("")
    setCart((current) =>
      current.some((line) => line.productId === productId)
        ? current.map((line) => (line.productId === productId ? { ...line, quantity: line.quantity + qty } : line))
        : [...current, { productId, quantity: qty }],
    )
    setQuantity("1")
  }

  function finish() {
    const result = registerSale({ items: cart, payment })
    if (!result.ok) return setError(result.error)
    onDone(result.value)
  }

  if (available.length === 0 && cart.length === 0) {
    return (
      <div>
        <p className="rounded-xl bg-[var(--color-paper)] px-4 py-5 text-sm text-[var(--color-slate)]">
          Nenhum produto ativo com estoque disponível. Cadastre produtos ou registre uma entrada de estoque para vender.
        </p>
        <div className="mt-5 flex justify-end">
          <Button variant="outline" onClick={onCancel}>
            Fechar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_110px_auto] sm:items-end">
        <Field id="sale-product" label="Produto">
          <Select
            id="sale-product"
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value)
              setError("")
            }}
          >
            {available.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} — {formatBRL(product.priceCents)} ({product.stock} em estoque)
              </option>
            ))}
          </Select>
        </Field>
        <Field id="sale-quantity" label="Qtd.">
          <Input
            id="sale-quantity"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value)
              setError("")
            }}
            inputMode="numeric"
          />
        </Field>
        <Button type="button" variant="outline" onClick={addToCart} disabled={available.length === 0}>
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
        {cart.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-[var(--color-slate)]">Nenhum item adicionado à venda.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]" aria-label="Itens da venda">
            {cart.map((line) => {
              const product = byId(line.productId)
              return (
                <li key={line.productId} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{product?.name}</p>
                    <p className="text-[11px] text-[var(--color-slate)]">
                      {line.quantity} × {formatBRL(product?.priceCents ?? 0)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{formatBRL((product?.priceCents ?? 0) * line.quantity)}</span>
                  <button
                    type="button"
                    aria-label={`Remover ${product?.name} da venda`}
                    onClick={() => setCart((current) => current.filter((item) => item.productId !== line.productId))}
                    className="rounded-lg p-2 text-[var(--color-slate)] transition hover:bg-[var(--color-alert-soft)] hover:text-[var(--color-alert-dark)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
        <Field id="sale-payment" label="Forma de pagamento">
          <Select id="sale-payment" value={payment} onChange={(e) => setPayment(e.target.value as PaymentMethod)}>
            {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((method) => (
              <option key={method} value={method}>
                {PAYMENT_LABELS[method]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="rounded-xl bg-[var(--color-ink)] px-4 py-3 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Total</p>
          <p className="font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums" aria-live="polite">
            {formatBRL(total)}
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium text-[var(--color-alert-dark)]">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" variant="accent" onClick={finish} disabled={cart.length === 0}>
          Finalizar venda
        </Button>
      </div>
    </div>
  )
}

export default function Sales() {
  const { sales, products, cancelSale } = useInventory()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("todas")
  const [creating, setCreating] = useState(false)
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
          <Button variant="accent" onClick={() => setCreating(true)} disabled={products.length === 0}>
            <Plus className="h-4 w-4" />
            Nova venda
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
                : "Registre a primeira venda para ver o histórico aqui."}
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
                    <p className="text-[11px] text-[var(--color-slate)]">{sale.items.reduce((sum, item) => sum + item.quantity, 0)} un.</p>
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
        open={creating}
        onClose={() => setCreating(false)}
        title="Nova venda"
        description="Adicione os produtos, escolha o pagamento e finalize."
      >
        {creating && (
          <NewSaleForm
            onCancel={() => setCreating(false)}
            onDone={(sale) => {
              setCreating(false)
              setToast({
                title: "Venda registrada",
                message: `${formatSaleNumber(sale.number)} — ${formatBRL(sale.totalCents)}`,
                tone: "success",
              })
            }}
          />
        )}
      </Dialog>

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
