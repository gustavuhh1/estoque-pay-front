import { useState, type FormEvent } from "react"
import { ArrowLeft, ArrowRight, Boxes, Building2, Check, CircleCheck, MapPin, Phone } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { useStores } from "@/store/StoreContext"

type FormData = { name: string; cnpj: string; phone: string; city: string; state: string }

export default function Onboarding() {
  const navigate = useNavigate()
  const { createStore } = useStores()
  const [step, setStep] = useState(1)
  const [saved, setSaved] = useState(false)
  const [data, setData] = useState<FormData>({ name: "", cnpj: "", phone: "", city: "", state: "CE" })

  const update = (key: keyof FormData, value: string) => setData((current) => ({ ...current, [key]: value }))

  const handleNext = (event: FormEvent) => {
    event.preventDefault()
    if (step === 1) {
      setStep(2)
      return
    }
    createStore(data)
    setSaved(true)
  }

  return (
    <div className="min-h-screen bg-[var(--color-paper)]">
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-amber)] text-white"><Boxes className="h-5 w-5" /></span>
            <span className="font-[family-name:var(--font-display)] text-lg font-semibold">EstoquePay</span>
          </Link>
          <span className="rounded-full bg-[var(--color-paper-dim)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-slate)]">Configuração inicial</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-6 md:py-14">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-amber-dark)]">Onboarding</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">Vamos colocar sua loja no ar.</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-slate)]">Preencha os dados básicos. Eles poderão ser complementados nas configurações depois.</p>
        </div>

        {!saved ? (
          <div className="mx-auto mt-8 max-w-3xl">
            <div className="mb-7 flex items-center justify-center gap-4">
              {[1,2].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${step >= item ? "bg-[var(--color-amber)] text-white" : "bg-[var(--color-paper-dim)] text-[var(--color-slate)]"}`}>{step > item ? <Check className="h-4 w-4" /> : item}</span>
                  <span className="hidden text-xs font-semibold text-[var(--color-slate)] sm:inline">{item === 1 ? "Dados da loja" : "Localização"}</span>
                </div>
              ))}
            </div>

            <Card className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[0_16px_50px_rgba(13,28,46,0.06)] sm:p-8">
              <form onSubmit={handleNext} className="space-y-6">
                {step === 1 ? (
                  <>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-stock-green-soft)] text-[var(--color-stock-green)]"><Building2 className="h-5 w-5" /></div>
                    <div><h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">Dados principais</h2><p className="mt-1 text-sm text-[var(--color-slate)]">Comece identificando o estabelecimento.</p></div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2"><Label htmlFor="store-name">Nome da loja</Label><Input id="store-name" value={data.name} onChange={(e) => update("name", e.target.value)} placeholder="Loja Ponto Certo" required /></div>
                      <div className="space-y-2"><Label htmlFor="cnpj">CNPJ</Label><Input id="cnpj" value={data.cnpj} onChange={(e) => update("cnpj", e.target.value)} placeholder="00.000.000/0000-00" required /></div>
                      <div className="space-y-2"><Label htmlFor="phone">Telefone</Label><div className="relative"><Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-slate)]/70" /><Input id="phone" value={data.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(85) 3333-2200" className="pl-9" required /></div></div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-stock-green-soft)] text-[var(--color-stock-green)]"><MapPin className="h-5 w-5" /></div>
                    <div><h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">Onde sua loja fica?</h2><p className="mt-1 text-sm text-[var(--color-slate)]">Essas informações ajudam a identificar o estabelecimento.</p></div>
                    <div className="grid gap-5 sm:grid-cols-[1fr_140px]">
                      <div className="space-y-2"><Label htmlFor="city">Cidade</Label><Input id="city" value={data.city} onChange={(e) => update("city", e.target.value)} placeholder="Fortaleza" required /></div>
                      <div className="space-y-2"><Label htmlFor="state">Estado</Label><Select id="state" value={data.state} onChange={(e) => update("state", e.target.value)}>{["AC","AL","AM","BA","CE","DF","ES","GO","MA","MG","PA","PB","PE","PI","PR","RJ","RN","RS","SC","SE","SP"].map((uf) => <option key={uf}>{uf}</option>)}</Select></div>
                    </div>
                    <div className="rounded-xl bg-[var(--color-paper)] p-4 text-xs leading-5 text-[var(--color-slate)]">Ao concluir, seu acesso será associado automaticamente como <strong className="text-[var(--color-ink)]">Owner</strong> desta nova loja.</div>
                  </>
                )}

                <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-border)] pt-6 sm:flex-row sm:justify-between">
                  {step === 1 ? <Button asChild type="button" variant="ghost"><Link to="/lojas"><ArrowLeft className="h-4 w-4" />Voltar para lojas</Link></Button> : <Button type="button" variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4" />Voltar</Button>}
                  <Button type="submit" variant="accent">{step === 1 ? "Continuar" : "Criar estabelecimento"}<ArrowRight className="h-4 w-4" /></Button>
                </div>
              </form>
            </Card>
          </div>
        ) : (
          <Card className="mx-auto mt-8 max-w-2xl rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center shadow-[0_16px_50px_rgba(13,28,46,0.06)] sm:p-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-stock-green-soft)] text-[var(--color-stock-green)]"><CircleCheck className="h-7 w-7" /></div>
            <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-amber-dark)]">Estabelecimento criado</p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">Sua loja está pronta para o painel.</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--color-slate)]">No backend real, o vínculo de Owner será persistido junto ao estabelecimento. Nesta etapa, o fluxo é mantido como protótipo funcional.</p>
            <Button className="mt-7" variant="accent" onClick={() => navigate("/painel", { replace: true })}>Ir para o Dashboard<ArrowRight className="h-4 w-4" /></Button>
          </Card>
        )}
      </main>
    </div>
  )
}
