import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { api, type Congregation } from "@/lib/api";

export default function AdminCongregationsPage() {
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const data = await api.get<Congregation[]>("/api/admin/congregations");
    setCongregations(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post("/api/admin/congregations", { name: name.trim() });
      setName("");
      load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: Congregation) {
    await api.patch(`/api/admin/congregations/${c.id}`, { active: !c.active });
    load();
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="font-display text-xl font-semibold text-foreground">Congregações</h1>
        <p className="mt-1 text-sm text-muted">
          Todas as congregações usam o mesmo sistema e o mesmo banco de dados — a lista abaixo é o que aparece pra escolher no formulário de cadastro.
        </p>
      </div>

      {congregations.length > 0 && (
        <div className="mb-6 space-y-2">
          {congregations.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
              <p className="text-sm font-semibold text-foreground">{c.name}</p>
              <button
                onClick={() => toggleActive(c)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  c.active ? "bg-success/10 text-success hover:bg-success/20" : "bg-border text-muted hover:bg-border/70"
                }`}
              >
                {c.active ? "Ativa" : "Inativa"}
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleCreate} className="flex max-w-md gap-2 rounded-2xl border border-border bg-surface p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da congregação (ex: Bairro Popular)"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={saving}
          className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          Adicionar
        </button>
      </form>
    </AdminLayout>
  );
}
