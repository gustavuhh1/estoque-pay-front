import { cn } from "@/lib/utils"

/** Recurring structural device: separates sections like a receipt separates items. */
export function BarcodeStrip({ className }: { className?: string }) {
  return <div className={cn("barcode-strip w-full", className)} />
}
