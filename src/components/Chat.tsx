import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Mic, MicOff, Send, Square, Volume2, VolumeX, CheckCircle2, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { bip, brl, contextoParaIA, financas } from "@/lib/finance";

const CHAT_KEY = "financas-lia-chat-v1";
const SUGESTOES = ["Gastei R$ 30 no mercado", "Recebi R$ 2.500 de salário", "Quero economizar R$ 500 até o fim do mês", "Como posso gastar menos?"];

type SR = { lang: string; interimResults: boolean; start(): void; stop(): void; onresult: (e: { results: { 0: { transcript: string } }[] }) => void; onend: () => void; onerror: () => void };

export function Chat() {
  const [input, setInput] = useState("");
  const [lerVoz, setLerVoz] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const [carregado, setCarregado] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<SR | null>(null);
  const falado = useRef<Set<string>>(new Set());

  const { messages, setMessages, sendMessage, status, stop, addToolOutput } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat", body: () => ({ contexto: contextoParaIA() }) }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: ({ toolCall }) => {
      const i = toolCall.input as { tipo?: string; valor?: number; categoria?: string; descricao?: string; nome?: string; valorAlvo?: number; prazo?: string | null; metaId?: string };
      let output: unknown;
      if (toolCall.toolName === "registrar_transacao") {
        const t = financas.addTransacao({
          tipo: i.tipo === "receita" ? "receita" : "gasto",
          valor: Number(i.valor),
          categoria: String(i.categoria || "Outros"),
          descricao: String(i.descricao || ""),
        });
        output = { ok: true, registrado: t };
      } else if (toolCall.toolName === "criar_meta") {
        output = { ok: true, meta: financas.addMeta({ nome: String(i.nome), valorAlvo: Number(i.valorAlvo), prazo: (i.prazo as string) || null }) };
      } else if (toolCall.toolName === "guardar_na_meta") {
        const m = financas.guardar(String(i.metaId), Number(i.valor));
        output = m ? { ok: true, meta: m } : { ok: false, erro: "Meta não encontrada" };
      } else return;
      bip(true);
      addToolOutput({ tool: toolCall.toolName as never, toolCallId: toolCall.toolCallId, output: output as never });
    },
    onError: (e) => {
      bip(false);
      toast.error(e.message || "Não foi possível falar com a Lia agora.");
    },
  });

  const ocupado = status === "submitted" || status === "streaming";

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAT_KEY);
      if (raw) {
        const msgs = JSON.parse(raw) as UIMessage[];
        msgs.forEach((m) => falado.current.add(m.id));
        setMessages(msgs);
      }
    } catch {
      /* ignora */
    }
    setCarregado(true);
    textRef.current?.focus();
  }, [setMessages]);

  useEffect(() => {
    if (carregado && status === "ready") localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    if (status === "ready") textRef.current?.focus();
  }, [messages, status, carregado]);

  useEffect(() => {
    if (!lerVoz || status !== "ready") return;
    const ultima = messages[messages.length - 1];
    if (!ultima || ultima.role !== "assistant" || falado.current.has(ultima.id)) return;
    falado.current.add(ultima.id);
    const texto = ultima.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").replace(/[*#_`]/g, "");
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "pt-BR";
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }, [messages, status, lerVoz]);

  function enviar(texto: string) {
    const t = texto.trim();
    if (!t || ocupado) return;
    sendMessage({ text: t });
    setInput("");
  }

  function alternarMic() {
    if (ouvindo) return recRef.current?.stop();
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) return toast.error("Seu navegador não permite falar por voz. Tente no Chrome.");
    const rec = new Ctor();
    rec.lang = "pt-BR";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const txt = e.results[0]?.[0].transcript ?? "";
      setInput(txt);
      enviar(txt);
    };
    rec.onend = () => setOuvindo(false);
    rec.onerror = () => setOuvindo(false);
    recRef.current = rec;
    setOuvindo(true);
    rec.start();
  }

  function limpar() {
    if (!confirm("Apagar a conversa? Seus gastos e metas continuam salvos.")) return;
    setMessages([]);
    localStorage.removeItem(CHAT_KEY);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Olá! Eu sou a Lia.</h1>
          <p className="text-muted-foreground">Me conte seus gastos do jeito que você falaria com uma amiga.</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setLerVoz((v) => !v)} aria-pressed={lerVoz} aria-label={lerVoz ? "Parar de ler respostas em voz alta" : "Ler respostas em voz alta"} title="Ler em voz alta">
            {lerVoz ? <Volume2 /> : <VolumeX />}
          </Button>
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" onClick={limpar} aria-label="Apagar conversa" title="Apagar conversa">
              <Trash2 />
            </Button>
          )}
        </div>
      </div>

      <section aria-live="polite" aria-label="Conversa com a Lia" className="flex flex-1 flex-col gap-4">
        {carregado && messages.length === 0 && (
          <div className="rounded-3xl border bg-card p-5">
            <p className="mb-3 font-bold">Experimente dizer:</p>
            <div className="flex flex-wrap gap-2">
              {SUGESTOES.map((s) => (
                <button key={s} onClick={() => enviar(s)} className="rounded-full border-2 border-secondary bg-secondary/50 px-4 py-2 text-left font-bold text-secondary-foreground transition-colors hover:bg-secondary">
                  “{s}”
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="max-w-[85%] self-end rounded-3xl rounded-br-md bg-primary px-5 py-3 text-lg text-primary-foreground">
              <span className="sr-only">Você disse: </span>
              {m.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
            </div>
          ) : (
            <div key={m.id} className="flex max-w-[92%] flex-col gap-2 self-start">
              <span className="sr-only">Lia disse:</span>
              {m.parts.map((p, i) => {
                if (p.type === "text")
                  return (
                    <div key={i} className="text-lg [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:font-bold">
                      <ReactMarkdown>{p.text}</ReactMarkdown>
                    </div>
                  );
                if (p.type.startsWith("tool-") && "state" in p && p.state === "output-available") {
                  const out = (p as { output?: { registrado?: { tipo: string; valor: number; categoria: string; descricao: string }; meta?: { nome: string; guardado: number; valorAlvo: number } } }).output;
                  if (out?.registrado)
                    return (
                      <div key={i} className="flex items-center gap-3 rounded-2xl border-2 border-success/40 bg-card px-4 py-3">
                        <CheckCircle2 className="h-6 w-6 shrink-0 text-success" aria-hidden />
                        <div>
                          <p className="font-bold">
                            {out.registrado.tipo === "receita" ? "Receita" : "Gasto"} de {brl(out.registrado.valor)} registrado
                          </p>
                          <p className="text-muted-foreground">{out.registrado.categoria} · {out.registrado.descricao}</p>
                        </div>
                      </div>
                    );
                  if (out?.meta)
                    return (
                      <div key={i} className="flex items-center gap-3 rounded-2xl border-2 border-accent bg-card px-4 py-3">
                        <Target className="h-6 w-6 shrink-0 text-accent-foreground" aria-hidden />
                        <p className="font-bold">
                          Meta “{out.meta.nome}”: {brl(out.meta.guardado)} de {brl(out.meta.valorAlvo)}
                        </p>
                      </div>
                    );
                }
                return null;
              })}
            </div>
          ),
        )}
        {status === "submitted" && (
          <div className="flex gap-1 self-start rounded-full bg-muted px-4 py-3" role="status" aria-label="Lia está pensando">
            {[0, 1, 2].map((d) => (
              <span key={d} className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${d * 150}ms` }} />
            ))}
          </div>
        )}
        <div ref={fimRef} />
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(input);
        }}
        className="sticky bottom-20 mt-6 flex items-end gap-2 rounded-3xl border-2 bg-card p-2 shadow-lg sm:bottom-4"
      >
        <label htmlFor="mensagem" className="sr-only">Escreva sua mensagem</label>
        <textarea
          id="mensagem"
          ref={textRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar(input);
            }
          }}
          placeholder="Ex: gastei 25 reais no almoço"
          className="max-h-40 min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-lg outline-none placeholder:text-muted-foreground"
        />
        <Button type="button" variant={ouvindo ? "destructive" : "secondary"} size="icon" className="h-12 w-12 rounded-full" onClick={alternarMic} aria-label={ouvindo ? "Parar de ouvir" : "Falar por voz"}>
          {ouvindo ? <MicOff /> : <Mic />}
        </Button>
        {ocupado ? (
          <Button type="button" size="icon" className="h-12 w-12 rounded-full" onClick={() => stop()} aria-label="Parar resposta">
            <Square />
          </Button>
        ) : (
          <Button type="submit" size="icon" className="h-12 w-12 rounded-full" disabled={!input.trim()} aria-label="Enviar mensagem">
            <Send />
          </Button>
        )}
      </form>
    </div>
  );
}
