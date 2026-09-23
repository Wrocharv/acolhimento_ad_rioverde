import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { api } from "@/lib/api";

const tabs = [
  { href: "/admin", label: "Pessoas" },
  { href: "/admin/boas-vindas", label: "Boas-vindas pendentes" },
  { href: "/admin/perguntas", label: "Perguntas personalizadas" },
  { href: "/admin/congregacoes", label: "Congregações" },
  { href: "/admin/voluntarios", label: "Voluntários" },
  { href: "/admin/kids", label: "Missão Reino Kids" },
  { href: "/admin/kids/divulgacao", label: "Divulgação Kids" },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/admin/me")
      .catch(() => {
        if (!cancelled) navigate("/admin/login");
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function handleLogout() {
    await api.post("/api/admin/logout");
    navigate("/admin/login");
  }

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Acolhimento — AD Rio Verde</p>
          <button onClick={handleLogout} className="text-sm text-muted hover:text-foreground">
            Sair
          </button>
        </div>
      </header>
      <nav className="border-b border-border bg-surface px-6">
        <div className="mx-auto flex max-w-5xl gap-6">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`border-b-2 py-3 text-sm font-medium transition ${
                location === tab.href ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
