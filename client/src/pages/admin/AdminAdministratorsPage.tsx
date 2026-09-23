import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { api, ApiError, type AdminUser } from "@/lib/api";

const campo =
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";
const botao = "rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary-dark disabled:opacity-60";
const botaoLeve = "rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition hover:border-primary hover:text-primary";

const PAPEIS = {
  total: { nome: "Acesso total", detalhe: "Vê o sistema inteiro, inclusive a base de pessoas." },
  kids: { nome: "Só Missão Reino Kids", detalhe: "Vê apenas as telas do evento: equipes, fila, presença e divulgação." },
} as const;

function erroEmPortugues(e: unknown) {
  const codigo = e instanceof ApiError ? e.message : "";
  const textos: Record<string, string> = {
    email_ja_usado: "Já existe um acesso com esse e-mail.",
    nao_pode_rebaixar_voce: "Você não pode tirar o seu próprio acesso total.",
    nao_pode_remover_voce: "Você não pode remover o seu próprio acesso.",
    invalid_input: "Confira os campos: a senha precisa de pelo menos 6 caracteres.",
    sem_permissao: "Só quem tem acesso total pode mexer aqui.",
  };
  return textos[codigo] ?? "Não deu certo. Tente de novo.";
}

/**
 * Acessos ao painel. O Wellington cria a conta e entrega para quem vai administrar: quem cuida
 * da Missao Reino Kids nao precisa (e nao deve) enxergar a base de pessoas da igreja.
 */
export default function AdminAdministratorsPage() {
  const [lista, setLista] = useState<AdminUser[] | null>(null);
  const [eu, setEu] = useState<AdminUser | null>(null);
  const [novo, setNovo] = useState({ name: "", email: "", password: "", role: "kids" as "total" | "kids" });
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = () => api.get<AdminUser[]>("/api/admin/administradores").then(setLista).catch(() => setErro("Não consegui carregar a lista."));

  useEffect(() => {
    carregar();
    api.get<AdminUser>("/api/admin/me").then(setEu).catch(() => {});
  }, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setAviso("");
    setSalvando(true);
    try {
      await api.post("/api/admin/administradores", novo);
      setAviso(`Acesso criado para ${novo.name}. Passe o e-mail e a senha para ela.`);
      setNovo({ name: "", email: "", password: "", role: "kids" });
      carregar();
    } catch (err) {
      setErro(erroEmPortugues(err));
    } finally {
      setSalvando(false);
    }
  }

  async function mudar(a: AdminUser, mudancas: Record<string, unknown>, mensagem: string) {
    setErro("");
    setAviso("");
    try {
      await api.patch(`/api/admin/administradores/${a.id}`, mudancas);
      setAviso(mensagem);
      carregar();
    } catch (err) {
      setErro(erroEmPortugues(err));
    }
  }

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl">Quem administra o painel</h1>
      <p className="mt-1 text-sm text-muted">Crie o acesso aqui e entregue o e-mail e a senha para a pessoa. Ela entra pela mesma tela de login.</p>

      {erro && <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{erro}</p>}
      {aviso && <p className="mt-4 rounded-xl bg-success/10 px-4 py-3 text-sm text-success">{aviso}</p>}

      <form onSubmit={criar} className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="font-display text-xl">Novo acesso</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="font-medium">Nome</span>
            <input required className={`mt-1 ${campo}`} value={novo.name} onChange={(e) => setNovo({ ...novo, name: e.target.value })} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">E-mail</span>
            <input required type="email" autoComplete="off" className={`mt-1 ${campo}`} value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Senha</span>
            <input
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="mínimo 6 caracteres"
              className={`mt-1 ${campo}`}
              value={novo.password}
              onChange={(e) => setNovo({ ...novo, password: e.target.value })}
            />
            <span className="mt-1 block text-xs text-muted">A pessoa pode continuar com esta senha; ela aparece enquanto você digita.</span>
          </label>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {(Object.keys(PAPEIS) as (keyof typeof PAPEIS)[]).map((k) => (
            <label
              key={k}
              className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${novo.role === k ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"}`}
            >
              <input type="radio" name="papel" className="mt-1" checked={novo.role === k} onChange={() => setNovo({ ...novo, role: k })} />
              <span>
                <span className="block font-semibold">{PAPEIS[k].nome}</span>
                <span className="block text-xs text-muted">{PAPEIS[k].detalhe}</span>
              </span>
            </label>
          ))}
        </div>
        <button disabled={salvando} className={`mt-4 ${botao}`}>
          {salvando ? "Criando…" : "Criar acesso"}
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-background/60 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">E-mail</th>
              <th className="px-4 py-3 text-left">Acesso</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(lista ?? []).map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">
                  {a.name}
                  {eu?.id === a.id && <span className="ml-2 rounded-full bg-background px-2 py-0.5 text-xs text-muted">você</span>}
                </td>
                <td className="px-4 py-3 text-muted">{a.email}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${a.role === "total" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                    {PAPEIS[(a.role ?? "total") as keyof typeof PAPEIS].nome}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      className={botaoLeve}
                      onClick={() => {
                        const password = prompt(`Nova senha para ${a.name} (mínimo 6 caracteres):`);
                        if (password && password.length >= 6) mudar(a, { password }, `Senha de ${a.name} trocada. Avise a pessoa.`);
                      }}
                    >
                      Trocar senha
                    </button>
                    {eu?.id !== a.id && (
                      <>
                        <button
                          type="button"
                          className={botaoLeve}
                          onClick={() =>
                            mudar(
                              a,
                              { role: a.role === "total" ? "kids" : "total" },
                              `${a.name} agora tem ${a.role === "total" ? "acesso só ao Missão Reino Kids" : "acesso total"}.`,
                            )
                          }
                        >
                          {a.role === "total" ? "Deixar só no Kids" : "Dar acesso total"}
                        </button>
                        <button
                          type="button"
                          className={botaoLeve}
                          onClick={async () => {
                            if (!confirm(`Remover o acesso de ${a.name}? Ela não entra mais no painel.`)) return;
                            try {
                              await api.delete(`/api/admin/administradores/${a.id}`);
                              setAviso(`Acesso de ${a.name} removido.`);
                              carregar();
                            } catch (err) {
                              setErro(erroEmPortugues(err));
                            }
                          }}
                        >
                          Remover
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {lista && !lista.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  Nenhum acesso cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
