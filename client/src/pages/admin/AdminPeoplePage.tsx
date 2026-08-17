import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { api, type Person } from "@/lib/api";

const statusLabels: Record<Person["status"], string> = {
  visitante: "Visitante",
  decisao: "Decisão por Cristo",
  em_acompanhamento: "Em acompanhamento",
  membro: "Membro",
  afastado: "Afastado",
};

const statusColors: Record<Person["status"], string> = {
  visitante: "bg-border text-muted",
  decisao: "bg-accent/20 text-accent-dark",
  em_acompanhamento: "bg-primary/10 text-primary",
  membro: "bg-success/10 text-success",
  afastado: "bg-danger/10 text-danger",
};

const EXPORT_FIELD_OPTIONS = [
  { key: "fullName", label: "Nome" },
  { key: "phone", label: "Telefone" },
  { key: "congregation", label: "Congregação" },
  { key: "service", label: "Culto" },
  { key: "filledBy", label: "Preenchido por" },
  { key: "sex", label: "Sexo" },
  { key: "address", label: "Endereço" },
  { key: "city", label: "Cidade" },
  { key: "status", label: "Status" },
  { key: "decisionForChrist", label: "Decisão por Cristo" },
  { key: "decisionDate", label: "Data da decisão" },
  { key: "firstVisitDate", label: "Primeira visita" },
  { key: "howFound", label: "Como conheceu" },
  { key: "assignedTo", label: "Responsável" },
  { key: "notes", label: "Observações" },
  { key: "acceptsVisit", label: "Aceita visita" },
  { key: "preferredVisitDay", label: "Melhor dia p/ visita" },
  { key: "preferredVisitTime", label: "Melhor horário p/ visita" },
] as const;

const DEFAULT_EXPORT_FIELDS = ["fullName", "phone", "city", "status", "decisionForChrist"];

export default function AdminPeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [congregationFilter, setCongregationFilter] = useState("");
  const [search, setSearch] = useState("");
  const [exportFields, setExportFields] = useState<string[]>(DEFAULT_EXPORT_FIELDS);
  const [exportDecision, setExportDecision] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (congregationFilter) params.set("congregation", congregationFilter);
    if (search.trim()) params.set("search", search.trim());
    const data = await api.get<Person[]>(`/api/admin/people?${params.toString()}`);
    setPeople(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [statusFilter, congregationFilter, search]);

  function toggleExportField(key: string) {
    setExportFields((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));
  }

  function buildExportParams() {
    return new URLSearchParams({
      fields: (exportFields.length ? exportFields : DEFAULT_EXPORT_FIELDS).join(","),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(congregationFilter ? { congregation: congregationFilter } : {}),
      ...(exportDecision ? { decisionForChrist: exportDecision } : {}),
    });
  }

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
          <option value="">Todos os status</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={congregationFilter}
          onChange={(e) => setCongregationFilter(e.target.value)}
          placeholder="Congregação"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>

      <div className="mb-6 rounded-xl border border-border bg-surface p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Exportar lista</span>

        <div className="mt-3">
          <select
            value={exportDecision}
            onChange={(e) => setExportDecision(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">Decisão por Cristo: todos</option>
            <option value="true">Só quem decidiu</option>
            <option value="false">Só quem não decidiu</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          {EXPORT_FIELD_OPTIONS.map((field) => (
            <label key={field.key} className="flex items-center gap-1.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={exportFields.includes(field.key)}
                onChange={() => toggleExportField(field.key)}
                className="rounded border-border"
              />
              {field.label}
            </label>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={`/api/admin/people/export.csv?${buildExportParams().toString()}`}
            className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5"
          >
            Exportar CSV
          </a>
          <a
            href={`/api/admin/people/export.xlsx?${buildExportParams().toString()}`}
            className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5"
          >
            Exportar Excel
          </a>
          <a
            href={`/admin/exportar/imprimir?${buildExportParams().toString()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5"
          >
            Gerar PDF
          </a>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Carregando...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background/60 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Congregação</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Primeira visita</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/admin/pessoas/${p.id}`} className="text-primary hover:underline">
                      {p.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{p.phone}</td>
                  <td className="px-4 py-3">{p.congregation}</td>
                  <td className="px-4 py-3">{p.city ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[p.status]}`}>{statusLabels[p.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-muted">{new Date(p.firstVisitDate).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
              {!people.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                    Nenhuma pessoa encontrada.
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
