import { useEffect, useState } from "react";

export type Transacao = {
  id: string;
  tipo: "gasto" | "receita";
  valor: number;
  categoria: string;
  descricao: string;
  data: string; // ISO
};

export type Meta = {
  id: string;
  nome: string;
  valorAlvo: number;
  guardado: number;
  prazo: string | null;
  criadaEm: string;
};

type Estado = { transacoes: Transacao[]; metas: Meta[] };

const KEY = "financas-lia-v1";
let estado: Estado = { transacoes: [], metas: [] };
let carregado = false;
const ouvintes = new Set<() => void>();

function carregar() {
  if (carregado || typeof window === "undefined") return;
  carregado = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) estado = { transacoes: [], metas: [], ...JSON.parse(raw) };
  } catch {
    /* ignora */
  }
}

function salvar(novo: Estado) {
  estado = novo;
  localStorage.setItem(KEY, JSON.stringify(estado));
  ouvintes.forEach((f) => f());
}

const novoId = () => Math.random().toString(36).slice(2, 10);

export const financas = {
  get: () => (carregar(), estado),
  addTransacao(t: Omit<Transacao, "id" | "data">) {
    carregar();
    const nova: Transacao = { ...t, valor: Math.abs(t.valor), id: novoId(), data: new Date().toISOString() };
    salvar({ ...estado, transacoes: [nova, ...estado.transacoes] });
    return nova;
  },
  removerTransacao(id: string) {
    salvar({ ...estado, transacoes: estado.transacoes.filter((t) => t.id !== id) });
  },
  addMeta(m: { nome: string; valorAlvo: number; prazo: string | null }) {
    carregar();
    const nova: Meta = { ...m, valorAlvo: Math.abs(m.valorAlvo), id: novoId(), guardado: 0, criadaEm: new Date().toISOString() };
    salvar({ ...estado, metas: [...estado.metas, nova] });
    return nova;
  },
  guardar(metaId: string, valor: number) {
    carregar();
    const meta = estado.metas.find((m) => m.id === metaId);
    if (!meta) return null;
    const atual = { ...meta, guardado: Math.max(0, meta.guardado + valor) };
    salvar({ ...estado, metas: estado.metas.map((m) => (m.id === metaId ? atual : m)) });
    return atual;
  },
  removerMeta(id: string) {
    salvar({ ...estado, metas: estado.metas.filter((m) => m.id !== id) });
  },
};

/** Lê os dados após a hidratação para evitar divergência com o SSR. */
export function useFinancas() {
  const [s, setS] = useState<Estado>({ transacoes: [], metas: [] });
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    const f = () => setS(financas.get());
    f();
    setPronto(true);
    ouvintes.add(f);
    return () => {
      ouvintes.delete(f);
    };
  }, []);
  return { ...s, pronto };
}

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function doMes(ts: Transacao[], ref = new Date()) {
  return ts.filter((t) => {
    const d = new Date(t.data);
    return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
  });
}

export function resumo(ts: Transacao[]) {
  const gastos = ts.filter((t) => t.tipo === "gasto").reduce((a, t) => a + t.valor, 0);
  const receitas = ts.filter((t) => t.tipo === "receita").reduce((a, t) => a + t.valor, 0);
  const porCategoria: Record<string, number> = {};
  ts.filter((t) => t.tipo === "gasto").forEach((t) => (porCategoria[t.categoria] = (porCategoria[t.categoria] ?? 0) + t.valor));
  return { gastos, receitas, saldo: receitas - gastos, porCategoria };
}

export function contextoParaIA() {
  const { transacoes, metas } = financas.get();
  const r = resumo(doMes(transacoes));
  const cats = Object.entries(r.porCategoria).map(([c, v]) => `${c}: ${brl(v)}`).join("; ") || "nenhum";
  const ult = transacoes.slice(0, 8).map((t) => `${t.data.slice(0, 10)} ${t.tipo} ${brl(t.valor)} ${t.categoria} (${t.descricao})`).join("\n");
  const ms = metas.map((m) => `id=${m.id} "${m.nome}" ${brl(m.guardado)} de ${brl(m.valorAlvo)} prazo ${m.prazo ?? "sem prazo"}`).join("\n") || "nenhuma";
  return `Mês atual — gastos ${brl(r.gastos)}, receitas ${brl(r.receitas)}, saldo ${brl(r.saldo)}.\nGastos por categoria: ${cats}\nÚltimas transações:\n${ult || "nenhuma"}\nMetas:\n${ms}`;
}

/** Feedback sonoro curto (Design Universal: retorno auditivo). */
export function bip(ok = true) {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = ok ? 880 : 300;
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.25);
  } catch {
    /* sem áudio */
  }
}
