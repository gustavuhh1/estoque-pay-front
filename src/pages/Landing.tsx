import { Link } from "react-router-dom"
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Check,
  Package,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { BarcodeStrip } from "@/components/BarcodeStrip"

const stockRows = [
  { sku: "CAM-001", name: "Camiseta Básica P", qty: 84, trend: "up" as const },
  { sku: "CAN-014", name: "Caneca Cerâmica", qty: 12, trend: "down" as const },
  { sku: "MOC-007", name: "Mochila Urbana", qty: 46, trend: "up" as const },
  { sku: "TEN-023", name: "Tênis Corrida 42", qty: 3, trend: "down" as const },
]

const features = [
  {
    number: "01",
    title: "Estoque em tempo real",
    description:
      "Cada venda atualiza a contagem na hora. Sem planilha, sem contagem manual no fim do dia.",
  },
  {
    number: "02",
    title: "Pagamentos no mesmo painel",
    description:
      "Receba, concilie e acompanhe repasses sem trocar de sistema ou exportar relatório.",
  },
  {
    number: "03",
    title: "Alertas de reposição",
    description:
      "O EstoquePay avisa antes de faltar produto, com base no histórico de vendas.",
  },
]

const plans = [
  {
    name: "Essencial",
    description: "Para começar a organizar a operação.",
    price: "R$ 29",
    highlight: false,
    items: ["Cadastro de produtos", "Controle de estoque", "Resumo de vendas"],
  },
  {
    name: "Profissional",
    description: "Para lojas que querem tudo em um painel.",
    price: "R$ 59",
    highlight: true,
    items: [
      "Tudo do Essencial",
      "Controle de pagamentos",
      "Alertas de reposição",
      "Relatórios da operação",
    ],
  },
  {
    name: "Equipe",
    description: "Para operações com mais pessoas e rotinas.",
    price: "R$ 99",
    highlight: false,
    items: [
      "Tudo do Profissional",
      "Mais usuários",
      "Rotinas por responsável",
    ],
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--color-paper)]">
      <header className="sticky top-0 z-20 border-b border-[var(--color-ink)]/10 bg-[var(--color-paper)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--color-ink)]">
              <Boxes className="h-5 w-5 text-[var(--color-amber)]" />
            </div>
            <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
              EstoquePay
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-[var(--color-slate)] md:flex">
            <a href="#recursos" className="transition-colors hover:text-[var(--color-ink)]">
              Recursos
            </a>
            <a href="#precos" className="transition-colors hover:text-[var(--color-ink)]">
              Preços
            </a>
            <Link to="/login" className="transition-colors hover:text-[var(--color-ink)]">
              Entrar
            </Link>
          </nav>

          <Button asChild size="sm" variant="accent">
            <Link to="/cadastro">Começar agora</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-20 pt-14 sm:px-6 md:pb-28 md:pt-24">
          <div className="grid items-center gap-12 md:grid-cols-[1.03fr_0.97fr] md:gap-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink)]/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-[var(--color-amber-dark)]">
                <BadgeCheck className="h-3.5 w-3.5" />
                Feito para quem vende no balcão e no online
              </div>

              <h1 className="mt-5 max-w-3xl font-[family-name:var(--font-display)] text-5xl font-semibold leading-[1.04] tracking-[-0.04em] sm:text-6xl md:text-[4.5rem]">
                Seu estoque e seus pagamentos, na mesma tela.
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-[var(--color-slate)] sm:text-lg">
                O EstoquePay junta produtos, vendas e recebimentos em um painel só —
                para você acompanhar a operação sem ficar pulando entre três sistemas.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg" variant="accent">
                  <Link to="/cadastro">
                    Criar minha conta
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link to="/login">Já tenho conta</Link>
                </Button>
              </div>

              <div className="mt-9 grid max-w-xl grid-cols-1 gap-3 text-xs text-[var(--color-slate)] sm:grid-cols-3">
                {["Interface responsiva", "Visão da operação", "Fluxo simples"].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[var(--color-stock-green)]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-5 -z-10 rounded-[2rem] bg-[var(--color-amber)]/10 blur-2xl" />
              <Card className="overflow-hidden rounded-2xl border-[var(--color-ink)]/10 shadow-[0_20px_70px_rgba(27,42,74,0.12)]">
                <div className="flex items-center justify-between border-b border-[var(--color-ink)]/10 px-5 py-4 sm:px-6">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-slate)]">
                      Visão do dia
                    </p>
                    <h2 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold">
                      Ficha de estoque
                    </h2>
                  </div>
                  <div className="rounded-md bg-[var(--color-paper)] p-2">
                    <Package className="h-4 w-4 text-[var(--color-ink)]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-b border-[var(--color-ink)]/10 p-5 sm:grid-cols-3 sm:px-6">
                  <div className="rounded-lg bg-[var(--color-paper)] p-3">
                    <p className="text-[11px] text-[var(--color-slate)]">Produtos</p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">248</p>
                  </div>
                  <div className="rounded-lg bg-[var(--color-paper)] p-3">
                    <p className="text-[11px] text-[var(--color-slate)]">Saídas hoje</p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">84</p>
                  </div>
                  <div className="col-span-2 rounded-lg border border-[var(--color-alert)]/15 bg-[var(--color-alert)]/5 p-3 sm:col-span-1">
                    <p className="text-[11px] text-[var(--color-alert)]">Atenção</p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">3 itens</p>
                  </div>
                </div>

                <div className="divide-y divide-[var(--color-ink)]/8">
                  {stockRows.map((row) => (
                    <div key={row.sku} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--color-ink)]">{row.name}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-[var(--color-slate)]">{row.sku}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={
                            "text-sm font-semibold " +
                            (row.trend === "down"
                              ? "text-[var(--color-alert)]"
                              : "text-[var(--color-stock-green)]")
                          }
                        >
                          {row.qty} un.
                        </span>
                        {row.trend === "up" ? (
                          <TrendingUp className="h-4 w-4 text-[var(--color-stock-green)]" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-[var(--color-alert)]" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <BarcodeStrip className="h-7 rounded-b-2xl opacity-60" />
              </Card>
            </div>
          </div>
        </section>

        <section id="recursos" className="border-y border-[var(--color-ink)]/10 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-amber-dark)]">
                Recursos
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
                Tudo o que envolve vender, num lugar só.
              </h2>
              <p className="mt-4 text-sm leading-6 text-[var(--color-slate)] sm:text-base">
                A interface foi pensada para transformar informação operacional em decisões rápidas,
                sem excesso de elementos na tela.
              </p>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="border-[var(--color-ink)]/10 bg-[var(--color-paper)] p-6 shadow-none">
                  <span className="font-mono text-xs font-semibold text-[var(--color-amber-dark)]">{feature.number}</span>
                  <div className="mt-5 h-px w-10 bg-[var(--color-amber)]" />
                  <h3 className="mt-5 font-[family-name:var(--font-display)] text-xl font-semibold">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--color-slate)]">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="precos" className="mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-24">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-amber-dark)]">
                Preços
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
                Um plano para cada momento da operação.
              </h2>
              <p className="mt-4 text-sm leading-6 text-[var(--color-slate)] sm:text-base">
                Nesta etapa, os valores são apenas parte do protótipo visual e podem ser ajustados depois.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--color-slate)]">
              <ShieldCheck className="h-4 w-4 text-[var(--color-stock-green)]" />
              Sem integração de pagamento nesta etapa
            </div>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={
                  "relative flex h-full flex-col p-6 shadow-none " +
                  (plan.highlight
                    ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                    : "bg-white")
                }
              >
                {plan.highlight && (
                  <span className="absolute right-5 top-5 rounded-full bg-[var(--color-amber)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-ink)]">
                    Mais escolhido
                  </span>
                )}
                <p className={"text-xs font-semibold uppercase tracking-[0.16em] " + (plan.highlight ? "text-white/60" : "text-[var(--color-slate)]")}>
                  {plan.name}
                </p>
                <h3 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold">{plan.price}</h3>
                <p className={"mt-2 min-h-12 text-sm leading-5 " + (plan.highlight ? "text-white/65" : "text-[var(--color-slate)]")}>{plan.description}</p>
                <div className={"my-6 h-px " + (plan.highlight ? "bg-white/15" : "bg-[var(--color-ink)]/10")} />
                <div className="space-y-3">
                  {plan.items.map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm">
                      <Check className={"mt-0.5 h-4 w-4 shrink-0 " + (plan.highlight ? "text-[var(--color-amber)]" : "text-[var(--color-stock-green)]")} />
                      <span className={plan.highlight ? "text-white/80" : "text-[var(--color-ink)]"}>{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-auto pt-8">
                  <Button asChild size="lg" variant={plan.highlight ? "accent" : "outline"} className="w-full">
                    <Link to="/cadastro">Escolher plano</Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t border-[var(--color-ink)]/10 bg-[var(--color-paper-dim)]">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16 sm:px-6 md:flex-row md:items-center md:justify-between md:py-20">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-amber-dark)]">Próximo passo</p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
                Comece pela interface. A integração vem depois.
              </h2>
              <p className="mt-4 text-sm leading-6 text-[var(--color-slate)]">
                O protótipo já pode apresentar a experiência do usuário antes de receber o back-end definitivo.
              </p>
            </div>
            <Button asChild size="lg" variant="accent">
              <Link to="/cadastro">Criar minha conta</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-ink)]/10 px-5 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-[var(--color-slate)] sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} EstoquePay</span>
          <div className="flex gap-5">
            <Link to="/login" className="transition-colors hover:text-[var(--color-ink)]">Entrar</Link>
            <Link to="/cadastro" className="transition-colors hover:text-[var(--color-ink)]">Cadastrar</Link>
            <Link to="/recuperar-senha" className="transition-colors hover:text-[var(--color-ink)]">Recuperar acesso</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
