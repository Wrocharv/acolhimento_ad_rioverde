import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { api, type KidsPainel } from "@/lib/api";

const campo =
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";
const botao = "rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary-dark disabled:opacity-60";
const botaoLeve = "rounded-full border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary hover:text-primary";

/**
 * Estilos de arte pensados pra crianca: fundo colorido, confete e bandeirinhas. Cada estilo traz
 * o fundo (degrade), as cores da festa e a cor do texto de apoio.
 */
const ESTILOS = {
  festa: { nome: "Festa", fundo: ["#ffd43b", "#ff7a59", "#7b5cff"], confete: ["#ffffff", "#ffe066", "#4dd0e1", "#ff8fab", "#8ce99a"], destaque: "#fff3bf" },
  arcoiris: { nome: "Arco-íris", fundo: ["#4dabf7", "#9775fa", "#ff8787"], confete: ["#ffd43b", "#ffffff", "#69db7c", "#ffa8a8", "#66d9e8"], destaque: "#ffe066" },
  parquinho: { nome: "Parquinho", fundo: ["#63e6be", "#4dabf7", "#845ef7"], confete: ["#ffffff", "#ffd43b", "#ff8787", "#b2f2bb", "#ffc9c9"], destaque: "#fff9db" },
} as const;

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
  const [estilo, setEstilo] = useState<keyof typeof ESTILOS>("festa");
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

    const tema = ESTILOS[estilo];
    ctx.clearRect(0, 0, L, A);
    const fundo = ctx.createLinearGradient(0, 0, L * 0.4, A);
    tema.fundo.forEach((c, i) => fundo.addColorStop(i / (tema.fundo.length - 1), c));
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 0, L, A);

    // confete: bolinha, estrela e triangulo espalhados sem cobrir o miolo do cartaz
    const estrela = (cx: number, cy: number, r: number) => {
      ctx.beginPath();
      for (let p = 0; p < 10; p++) {
        const raio = p % 2 ? r * 0.45 : r;
        const ang = (Math.PI / 5) * p - Math.PI / 2;
        ctx.lineTo(cx + Math.cos(ang) * raio, cy + Math.sin(ang) * raio);
      }
      ctx.closePath();
      ctx.fill();
    };
    for (let i = 0; i < 46; i++) {
      const x = ((i * 197) % (L - 60)) + 30;
      const y = ((i * 373) % (A - 60)) + 30;
      // No miolo (onde fica o texto e o QR) o confete fica bem apagado, pra nao atrapalhar a leitura.
      const meio = x > 110 && x < L - 110 && y > 200;
      ctx.globalAlpha = meio ? 0.13 : 0.8;
      ctx.fillStyle = tema.confete[i % tema.confete.length];
      const r = 10 + (i % 5) * 7;
      if (i % 3 === 0) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (i % 3 === 1) {
        estrela(x, y, r + 4);
      } else {
        ctx.beginPath();
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r, y + r);
        ctx.lineTo(x - r, y + r);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // bandeirinhas no topo
    const passo = L / 14;
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = tema.confete[i % tema.confete.length];
      ctx.beginPath();
      ctx.moveTo(i * passo, 0);
      ctx.lineTo((i + 1) * passo, 0);
      ctx.lineTo(i * passo + passo / 2, 62);
      ctx.closePath();
      ctx.fill();
    }

    ctx.textAlign = "center";
    // Sombra leve: garante leitura do texto branco sobre o fundo colorido.
    ctx.shadowColor = "rgba(20,12,4,.35)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 40px Inter, system-ui, sans-serif";
    ctx.fillText(arte.chamada.toUpperCase(), L / 2, 170);

    // O titulo e medido com a fonte dele; medir depois de trocar a fonte bagunçava o espaçamento.
    ctx.fillStyle = "#ffffff";
    const tamTitulo = arte.titulo.length > 22 ? 84 : 104;
    ctx.font = `700 ${tamTitulo}px 'Playfair Display', Georgia, serif`;
    const linhasTitulo = linhas(ctx, arte.titulo, 900);
    linhasTitulo.forEach((l, i) => ctx.fillText(l, L / 2, 280 + i * (tamTitulo + 14)));
    const base = 280 + linhasTitulo.length * (tamTitulo + 14);

    ctx.font = "400 36px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    const linhasFrase = linhas(ctx, arte.frase, 820);
    linhasFrase.forEach((l, i) => ctx.fillText(l, L / 2, base + 40 + i * 50));

    // faixa com data, horario e local
    const infos = [data, dados.edicao.startTime, dados.edicao.place].filter(Boolean) as string[];
    let y = base + 40 + linhasFrase.length * 50 + 40;
    if (infos.length) {
      ctx.fillStyle = "rgba(255,255,255,.22)";
      ctx.beginPath();
      ctx.roundRect(120, y, L - 240, 60 + (infos.length - 1) * 46, 30);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 34px Inter, system-ui, sans-serif";
      infos.forEach((t, i) => ctx.fillText(t, L / 2, y + 44 + i * 46));
      y += 80 + (infos.length - 1) * 46;
    }

    // vagas restantes
    ctx.fillStyle = tema.destaque;
    ctx.font = "700 40px Inter, system-ui, sans-serif";
    ctx.fillText(vagas > 0 ? `${vagas} vagas abertas nas equipes` : "Vagas encerradas — entre na fila", L / 2, y + 50);

    // QR
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

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
        ctx.shadowColor = "rgba(20,12,4,.35)";
        ctx.shadowBlur = 14;
        ctx.fillStyle = "#ffffff";
        ctx.font = "700 34px Inter, system-ui, sans-serif";
        ctx.fillText("Aponte a câmera e inscreva-se", L / 2, A - 130);
        ctx.font = "500 26px Inter, system-ui, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,.9)";
        ctx.fillText(link.replace(/^https?:\/\//, ""), L / 2, A - 92);
        ctx.fillStyle = tema.destaque;
        ctx.font = "600 28px Inter, system-ui, sans-serif";
        ctx.fillText(arte.rodape, L / 2, A - 44);
      };
      img.src = url;
    });
  }, [dados, arte, estilo, link]);

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
            <span className="font-medium">Estilo</span>
            <div className="mt-2 grid gap-2">
              {(Object.keys(ESTILOS) as (keyof typeof ESTILOS)[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setEstilo(k)}
                  className={`flex items-center gap-3 rounded-xl border p-2 text-left text-sm font-semibold transition ${estilo === k ? "border-primary ring-1 ring-primary" : "border-border"}`}
                >
                  <span
                    className="h-8 w-14 shrink-0 rounded-lg"
                    style={{ background: `linear-gradient(135deg, ${ESTILOS[k].fundo.join(", ")})` }}
                  />
                  {ESTILOS[k].nome}
                </button>
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
