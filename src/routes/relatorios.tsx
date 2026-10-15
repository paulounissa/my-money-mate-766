import { createFileRoute } from "@tanstack/react-router";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brl, doMes, financas, resumo, useFinancas } from "@/lib/finance";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios do mês — Lia" },
      { name: "description", content: "Veja de forma simples para onde vai o seu dinheiro." },
      { property: "og:title", content: "Relatórios do mês — Lia" },
      { property: "og:description", content: "Gastos por categoria, saldo e histórico em linguagem clara." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Relatorios,
});

const CORES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Relatorios() {
  const { transacoes, pronto } = useFinancas();
  const mes = doMes(transacoes);
  const r = resumo(mes);
  const cats = Object.entries(r.porCategoria).sort((a, b) => b[1] - a[1]);
  const maior = cats[0];
  const nomeMes = new Date().toLocaleDateString("pt-BR", { month: "long" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Seu mês de {nomeMes}</h1>
        {pronto && (
          <p className="text-lg text-muted-foreground">
            {mes.length === 0
              ? "Ainda não há registros este mês. Conte um gasto para a Lia!"
              : maior
                ? `Você gastou ${brl(r.gastos)}. A maior parte foi com ${maior[0]} (${brl(maior[1])}).`
                : `Você recebeu ${brl(r.receitas)} e ainda não registrou gastos.`}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Cartao icone={<TrendingUp aria-hidden />} rotulo="Entrou" valor={brl(r.receitas)} />
        <Cartao icone={<TrendingDown aria-hidden />} rotulo="Saiu" valor={brl(r.gastos)} />
        <Cartao icone={<Wallet aria-hidden />} rotulo="Sobrou" valor={brl(r.saldo)} destaque={r.saldo < 0 ? "negativo" : "positivo"} />
      </div>

      {cats.length > 0 && (
        <section className="rounded-3xl border bg-card p-5">
          <h2 className="mb-2 text-xl font-bold">Para onde foi o dinheiro</h2>
          <div className="grid items-center gap-4 sm:grid-cols-2">
            <div className="h-56" aria-hidden>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={cats.map(([name, value]) => ({ name, value }))} dataKey="value" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {cats.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => brl(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2">
              {cats.map(([c, v], i) => (
                <li key={c} className="flex items-center justify-between gap-2 text-lg">
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full" style={{ background: CORES[i % CORES.length] }} aria-hidden />
                    {c}
                  </span>
                  <span className="font-bold">{brl(v)} <span className="text-sm font-normal text-muted-foreground">({Math.round((v / r.gastos) * 100)}%)</span></span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {transacoes.length > 0 && (
        <section className="rounded-3xl border bg-card p-5">
          <h2 className="mb-3 text-xl font-bold">Histórico</h2>
          <ul className="divide-y">
            {transacoes.slice(0, 50).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-bold">{t.descricao || t.categoria}</p>
                  <p className="text-sm text-muted-foreground">{t.categoria} · {new Date(t.data).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className={t.tipo === "receita" ? "font-bold text-success" : "font-bold"}>
                    {t.tipo === "receita" ? "+" : "−"} {brl(t.valor)}
                  </span>
                  <Button variant="ghost" size="icon" aria-label={`Excluir ${t.descricao}`} onClick={() => confirm("Excluir este registro?") && financas.removerTransacao(t.id)}>
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Cartao({ icone, rotulo, valor, destaque }: { icone: React.ReactNode; rotulo: string; valor: string; destaque?: "positivo" | "negativo" }) {
  return (
    <div className={`rounded-3xl border p-5 ${destaque === "positivo" ? "bg-primary text-primary-foreground" : destaque === "negativo" ? "bg-destructive text-destructive-foreground" : "bg-card"}`}>
      <div className="flex items-center gap-2 font-bold opacity-90">{icone} {rotulo}</div>
      <p className="mt-1 font-display text-2xl font-extrabold">{valor}</p>
    </div>
  );
}
