import { Link } from "react-router-dom"
import { ArrowRight, Calculator, Check, CircleCheck, FileText, Minus, Package, QrCode, TrendingUp, Users, type LucideIcon } from "lucide-react"

import logo from "@/assets/brand/logo-estoquepay.jpg"

const features: { icon: LucideIcon; title: string; description: string; id?: string }[] = [
  {
    icon: Calculator,
    title: "PDV completo",
    description: "Busca por nome ou código de barras, quantidades fracionadas, cálculo de troco e abertura/fechamento de caixa.",
  },
  {
    icon: Package,
    title: "Estoque com auditoria",
    description: "Alertas de quantidade mínima e histórico imutável de cada entrada e saída, com motivo e responsável.",
  },
  {
    icon: QrCode,
    title: "Pix integrado",
    description: "QR Code gerado na hora pelo AbacatePay e venda aprovada automaticamente por webhook.",
  },
  {
    // D3: a emissão real está fora do escopo; o card descreve a NFC-e simulada.
    id: "fiscal",
    icon: FileText,
    title: "NFC-e simulada",
    description: "O espelho da nota sai logo após o pagamento, sem travar a fila do caixa. Sem valor fiscal: emissão real fora do escopo.",
  },
  {
    icon: Users,
    title: "CRM e fidelidade",
    description: "Histórico por cliente, produtos favoritos e cupons de desconto com validade e baixa automática.",
  },
  {
    icon: TrendingUp,
    title: "Lucro real por venda",
    description: "Margem calculada sobre o preço de custo, trava anti-prejuízo e valuation do estoque parado.",
  },
]

const freeItems = ["50 produtos ativos", "3 membros na equipe", "CRM com CPF e nome", "Sem emissão de NFC-e"]
const premiumItems = ["Produtos e equipe ilimitados", "NFC-e simulada após o pagamento", "CRM completo e cupons de fidelidade", "Lucro bruto e valuation do estoque"]

const navLink = "text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-slate)] transition-colors hover:text-[var(--color-ink)]"
const brandButton =
  "inline-flex items-center gap-2 rounded-xl border border-[var(--color-amber)] bg-[var(--color-amber)] font-bold uppercase tracking-[0.08em] text-white shadow-[0_8px_20px_rgba(0,108,73,0.25)] transition-colors hover:bg-[var(--color-amber-dark)]"
const card = "rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_1px_2px_rgba(11,28,48,0.04),0_1px_3px_rgba(11,28,48,0.06)]"

export default function Landing() {
  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)]">
      <header className="border-b border-[var(--color-border)]">
        <div className="mx-auto flex h-[85px] max-w-[1400px] items-center justify-between gap-6 px-5 sm:px-11">
          <Link to="/" aria-label="EstoquePay">
            <img src={logo} alt="EstoquePay" width={144} height={36} className="h-9 w-36" />
          </Link>
          <nav className="flex items-center gap-6 sm:gap-10">
            <a href="#recursos" className={`hidden md:inline ${navLink}`}>Recursos</a>
            <a href="#precos" className={`hidden md:inline ${navLink}`}>Preços</a>
            <a href="#fiscal" className={`hidden md:inline ${navLink}`}>Fiscal</a>
            <Link to="/login" className="text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--color-amber)] hover:underline">Entrar</Link>
            <Link to="/cadastro" className={`h-11 px-5 text-[15px] ${brandButton}`}>Começar agora</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1400px] items-center gap-14 px-5 pb-24 pt-16 sm:px-11 lg:grid-cols-[minmax(0,609px)_minmax(0,640px)] lg:justify-between lg:pt-[84px]">
          <div>
            <h1 className="text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[64px]">
              Simplifique a <span className="text-[var(--color-amber)]">Gestão</span> do seu Negócio.
            </h1>
            <p className="mt-7 max-w-[521px] text-[17px] font-medium leading-[1.65] text-[var(--color-body)]">
              Estoque, PDV, Pix e nota fiscal no mesmo lugar. Feito para mercearias, bodegas e docerias que precisam de controle sem complicação.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-[100px] gap-y-3">
              <Link to="/cadastro" className={`h-9 px-4 text-[17px] ${brandButton}`}>
                Começar agora
                <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="text-[13px] font-medium text-[var(--color-slate)]">7 dias grátis · cancele quando quiser</span>
            </div>
          </div>

          <DashboardMock />
        </section>

        <section id="recursos" className="mx-auto max-w-[1400px] scroll-mt-6 px-5 pb-24 sm:px-11">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-[30px] font-extrabold leading-[1.15] tracking-[-0.03em] sm:text-[36px]">Tudo que a loja usa todo dia</h2>
            <span className="rounded-[14px] border border-[var(--color-green-200)] bg-[var(--color-stock-green-soft)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-amber-dark)]">
              MVP completo
            </span>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description, id }) => (
              <article key={title} id={id} className={`scroll-mt-6 p-6 ${card}`}>
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-stock-green-soft)] text-[var(--color-amber)]">
                  <Icon className="h-[23px] w-[23px]" />
                </span>
                <h3 className="mt-4 text-xl font-bold leading-[1.3] tracking-[-0.02em]">{title}</h3>
                <p className="mt-2 text-[15px] font-medium leading-[1.55] text-[var(--color-slate)]">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="precos" className="mx-auto max-w-[1000px] scroll-mt-6 px-5 pb-24 sm:px-11">
          <div className="grid gap-4 md:grid-cols-2">
            <div className={`flex flex-col p-6 pt-7 ${card}`}>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-slate)]">Free</p>
              <p className="mt-2 text-[40px] font-extrabold leading-[1.1] tracking-[-0.03em]">R$ 0</p>
              <PlanList items={freeItems} icon={Minus} />
              <Link
                to="/cadastro"
                className="inline-flex h-11 w-fit items-center rounded-xl border border-[var(--color-border)] bg-white px-5 text-[15px] font-bold shadow-[0_1px_2px_rgba(11,28,48,0.06)] hover:bg-[var(--color-paper)]"
              >
                Continuar no Free
              </Link>
            </div>

            <div className="flex flex-col rounded-2xl border border-[var(--color-green-200)] bg-[var(--color-stock-green-soft)] p-6 shadow-[0_1px_2px_rgba(11,28,48,0.04),0_1px_3px_rgba(11,28,48,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-amber-dark)]">Premium</p>
                <span className="rounded-[14px] bg-[var(--color-amber)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-white">7 dias grátis</span>
              </div>
              <p className="mt-1 text-[40px] font-extrabold leading-[1.1] tracking-[-0.03em]">
                R$ 30<span className="text-lg font-bold text-[var(--color-slate)]">/mês</span>
              </p>
              <p className="mt-1 text-[13px] font-medium text-[var(--color-slate)]">ou R$ 299,90 por ano</p>
              <PlanList items={premiumItems} icon={Check} iconClass="text-[var(--color-amber)]" />
              <Link to="/cadastro" className={`mt-6 h-11 w-fit px-5 text-[15px] ${brandButton}`}>Ativar Premium</Link>
            </div>
          </div>
          <p className="mt-5 text-center text-[13px] font-medium leading-[1.55] text-[var(--color-slate)]">
            O trial exige um cartão de crédito válido no AbacatePay. A taxa de R$ 0,80 do Pix é paga pelo cliente, em qualquer plano.
          </p>
        </section>
      </main>

      <footer className="bg-[var(--color-brand-deep)] text-white">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-6 px-5 py-12 sm:px-11">
          <p className="text-[22px] font-extrabold uppercase tracking-[0.14em]">EstoquePay</p>
          <nav className="flex gap-7 text-xs font-bold uppercase tracking-[0.08em]">
            <Link to="/termos" className="hover:underline">Termos de uso</Link>
            <Link to="/privacidade" className="hover:underline">Privacidade</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

