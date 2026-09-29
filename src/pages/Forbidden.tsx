import { ShieldX } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

export default function Forbidden() {
  return <ErrorPage icon={<ShieldX className="h-6 w-6" />} eyebrow="403" title="Você não tem acesso a esta área." description="O layout já prevê a resposta visual para acessos bloqueados. A autorização definitiva virá do backend." back="/painel" backLabel="Voltar ao Dashboard" />
}

function ErrorPage({ icon, eyebrow, title, description, back, backLabel }: { icon: ReactNode; eyebrow: string; title: string; description: string; back: string; backLabel: string }) {
  return <div className="flex min-h-screen items-center justify-center bg-[var(--color-paper)] px-5 py-10"><div className="w-full max-w-xl text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-alert-soft)] text-[var(--color-alert)]">{icon}</span><p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-amber-dark)]">{eyebrow}</p><h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-3 text-sm leading-6 text-[var(--color-slate)]">{description}</p><Button asChild className="mt-7" variant="accent"><Link to={back}>{backLabel}</Link></Button></div></div>
}
