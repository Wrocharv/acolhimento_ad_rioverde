import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { api, ApiError, type KidsPainel, type KidsSignup } from "@/lib/api";

const campo =
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";
const botao = "rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-primary-dark disabled:opacity-60";
const botaoLeve = "rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition hover:border-primary hover:text-primary";

function telefone(v: string) {
  const d = v.replace(/\D/g, "");
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : v;
}
const whatsapp = (fone: string, texto: string) => `https://wa.me/55${fone.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;

/**
 * Painel da Missao Reino Kids: equipes, quem esta confirmado, quem esta na fila e a presenca do dia.
 * Subir alguem da fila e sempre manual — o Wellington escolhe quem entra quando abre vaga.
 */
export default function AdminKidsPage() {
  const [dados, setDados] = useState<KidsPainel | null>(null);
  const [equipeAberta, setEquipeAberta] = useState<number | null>(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [evento, setEvento] = useState({ title: "", eventDate: "", startTime: "", place: "", notes: "" });

  const carregar = (edicaoId?: number) =>
    api
      .get<KidsPainel>(`/api/admin/kids/painel${edicaoId ? `?edicao=${edicaoId}` : ""}`)
      .then((d) => {
        setDados(d);
        setEvento({
          title: d.edicao.title,
          eventDate: d.edicao.eventDate ?? "",
          startTime: d.edicao.startTime ?? "",
          place: d.edicao.place ?? "",
          notes: d.edicao.notes ?? "",
        });
      })
      .catch(() => setErro("Não consegui carregar o painel."));

  useEffect(() => {
    carregar();
  }, []);

  const porEquipe = useMemo(() => {
    const m = new Map<number, KidsSignup[]>();
    (dados?.inscricoes ?? []).forEach((i) => m.set(i.teamId, [...(m.get(i.teamId) ?? []), i]));
    return m;
  }, [dados]);

  async function mudar(inscricao: KidsSignup, mudancas: Record<string, unknown>) {
    setErro("");
    try {
      await api.patch(`/api/admin/kids/inscricoes/${inscricao.id}`, mudancas);
      await carregar(dados?.edicao.id);
    } catch (e) {
      setErro(e instanceof ApiError && e.message === "equipe_lotada" ? "Essa equipe já está completa. Abra uma vaga antes." : "Não consegui salvar.");
    }
  }

  async function salvarEvento(e: React.FormEvent) {
    e.preventDefault();
    if (!dados) return;
    setSalvando(true);
    try {
      await api.patch(`/api/admin/kids/edicoes/${dados.edicao.id}`, {
        title: evento.title,
        eventDate: evento.eventDate || null,
        startTime: evento.startTime || null,
        place: evento.place || null,
        notes: evento.notes || null,
      });
      await carregar(dados.edicao.id);
    } catch {
      setErro("Não consegui salvar os dados do evento.");
    } finally {
      setSalvando(false);
    }
  }

  function baixarContatos() {
    if (!dados) return;
    const nomeEquipe = (id: number) => dados.equipes.find((e) => e.id === id)?.name ?? "";
    const linhas = [
      ["Equipe", "Situação", "Nome", "WhatsApp", "Idade", "Igreja", "Colete", "Já serviu", "Observações"],
      ...dados.inscricoes.map((i) => [
        nomeEquipe(i.teamId),
        i.status,
        i.fullName,
        telefone(i.phone),
        i.age ?? "",
        i.congregation ?? "",
        i.vestSize ?? "",
        i.experience ?? "",
        i.notes ?? "",
      ]),
    ];
    const csv = "﻿" + linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `missao-reino-kids-${dados.edicao.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!dados) {
    return (
      <AdminLayout>
        <p className="py-16 text-center text-sm text-muted">{erro || "Carregando…"}</p>
      </AdminLayout>
    );
  }

  const totalConfirmados = dados.equipes.reduce((s, e) => s + e.confirmados, 0);
  const totalVagas = dados.equipes.reduce((s, e) => s + e.slots, 0);
  const totalFila = dados.equipes.reduce((s, e) => s + e.fila, 0);
  const presentes = dados.inscricoes.filter((i) => i.attendedAt).length;

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Missão Reino Kids</h1>
          <p className="mt-1 text-sm text-muted">
            {totalConfirmados} de {totalVagas} vagas preenchidas · {totalFila} na fila · {presentes} presentes no dia
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            value={dados.edicao.id}
            onChange={(e) => carregar(Number(e.target.value))}
          >
            {dados.edicoes.map((ed) => (
              <option key={ed.id} value={ed.id}>
                {ed.title} {ed.open ? "(aberta)" : ""}
              </option>
            ))}
          </select>
          <button type="button" className={botaoLeve} onClick={baixarContatos}>
            Baixar contatos
          </button>
          <button
            type="button"
            className={botaoLeve}
            onClick={async () => {
              await api.patch(`/api/admin/kids/edicoes/${dados.edicao.id}`, { open: !dados.edicao.open });
              carregar(dados.edicao.id);
            }}
          >
            {dados.edicao.open ? "Encerrar inscrições" : "Reabrir inscrições"}
          </button>
          <button
            type="button"
            className={botaoLeve}
            onClick={async () => {
              const title = prompt("Nome da nova edição:", "Missão Reino Kids");
              if (!title) return;
              const nova = await api.post<{ id: number }>("/api/admin/kids/edicoes", { title });
              carregar(nova.id);
            }}
          >
            Nova edição
          </button>
        </div>
      </div>

      {erro && <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{erro}</p>}

      <form onSubmit={salvarEvento} className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-display text-xl">Dados do evento</h2>
        <p className="mt-1 text-sm text-muted">Aparecem na tela de inscrição do voluntário.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className="font-medium">Nome</span>
            <input className={`mt-1 ${campo}`} value={evento.title} onChange={(e) => setEvento({ ...evento, title: e.target.value })} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Data</span>
            <input type="date" className={`mt-1 ${campo}`} value={evento.eventDate} onChange={(e) => setEvento({ ...evento, eventDate: e.target.value })} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Horário dos voluntários</span>
            <input
              placeholder="Chegar às 7h"
              className={`mt-1 ${campo}`}
              value={evento.startTime}
              onChange={(e) => setEvento({ ...evento, startTime: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Local</span>
            <input className={`mt-1 ${campo}`} value={evento.place} onChange={(e) => setEvento({ ...evento, place: e.target.value })} />
          </label>
        </div>
        <label className="mt-3 block text-sm">
          <span className="font-medium">Recado para os voluntários</span>
          <textarea rows={2} className={`mt-1 ${campo}`} value={evento.notes} onChange={(e) => setEvento({ ...evento, notes: e.target.value })} />
        </label>
        <button disabled={salvando} className={`mt-3 ${botao}`}>
          {salvando ? "Salvando…" : "Salvar"}
        </button>
        <p className="mt-3 text-xs text-muted">
          Link para divulgar: <b className="text-foreground">{location.origin}/reino-kids</b>
        </p>
      </form>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {dados.equipes.map((e) => {
          const lista = porEquipe.get(e.id) ?? [];
          const confirmados = lista.filter((i) => i.status === "confirmado");
          const fila = lista.filter((i) => i.status === "espera");
          const cancelados = lista.filter((i) => i.status === "cancelado");
          const aberta = equipeAberta === e.id;
          return (
            <section key={e.id} className="rounded-2xl border border-border bg-surface p-4">
              <button type="button" className="w-full text-left" onClick={() => setEquipeAberta(aberta ? null : e.id)}>
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{e.name}</span>
                  <span className={`text-xs font-semibold ${e.vagas === 0 ? "text-warning" : "text-success"}`}>
                    {e.confirmados}/{e.slots}
                  </span>
                </span>
                <span className="mt-2 block h-2 overflow-hidden rounded-full bg-background">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (e.confirmados / Math.max(e.slots, 1)) * 100)}%` }} />
                </span>
                <span className="mt-1 block text-xs text-muted">
                  {e.vagas === 0 ? "Completa" : `${e.vagas} ${e.vagas === 1 ? "vaga" : "vagas"}`}
                  {e.fila > 0 && ` · ${e.fila} na fila`}
                </span>
              </button>

              {aberta && (
                <div className="mt-3 space-y-3 border-t border-border pt-3">
                  {[
                    ["Confirmados", confirmados],
                    ["Fila de espera", fila],
                    ["Cancelados", cancelados],
                  ].map(([titulo, grupo]) => {
                    const pessoas = grupo as KidsSignup[];
                    if (!pessoas.length) return null;
                    return (
                      <div key={titulo as string}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{titulo as string}</p>
                        <ul className="mt-1 space-y-2">
                          {pessoas.map((i, idx) => (
                            <li key={i.id} className="rounded-xl bg-background p-3 text-sm">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-medium">
                                    {i.status === "espera" && <span className="text-muted">{idx + 1}º · </span>}
                                    {i.fullName}
                                  </p>
                                  <p className="text-xs text-muted">
                                    {telefone(i.phone)}
                                    {i.age ? ` · ${i.age} anos` : ""}
                                    {i.vestSize ? ` · colete ${i.vestSize}` : ""}
                                    {i.congregation ? ` · ${i.congregation}` : ""}
                                  </p>
                                  {(i.experience || i.notes) && <p className="mt-1 text-xs text-muted">{[i.experience, i.notes].filter(Boolean).join(" · ")}</p>}
                                </div>
                                {i.status === "confirmado" && (
                                  <button
                                    type="button"
                                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${i.attendedAt ? "bg-success/10 text-success" : "border border-border text-muted"}`}
                                    onClick={() => mudar(i, { presente: !i.attendedAt })}
                                  >
                                    {i.attendedAt ? "Presente" : "Marcar presença"}
                                  </button>
                                )}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <a
                                  className={botaoLeve}
                                  href={whatsapp(i.phone, `Oi ${i.fullName.split(" ")[0]}! Aqui é da ${dados.edicao.title}.`)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  WhatsApp
                                </a>
                                {i.status === "espera" && (
                                  <button type="button" className={botaoLeve} onClick={() => mudar(i, { status: "confirmado" })}>
                                    Subir para a equipe
                                  </button>
                                )}
                                {i.status === "confirmado" && (
                                  <button type="button" className={botaoLeve} onClick={() => mudar(i, { status: "espera" })}>
                                    Mandar para a fila
                                  </button>
                                )}
                                {i.status !== "cancelado" ? (
                                  <button
                                    type="button"
                                    className={botaoLeve}
                                    onClick={() => confirm(`Cancelar a inscrição de ${i.fullName}?`) && mudar(i, { status: "cancelado" })}
                                  >
                                    Cancelar
                                  </button>
                                ) : (
                                  <button type="button" className={botaoLeve} onClick={() => mudar(i, { status: "espera" })}>
                                    Voltar para a fila
                                  </button>
                                )}
                                <select
                                  className="rounded-full border border-border px-2 py-1 text-xs"
                                  value={i.teamId}
                                  onChange={(ev) => mudar(i, { teamId: Number(ev.target.value) })}
                                >
                                  {dados.equipes.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                  {!lista.length && <p className="text-sm text-muted">Ninguém inscrito nesta equipe ainda.</p>}
                  <label className="flex items-center gap-2 text-xs text-muted">
                    Vagas
                    <input
                      type="number"
                      min={0}
                      max={200}
                      defaultValue={e.slots}
                      className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-sm"
                      onBlur={async (ev) => {
                        const slots = Number(ev.target.value);
                        if (slots === e.slots) return;
                        await api.patch(`/api/admin/kids/equipes/${e.id}`, { slots });
                        carregar(dados.edicao.id);
                      }}
                    />
                  </label>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </AdminLayout>
  );
}
