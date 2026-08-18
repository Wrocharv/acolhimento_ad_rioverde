import { useEffect, useState } from "react";
import { api, ApiError, type Congregation } from "@/lib/api";

const loginErrorMessages: Record<string, string> = {
  account_pendente: "Seu cadastro ainda está aguardando aprovação do líder da sua congregação.",
  account_rejeitado: "Seu cadastro foi rejeitado. Fale com o líder da sua congregação.",
  invalid_credentials: "E-mail ou senha inválidos.",
};

export default function VolunteerAuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [congregation, setCongregation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  useEffect(() => {
    api
      .get<Congregation[]>("/api/congregations")
      .then(setCongregations)
      .catch(() => setCongregations([]));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/volunteers/login", { email, password });
      const redirect = new URLSearchParams(window.location.search).get("redirect");
      window.location.href = redirect || "/?equipe=1";
    } catch (err) {
      const code = err instanceof ApiError && typeof err.body === "object" && err.body && "error" in err.body ? String((err.body as { error: unknown }).error) : "";
      setError(loginErrorMessages[code] || "Não foi possível entrar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/volunteers/signup", { name: name.trim(), email: email.trim(), password, congregation });
      setSignupDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("Esse e-mail já está cadastrado.");
      } else {
        setError("Não foi possível concluir o cadastro. Confira os dados e tente de novo.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (signupDone) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div className="max-w-sm rounded-2xl border border-border bg-surface p-8">
          <h1 className="font-display text-xl font-bold text-primary">Cadastro enviado!</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Seu acesso está aguardando aprovação do líder da sua congregação. Assim que for aprovado, você já pode entrar com seu e-mail e senha.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-5 flex rounded-full bg-background p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${mode === "login" ? "bg-primary text-white" : "text-muted"}`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${mode === "signup" ? "bg-primary text-white" : "text-muted"}`}
          >
            Cadastrar
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <h1 className="font-display text-lg font-bold text-foreground">Acesso de voluntário</h1>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary-dark disabled:opacity-60"
            >
              {submitting ? "Entrando..." : "Entrar"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <h1 className="font-display text-lg font-bold text-foreground">Cadastro de voluntário</h1>
            <p className="text-xs text-muted">Depois de treinado pela equipe, cadastre-se aqui. Seu acesso precisa ser aprovado pelo líder da sua congregação.</p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Nome completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Congregação</label>
              <select
                required
                value={congregation}
                onChange={(e) => setCongregation(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="" disabled>
                  Selecione
                </option>
                {congregations.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Senha</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary-dark disabled:opacity-60"
            >
              {submitting ? "Enviando..." : "Cadastrar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
