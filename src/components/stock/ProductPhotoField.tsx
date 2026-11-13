import { ImagePlus, LoaderCircle, Trash2, Upload } from "lucide-react"
import { useRef, useState, type DragEvent } from "react"

import { Button } from "@/components/ui/button"
import { PHOTO_ACCEPT, resizePhoto } from "@/profile/resizeImage"

type ProductPhotoFieldProps = {
  /** Data URI (ou caminho público, nos produtos de demonstração); null quando o produto não tem foto. */
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
}

/**
 * Foto do produto no cadastro/edição: quadrado clicável que também aceita arrastar e soltar.
 * A imagem é cortada no centro e reduzida no navegador (mesma rotina da foto de perfil) antes de ir para a API.
 */
export default function ProductPhotoField({ value, onChange, disabled = false }: ProductPhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState("")
  const blocked = disabled || processing

  async function pick(file?: File) {
    if (!file) return
    setError("")
    setProcessing(true)
    try {
      onChange(await resizePhoto(file))
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível usar esta imagem.")
    } finally {
      setProcessing(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const choose = () => {
    if (!blocked) inputRef.current?.click()
  }

  function drop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setDragging(false)
    if (!blocked) void pick(event.dataTransfer.files[0])
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={choose}
        onDragOver={(event) => {
          event.preventDefault()
          if (!blocked) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
        disabled={blocked}
        aria-label={value ? "Trocar foto do produto" : "Escolher foto do produto"}
        aria-describedby="product-photo-hint"
        data-testid="product-photo-drop"
        className={`group relative flex h-28 w-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl transition outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-amber)] focus-visible:ring-offset-2 disabled:cursor-wait ${
          value
            ? "border border-[var(--color-border)] bg-[var(--color-paper-dim)]"
            : "border-2 border-dashed border-[var(--color-border)] bg-[var(--color-paper-dim)] text-[var(--color-slate)] hover:border-[var(--color-amber)] hover:text-[var(--color-amber)]"
        } ${dragging ? "border-[var(--color-amber)] bg-[var(--color-stock-green-soft)] text-[var(--color-amber)]" : ""}`}
      >
        {value ? (
          <>
            <img src={value} alt="Foto do produto" className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-[var(--color-ink)]/45 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
              <Upload className="h-5 w-5" />
            </span>
          </>
        ) : (
          <span className="flex flex-col items-center gap-1 px-2 text-center text-[11px] font-semibold leading-tight">
            <ImagePlus className="h-6 w-6" />
            {dragging ? "Solte aqui" : "Adicionar foto"}
          </span>
        )}
        {processing && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-[var(--color-amber)]">
            <LoaderCircle className="h-6 w-6 animate-spin" />
          </span>
        )}
      </button>

      <div className="min-w-0 space-y-2">
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink)]">Foto do produto</p>
          <p id="product-photo-hint" className="text-xs text-[var(--color-slate)]">
            Clique ou arraste uma imagem (PNG, JPG, WebP ou GIF). Ela é recortada em quadrado e aparece no Estoque e no PDV.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={blocked} onClick={choose}>
            <Upload />
            {value ? "Trocar foto" : "Escolher foto"}
          </Button>
          {value && (
            <Button type="button" size="sm" variant="ghost" disabled={blocked} onClick={() => onChange(null)}>
              <Trash2 />
              Remover
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="text-xs font-medium text-[var(--color-alert-dark)]">
            {error}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_ACCEPT}
        className="hidden"
        data-testid="product-photo-input"
        onChange={(event) => void pick(event.target.files?.[0])}
      />
    </div>
  )
}
