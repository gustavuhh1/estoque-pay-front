import { Printer } from "lucide-react"

import PdvReceipt from "@/components/pdv/PdvReceipt"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { formatReceiptNumber } from "@/lib/format"
import type { Sale } from "@/inventory/types"
import { useStores } from "@/store/useStores"

/** Visualiza e imprime a NFC-e simulada de uma venda (espelho, sem valor fiscal). */
export default function NoteDialog({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const { activeStore } = useStores()
  return (
    <Dialog open onClose={onClose} title="NFC-e (simulado)" description={`Nota nº ${formatReceiptNumber(sale.number)}`} widthClass="max-w-[520px]">
      <PdvReceipt sale={sale} store={activeStore} operator={sale.operator ?? "—"} />
      <div className="mt-6 flex flex-col-reverse justify-end gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row">
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
        <Button variant="accent" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
      </div>
    </Dialog>
  )
}
