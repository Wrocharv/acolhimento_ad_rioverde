export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(typeof body === "object" && body && "error" in body ? String((body as { error: unknown }).error) : "Erro na requisição");
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    throw new ApiError(res.status, body);
  }
  return body as T;
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, data?: unknown) => request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  patch: <T,>(path: string, data?: unknown) => request<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  delete: <T,>(path: string) => request<T>(path, { method: "DELETE" }),
};

export type AdminUser = {
  id: number;
  email: string;
  name: string;
  /** "total" ve tudo; "kids" so as telas da Missão Reino Kids. */
  role?: "total" | "kids";
  createdAt?: string;
};

export type PersonStatus = "visitante" | "decisao" | "em_acompanhamento" | "membro" | "afastado";

export type Person = {
  id: number;
  fullName: string;
  phone: string;
  congregation: string;
  service: string | null;
  filledBy: string | null;
  sex: "masculino" | "feminino" | null;
  address: string | null;
  city: string | null;
  howFound: string | null;
  decisionForChrist: boolean;
  decisionDate: string | null;
  firstVisitDate: string;
  status: PersonStatus;
  assignedTo: string | null;
  notes: string | null;
  source: "qrcode" | "manual";
  welcomeMessageSentAt: string | null;
  acceptsVisit: boolean;
  preferredVisitDay: string | null;
  preferredVisitTime: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Interaction = {
  id: number;
  personId: number;
  type: "mensagem" | "ligacao" | "presenca_culto" | "visita" | "outro";
  note: string | null;
  createdAt: string;
};

export type Need = {
  id: number;
  personId: number;
  type: "financeiro" | "oracao" | "aconselhamento" | "outro";
  description: string;
  status: "aberto" | "resolvido";
  createdAt: string;
  resolvedAt: string | null;
};

export type CustomField = {
  id: number;
  label: string;
  type: "text" | "checkbox";
  active: boolean;
  sortOrder: number;
};

export type CustomAnswer = {
  id: number;
  label: string;
  type: "text" | "checkbox";
  value: string | null;
};

export type Congregation = {
  id: number;
  name: string;
  active: boolean;
  sortOrder: number;
};

export type Volunteer = {
  id: number;
  name: string;
  email: string;
  congregation: string;
  role: "lider" | "voluntario";
  status: "pendente" | "aprovado" | "rejeitado";
  createdAt: string;
  approvedAt: string | null;
};

export type KidsEdicao = {
  id: number;
  title: string;
  eventDate: string | null;
  startTime: string | null;
  place: string | null;
  notes: string | null;
  open: boolean;
};

export type KidsTeamVagas = { id: number; name: string; slots: number; confirmados: number; vagas: number; fila: number };

export type KidsEvento = {
  edicao: KidsEdicao;
  equipes: KidsTeamVagas[];
  totalVagas: number;
  totalConfirmados: number;
  lotado: boolean;
};

export type KidsSignup = {
  id: number;
  editionId: number;
  teamId: number;
  fullName: string;
  phone: string;
  age: number | null;
  congregation: string | null;
  vestSize: string | null;
  experience: string | null;
  notes: string | null;
  status: "confirmado" | "espera" | "cancelado";
  attendedAt: string | null;
  createdAt: string;
};

export type KidsPainel = { edicoes: KidsEdicao[]; edicao: KidsEdicao; equipes: KidsTeamVagas[]; inscricoes: KidsSignup[] };
