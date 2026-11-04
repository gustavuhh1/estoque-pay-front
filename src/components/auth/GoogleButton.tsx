import { useState } from "react"

import googleIcon from "@/assets/brand/icone-google.svg"
import { useAuth } from "@/auth/useAuth"
import { config } from "@/config"

/** Divisor "ou" + "Continuar com Google" (Figma "02 — Login"). Não aparece sem `VITE_GOOGLE_LOGIN=true` e API. */
export default function GoogleButton({ onError }: { onError: (message: string) => void }) {
  const { signInWithGoogle } = useAuth()
  const [busy, setBusy] = useState(false)

  if (!config.googleLogin) return null

  return (
    <>
      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-faint)]">ou</span>
        <span className="h-px flex-1 bg-[var(--color-border)]" />
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            // Em caso de sucesso a página segue para o Google; só voltamos aqui se o servidor recusar.
            if (!(await signInWithGoogle())) onError("Não foi possível iniciar o login com Google. Tente de novo.")
          } catch {
            onError("Não foi possível conectar ao serviço de autenticação. Tente novamente.")
          }
          setBusy(false)
        }}
        className="flex h-12 w-full items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-4 text-[17px] font-bold text-[var(--color-ink)] shadow-[0_1px_2px_rgba(11,28,48,0.06)] transition-colors hover:bg-[var(--color-paper)] disabled:opacity-60"
      >
        <img src={googleIcon} alt="" width={16} height={16} />
        {busy ? "Abrindo o Google..." : "Continuar com Google"}
      </button>
    </>
  )
}
