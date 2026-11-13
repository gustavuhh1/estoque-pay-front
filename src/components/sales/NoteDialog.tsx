import { Printer } from "lucide-react"
import { useEffect, useState } from "react"

import EspelhoReceipt from "@/components/pdv/EspelhoReceipt"
import PdvReceipt from "@/components/pdv/PdvReceipt"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { config } from "@/config"
import { errorMessage } from "@/lib/api"
import { saleLabel } from "@/lib/format"
import { fetchNota, type Espelho } from "@/pdv/pdvApi"
import type { Sale } from "@/inventory/types"
import { useStores } from "@/store/useStores"

type View = "comprovante" | "nfce"

/**
 * Comprovante de qualquer venda do histórico (montado com os dados da própria venda) e, quando a venda
 * gerou nota, a NFC-e simulada ao lado. Os dois imprimem ou viram PDF pelo "Imprimir" do navegador.
 */
export default function NoteDialog({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const { activeStore } = useStores()
  const hasNote = sale.status === "concluida" && sale.nfce !== false
  const [view, setView] = useState<View>("comprovante")
  // Com a API o espelho da NFC-e vem do servidor (com o aviso de simulação); no modo demonstração é montado na hora.
  const [espelho, setEspelho] = useState<Espelho | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const wantsRemote = config.useApi && hasNote && view === "nfce"

  useEffect(() => {
    if (!wantsRemote || espelho) return
    let cancelled = false
    fetchNota(sale.id).then(
      (nota) => {
        if (!cancelled) setEspelho(nota.espelho)
      },
      (error: unknown) => {
        if (!cancelled) setFailure(errorMessage(error))
      },
    )
    return () => {
      cancelled = true
    }
  }, [espelho, sale.id, wantsRemote])

  const tab = (value: View, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={view === value}
      onClick={() => setView(value)}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${
        view === value ? "bg-white text-[var(--color-ink)] shadow-[0_1px_3px_rgba(13,28,46,0.12)]" : "text-[var(--color-slate)] hover:text-[var(--color-ink)]"
      }`}
    >
      {label}
    </button>
  )

  return (
    <Dialog open onClose={onClose} title="Comprovante da venda" description={`Venda ${saleLabel(sale)}`} widthClass="max-w-[520px]">
      {hasNote && (
        <div role="tablist" aria-label="Documento" className="mb-4 flex gap-1 rounded-xl bg-[var(--color-paper-dim)] p-1">
          {tab("comprovante", "Comprovante")}
          {tab("nfce", "NFC-e (simulada)")}
        </div>
      )}

      {view === "comprovante" || !config.useApi ? (
        <PdvReceipt sale={sale} store={activeStore} operator={sale.operator ?? "—"} plain={view === "comprovante"} />
      ) : espelho ? (
        <EspelhoReceipt espelho={espelho} />
      ) : failure ? (
        <p role="alert" className="rounded-xl bg-[var(--color-alert-soft)] px-3.5 py-3 text-sm font-medium text-[var(--color-alert-dark)]">
          {failure}
        </p>
      ) : (
        <p className="py-8 text-center text-sm text-[var(--color-slate)]">Carregando a nota...</p>
      )}

      <div className="mt-6 flex flex-col-reverse justify-end gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row">
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
        <Button variant="accent" onClick={() => window.print()} disabled={wantsRemote && !espelho} title="Imprime ou salva em PDF (escolha “Salvar como PDF” na impressora)">
          <Printer className="h-4 w-4" />
          Imprimir ou salvar PDF
        </Button>
      </div>
    </Dialog>
  )
}
