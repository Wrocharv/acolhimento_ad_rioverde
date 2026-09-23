import { useEffect, useState } from "react";
import { api, ApiError, type KidsEvento, type KidsTeamVagas } from "@/lib/api";

const TAMANHOS = ["P", "M", "G", "GG", "XG"] as const;

const campo =
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";

function mascaraTelefone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
}

function erroEmPortugues(e: unknown) {
  const codigo = e instanceof ApiError ? e.message : "";
  const textos: Record<string, string> = {
    ja_inscrito: "Esse WhatsApp já está inscrito nesta edição. Se quiser trocar de equipe, fale com a organização.",
    equipe_lotada: "Essa equipe encheu agora mesmo. Escolha outra ou entre na fila de espera.",
    equipe_invalida: "Escolha uma equipe da lista.",
    inscricoes_encerradas: "As inscrições estão encerradas.",
    telefone_invalido: "Confira o WhatsApp: DDD + número.",
    invalid_input: "Confira os campos e tente de novo.",
  };
  return textos[codigo] ?? "Não deu certo. Tente de novo em instantes.";
}

/**
 * Inscricao de voluntarios da Missao Reino Kids. A pessoa ve quantas vagas restam em cada equipe;
 * se a que ela quer estiver lotada, escolhe outra ou entra na fila daquela mesma equipe.
 */
