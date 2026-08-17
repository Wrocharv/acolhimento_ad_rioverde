import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { api, type Person, type Interaction, type Need, type CustomAnswer } from "@/lib/api";

type PersonDetail = Person & { interactions: Interaction[]; needs: Need[]; customAnswers: CustomAnswer[] };

const statusLabels: Record<Person["status"], string> = {
  visitante: "Visitante",
  decisao: "Decisão por Cristo",
  em_acompanhamento: "Em acompanhamento",
  membro: "Membro",
  afastado: "Afastado",
};

const interactionTypeLabels: Record<Interaction["type"], string> = {
  mensagem: "Mensagem",
  ligacao: "Ligação",
  presenca_culto: "Presença em culto",
  visita: "Visita",
  outro: "Outro",
};

const needTypeLabels: Record<Need["type"], string> = {
  financeiro: "Financeiro",
  oracao: "Oração",
  aconselhamento: "Aconselhamento",
  outro: "Outro",
};

export default function AdminPersonDetailPage() {
  const params = useParams<{ id: string }>();
  const personId = Number(params.id);
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [interactionType, setInteractionType] = useState<Interaction["type"]>("mensagem");
  const [interactionNote, setInteractionNote] = useState("");
  const [needType, setNeedType] = useState<Need["type"]>("oracao");
  const [needDescription, setNeedDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const data = await api.get<PersonDetail>(`/api/admin/people/${personId}`);
    setPerson(data);
    setNotes(data.notes ?? "");
    setAssignedTo(data.assignedTo ?? "");
  }

  useEffect(() => {
    load();
  }, [personId]);

  async function updateStatus(status: Person["status"]) {
    await api.patch(`/api/admin/people/${personId}`, { status });
    load();
  }

  async function saveNotes() {
    setSaving(true);
    try {
      await api.patch(`/api/admin/people/${personId}`, { notes, assignedTo });
      load();
    } finally {
      setSaving(false);
    }
  }

  async function addInteraction(e: React.FormEvent) {
    e.preventDefault();
    await api.post(`/api/admin/people/${personId}/interactions`, { type: interactionType, note: interactionNote.trim() || undefined });
    setInteractionNote("");
    load();
  }

  async function addNeed(e: React.FormEvent) {
    e.preventDefault();
    if (!needDescription.trim()) return;
    await api.post(`/api/admin/people/${personId}/needs`, { type: needType, description: needDescription.trim() });
    setNeedDescription("");
    load();
  }

  async function resolveNeed(needId: number, status: Need["status"]) {
    await api.patch(`/api/admin/needs/${needId}`, { status });
    load();
  }

  async function markWelcomeSent() {
    await api.post(`/api/admin/people/${personId}/welcome-sent`);
    load();
  }

  function buildWelcomeWhatsAppLink() {
    if (!person) return "#";
    const phone = person.phone.replace(/\D/g, "");
    const firstName = person.fullName.trim().split(/\s+/)[0] ?? person.fullName;
    const text = encodeURIComponent(
      `Olá ${firstName}! Que alegria ter você conosco na AD Rio Verde. 🙌\n\nQue bom que você tomou a decisão de aceitar Jesus! Queremos te acompanhar de perto nessa nova caminhada — qualquer coisa que precisar, estamos aqui.`,
    );
    return `https://wa.me/55${phone}?text=${text}`;
  }

  if (!person) {
    return (
      <AdminLayout>
        <p className="text-sm text-muted">Carregando...</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Link href="/admin" className="text-sm text-primary hover:underline">
        ← Voltar
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{person.fullName}</h1>
          <p className="mt-1 text-sm text-muted">
            {person.phone} {person.city ? `· ${person.city}` : ""} · {person.congregation}
          </p>
        </div>
        <select
          value={person.status}
          onChange={(e) => updateStatus(e.target.value as Person["status"])}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {person.decisionForChrist && !person.welcomeMessageSentAt && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4">
          <p className="text-sm text-foreground">Decidiu por Cristo em {new Date(person.decisionDate!).toLocaleDateString("pt-BR")} — mensagem de boas-vindas ainda não enviada.</p>
          <a
            href={buildWelcomeWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={markWelcomeSent}
            className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            Enviar boas-vindas
          </a>
        </div>
      )}
      {person.decisionForChrist && person.welcomeMessageSentAt && (
        <p className="mt-4 text-xs text-success">
          Boas-vindas enviada em {new Date(person.welcomeMessageSentAt).toLocaleString("pt-BR")}
        </p>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-foreground">Dados</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Sexo</dt>
              <dd className="capitalize">{person.sex ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Endereço</dt>
              <dd>{person.address ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Como conheceu</dt>
              <dd>{person.howFound ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Culto</dt>
              <dd>{person.service ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Data da visita</dt>
              <dd>{new Date(person.firstVisitDate).toLocaleDateString("pt-BR")}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Origem do cadastro</dt>
              <dd>{person.source === "qrcode" ? "QR code" : "Preenchimento manual"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Preenchido por</dt>
              <dd>{person.filledBy ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Aceita visita</dt>
              <dd>
                {person.acceptsVisit
                  ? `Sim${person.preferredVisitDay ? ` · ${person.preferredVisitDay}` : ""}${person.preferredVisitTime ? ` · ${person.preferredVisitTime}` : ""}`
                  : "Não"}
              </dd>
            </div>
            {person.customAnswers.map((answer) => (
              <div key={answer.id} className="flex justify-between gap-3">
                <dt className="text-muted">{answer.label}</dt>
                <dd className="text-right">{answer.value ?? "—"}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium text-muted">Responsável pelo acompanhamento</label>
            <input
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="mt-3">
            <label className="mb-1.5 block text-xs font-medium text-muted">Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={saveNotes}
            disabled={saving}
            className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-foreground">Necessidades</h2>
          <div className="mt-3 space-y-2">
            {person.needs.map((n) => (
              <div key={n.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{needTypeLabels[n.type]}</span>
                  <p className="text-muted">{n.description}</p>
                </div>
                <button
                  onClick={() => resolveNeed(n.id, n.status === "aberto" ? "resolvido" : "aberto")}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    n.status === "aberto" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                  }`}
                >
                  {n.status === "aberto" ? "Aberto" : "Resolvido"}
                </button>
              </div>
            ))}
            {!person.needs.length && <p className="text-sm text-muted">Nenhuma necessidade registrada.</p>}
          </div>
          <form onSubmit={addNeed} className="mt-4 space-y-2">
            <select value={needType} onChange={(e) => setNeedType(e.target.value as Need["type"])} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              {Object.entries(needTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              value={needDescription}
              onChange={(e) => setNeedDescription(e.target.value)}
              placeholder="Descrição"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <button type="submit" className="w-full rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5">
              Adicionar necessidade
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-foreground">Histórico de interações</h2>
        <form onSubmit={addInteraction} className="mt-3 flex flex-wrap gap-2">
          <select value={interactionType} onChange={(e) => setInteractionType(e.target.value as Interaction["type"])} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {Object.entries(interactionTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            value={interactionNote}
            onChange={(e) => setInteractionNote(e.target.value)}
            placeholder="Observação (opcional)"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5">
            Adicionar
          </button>
        </form>

        <div className="mt-4 space-y-2">
          {person.interactions.map((i) => (
            <div key={i.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              <div>
                <span className="font-medium">{interactionTypeLabels[i.type]}</span>
                {i.note && <span className="text-muted"> — {i.note}</span>}
              </div>
              <span className="text-xs text-muted">{new Date(i.createdAt).toLocaleString("pt-BR")}</span>
            </div>
          ))}
          {!person.interactions.length && <p className="text-sm text-muted">Nenhuma interação registrada.</p>}
        </div>
      </div>
    </AdminLayout>
  );
}