function PlanList({ items, icon: Icon, iconClass = "text-[var(--color-slate)]" }: { items: string[]; icon: LucideIcon; iconClass?: string }) {
  return (
    <ul className="mb-8 mt-6 space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-2.5 text-[15px] font-medium leading-[1.55] text-[var(--color-body)]">
          <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
          {item}
        </li>
      ))}
    </ul>
  )
}

/** Ilustração do painel (Figma "Stack / Venda realizada"): só decorativa. */
function DashboardMock() {
  const bar = "h-2.5 rounded bg-white"
  return (
    <div aria-hidden className="relative rounded-3xl bg-[var(--color-surface-dark)] p-[18px] shadow-[0_12px_32px_rgba(11,28,48,0.1)]">
      <div className="flex gap-[7px] pl-1.5">
        <span className="h-[11px] w-[11px] rounded-full bg-[var(--color-danger-border)]" />
        <span className="h-[11px] w-[11px] rounded-full bg-[#f59e0b]" />
        <span className="h-[11px] w-[11px] rounded-full bg-[var(--color-green-400)]" />
      </div>
      <div className="mt-3.5 space-y-3.5 rounded-2xl bg-[#273449] p-4">
        <div className="flex items-center gap-2.5">
          <span className={`${bar} w-[46px]`} />
          <span className={`${bar} w-[34px]`} />
          <span className="ml-auto h-4 w-4 rounded-full bg-white" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {["bg-[#0f6b47]", "bg-white", "bg-[#7f2a2a]"].map((accent) => (
            <div key={accent} className="space-y-2.5 rounded-xl bg-[var(--color-surface-dark)] p-3.5">
              <span className={`block ${bar} w-[60%]`} />
              <span className={`block h-2.5 w-[42%] rounded ${accent}`} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[3fr_2fr] gap-3">
          <div className="rounded-xl bg-[var(--color-surface-dark)] p-4">
            <span className={`block ${bar} w-[106px]`} />
            <div className="mt-3.5 flex h-[78px] items-end gap-3">
              {[38, 58, 26, 72, 48].map((h) => (
                <span key={h} className="flex-1 rounded-md bg-[#0f6b47]" style={{ height: h }} />
              ))}
            </div>
          </div>
          <div className="space-y-3 rounded-xl bg-[var(--color-surface-dark)] p-4">
            {["w-[70%]", "w-full", "w-[80%]", "w-full"].map((w, i) => (
              <span key={i} className={`block ${bar} ${w}`} />
            ))}
          </div>
        </div>
      </div>
      <div className="absolute -right-3 top-24 flex items-center gap-3 rounded-[14px] bg-white px-5 py-3.5 shadow-[0_12px_32px_rgba(11,28,48,0.1)] sm:-right-6">
        <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[var(--color-stock-green-soft)] text-[var(--color-amber)]">
          <CircleCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-slate)]">Venda realizada</p>
          <p className="text-[15px] font-extrabold leading-[1.55]">R$ 1.490,00</p>
        </div>
      </div>
    </div>
  )
}
