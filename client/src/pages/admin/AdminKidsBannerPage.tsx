import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { api, type KidsPainel } from "@/lib/api";

const campo =
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";
const botao = "rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary-dark disabled:opacity-60";
const botaoLeve = "rounded-full border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary hover:text-primary";

/** Quebra o texto no tamanho da arte, respeitando a largura disponivel. */
function linhas(ctx: CanvasRenderingContext2D, texto: string, largura: number) {
  const palavras = texto.split(/\s+/);
  const saida: string[] = [];
  let linha = "";
  palavras.forEach((p) => {
    const tentativa = linha ? `${linha} ${p}` : p;
    if (ctx.measureText(tentativa).width > largura && linha) {
      saida.push(linha);
      linha = p;
    } else {
      linha = tentativa;
    }
  });
  if (linha) saida.push(linha);
  return saida;
}

/**
 * Arte de divulgacao da Missao Reino Kids, no formato do story/post, com o QR code que leva
 * direto ao formulario. Tudo e desenhado no navegador: o Wellington muda os textos e baixa.
 */
export default function AdminKidsBannerPage() {
  const [dados, setDados] = useState<KidsPainel | null>(null);
  const [arte, setArte] = useState({
    chamada: "SEJA VOLUNTÁRIO",
    titulo: "Missão Reino Kids",
    frase: "Um dia inteiro de alegria para as crianças. Venha servir com a gente!",
    rodape: "Assembleia de Deus · Rio Verde",
  });
  const [cor, setCor] = useState("#b8321f");
  const canvas = useRef<HTMLCanvasElement>(null);
  const link = `${location.origin}/reino-kids`;

  useEffect(() => {
    api.get<KidsPainel>("/api/admin/kids/painel").then((d) => {
      setDados(d);
      setArte((a) => ({ ...a, titulo: d.edicao.title }));
    });
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !dados) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const L = 1080, A = 1350;
    const vagas = dados.equipes.reduce((s, e) => s + e.vagas, 0);
    const data = dados.edicao.eventDate
      ? new Date(`${dados.edicao.eventDate}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })
      : "";

    ctx.clearRect(0, 0, L, A);
    const fundo = ctx.createLinearGradient(0, 0, L, A);
    fundo.addColorStop(0, cor);
    fundo.addColorStop(1, "#241b14");
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 0, L, A);

    // bolinhas de festa, so decoracao
    const cores = ["#eab040", "#ffffff", "#f7f3ec"];
    for (let i = 0; i < 26; i++) {
      ctx.globalAlpha = 0.12 + (i % 3) * 0.05;
      ctx.fillStyle = cores[i % 3];
      ctx.beginPath();
      ctx.arc(((i * 137) % L) + 40, ((i * 311) % A) + 30, 14 + (i % 5) * 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = "center";
    ctx.fillStyle = "#eab040";
    ctx.font = "600 38px Inter, system-ui, sans-serif";
    ctx.fillText(arte.chamada.toUpperCase(), L / 2, 150);

    // O titulo e medido com a fonte dele; medir depois de trocar a fonte bagunçava o espaçamento.
    ctx.fillStyle = "#ffffff";
    const tamTitulo = arte.titulo.length > 22 ? 84 : 104;
    ctx.font = `700 ${tamTitulo}px 'Playfair Display', Georgia, serif`;
    const linhasTitulo = linhas(ctx, arte.titulo, 900);
    linhasTitulo.forEach((l, i) => ctx.fillText(l, L / 2, 280 + i * (tamTitulo + 14)));
    const base = 280 + linhasTitulo.length * (tamTitulo + 14);

    ctx.font = "400 36px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,.92)";
    const linhasFrase = linhas(ctx, arte.frase, 820);
    linhasFrase.forEach((l, i) => ctx.fillText(l, L / 2, base + 40 + i * 50));

    // faixa com data, horario e local
    const infos = [data, dados.edicao.startTime, dados.edicao.place].filter(Boolean) as string[];
    let y = base + 40 + linhasFrase.length * 50 + 40;
    if (infos.length) {
      ctx.fillStyle = "rgba(255,255,255,.14)";
      ctx.beginPath();
      ctx.roundRect(120, y, L - 240, 60 + (infos.length - 1) * 46, 30);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 34px Inter, system-ui, sans-serif";
      infos.forEach((t, i) => ctx.fillText(t, L / 2, y + 44 + i * 46));
      y += 80 + (infos.length - 1) * 46;
    }

    // vagas restantes
    ctx.fillStyle = "#eab040";
    ctx.font = "700 40px Inter, system-ui, sans-serif";
    ctx.fillText(vagas > 0 ? `${vagas} vagas abertas nas equipes` : "Vagas encerradas — entre na fila", L / 2, y + 50);

    // QR
    QRCode.toDataURL(link, { width: 420, margin: 1, color: { dark: "#241b14", light: "#ffffff" } }).then((url) => {
      const img = new Image();
      img.onload = () => {
        const tamanho = 320;
        const qx = (L - tamanho) / 2;
        const qy = A - tamanho - 190;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(qx - 22, qy - 22, tamanho + 44, tamanho + 44, 28);
        ctx.fill();
        ctx.drawImage(img, qx, qy, tamanho, tamanho);
        ctx.fillStyle = "#ffffff";
        ctx.font = "600 32px Inter, system-ui, sans-serif";
        ctx.fillText("Aponte a câmera e inscreva-se", L / 2, A - 130);
        ctx.font = "400 26px Inter, system-ui, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,.75)";
        ctx.fillText(link.replace(/^https?:\/\//, ""), L / 2, A - 92);
        ctx.fillStyle = "#eab040";
        ctx.font = "600 28px Inter, system-ui, sans-serif";
        ctx.fillText(arte.rodape, L / 2, A - 44);
      };
      img.src = url;
    });
  }, [dados, arte, cor, link]);

  function baixar(nome: string, url: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    a.click();
  }

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl">Divulgação da Missão Reino Kids</h1>
      <p className="mt-1 text-sm text-muted">A arte e o QR code que levam direto ao formulário de inscrição dos voluntários.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <canvas ref={canvas} width={1080} height={1350} className="w-full rounded-xl" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={botao} onClick={() => canvas.current && baixar("missao-reino-kids.png", canvas.current.toDataURL("image/png"))}>
              Baixar a arte
            </button>
            <button
              type="button"
              className={botaoLeve}
              onClick={async () => baixar("qrcode-missao-reino-kids.png", await QRCode.toDataURL(link, { width: 900, margin: 2 }))}
            >
              Baixar só o QR code
            </button>
            <button type="button" className={botaoLeve} onClick={() => navigator.clipboard.writeText(link)}>
              Copiar o link
            </button>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-display text-xl">Textos da arte</h2>
          <label className="block text-sm">
            <span className="font-medium">Chamada</span>
            <input className={`mt-1 ${campo}`} value={arte.chamada} onChange={(e) => setArte({ ...arte, chamada: e.target.value })} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Título</span>
            <input className={`mt-1 ${campo}`} value={arte.titulo} onChange={(e) => setArte({ ...arte, titulo: e.target.value })} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Frase</span>
            <textarea rows={3} className={`mt-1 ${campo}`} value={arte.frase} onChange={(e) => setArte({ ...arte, frase: e.target.value })} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Rodapé</span>
            <input className={`mt-1 ${campo}`} value={arte.rodape} onChange={(e) => setArte({ ...arte, rodape: e.target.value })} />
          </label>
          <div className="text-sm">
            <span className="font-medium">Cor</span>
            <div className="mt-2 flex gap-2">
              {["#b8321f", "#1f7a4d", "#2f5d8a", "#7a4ea3", "#c9820b"].map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Cor ${c}`}
                  onClick={() => setCor(c)}
                  className={`h-9 w-9 rounded-full ${cor === c ? "ring-2 ring-foreground ring-offset-2" : ""}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <p className="text-xs text-muted">
            A data, o horário, o local e o número de vagas saem do quadro “Dados do evento”, na aba Missão Reino Kids. Mude lá e a arte se refaz.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
