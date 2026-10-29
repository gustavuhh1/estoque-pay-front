import { useMemo, useState, type FormEvent } from "react"

import Field from "@/components/Field"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { formatQuantity, parseQuantity } from "@/lib/format"
import { roundQty } from "@/inventory/logic"
import type { MoveInput } from "@/inventory/types"
import { useInventory } from "@/inventory/useInventory"

const typeHelp: Record<MoveInput["type"], { quantity: string; reason: string }> = {
  entrada: { quantity: "Quantidade que entrou", reason: "Motivo (opcional)" },
  saida: { quantity: "Quantidade que saiu", reason: "Motivo (ex.: avaria, perda, uso interno)" },
  ajuste: { quantity: "Quantidade contada (novo saldo)", reason: "Motivo (ex.: contagem de inventário)" },
}

type MovementDialogProps = {
  initialProductId: string
  initialType?: MoveInput["type"]
  onClose: () => void
  onDone: (message: string) => void
}

/** Entradas, saídas e ajustes: cada um vira uma movimentação imutável no histórico. */
export default function MovementDialog({ initialProductId, initialType = "entrada", onClose, onDone }: MovementDialogProps) {
  const { products: allProducts, moveStock } = useInventory()
  const products = useMemo(() => allProducts.filter((item) => item.active), [allProducts])
  const [productId, setProductId] = useState(initialProductId || products[0]?.id || "")
  const [type, setType] = useState<MoveInput["type"]>(initialType)
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")

  const product = products.find((item) => item.id === productId)
  const parsed = parseQuantity(quantity)
  const preview =
    product && parsed !== null
      ? roundQty(type === "entrada" ? product.stock + parsed : type === "saida" ? product.stock - parsed : parsed)
      : null

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (parsed === null) return setError("Informe uma quantidade válida (0 ou mais, até 3 casas decimais).")
    const result = await moveStock({ productId, type, quantity: parsed, reason })
    if (!result.ok) return setError(result.error)
    onDone(`${result.value.productName}: saldo ${formatQuantity(result.value.balance)}`)
  }

  return (
    <Dialog open onClose={onClose} title="Registrar movimentação" description="Entradas, saídas e ajustes ficam registrados no histórico.">
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field id="mv-product" label="Produto">
          <Select
            id="mv-product"
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value)
              setError("")
            }}
          >
            {products.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.sku}) — {formatQuantity(item.stock)} {item.unit.toLowerCase()}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="mv-type" label="Tipo de movimentação">
            <Select
              id="mv-type"
              value={type}
              onChange={(e) => {
                setType(e.target.value as MoveInput["type"])
                setError("")
              }}
            >
              <option value="entrada">Entrada (reposição/compra)</option>
              <option value="saida">Saída (perda/avaria)</option>
              <option value="ajuste">Ajuste de contagem</option>
            </Select>
          </Field>
          <Field id="mv-quantity" label={typeHelp[type].quantity}>
            <Input
              id="mv-quantity"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value)
                setError("")
              }}
              inputMode="decimal"
              placeholder="0"
              autoFocus
            />
          </Field>
        </div>

        <Field id="mv-reason" label={typeHelp[type].reason}>
          <Input id="mv-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={120} />
        </Field>

        {product && (
          <p className="rounded-xl bg-[var(--color-paper)] px-3.5 py-3 text-sm text-[var(--color-slate)]">
            Saldo atual: <strong className="text-[var(--color-ink)]">{formatQuantity(product.stock)}</strong>
            {preview !== null && (
              <>
                {" "}
                → após a movimentação:{" "}
                <strong className={preview < 0 ? "text-[var(--color-alert-dark)]" : "text-[var(--color-ink)]"}>{formatQuantity(preview)}</strong>
              </>
            )}
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium text-[var(--color-alert-dark)]">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="accent">
            Registrar movimentação
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
