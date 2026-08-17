import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type ExportData = {
  columns: { key: string; label: string }[];
  rows: Record<string, string>[];
};

export default function AdminExportPrintPage() {
  const [data, setData] = useState<ExportData | null>(null);

  useEffect(() => {
    const query = window.location.search;
    api.get<ExportData>(`/api/admin/people/export.json${query}`).then(setData);
  }, []);

  if (!data) {
    return <p className="p-6 text-sm text-muted">Carregando...</p>;
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <p className="text-sm text-muted">{data.rows.length} pessoa(s) — use o comando de impressão do navegador para salvar como PDF.</p>
        <button onClick={() => window.print()} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark">
          Imprimir / Salvar PDF
        </button>
      </div>

      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            {data.columns.map((col) => (
              <th key={col.key} className="border border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i}>
              {data.columns.map((col) => (
                <td key={col.key} className="border border-border px-3 py-2">
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
          {!data.rows.length && (
            <tr>
              <td colSpan={data.columns.length} className="px-3 py-8 text-center text-muted">
                Nenhuma pessoa encontrada com esses filtros.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