export default function KidsSignupPage() {
  const [evento, setEvento] = useState<KidsEvento | null>(null);
  const [equipe, setEquipe] = useState<KidsTeamVagas | null>(null);
  const [form, setForm] = useState({ fullName: "", phone: "", age: "", congregation: "", vestSize: "", experience: "", notes: "" });
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState<{ status: string; equipe: string; posicaoNaFila: number | null } | null>(null);

  useEffect(() => {
    api.get<KidsEvento>("/api/kids/evento").then(setEvento).catch(() => setErro("Não consegui carregar as equipes."));
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!equipe) return setErro("Escolha a equipe onde você quer servir.");
    if (form.fullName.trim().split(/\s+/).length < 2) return setErro("Escreva seu nome completo, com sobrenome.");
    setEnviando(true);
    try {
      const r = await api.post<{ status: string; equipe: string; posicaoNaFila: number | null }>("/api/kids/inscricoes", {
        teamId: equipe.id,
        fullName: form.fullName.trim(),
        phone: form.phone,
        age: form.age ? Number(form.age) : null,
        congregation: form.congregation.trim() || null,
        vestSize: form.vestSize || null,
        experience: form.experience.trim() || null,
        notes: form.notes.trim() || null,
        aceitaFila: equipe.vagas === 0,
      });
      setPronto(r);
    } catch (err) {
      setErro(erroEmPortugues(err));
      api.get<KidsEvento>("/api/kids/evento").then(setEvento).catch(() => {});
    } finally {
      setEnviando(false);
    }
  }

  if (pronto) {
    const naFila = pronto.status === "espera";
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-10">
        <div className="rounded-2xl border border-border bg-surface p-6 text-center">
          <p className="font-display text-3xl">{naFila ? "Você está na fila" : "Inscrição confirmada!"}</p>
          <p className="mt-3 text-sm text-muted">
            {naFila ? (
              <>
                A equipe <b className="text-foreground">{pronto.equipe}</b> está completa. Você é o <b className="text-foreground">{pronto.posicaoNaFila}º</b> da
                fila — se abrir vaga, a organização entra em contato pelo seu WhatsApp.
              </>
            ) : (
              <>
                Você vai servir na equipe <b className="text-foreground">{pronto.equipe}</b>. Guarde a data e fique atento ao WhatsApp: a organização manda os
                combinados por lá.
              </>
            )}
          </p>
          <p className="mt-4 text-sm font-semibold text-primary">Que Deus abençoe o seu serviço!</p>
        </div>
      </div>
    );
  }

  if (!evento) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted">{erro || "Carregando…"}</div>;
  }

  const { edicao, equipes, totalVagas, totalConfirmados, lotado } = evento;
  const fechado = !edicao.open;

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <header className="rounded-2xl bg-primary px-6 py-7 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Inscrição de voluntários</p>
        <h1 className="mt-1 font-display text-3xl leading-tight">{edicao.title}</h1>
        <p className="mt-2 text-sm text-white/85">
          {[edicao.eventDate && new Date(`${edicao.eventDate}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }), edicao.startTime, edicao.place]
            .filter(Boolean)
            .join(" · ") || "Data e local serão divulgados em breve."}
        </p>
        <p className="mt-4 text-sm">
          <b>{totalConfirmados}</b> de <b>{totalVagas}</b> vagas preenchidas
        </p>
      </header>

      {edicao.notes && <p className="mt-4 rounded-2xl border border-border bg-surface p-4 text-sm text-muted">{edicao.notes}</p>}

      {fechado ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          As inscrições desta edição estão encerradas. Fique atento: em breve abrimos a próxima.
        </p>
      ) : (
        <form onSubmit={enviar} className="mt-6 space-y-6">
          <section>
            <h2 className="font-display text-xl">Onde você quer servir?</h2>
            <p className="mt-1 text-sm text-muted">
              {lotado
                ? "Todas as equipes estão completas. Você pode entrar na fila de espera da equipe que preferir."
                : "Escolha uma equipe. As que estão completas aceitam fila de espera."}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {equipes.map((e) => {
                const escolhida = equipe?.id === e.id;
                const cheia = e.vagas === 0;
                return (
                  <button
                    type="button"
                    key={e.id}
                    onClick={() => setEquipe(e)}
                    className={`rounded-xl border p-3 text-left transition ${escolhida ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-surface hover:border-primary/40"}`}
                  >
                    <span className="block text-sm font-semibold">{e.name}</span>
                    <span className={`mt-1 block text-xs ${cheia ? "text-warning" : "text-success"}`}>
                      {cheia ? `Completa · fila com ${e.fila}` : `${e.vagas} ${e.vagas === 1 ? "vaga" : "vagas"} de ${e.slots}`}
                    </span>
                  </button>
                );
              })}
            </div>
            {equipe?.vagas === 0 && (
              <p className="mt-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
                A equipe <b>{equipe.name}</b> está completa. Ao enviar, você entra na <b>fila de espera</b> dela. Se preferir servir hoje mesmo, escolha uma
                equipe com vaga acima.
              </p>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-display text-xl">Seus dados</h2>
            <label className="block text-sm">
              <span className="font-medium">Nome completo</span>
              <input required className={`mt-1 ${campo}`} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium">WhatsApp</span>
                <input
                  required
                  inputMode="tel"
                  placeholder="(64) 99999-0000"
                  className={`mt-1 ${campo}`}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: mascaraTelefone(e.target.value) })}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium">Idade</span>
                <input
                  inputMode="numeric"
                  className={`mt-1 ${campo}`}
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium">Igreja ou congregação</span>
                <input className={`mt-1 ${campo}`} value={form.congregation} onChange={(e) => setForm({ ...form, congregation: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="font-medium">Tamanho do colete</span>
                <select className={`mt-1 ${campo}`} value={form.vestSize} onChange={(e) => setForm({ ...form, vestSize: e.target.value })}>
                  <option value="">Escolha</option>
                  {TAMANHOS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm">
              <span className="font-medium">Já serviu em outra Missão Reino? Em qual equipe?</span>
              <input className={`mt-1 ${campo}`} value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Observações</span>
              <textarea
                rows={3}
                placeholder="Horário que pode chegar, restrição de saúde, o que quiser avisar."
                className={`mt-1 ${campo}`}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>
          </section>

          {erro && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{erro}</p>}

          <button
            disabled={enviando}
            className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-primary-dark disabled:opacity-60"
          >
            {enviando ? "Enviando…" : equipe?.vagas === 0 ? "Entrar na fila de espera" : "Confirmar minha inscrição"}
          </button>
        </form>
      )}
    </div>
  );
}
