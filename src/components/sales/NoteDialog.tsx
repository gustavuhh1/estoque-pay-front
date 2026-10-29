import { Printer } from "lucide-react"
import { useEffect, useState } from "react"

import EspelhoReceipt from "@/components/pdv/EspelhoReceipt"
import PdvReceipt from "@/components/pdv/PdvReceipt"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { config } from "@/config"
import { errorMessage } from "@/lib/api"
import { formatReceiptNumber } from "@/lib/format"
import { fetchNota, type Espelho } from "@/pdv/pdvApi"
import type { Sale } from "@/inventory/types"
import { useStores } from "@/store/useStores"

/** Visualiza e imprime a NFC-e simulada de uma venda (espelho, sem valor fiscal). */
export default function NoteDialog({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const { activeStore } = useStores()
  // Com a API o espelho vem do servidor (com o aviso de simulação); no modo demonstração é montado na hora.
  const [espelho, setEspelho] = useState<Espelho | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  useEffect(() => {
    if (!config.useApi) return
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
  }, [sale.id])

  return (
    <Dialog open onClose={onClose} title="NFC-e (simulado)" description={espelho ? `Nota nº ${formatReceiptNumber(espelho.numero)}` : sale.code ? `Venda ${sale.code}` : `Nota nº ${formatReceiptNumber(sale.number)}`} widthClass="max-w-[520px]">
      {config.useApi ? (
        espelho ? (
          <EspelhoReceipt espelho={espelho} />
        ) : failure ? (
          <p role="alert" className="rounded-xl bg-[var(--color-alert-soft)] px-3.5 py-3 text-sm font-medium text-[var(--color-alert-dark)]">
            {failure}
          </p>
        ) : (
          <p className="py-8 text-center text-sm text-[var(--color-slate)]">Carregando a nota...</p>
        )
      ) : (
        <PdvReceipt sale={sale} store={activeStore} operator={sale.operator ?? "—"} />
      )}
      <div className="mt-6 flex flex-col-reverse justify-end gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row">
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
        <Button variant="accent" onClick={() => window.print()} disabled={config.useApi && !espelho}>
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
      </div>
    </Dialog>
  )
}
