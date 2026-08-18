import { useEffect, useState } from "react";
import { Link } from "wouter";
import { api, type Volunteer } from "@/lib/api";

type PendingVolunteer = { id: number; name: string; email: string; createdAt: string };

export default function VolunteerDashboardPage() {
  const [me, setMe] = useState<Volunteer | null>(null);
  const [checking, setChecking] = useState(true);
  const [pending, setPending] = useState<PendingVolunteer[]>([]);

  async function load() {
    const data = await api.get<PendingVolunteer[]>("/api/volunteers/pending");
    setPending(data);
  }

  useEffect(() => {
    api
      .get<Volunteer>("/api/volunteers/me")
      .then((data) => {
        setMe(data);
        if (data.role === "lider") load();
      })
      .catch(() => setMe(null))
      .finally(() => setChecking(false));
  }, []);

  async function handleApprove(id: number) {
    await api.post(`/api/volunteers/${id}/approve`);
    load();
  }

  async function handleReject(id: number) {
    if (!confirm("Rejeitar esse cadastro de voluntário?")) return;
    await api.post(`/api/volunteers/${id}/reject`);
    load();
  }

  async function handleLogout() {
    await api.post("/api/volunteers/logout");
    window.location.href = "/voluntario";
  }

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted">Carregando...</div>;
  }

  if (!me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div className="max-w-sm">
          <h1 className="font-display text-lg font-bold text-foreground">Você precisa entrar</h1>
          <p className="mt-2 text-sm text-muted">Faça login com seu acesso de voluntário para continuar.</p>
          <Link href="/voluntario" className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">
            Ir para o login
          </Link>
        </div>
      </div>
    );
  }

  if (me.role !== "lider") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div className="max-w-sm">
          <h1 className="font-display text-lg font-bold text-foreground">Área restrita a líderes</h1>
          <p className="mt-2 text-sm text-muted">Essa página é só para o líder de cada congregação aprovar novos voluntários.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Voluntários pendentes</h1>
            <p className="mt-1 text-sm text-muted">Congregação: {me.congregation}</p>
          </div>
          <button onClick={handleLogout} className="text-sm text-muted hover:text-foreground">
            Sair
          </button>
        </div>

        <div className="space-y-3">
          {pending.map((v) => (
            <div key={v.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
              <div>
                <p className="font-semibold text-foreground">{v.name}</p>
                <p className="text-sm text-muted">{v.email}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(v.id)}
                  className="rounded-full bg-success/10 px-4 py-2 text-sm font-medium text-success hover:bg-success/20"
                >
                  Aprovar
                </button>
                <button onClick={() => handleReject(v.id)} className="rounded-full bg-danger/10 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/20">
                  Rejeitar
                </button>
              </div>
            </div>
          ))}
          {!pending.length && <p className="text-sm text-muted">Nenhum voluntário aguardando aprovação.</p>}
        </div>
      </div>
    </div>
  );
}
