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

/** Tamanhos da arte enviada. "original" usa o tamanho da propria imagem. */
const FORMATOS = {
  original: { rotulo: "Tamanho da imagem", w: 0, h: 0 },
  feed: { rotulo: "Feed (1080×1350)", w: 1080, h: 1350 },
  story: { rotulo: "Story / status (1080×1920)", w: 1080, h: 1920 },
  quadrado: { rotulo: "Quadrado (1080×1080)", w: 1080, h: 1080 },
} as const;

/**
 * Pecas que podem ir por cima da arte enviada. Cada uma liga/desliga, arrasta na tela
 * (posicao em fracao da largura/altura, pelo centro), muda de tamanho e de cor.
 */
type CamadaId = "chamada" | "titulo" | "frase" | "data" | "qr" | "rodape";
type Camada = { id: CamadaId; nome: string; x: number; y: number; escala: number; visivel: boolean; cor: string };
type Caixa = { x: number; y: number; w: number; h: number };
const CAMADAS_PADRAO: Camada[] = [
  { id: "chamada", nome: "Chamada", x: 0.5, y: 0.08, escala: 1, visivel: true, cor: "#ffffff" },
  { id: "titulo", nome: "Título (nome do evento)", x: 0.5, y: 0.19, escala: 1, visivel: true, cor: "#ffffff" },
  { id: "frase", nome: "Frase", x: 0.5, y: 0.31, escala: 1, visivel: false, cor: "#ffffff" },
  { id: "data", nome: "Data, horário e local", x: 0.5, y: 0.62, escala: 1, visivel: true, cor: "#ffffff" },
  { id: "qr", nome: "QR code da inscrição", x: 0.5, y: 0.8, escala: 1, visivel: true, cor: "#241b14" },
  { id: "rodape", nome: "Rodapé", x: 0.5, y: 0.955, escala: 1, visivel: false, cor: "#ffffff" },
];
const CORES = ["#ffffff", "#241b14", "#ffd43b", "#ff7a59", "#7b5cff", "#2f9e44"];
const PRESETS: { nome: string; ligadas: CamadaId[] }[] = [
  { nome: "Só a minha arte", ligadas: [] },
  { nome: "Arte + QR code", ligadas: ["qr"] },
  { nome: "Arte + nomes + QR", ligadas: ["chamada", "titulo", "data", "qr"] },
];

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
    titulo: "Missão Reino",
    frase: "Um dia inteiro de alegria para as crianças. Venha servir com a gente!",
    rodape: "Assembleia de Deus · Rio Verde",
  });
  const [estilo, setEstilo] = useState<keyof typeof ESTILOS>("festa");
  const canvas = useRef<HTMLCanvasElement>(null);
  // "Minha arte": imagem feita fora (Canva etc.); por cima dela entram so as pecas que ele ligar.
  const [modo, setModo] = useState<"sistema" | "minha">("sistema");
  const [minhaArte, setMinhaArte] = useState<HTMLImageElement | null>(null);
  const [formato, setFormato] = useState<keyof typeof FORMATOS>("original");
  const [camadas, setCamadas] = useState<Camada[]>(CAMADAS_PADRAO);
  const [selecionada, setSelecionada] = useState<CamadaId | null>(null);
  const [qrImg, setQrImg] = useState<HTMLImageElement | null>(null);
  const caixas = useRef<Record<string, Caixa>>({});
  const arrasto = useRef<{ id: CamadaId; dx: number; dy: number } | null>(null);
  const canvasMinha = useRef<HTMLCanvasElement>(null);
  const link = `${location.origin}/missao-reino`;

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
  }, [dados, arte, estilo, link, modo]);

  useEffect(() => {
    QRCode.toDataURL(link, { width: 700, margin: 1, color: { dark: "#241b14", light: "#ffffff" } }).then((url) => {
      const img = new Image();
      img.onload = () => setQrImg(img);
      img.src = url;
    });
  }, [link]);

  const mudarCamada = (id: CamadaId, m: Partial<Camada>) => setCamadas((cs) => cs.map((c) => (c.id === id ? { ...c, ...m } : c)));

  function textoData() {
    if (!dados) return "";
    const e = dados.edicao;
    const data = e.eventDate ? new Date(`${e.eventDate}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }) : "";
    return [data, e.startTime, e.place].filter(Boolean).join(" · ");
  }

  /** Desenha a arte enviada e, por cima, as pecas ligadas. Guarda onde cada uma ficou (para arrastar). */
  function desenharMinha(c: HTMLCanvasElement, comSelecao: boolean) {
    if (!minhaArte) return;
    const f = FORMATOS[formato];
    const W = f.w || minhaArte.naturalWidth;
    const H = f.h || minhaArte.naturalHeight;
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    // Imagem cobrindo o quadro inteiro (corta o que sobrar, sem esticar).
    const esc = Math.max(W / minhaArte.naturalWidth, H / minhaArte.naturalHeight);
    const iw = minhaArte.naturalWidth * esc, ih = minhaArte.naturalHeight * esc;
    ctx.drawImage(minhaArte, (W - iw) / 2, (H - ih) / 2, iw, ih);

    const k = Math.min(W, H) / 1080;
    const novas: Record<string, Caixa> = {};
    const textos: Record<string, { t: string; tam: number; peso: string; fonte: string }> = {
      chamada: { t: arte.chamada, tam: 46, peso: "800", fonte: "Inter, system-ui, sans-serif" },
      titulo: { t: arte.titulo, tam: 104, peso: "800", fonte: "Inter, system-ui, sans-serif" },
      frase: { t: arte.frase, tam: 40, peso: "500", fonte: "Inter, system-ui, sans-serif" },
      data: { t: textoData(), tam: 44, peso: "700", fonte: "Inter, system-ui, sans-serif" },
      rodape: { t: arte.rodape, tam: 32, peso: "600", fonte: "Inter, system-ui, sans-serif" },
    };

    camadas.forEach((cam) => {
      if (!cam.visivel) return;
      const cx = cam.x * W, cy = cam.y * H;
      if (cam.id === "qr") {
        if (!qrImg) return;
        const lado = 300 * k * cam.escala;
        const pad = lado * 0.07;
        const leg = lado * 0.17;
        const bw = lado + pad * 2, bh = lado + pad * 2 + leg;
        const bx = cx - bw / 2, by = cy - bh / 2;
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,.25)";
        ctx.shadowBlur = pad;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, pad * 1.4);
        ctx.fill();
        ctx.restore();
        ctx.drawImage(qrImg, bx + pad, by + pad, lado, lado);
        ctx.fillStyle = cam.cor === "#ffffff" ? "#241b14" : cam.cor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `700 ${leg * 0.42}px Inter, system-ui, sans-serif`;
        ctx.fillText("Aponte a câmera e inscreva-se", cx, by + pad + lado + leg / 2);
        novas[cam.id] = { x: bx, y: by, w: bw, h: bh };
        return;
      }
      const t = textos[cam.id];
      if (!t.t.trim()) return;
      const tam = t.tam * k * cam.escala;
      ctx.font = `${t.peso} ${tam}px ${t.fonte}`;
      const ls = linhas(ctx, t.t, W * 0.86);
      const alt = ls.length * tam * 1.12;
      let largura = 0;
      ls.forEach((l) => (largura = Math.max(largura, ctx.measureText(l).width)));
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = cam.cor;
      const claro = ["#ffffff", "#ffd43b"].includes(cam.cor);
      ctx.shadowColor = claro ? "rgba(0,0,0,.55)" : "rgba(255,255,255,.4)";
      ctx.shadowBlur = 14 * k;
      ls.forEach((l, i) => ctx.fillText(l, cx, cy - alt / 2 + tam * 1.12 * (i + 0.5)));
      ctx.restore();
      novas[cam.id] = { x: cx - largura / 2, y: cy - alt / 2, w: largura, h: alt };
    });

    if (comSelecao && selecionada && novas[selecionada]) {
      const b = novas[selecionada];
      ctx.save();
      ctx.strokeStyle = "#4dabf7";
      ctx.lineWidth = 4 * k;
      ctx.setLineDash([14 * k, 10 * k]);
      ctx.strokeRect(b.x - 10 * k, b.y - 10 * k, b.w + 20 * k, b.h + 20 * k);
      ctx.restore();
    }
    caixas.current = novas;
  }

  useEffect(() => {
    if (modo === "minha" && canvasMinha.current) desenharMinha(canvasMinha.current, true);
  });

  function pontoNoCanvas(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height };
  }

  function apertou(e: React.PointerEvent<HTMLCanvasElement>) {
    const p = pontoNoCanvas(e);
    const ids = Object.keys(caixas.current).reverse() as CamadaId[];
    const id = ids.find((i) => {
      const b = caixas.current[i];
      return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
    });
    setSelecionada(id ?? null);
    if (!id) return;
    const cam = camadas.find((c) => c.id === id)!;
    const c = e.currentTarget;
    arrasto.current = { id, dx: p.x - cam.x * c.width, dy: p.y - cam.y * c.height };
    c.setPointerCapture(e.pointerId);
  }

  function moveu(e: React.PointerEvent<HTMLCanvasElement>) {
    const a = arrasto.current;
    if (!a) return;
    const c = e.currentTarget;
    const p = pontoNoCanvas(e);
    mudarCamada(a.id, {
      x: Math.min(1, Math.max(0, (p.x - a.dx) / c.width)),
      y: Math.min(1, Math.max(0, (p.y - a.dy) / c.height)),
    });
  }

  function escolherArte(arquivo: File | undefined) {
    if (!arquivo) return;
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => setMinhaArte(img);
    img.src = url;
  }

  function baixarMinha() {
    const c = canvasMinha.current;
    if (!c) return;
    desenharMinha(c, false);
    baixar("missao-reino-arte.png", c.toDataURL("image/png"));
    desenharMinha(c, true);
  }

  function baixar(nome: string, url: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    a.click();
  }

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl">Divulgação da Missão Reino</h1>
      <p className="mt-1 text-sm text-muted">A arte e o QR code que levam direto ao formulário de inscrição dos voluntários.</p>

      <div className="mt-4 inline-flex rounded-full border border-border bg-surface p-1 text-sm font-semibold">
        <button type="button" onClick={() => setModo("sistema")} className={`rounded-full px-4 py-1.5 ${modo === "sistema" ? "bg-primary text-white" : ""}`}>
          Arte do sistema
        </button>
        <button type="button" onClick={() => setModo("minha")} className={`rounded-full px-4 py-1.5 ${modo === "minha" ? "bg-primary text-white" : ""}`}>
          Minha arte (Canva etc.)
        </button>
      </div>

      {modo === "minha" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-border bg-surface p-4">
            {minhaArte ? (
              <>
                <canvas
                  ref={canvasMinha}
                  className="w-full touch-none rounded-xl"
                  style={{ cursor: arrasto.current ? "grabbing" : "grab" }}
                  onPointerDown={apertou}
                  onPointerMove={moveu}
                  onPointerUp={() => (arrasto.current = null)}
                />
                <p className="mt-2 text-xs text-muted">Clique num texto ou no QR code e arraste para mudar de lugar.</p>
              </>
            ) : (
              <label className="flex h-80 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-center text-sm text-muted hover:border-primary">
                <span className="font-semibold text-foreground">Clique para enviar a sua arte</span>
                <span className="mt-1">Imagem JPG ou PNG feita no Canva (ou outro programa)</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => escolherArte(e.target.files?.[0])} />
              </label>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={!minhaArte} className={botao} onClick={baixarMinha}>
                Baixar a arte
              </button>
              {minhaArte && (
                <label className={`${botaoLeve} cursor-pointer`}>
                  Trocar imagem
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => escolherArte(e.target.files?.[0])} />
                </label>
              )}
              {minhaArte && (
                <button type="button" className={botaoLeve} onClick={() => setMinhaArte(null)}>
                  Tirar imagem
                </button>
              )}
              <button type="button" className={botaoLeve} onClick={() => navigator.clipboard.writeText(link)}>
                Copiar o link
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 text-sm">
            <div>
              <h2 className="font-display text-xl">O que vai na arte</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESETS.map((pr) => (
                  <button
                    key={pr.nome}
                    type="button"
                    className={botaoLeve}
                    onClick={() => setCamadas((cs) => cs.map((c) => ({ ...c, visivel: pr.ligadas.includes(c.id) })))}
                  >
                    {pr.nome}
                  </button>
                ))}
              </div>
              <div className="mt-3 space-y-1">
                {camadas.map((c) => (
                  <label key={c.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${selecionada === c.id ? "bg-primary/10" : ""}`}>
                    <input type="checkbox" checked={c.visivel} onChange={(e) => mudarCamada(c.id, { visivel: e.target.checked })} />
                    <button type="button" className="flex-1 text-left" onClick={() => setSelecionada(c.id)}>
                      {c.nome}
                    </button>
                  </label>
                ))}
              </div>
            </div>

            {selecionada && (
              <div className="rounded-xl border border-border p-3">
                <p className="font-semibold">{camadas.find((c) => c.id === selecionada)?.nome}</p>
                <label className="mt-2 block text-xs">
                  Tamanho
                  <input
                    type="range"
                    min={0.4}
                    max={2.5}
                    step={0.05}
                    value={camadas.find((c) => c.id === selecionada)?.escala ?? 1}
                    onChange={(e) => mudarCamada(selecionada, { escala: Number(e.target.value) })}
                    className="mt-1 w-full"
                  />
                </label>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  Cor
                  {CORES.map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      aria-label={`Cor ${cor}`}
                      onClick={() => mudarCamada(selecionada, { cor })}
                      className={`h-6 w-6 rounded-full border ${camadas.find((c) => c.id === selecionada)?.cor === cor ? "ring-2 ring-primary" : "border-border"}`}
                      style={{ background: cor }}
                    />
                  ))}
                </div>
              </div>
            )}

            <label className="block">
              <span className="font-medium">Tamanho da arte</span>
              <select className={`mt-1 ${campo}`} value={formato} onChange={(e) => setFormato(e.target.value as keyof typeof FORMATOS)}>
                {(Object.keys(FORMATOS) as (keyof typeof FORMATOS)[]).map((k) => (
                  <option key={k} value={k}>
                    {FORMATOS[k].rotulo}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2">
              <span className="font-medium">Textos</span>
              {(
                [
                  ["chamada", "Chamada"],
                  ["titulo", "Título"],
                  ["frase", "Frase"],
                  ["rodape", "Rodapé"],
                ] as const
              ).map(([chave, rotulo]) => (
                <label key={chave} className="block text-xs">
                  {rotulo}
                  <input className={`mt-1 ${campo}`} value={arte[chave]} onChange={(e) => setArte({ ...arte, [chave]: e.target.value })} />
                </label>
              ))}
              <p className="text-xs text-muted">Data, horário e local saem dos “Dados do evento”, na aba Missão Reino.</p>
            </div>
            <p className="text-xs text-muted">A imagem não fica salva no sistema: guarde a arte baixada.</p>
          </div>
        </div>
      ) : (
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <canvas ref={canvas} width={1080} height={1350} className="w-full rounded-xl" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={botao} onClick={() => canvas.current && baixar("missao-reino.png", canvas.current.toDataURL("image/png"))}>
              Baixar a arte
            </button>
            <button
              type="button"
              className={botaoLeve}
              onClick={async () => baixar("qrcode-missao-reino.png", await QRCode.toDataURL(link, { width: 900, margin: 2 }))}
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
            A data, o horário, o local e o número de vagas saem do quadro “Dados do evento”, na aba Missão Reino. Mude lá e a arte se refaz.
          </p>
        </div>
      </div>
      )}
    </AdminLayout>
  );
}
