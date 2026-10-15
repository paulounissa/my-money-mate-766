import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { bip, brl, financas, useFinancas } from "@/lib/finance";

export const Route = createFileRoute("/metas")({
  head: () => ({
    meta: [
      { title: "Minhas metas — Lia" },
      { name: "description", content: "Acompanhe suas metas financeiras, como sua reserva de emergência." },
      { property: "og:title", content: "Minhas metas — Lia" },
      { property: "og:description", content: "Acompanhe o progresso das suas metas de economia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Metas,
});

function Metas() {
  const { metas, pronto } = useFinancas();
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [prazo, setPrazo] = useState("");

  function criar(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(valor.replace(",", "."));
    if (!nome.trim() || !(v > 0)) return toast.error("Preencha o nome e um valor maior que zero.");
    financas.addMeta({ nome: nome.trim(), valorAlvo: v, prazo: prazo || null });
    bip();
    toast.success("Meta criada!");
    setNome(""); setValor(""); setPrazo("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Minhas metas</h1>
        <p className="text-muted-foreground">
          Dica: você também pode pedir na <Link to="/" className="font-bold text-primary underline">conversa</Link>, como “guardei R$ 50 para a viagem”.
        </p>
      </div>

      {pronto && metas.length === 0 && (
        <p className="rounded-3xl border bg-card p-5 text-lg">Você ainda não tem metas. Que tal começar com uma reserva de emergência?</p>
      )}

      <ul className="space-y-4">
        {metas.map((m) => {
          const pct = Math.min(100, Math.round((m.guardado / m.valorAlvo) * 100));
          return (
            <li key={m.id} className="rounded-3xl border bg-card p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-bold">
                    {pct >= 100 && <Trophy className="h-5 w-5 text-accent-foreground" aria-label="Meta concluída" />}
                    {m.nome}
                  </h2>
                  <p className="text-muted-foreground">
                    {brl(m.guardado)} de {brl(m.valorAlvo)}
                    {m.prazo && ` · até ${new Date(m.prazo + "T12:00").toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
                <Button variant="ghost" size="icon" aria-label={`Excluir meta ${m.nome}`} onClick={() => confirm("Excluir esta meta?") && financas.removerMeta(m.id)}>
                  <Trash2 />
                </Button>
              </div>
              <Progress value={pct} className="mt-4 h-4" aria-label={`${pct}% concluído`} />
              <p className="mt-2 font-bold">{pct}% concluído{pct < 100 && ` — faltam ${brl(m.valorAlvo - m.guardado)}`}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[20, 50, 100].map((v) => (
                  <Button key={v} variant="secondary" onClick={() => { financas.guardar(m.id, v); bip(); toast.success(`${brl(v)} guardados!`); }}>
                    + {brl(v)}
                  </Button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      <form onSubmit={criar} className="space-y-3 rounded-3xl border-2 border-dashed bg-card p-5">
        <h2 className="text-xl font-bold">Nova meta</h2>
        <label className="block">
          <span className="font-bold">Nome da meta</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Reserva de emergência" className="mt-1 h-12 w-full rounded-xl border-2 bg-background px-3" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="font-bold">Quanto quer juntar (R$)</span>
            <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="500" className="mt-1 h-12 w-full rounded-xl border-2 bg-background px-3" />
          </label>
          <label className="block">
            <span className="font-bold">Prazo (opcional)</span>
            <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="mt-1 h-12 w-full rounded-xl border-2 bg-background px-3" />
          </label>
        </div>
        <Button type="submit" size="lg" className="h-12 rounded-full px-6 text-base">
          <Plus /> Criar meta
        </Button>
      </form>
    </div>
  );
}
