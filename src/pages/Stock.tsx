import { ArrowDownToLine, CircleAlert, List, Package, Pencil, Plus, ScanBarcode, Search, Trash2, TriangleAlert, X } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"

import AlertBanner from "@/components/AlertBanner"
import CategoryScroller from "@/components/CategoryScroller"
import PageHeader from "@/components/PageHeader"
import CategoriesDialog from "@/components/stock/CategoriesDialog"
import MovementDialog from "@/components/stock/MovementDialog"
import ProductDialog from "@/components/stock/ProductDialog"
import { MovementBadge } from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Toast, type ToastTone } from "@/components/ui/toast"
import { formatBRL, formatDateTime, formatQuantity, normalizeText } from "@/lib/format"
import { missingFiscal, stockStatus } from "@/inventory/logic"
import type { Product } from "@/inventory/types"
import { useInventory } from "@/inventory/useInventory"
import { usePlan } from "@/billing/plan"
import { beep } from "@/scanner/beep"
import { useBarcodeScanner } from "@/scanner/useBarcodeScanner"

const MOVEMENT_HISTORY_LIMIT = 15

function StatusPill({ product }: { product: Product }) {
  const base = "inline-flex items-center whitespace-nowrap rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em]"
  if (!product.active) return <span className={`${base} bg-[var(--color-paper-dim)] text-[var(--color-slate)]`}>Inativo</span>
  const status = stockStatus(product)
  if (status === "zerado") return <span className={`${base} bg-[var(--color-ink)] text-white`}>Crítico / Esgotado</span>
  if (status === "baixo")
    return <span className={`${base} border border-[#fde68a] bg-[var(--color-warn-soft)] text-[var(--color-warn)]`}>Atenção / Baixo</span>
  return <span className={`${base} border border-[var(--color-green-100)] bg-[var(--color-stock-green-soft)] text-[var(--color-amber-dark)]`}>Conforme</span>
}

const quantityTone = (product: Product) => {
  const status = stockStatus(product)
  return status === "zerado" ? "text-[var(--color-alert)]" : status === "baixo" ? "text-[var(--color-warn)]" : "text-[var(--color-amber)]"
}

/** Foto do produto, ou um ícone quando ele não tem foto. */
function ProductThumb({ product }: { product: Product }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-paper-dim)] text-[var(--color-slate)]">
      {product.image ? <img src={product.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package className="h-5 w-5" />}
    </span>
  )
}

type RowActionsProps = { product: Product; onMove: () => void; onEdit: () => void; onRemove: () => void }

function RowActions({ product, onMove, onEdit, onRemove }: RowActionsProps) {
  const neutral = "rounded-lg p-2 text-[var(--color-slate)] transition hover:bg-[var(--color-paper-dim)] hover:text-[var(--color-ink)] disabled:opacity-40"
  return (
    <span className="inline-flex gap-0.5">
      <button type="button" aria-label={`Registrar movimentação de ${product.name}`} title="Entrada" disabled={!product.active} onClick={onMove} className={neutral}>
        <ArrowDownToLine className="h-[18px] w-[18px]" />
      </button>
      <button type="button" aria-label={`Editar ${product.name}`} title="Editar" onClick={onEdit} className={neutral}>
        <Pencil className="h-[18px] w-[18px]" />
      </button>
      <button
        type="button"
        aria-label={`Excluir ${product.name}`}
        title="Excluir"
        disabled={!product.active}
        onClick={onRemove}
        className="rounded-lg p-2 text-[var(--color-alert)] transition hover:bg-[var(--color-alert-soft)] disabled:opacity-40"
      >
        <Trash2 className="h-[18px] w-[18px]" />
      </button>
    </span>
  )
}

