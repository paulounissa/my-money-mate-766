import { createFileRoute } from "@tanstack/react-router";
import { Chat } from "@/components/Chat";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lia — Converse e organize seu dinheiro" },
      { name: "description", content: "Conte seus gastos como numa conversa. A Lia registra, organiza e dá dicas para você economizar." },
      { property: "og:title", content: "Lia — Converse e organize seu dinheiro" },
      { property: "og:description", content: "Registre gastos e metas conversando, sem planilhas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Chat,
});
