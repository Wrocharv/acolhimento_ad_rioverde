import { useEffect, useState } from "react";
import { api, type CustomField, type Congregation } from "@/lib/api";

// Mesmo formulário serve pro QR code (preenchimento pela própria pessoa) e pro preenchimento
// assistido pela equipe de recepção — acessando com ?equipe=1 só muda a origem registrada.
// A congregação é escolhida manualmente por quem preenche (geralmente um voluntário da recepção),
// mas o link pode vir com ?congregacao=Norte pra já deixar pré-selecionada.
const searchParams = new URLSearchParams(window.location.search);
const isStaffEntry = searchParams.has("equipe");
const preselectedCongregation = searchParams.get("congregacao")?.trim() ?? "";
const todayIso = new Date().toISOString().slice(0, 10);

export default function PublicFormPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [congregation, setCongregation] = useState("");
  const [service, setService] = useState("");
  const [visitDate, setVisitDate] = useState(todayIso);
  const [filledBy, setFilledBy] = useState("");
  const [sex, setSex] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [howFound, setHowFound] = useState("");
  const [decisionForChrist, setDecisionForChrist] = useState(false);
  const [acceptsVisit, setAcceptsVisit] = useState(false);
  const [preferredVisitDay, setPreferredVisitDay] = useState("");
  const [preferredVisitTime, setPreferredVisitTime] = useState("");
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customAnswers, setCustomAnswers] = useState<Record<number, string | boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api
      .get<Congregation[]>("/api/congregations")
      .then((data) => {
        setCongregations(data);
        if (preselectedCongregation && data.some((c) => c.name === preselectedCongregation)) {
          setCongregation(preselectedCongregation);
        } else if (data.length === 1) {
          setCongregation(data[0].name);
        }
      })
      .catch(() => setCongregations([]));
    api
      .get<CustomField[]>("/api/custom-fields")
      .then(setCustomFields)
      .catch(() => setCustomFields([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/people", {
        fullName: fullName.trim(),
        phone: phone.trim(),
        congregation,
        service: service.trim() || undefined,
        filledBy: filledBy.trim() || undefined,
        firstVisitDate: visitDate,
        sex: sex || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        howFound: howFound.trim() || undefined,
        decisionForChrist,
        acceptsVisit,
        preferredVisitDay: acceptsVisit ? preferredVisitDay.trim() || undefined : undefined,
        preferredVisitTime: acceptsVisit ? preferredVisitTime.trim() || undefined : undefined,
        source: isStaffEntry ? "manual" : "qrcode",
        customAnswers: Object.fromEntries(Object.entries(customAnswers).map(([id, value]) => [id, value])),
      });
      setDone(true);
    } catch {
      setError("Não foi possível enviar seu cadastro. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div className="max-w-sm">
          <h1 className="font-display text-2xl font-bold text-primary">Que alegria ter você aqui!</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Seu cadastro foi recebido. A equipe de acolhimento da AD Rio Verde vai entrar em contato em breve.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h1 className="font-display text-xl font-bold text-primary">Bem-vindo(a) à AD Rio Verde</h1>
        <p className="mt-1 text-sm text-muted">Preencha seus dados para que possamos te acompanhar de perto.</p>

        <div className="mt-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-dark">Dados do acolhimento</p>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Congregação</label>
            <select
              required
              value={congregation}
              onChange={(e) => setCongregation(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="" disabled>
                Selecione a congregação
              </option>
              {congregations.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Culto</label>
              <input
                type="text"
                placeholder="Ex: Domingo à noite"
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Data</label>
              <input
                type="date"
                required
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Preenchido por</label>
            <input
              type="text"
              required
              placeholder="Nome do voluntário da recepção"
              value={filledBy}
              onChange={(e) => setFilledBy(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-dark">Dados do recém-chegado</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Nome completo</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Telefone / WhatsApp</label>
            <input
              type="tel"
              required
              placeholder="(64) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Sexo (opcional)</label>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">Prefiro não informar</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Endereço (opcional)</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Cidade (opcional)</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Como conheceu a igreja? (opcional)</label>
            <input
              type="text"
              placeholder="Convite de um amigo, redes sociais..."
              value={howFound}
              onChange={(e) => setHowFound(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <label className="flex items-start gap-2.5 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={decisionForChrist}
              onChange={(e) => setDecisionForChrist(e.target.checked)}
              className="mt-0.5 rounded border-border"
            />
            <span>Hoje eu aceitei Jesus como meu Salvador! 🙌</span>
          </label>

          <div className="rounded-lg border border-border px-4 py-3">
            <label className="flex items-start gap-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={acceptsVisit}
                onChange={(e) => setAcceptsVisit(e.target.checked)}
                className="mt-0.5 rounded border-border"
              />
              <span>Aceito receber uma visita da equipe da igreja</span>
            </label>

            {acceptsVisit && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Melhor dia"
                  value={preferredVisitDay}
                  onChange={(e) => setPreferredVisitDay(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <input
                  type="text"
                  placeholder="Melhor horário"
                  value={preferredVisitTime}
                  onChange={(e) => setPreferredVisitTime(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
          </div>

          {customFields.map((field) =>
            field.type === "checkbox" ? (
              <label key={field.id} className="flex items-start gap-2.5 rounded-lg border border-border px-4 py-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={Boolean(customAnswers[field.id])}
                  onChange={(e) => setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.checked }))}
                  className="mt-0.5 rounded border-border"
                />
                <span>{field.label}</span>
              </label>
            ) : (
              <div key={field.id}>
                <label className="mb-1.5 block text-sm font-medium text-foreground">{field.label}</label>
                <input
                  type="text"
                  value={(customAnswers[field.id] as string) ?? ""}
                  onChange={(e) => setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            ),
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-primary-dark disabled:opacity-60"
          >
            {submitting ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </form>
    </div>
  );
}
