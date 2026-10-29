import { Check, Pencil, Plus, Trash2, X } from "lucide-react"
import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useInventory } from "@/inventory/useInventory"

/** Cadastro de categorias da loja. Excluir uma categoria nunca apaga os produtos dela. */
export default function CategoriesDialog({ onClose }: { onClose: () => void }) {
  const { categories, products, addCategory, renameCategory, removeCategory } = useInventory()
  const [name, setName] = useState("")
  const [editing, setEditing] = useState<{ from: string; to: string } | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null)

  const countOf = (category: string) => products.filter((product) => product.category === category).length

  async function add(event: FormEvent) {
    event.preventDefault()
    const result = await addCategory(name)
    if (!result.ok) return setMessage({ tone: "error", text: result.error })
    setName("")
    setMessage(null)
  }

  async function saveRename() {
    if (!editing) return
    const result = await renameCategory(editing.from, editing.to)
    if (!result.ok) return setMessage({ tone: "error", text: result.error })
    setEditing(null)
    setMessage(null)
  }

  async function confirmRemove() {
    if (!removing) return
    const result = await removeCategory(removing)
    if (!result.ok) return setMessage({ tone: "error", text: result.error })
    setMessage({
      tone: "info",
      text: result.value > 0 ? `${result.value} produto(s) foram para "Sem categoria". Nenhum produto foi apagado.` : "Categoria excluída.",
    })
    setRemoving(null)
  }

  return (
    <Dialog open onClose={onClose} title="Gerenciar categorias" description="Organize o estoque por categoria. Excluir uma categoria não apaga os produtos." widthClass="max-w-[520px]">
      <form onSubmit={add} className="flex gap-3">
        <Input aria-label="Nova categoria" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome da nova categoria" maxLength={40} />
        <Button type="submit" variant="accent">
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </form>

      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`mt-4 rounded-xl px-3 py-2 text-xs font-medium ${
            message.tone === "error" ? "bg-[var(--color-alert-soft)] text-[var(--color-alert-dark)]" : "bg-[var(--color-stock-green-soft)] text-[var(--color-amber-dark)]"
          }`}
        >
          {message.text}
        </p>
      )}

      <ul className="mt-5 flex flex-col gap-2" aria-label="Categorias">
        {categories.length === 0 && <li className="rounded-xl bg-[var(--color-paper)] px-4 py-5 text-center text-sm text-[var(--color-slate)]">Nenhuma categoria cadastrada.</li>}
        {categories.map((category) => (
          <li key={category} className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] px-4 py-2.5">
            {editing?.from === category ? (
              <>
                <Input
                  aria-label={`Novo nome de ${category}`}
                  value={editing.to}
                  onChange={(event) => setEditing({ from: category, to: event.target.value })}
                  onKeyDown={(event) => event.key === "Enter" && void saveRename()}
                  maxLength={40}
                  autoFocus
                  className="h-9"
                />
                <button type="button" aria-label="Salvar nome" onClick={saveRename} className="rounded-lg p-2 text-[var(--color-amber)] hover:bg-[var(--color-stock-green-soft)]">
                  <Check className="h-4 w-4" />
                </button>
                <button type="button" aria-label="Cancelar edição" onClick={() => setEditing(null)} className="rounded-lg p-2 text-[var(--color-slate)] hover:bg-[var(--color-paper)]">
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : removing === category ? (
              <>
                <span className="flex-1 text-sm font-medium">
                  Excluir "{category}"? {countOf(category) > 0 ? `${countOf(category)} produto(s) ficam sem categoria.` : ""}
                </span>
                <Button size="sm" variant="outline" onClick={() => setRemoving(null)}>
                  Manter
                </Button>
                <Button size="sm" onClick={confirmRemove}>
                  Excluir
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1">
                  <span className="text-[15px] font-bold">{category}</span>
                  <span className="ml-2 text-xs text-[var(--color-slate)]">{countOf(category)} produto(s)</span>
                </span>
                <button type="button" aria-label={`Renomear ${category}`} onClick={() => setEditing({ from: category, to: category })} className="rounded-lg p-2 text-[var(--color-slate)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]">
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" aria-label={`Excluir ${category}`} onClick={() => setRemoving(category)} className="rounded-lg p-2 text-[var(--color-alert)] hover:bg-[var(--color-alert-soft)]">
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-end border-t border-[var(--color-border)] pt-5">
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </Dialog>
  )
}
