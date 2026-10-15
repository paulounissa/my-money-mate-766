import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai/run-id";

const CATEGORIAS =
  "Mercado, Alimentação, Transporte, Moradia, Contas, Saúde, Educação, Lazer, Compras, Salário, Outros";

const tools = {
  registrar_transacao: tool({
    description:
      "Registra um gasto ou uma receita que a pessoa contou na conversa. Use sempre que ela mencionar um valor gasto ou recebido.",
    inputSchema: z.object({
      tipo: z.enum(["gasto", "receita"]),
      valor: z.number().describe("Valor em reais, positivo"),
      categoria: z.string().describe(`Uma de: ${CATEGORIAS}`),
      descricao: z.string().describe("Descrição curta, ex: 'Mercado'"),
    }),
  }),
  criar_meta: tool({
    description: "Cria uma meta financeira, ex: economizar R$ 500 até o fim do mês.",
    inputSchema: z.object({
      nome: z.string(),
      valorAlvo: z.number(),
      prazo: z.string().nullable().describe("Data limite AAAA-MM-DD, ou null"),
    }),
  }),
  guardar_na_meta: tool({
    description: "Adiciona dinheiro guardado a uma meta existente (use o id da meta do contexto).",
    inputSchema: z.object({ metaId: z.string(), valor: z.number() }),
  }),
};

export type FinanceTools = typeof tools;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Chave de IA não configurada", { status: 500 });
        const body = (await request.json()) as { messages: UIMessage[]; contexto?: string };
        if (!Array.isArray(body.messages)) return new Response("Requisição inválida", { status: 400 });

        const hoje = new Date().toISOString().slice(0, 10);
        const instructions = `Você é a Lia, assistente financeira amigável de um app de finanças pessoais para iniciantes. Fale em português do Brasil, com frases curtas, simples e acolhedoras, tom educativo e sem jargões. Hoje é ${hoje}.
- Quando a pessoa contar um gasto ou receita, chame registrar_transacao (categorias: ${CATEGORIAS}). Se faltar o valor, pergunte.
- Quando ela quiser uma meta, chame criar_meta. Quando disser que guardou dinheiro para uma meta, chame guardar_na_meta.
- Depois de registrar, confirme em uma frase e, quando fizer sentido, dê UMA dica prática de economia baseada nos hábitos dela.
- Use valores no formato R$ 1.234,56. Respostas com no máximo 4 frases curtas.
Dados atuais da pessoa:
${body.contexto ?? "Sem dados ainda."}`;

        const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
        const provider = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: runIdFetch.fetch,
        });

        const result = streamText({
          model: provider.responses("openai/gpt-6-astra"),
          instructions,
          messages: await convertToModelMessages(body.messages),
          tools,
          abortSignal: request.signal,
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        return withLovableAiGatewayRunIdHeader(
          result.toUIMessageStreamResponse({
            originalMessages: body.messages,
            onError: (e) => {
              const msg = e instanceof Error ? e.message : String(e);
              if (msg.includes("429")) return "Muitas mensagens seguidas. Aguarde um pouquinho e tente de novo.";
              if (msg.includes("402")) return "Os créditos de IA acabaram. Adicione créditos para continuar.";
              return "Não consegui responder agora. Tente novamente.";
            },
          }),
          runIdFetch,
        );
      },
    },
  },
});
