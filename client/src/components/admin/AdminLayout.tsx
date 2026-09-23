import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { api, type AdminUser } from "@/lib/api";

/** `kids: true` = aba que quem so cuida da Missao Reino Kids tambem enxerga. */
const tabs = [
  { href: "/admin", label: "Pessoas" },
  { href: "/admin/boas-vindas", label: "Boas-vindas pendentes" },
  { href: "/admin/perguntas", label: "Perguntas personalizadas" },
  { href: "/admin/congregacoes", label: "Congregações" },
  { href: "/admin/voluntarios", label: "Voluntários" },
  { href: "/admin/kids", label: "Missão Reino Kids", kids: true },
  { href: "/admin/kids/divulgacao", label: "Divulgação Kids", kids: true },
  { href: "/admin/administradores", label: "Administradores" },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const [checking, setChecking] = useState(true);
  const [eu, setEu] = useState<AdminUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<AdminUser>("/api/admin/me")
      .then((admin) => {
        if (cancelled) return;
        setEu(admin);
        // Quem so cuida do evento nao abre as telas da igreja: cai direto na area do Kids.
        if (admin.role === "kids" && !location.startsWith("/admin/kids")) navigate("/admin/kids");
      })
      .catch(() => {
        if (!cancelled) navigate("/admin/login");
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, location]);

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
          {tabs
            .filter((tab) => eu?.role !== "kids" || tab.kids)
            .map((tab) => (
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