export default function Stock() {
  const { products, movements, categories, setProductActive, isLoading, error, reload } = useInventory()
  const { nfceOn: nfceEnabled } = usePlan()

  const [category, setCategory] = useState("Todos")
  const [query, setQuery] = useState("")
  // A busca global do cabeçalho chega como ?busca=; cada nova busca substitui o filtro atual.
  const [params] = useSearchParams()
  const fromHeader = params.get("busca")
  const [lastFromHeader, setLastFromHeader] = useState<string | null>(null)
  if (fromHeader !== lastFromHeader) {
    setLastFromHeader(fromHeader)
    if (fromHeader) {
      setQuery(fromHeader)
      setCategory("Todos")
    }
  }
  const [onlyCritical, setOnlyCritical] = useState(false)
  const [editing, setEditing] = useState<Product | "new" | null>(null)
  const [moving, setMoving] = useState<{ productId: string } | null>(null)
  const [managingCategories, setManagingCategories] = useState(false)
  const [removing, setRemoving] = useState<Product | null>(null)
  const [toast, setToast] = useState<{ title: string; message?: string; tone: ToastTone } | null>(null)
  const closeToast = useCallback(() => setToast(null), [])

  // Leitor de código de barras: bipar filtra a lista pelo código; código sem produto oferece o cadastro com ele.
  // Os diálogos de produto e de movimentação têm o próprio tratamento (prioridade maior).
  const [newEan, setNewEan] = useState("")
  const [unknownCode, setUnknownCode] = useState<string | null>(null)
  useBarcodeScanner(
    (code) => {
      const found = products.some((product) => product.ean === code || product.sku.toLowerCase() === code.toLowerCase())
      beep(found ? "ok" : "erro")
      setQuery(code)
      setCategory("Todos")
      setOnlyCritical(false)
      setUnknownCode(found ? null : code)
    },
    { enabled: !managingCategories && removing === null },
  )
  function registerUnknown() {
    setNewEan(unknownCode ?? "")
    setUnknownCode(null)
    setEditing("new")
  }

  const chips = useMemo(() => {
    const used = products.map((product) => product.category).filter((name) => !categories.includes(name))
    return ["Todos", ...categories, ...new Set(used)]
  }, [categories, products])

  const critical = useMemo(() => products.filter((product) => product.active && stockStatus(product) !== "normal"), [products])
  const fiscalLocked = useMemo(
    () => (nfceEnabled ? products.filter((product) => !product.active && missingFiscal(product)) : []),
    [products, nfceEnabled],
  )

  // Produtos que passam pela busca e pelo "para repor" (antes da categoria): base da lista e da contagem em cada categoria.
  const matching = useMemo(() => {
    const term = normalizeText(query)
    return products
      .filter((product) => {
        if (onlyCritical && !(product.active && stockStatus(product) !== "normal")) return false
        return !term || normalizeText(`${product.name} ${product.sku} ${product.ean}`).includes(term)
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
  }, [products, onlyCritical, query])
  const counts = useMemo(() => {
    const result: Record<string, number> = { Todos: matching.length }
    for (const product of matching) result[product.category] = (result[product.category] ?? 0) + 1
    return result
  }, [matching])
  const rows = useMemo(() => (category === "Todos" ? matching : matching.filter((product) => product.category === category)), [matching, category])
  const actionsFor = (product: Product) => ({
    product,
    onMove: () => setMoving({ productId: product.id }),
    onEdit: () => setEditing(product),
    onRemove: () => setRemoving(product),
  })

  async function confirmRemove() {
    if (!removing) return
    const result = await setProductActive(removing.id, false)
    setToast(
      result.ok
        ? { title: "Produto excluído", message: `${removing.name} foi inativado e mantido no histórico.`, tone: "info" }
        : { title: "Não foi possível excluir", message: result.error, tone: "error" },
    )
    setRemoving(null)
  }

  return (
    <>
      <PageHeader
        title="Estoque"
        description={!isLoading && products.length > 0 ? `${products.length} ${products.length === 1 ? "produto" : "produtos"} na loja ativa` : undefined}
        actions={
          <>
          <Button variant="outline" onClick={() => setManagingCategories(true)} aria-label="Gerenciar categorias" title="Gerenciar categorias" className="px-3 sm:px-5">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Categorias</span>
          </Button>
          <Button variant="accent" onClick={() => setEditing("new")} className="px-4 sm:px-5">
            <Plus className="h-4 w-4" />
            <span className="sm:hidden">Novo</span>
            <span className="hidden sm:inline">Adicionar produto</span>
          </Button>
          </>
        }
      />

      {error && (
        <div className="mt-5">
          <AlertBanner title="Não foi possível carregar o estoque" description={error} actionLabel="Tentar de novo" onAction={() => void reload()} />
        </div>
      )}
      {isLoading && <p className="mt-5 text-sm text-[var(--color-slate)]">Carregando estoque... A primeira abertura pode levar até 1 minuto se o servidor estava parado.</p>}

      {fiscalLocked.length > 0 && (
        <p role="alert" className="mt-4 flex items-center gap-3 rounded-xl border border-[#fde68a] bg-[var(--color-warn-soft)] px-4 py-2.5 text-sm text-[var(--color-ink)]">
          <TriangleAlert className="h-4 w-4 shrink-0 text-[var(--color-warn)]" />
          <span className="min-w-0 flex-1">
            <strong className="text-[var(--color-warn)]">Trava fiscal:</strong> {fiscalLocked[0].name}
            {fiscalLocked.length > 1 ? ` e mais ${fiscalLocked.length - 1}` : ""} {fiscalLocked.length > 1 ? "estão inativos" : "está inativo"} sem{" "}
            {fiscalLocked[0].cfop.trim() ? "NCM" : "CFOP"} enquanto a NFC-e estiver ligada.
          </span>
          <button type="button" onClick={() => setEditing(fiscalLocked[0])} className="shrink-0 font-bold text-[var(--color-warn)] hover:underline">
            Corrigir
          </button>
        </p>
      )}

      {/* Busca e o alerta de reposição (agora um filtro) na mesma linha; categorias rolando na horizontal logo abaixo. */}
      <div className="mt-5 flex items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-slate)]" />
          <Input
            aria-label="Buscar no estoque"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setUnknownCode(null)
            }}
            placeholder="Bipe ou busque por nome, SKU ou código"
            className="h-11 border-[var(--color-border)] bg-white pl-10 pr-10"
          />
          {query ? (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={() => {
                setQuery("")
                setUnknownCode(null)
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[var(--color-slate)] hover:bg-[var(--color-paper-dim)] hover:text-[var(--color-ink)]"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <ScanBarcode className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-slate)]" />
          )}
        </div>
        {critical.length > 0 && (
          <button
            type="button"
            aria-pressed={onlyCritical}
            aria-label={`${critical.length} ${critical.length === 1 ? "item" : "itens"} para repor`}
            onClick={() => setOnlyCritical((value) => !value)}
            title={onlyCritical ? "Mostrar todos os produtos" : "Mostrar só os itens com estoque baixo ou zerado"}
            className={`flex h-11 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm font-bold transition ${
              onlyCritical
                ? "border-[var(--color-alert)] bg-[var(--color-alert)] text-white"
                : "border-[#fecaca] bg-[var(--color-alert-soft)] text-[var(--color-alert)] hover:border-[var(--color-alert)]/60"
            }`}
          >
            <CircleAlert className="h-4 w-4" />
            <span className="tabular-nums">{critical.length}</span>
            <span className="hidden sm:inline">para repor</span>
          </button>
        )}
      </div>
      <div className="mt-3">
        <CategoryScroller items={chips} counts={counts} active={category} onSelect={setCategory} />
      </div>

      {unknownCode && (
        <div role="status" className="search-item-enter mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
          <p className="flex items-center gap-3 text-sm">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-nav)] text-[var(--color-slate)]">
              <ScanBarcode className="h-4 w-4" />
            </span>
            <span>
              Nenhum produto com o código <strong className="font-[family-name:var(--font-mono)]">{unknownCode}</strong>.
            </span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setUnknownCode(null)}>
              Dispensar
            </Button>
            <Button variant="accent" size="sm" onClick={registerUnknown}>
              <Plus className="h-4 w-4" />
              Cadastrar com este código
            </Button>
          </div>
        </div>
      )}

      <Card className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white p-0 shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
        {products.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-[var(--color-slate)]">Nenhum produto cadastrado. Toque em "Adicionar produto" para começar.</p>
        ) : rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm font-semibold">Nenhum produto encontrado com esses filtros.</p>
        ) : (
          <>
            {/* Celular: lista compacta, sem rolagem lateral. */}
            <ul className="divide-y divide-[var(--color-border)] md:hidden" aria-label="Produtos e saldo de estoque">
              {rows.map((product) => (
                <li key={product.id} data-product-row className={`flex items-center gap-3 px-4 py-3 ${product.active ? "" : "opacity-70"}`}>
                  <ProductThumb product={product} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold">{product.name}</p>
                    <p className="truncate text-xs text-[var(--color-slate)]">
                      <span className="font-bold text-[var(--color-ink)]">{formatBRL(product.priceCents)}</span> ·{" "}
                      <span className="font-[family-name:var(--font-mono)]">{product.sku}</span>
                    </p>
                    {/* "Conforme" já aparece na cor da quantidade; o selo fica só para o que pede atenção. */}
                    {(!product.active || stockStatus(product) !== "normal") && (
                      <div className="mt-1.5">
                        <StatusPill product={product} />
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <strong className={`pr-2 text-xl font-extrabold tabular-nums ${quantityTone(product)}`}>
                      {formatQuantity(product.stock)} <span className="text-xs font-bold text-[var(--color-slate)]">{product.unit}</span>
                    </strong>
                    <RowActions {...actionsFor(product)} />
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
              <Table>
                <caption className="sr-only">Produtos e saldo de estoque</caption>
                <TableHeader>
                  <TableRow className="bg-[var(--color-paper)]/60 hover:bg-[var(--color-paper)]/60">
                    <TableHead scope="col" className="pl-5">
                      Produto
                    </TableHead>
                    <TableHead scope="col" className="hidden xl:table-cell">
                      SKU / Código
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Venda / Custo
                    </TableHead>
                    <TableHead scope="col" className="text-center">
                      Qtd. atual
                    </TableHead>
                    <TableHead scope="col" className="hidden text-center xl:table-cell">
                      Status
                    </TableHead>
                    <TableHead scope="col" className="pr-5 text-right">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((product) => (
                    <TableRow key={product.id} data-product-row className={product.active ? "" : "opacity-70"}>
                      <TableCell className="py-2.5 pl-5">
                        <div className="flex items-center gap-3">
                          <ProductThumb product={product} />
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-bold">{product.name}</p>
                            <p className="truncate font-[family-name:var(--font-mono)] text-xs text-[var(--color-slate)]">
                              <span className="xl:hidden">{product.sku} · </span>
                              {product.category} · {product.unit}
                            </p>
                            {(!product.active || stockStatus(product) !== "normal") && (
                              <div className="mt-1 xl:hidden">
                                <StatusPill product={product} />
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden py-2.5 xl:table-cell">
                        <span className="rounded bg-[var(--color-paper-dim)] px-2.5 py-1.5 font-[family-name:var(--font-mono)] text-xs">{product.sku}</span>
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                        <p className="font-bold">{formatBRL(product.priceCents)}</p>
                        <p className="text-[13px] text-[#94a3b8]">{formatBRL(product.costCents)}</p>
                      </TableCell>
                      <TableCell className="py-2.5 text-center">
                        <strong className={`text-xl font-extrabold tabular-nums ${quantityTone(product)}`}>{formatQuantity(product.stock)}</strong>
                      </TableCell>
                      <TableCell className="hidden py-2.5 text-center xl:table-cell">
                        <StatusPill product={product} />
                      </TableCell>
                      <TableCell className="py-2.5 pr-5 text-right">
                        <RowActions {...actionsFor(product)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      <Card className="mt-6 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
        <div className="border-b border-[var(--color-border)] px-4 py-4 sm:px-6 sm:py-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-slate)]">Rastreabilidade</p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold">Histórico de movimentações</h2>
        </div>
        {movements.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-[var(--color-slate)]">Nenhuma movimentação registrada ainda.</p>
        ) : (
          <Table>
            <caption className="sr-only">Últimas movimentações de estoque</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col" className="hidden sm:table-cell">
                  Data
                </TableHead>
                <TableHead scope="col">Produto</TableHead>
                <TableHead scope="col">Tipo</TableHead>
                <TableHead scope="col" className="text-right">
                  Variação
                </TableHead>
                <TableHead scope="col" className="hidden text-right sm:table-cell">
                  Saldo
                </TableHead>
                <TableHead scope="col" className="hidden md:table-cell">
                  Motivo
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.slice(0, MOVEMENT_HISTORY_LIMIT).map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell className="hidden whitespace-nowrap text-[var(--color-slate)] sm:table-cell">{formatDateTime(movement.createdAt)}</TableCell>
                  <TableCell>
                    <p className="font-semibold">{movement.productName}</p>
                    <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-slate)]">{movement.sku}</p>
                    <p className="text-[11px] text-[var(--color-slate)] sm:hidden">{formatDateTime(movement.createdAt)}</p>
                    {movement.reason && <p className="text-xs text-[var(--color-slate)] md:hidden">{movement.reason}</p>}
                  </TableCell>
                  <TableCell>
                    <MovementBadge type={movement.type} />
                  </TableCell>
                  <TableCell className={`text-right font-semibold tabular-nums ${movement.delta < 0 ? "text-[var(--color-alert-dark)]" : "text-[var(--color-stock-green)]"}`}>
                    {movement.delta > 0 ? `+${formatQuantity(movement.delta)}` : formatQuantity(movement.delta)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatQuantity(movement.balance)}</TableCell>
                  <TableCell className="hidden text-[var(--color-slate)] md:table-cell">{movement.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {movements.length > MOVEMENT_HISTORY_LIMIT && (
          <p className="border-t border-[var(--color-border)] px-6 py-3 text-xs text-[var(--color-slate)]">
            Mostrando as {MOVEMENT_HISTORY_LIMIT} movimentações mais recentes de {movements.length}.
          </p>
        )}
      </Card>

      {editing !== null && (
        <ProductDialog
          product={editing === "new" ? null : editing}
          initialEan={editing === "new" ? newEan : undefined}
          onClose={() => {
            setEditing(null)
            setNewEan("")
          }}
          onSaved={(message) => {
            setEditing(null)
            setNewEan("")
            setToast({ title: "Produto salvo", message, tone: "success" })
          }}
        />
      )}
      {moving !== null && (
        <MovementDialog
          initialProductId={moving.productId}
          onClose={() => setMoving(null)}
          onDone={(message) => {
            setMoving(null)
            setToast({ title: "Movimentação registrada", message, tone: "success" })
          }}
        />
      )}
      {managingCategories && <CategoriesDialog onClose={() => setManagingCategories(false)} />}

      <Dialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={removing ? `Excluir ${removing.name}?` : "Excluir produto"}
        description="O produto tem histórico de movimentações e vendas, então é inativado (exclusão lógica): sai do PDV e continua nos relatórios. Para reativar, use Editar."
      >
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setRemoving(null)}>
            Manter produto
          </Button>
          <Button onClick={confirmRemove}>Excluir produto</Button>
        </div>
      </Dialog>

      <Toast open={toast !== null} title={toast?.title ?? ""} message={toast?.message} tone={toast?.tone ?? "success"} onClose={closeToast} />
    </>
  )
}
