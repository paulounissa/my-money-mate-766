import { Link } from "@tanstack/react-router";
import { MessageCircle, Target, PieChart, Leaf } from "lucide-react";
import type { ReactNode } from "react";

const itens = [
  { to: "/", label: "Conversa", icon: MessageCircle },
  { to: "/metas", label: "Metas", icon: Target },
  { to: "/relatorios", label: "Relatórios", icon: PieChart },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded-lg focus:bg-card focus:p-3">
        Pular para o conteúdo
      </a>
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-extrabold text-primary">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
              <Leaf className="h-5 w-5" aria-hidden />
            </span>
            Lia
          </Link>
          <nav aria-label="Principal" className="hidden gap-1 sm:flex">
            {itens.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: true }}
                className="flex items-center gap-2 rounded-full px-4 py-2 font-bold text-muted-foreground transition-colors hover:bg-muted data-[status=active]:bg-secondary data-[status=active]:text-secondary-foreground"
              >
                <Icon className="h-5 w-5" aria-hidden /> {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main id="conteudo" className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-28 pt-6 sm:pb-8">
        {children}
      </main>
      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t bg-card sm:hidden">
        {itens.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: true }}
            className="flex flex-col items-center gap-1 py-3 text-sm font-bold text-muted-foreground data-[status=active]:text-primary"
          >
            <Icon className="h-6 w-6" aria-hidden /> {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
