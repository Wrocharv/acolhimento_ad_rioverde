import { useEffect, useState } from "react";
import { api, type KidsPainel, type KidsSignup } from "@/lib/api";

function telefone(v: string) {
  const d = v.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v;
}

/**
 * Lista de chamada por equipe, pra imprimir e entregar ao lider de cada equipe no dia.
 * Fica fora do AdminLayout de proposito: a folha impressa nao leva menu nem cabecalho do painel.
 */
export default function AdminKidsListPage() {
  const [dados, setDados] = useState<KidsPainel | null>(null);
  const [comFila, setComFila] = useState(true);

  useEffect(() => {
    const edicao = new URLSearchParams(location.search).get("edicao");
    api.get<KidsPainel>(`/api/admin/kids/painel${edicao ? `?edicao=${edicao}` : ""}`).then(setDados);
  }, []);

  if (!dados) return <p className="p-6 text-sm text-muted">Carregando…</p>;

  const { edicao, equipes, inscricoes } = dados;
  const cabecalho = [
    edicao.eventDate && new Date(`${edicao.eventDate}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
    edicao.startTime,
    edicao.place,
  ]
    .filter(Boolean)
    .join(" · ");

  const linha = (p: KidsSignup, i: number, fila: boolean) => (
    <tr key={p.id} className="break-inside-avoid">
      <td className="border border-border px-2 py-1.5 text-center text-xs text-muted">{i + 1}</td>
      <td className="border border-border px-2 py-1.5 font-medium">
        {p.fullName}
        {fila && <span className="ml-2 text-xs text-muted">(fila)</span>}
      </td>
      <td className="border border-border px-2 py-1.5">{telefone(p.phone)}</td>
      <td className="border border-border px-2 py-1.5 text-center">{p.vestSize ?? "—"}</td>
      <td className="border border-border px-2 py-1.5">{p.congregation ?? "—"}</td>
      <td className="border border-border px-2 py-1.5 text-center text-xs">{p.attendedAt ? "presente" : ""}</td>
      <td className="w-24 border border-border px-2 py-1.5"></td>
    </tr>
  );

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={comFila} onChange={(e) => setComFila(e.target.checked)} />
          Incluir a fila de espera de cada equipe
        </label>
        <div className="flex gap-2">
          <a href="/admin/kids" className="rounded-full border border-border px-4 py-2 text-sm font-semibold">
            Voltar ao painel
          </a>
          <button onClick={() => window.print()} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark">
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      <header className="mb-6">
        <h1 className="font-display text-3xl">{edicao.title}</h1>
        <p className="text-sm text-muted">{cabecalho || "Data e local a definir"}</p>
        <p className="mt-1 text-sm text-muted">
          Lista de voluntários por equipe · {inscricoes.filter((i) => i.status === "confirmado").length} confirmados
        </p>
      </header>

      {equipes.map((e) => {
        const confirmados = inscricoes.filter((i) => i.teamId === e.id && i.status === "confirmado");
        const fila = inscricoes.filter((i) => i.teamId === e.id && i.status === "espera");
        if (!confirmados.length && !fila.length) return null;
        return (
          <section key={e.id} className="mb-8 break-inside-avoid">
            <div className="mb-2 flex items-baseline justify-between border-b-2 border-foreground pb-1">
              <h2 className="font-display text-xl">{e.name}</h2>
              <p className="text-sm text-muted">
                {confirmados.length} de {e.slots}
                {fila.length > 0 && ` · ${fila.length} na fila`}
              </p>
            </div>
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted">
                  <th className="border border-border px-2 py-1.5 text-center">#</th>
                  <th className="border border-border px-2 py-1.5">Nome</th>
                  <th className="border border-border px-2 py-1.5">WhatsApp</th>
                  <th className="border border-border px-2 py-1.5 text-center">Colete</th>
                  <th className="border border-border px-2 py-1.5">Igreja</th>
                  <th className="border border-border px-2 py-1.5 text-center">Presença</th>
                  <th className="border border-border px-2 py-1.5">Assinatura</th>
                </tr>
              </thead>
              <tbody>
                {confirmados.map((p, i) => linha(p, i, false))}
                {comFila && fila.map((p, i) => linha(p, confirmados.length + i, true))}
              </tbody>
            </table>
          </section>
        );
      })}

      {!inscricoes.length && <p className="text-sm text-muted">Ninguém inscrito nesta edição ainda.</p>}
    </div>
  );
}
