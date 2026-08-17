import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { api, type CustomField } from "@/lib/api";

export default function AdminCustomFieldsPage() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<CustomField["type"]>("text");
  const [saving, setSaving] = useState(false);

  async function load() {
    const data = await api.get<CustomField[]>("/api/admin/custom-fields");
    setFields(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setSaving(true);
    try {
      await api.post("/api/admin/custom-fields", { label: label.trim(), type });
      setLabel("");
      setType("text");
      load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(field: CustomField) {
    await api.patch(`/api/admin/custom-fields/${field.id}`, { active: !field.active });
    load();
  }

  async function handleDelete(field: CustomField) {
    if (!confirm(`Excluir a pergunta "${field.label}"? As respostas já dadas por pessoas cadastradas também serão apagadas.`)) return;
    await api.delete(`/api/admin/custom-fields/${field.id}`);
    load();
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="font-display text-xl font-semibold text-foreground">Perguntas personalizadas</h1>
        <p className="mt-1 text-sm text-muted">
          Adicione campos extras (texto ou caixa de seleção) que aparecem no formulário público de cadastro, sem precisar mexer no sistema.
        </p>
      </div>

      {fields.length > 0 && (
        <div className="mb-6 space-y-2">
          {fields.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{f.label}</p>
                <p className="text-xs text-muted">{f.type === "text" ? "Campo de texto" : "Caixa de seleção (sim/não)"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => toggleActive(f)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    f.active ? "bg-success/10 text-success hover:bg-success/20" : "bg-border text-muted hover:bg-border/70"
                  }`}
                >
                  {f.active ? "Ativa" : "Inativa"}
                </button>
                <button onClick={() => handleDelete(f)} className="rounded-full px-3 py-1 text-xs font-medium text-danger hover:bg-danger/10">
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleCreate} className="max-w-md space-y-4 rounded-2xl border border-border bg-surface p-6">
        <h3 className="font-display text-base font-semibold text-foreground">Nova pergunta</h3>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Texto da pergunta</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: Tem filhos menores de idade?"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as CustomField["type"])}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="text">Texto livre</option>
            <option value="checkbox">Caixa de seleção (sim/não)</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Adicionar pergunta"}
        </button>
      </form>
    </AdminLayout>
  );
}
