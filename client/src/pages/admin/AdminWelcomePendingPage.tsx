import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { api, type Person } from "@/lib/api";

function buildWelcomeWhatsAppLink(person: Person) {
  const phone = person.phone.replace(/\D/g, "");
  const firstName = person.fullName.trim().split(/\s+/)[0] ?? person.fullName;
  const text = encodeURIComponent(
    `Olá ${firstName}! Que alegria ter você conosco na AD Rio Verde. 🙌\n\nQue bom que você tomou a decisão de aceitar Jesus! Queremos te acompanhar de perto nessa nova caminhada — qualquer coisa que precisar, estamos aqui.`,
  );
  return `https://wa.me/55${phone}?text=${text}`;
}

export default function AdminWelcomePendingPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await api.get<Person[]>("/api/admin/people/pending-welcome");
    setPeople(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function markSent(id: number) {
    await api.post(`/api/admin/people/${id}/welcome-sent`);
    load();
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="font-display text-xl font-semibold text-foreground">Boas-vindas pendentes</h1>
        <p className="mt-1 text-sm text-muted">
          Pessoas que decidiram por Cristo e ainda não receberam a mensagem de boas-vindas. Clique em "Enviar" pra abrir o WhatsApp com a mensagem pronta.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Carregando...</p>
      ) : (
        <div className="space-y-3">
          {people.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
              <div>
                <Link href={`/admin/pessoas/${p.id}`} className="font-semibold text-primary hover:underline">
                  {p.fullName}
                </Link>
                <p className="text-sm text-muted">
                  {p.phone} · decidiu em {new Date(p.decisionDate!).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <a
                href={buildWelcomeWhatsAppLink(p)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => markSent(p.id)}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
              >
                Enviar boas-vindas
              </a>
            </div>
          ))}
          {!people.length && <p className="text-sm text-muted">Nenhuma pendência — tudo em dia. 🎉</p>}
        </div>
      )}
    </AdminLayout>
  );
}
