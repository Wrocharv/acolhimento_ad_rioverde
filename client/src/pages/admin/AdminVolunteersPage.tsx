import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { api, type Volunteer } from "@/lib/api";

const statusLabels: Record<Volunteer["status"], string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

const statusColors: Record<Volunteer["status"], string> = {
  pendente: "bg-warning/10 text-warning",
  aprovado: "bg-success/10 text-success",
  rejeitado: "bg-danger/10 text-danger",
};

export default function AdminVolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await api.get<Volunteer[]>("/api/admin/volunteers");
    setVolunteers(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleApprove(id: number) {
    await api.post(`/api/admin/volunteers/${id}/approve`);
    load();
  }

  async function handleReject(id: number) {
    if (!confirm("Rejeitar esse voluntário?")) return;
    await api.post(`/api/admin/volunteers/${id}/reject`);
    load();
  }

  async function handlePromote(id: number) {
    await api.post(`/api/admin/volunteers/${id}/promote`);
    load();
  }

  async function handleDemote(id: number) {
    await api.post(`/api/admin/volunteers/${id}/demote`);
    load();
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="font-display text-xl font-semibold text-foreground">Voluntários</h1>
        <p className="mt-1 text-sm text-muted">
          Todos os voluntários cadastrados, de qualquer congregação. Você pode aprovar/rejeitar direto por aqui, ou promover alguém a líder — só o
          admin pode promover.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Carregando...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background/60 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Congregação</th>
                <th className="px-4 py-3">Função</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {volunteers.map((v) => (
                <tr key={v.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{v.name}</td>
                  <td className="px-4 py-3">{v.email}</td>
                  <td className="px-4 py-3">{v.congregation}</td>
                  <td className="px-4 py-3 capitalize">{v.role}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[v.status]}`}>{statusLabels[v.status]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {v.status !== "aprovado" && (
                        <button onClick={() => handleApprove(v.id)} className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success hover:bg-success/20">
                          Aprovar
                        </button>
                      )}
                      {v.status !== "rejeitado" && (
                        <button onClick={() => handleReject(v.id)} className="rounded-full bg-danger/10 px-3 py-1 text-xs font-medium text-danger hover:bg-danger/20">
                          Rejeitar
                        </button>
                      )}
                      {v.role === "voluntario" ? (
                        <button onClick={() => handlePromote(v.id)} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20">
                          Promover a líder
                        </button>
                      ) : (
                        <button onClick={() => handleDemote(v.id)} className="rounded-full bg-border px-3 py-1 text-xs font-medium text-foreground hover:bg-border/70">
                          Remover liderança
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!volunteers.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                    Nenhum voluntário cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
