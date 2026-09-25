const PAPER = "#f7f7f5";
const SHEET = "#ffffff";
const INK = "#111111";
const INK_SOFT = "#6b6b6b";
const PASTEL = "#8a9bb0";
const LINE = "#e8e8e4";

let generation = 0;
let liveUrls: string[] = [];
let icon192Url = "/icon-192.png";

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radii: number | [number, number, number, number],
) {
  const [tl, tr, br, bl] = typeof radii === "number" ? [radii, radii, radii, radii] : radii;
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + width - tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + tr);
  ctx.lineTo(x + width, y + height - br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - br, y + height);
  ctx.lineTo(x + bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

export function homeScreenTitle(groupName?: string): string {
  const name = String(groupName || "").trim();
  return name ? `FamCal · ${name}` : "FamCal";
}

export function homeScreenShortName(groupName?: string): string {
  const title = homeScreenTitle(groupName);
  return title.length <= 14 ? title : `FamCal · ${String(groupName).trim().slice(0, 6)}`;
}

function setMeta(name: string, content: string) {
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", name);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

function setLink(rel: string, href: string, attrs: Record<string, string> = {}) {
  let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.appendChild(link);
  }
  for (const [key, value] of Object.entries(attrs)) link.setAttribute(key, value);
  link.href = href;
}

function revokeLive() {
  for (const url of liveUrls) URL.revokeObjectURL(url);
  liveUrls = [];
}

function keep(url: string): string {
  liveUrls.push(url);
  return url;
}

function canvasToUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not render icon"));
        return;
      }
      resolve(URL.createObjectURL(blob));
    }, "image/png");
  });
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let value = text;
  while (value.length > 1 && ctx.measureText(`${value}…`).width > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value}…`;
}

export function drawHomeIcon(canvas: HTMLCanvasElement, groupName = "", compact = false) {
  const size = canvas.width;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, size, size);

  const label = String(groupName || "").trim();
  const showWordmark = !compact && size >= 128;
  const calendarSize = showWordmark ? size * 0.36 : size * 0.58;
  const calendarX = (size - calendarSize) / 2;
  const calendarY = showWordmark ? size * 0.16 : (size - calendarSize) / 2;
  const radius = calendarSize * 0.18;
  const header = calendarSize * 0.22;

  ctx.fillStyle = SHEET;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = Math.max(1, size * 0.012);
  roundedRect(ctx, calendarX, calendarY, calendarSize, calendarSize, radius);
  ctx.fill();
  ctx.stroke();

  ctx.save();
  roundedRect(ctx, calendarX, calendarY, calendarSize, calendarSize, radius);
  ctx.clip();
  ctx.fillStyle = PASTEL;
  ctx.fillRect(calendarX, calendarY, calendarSize, header);
  ctx.restore();

  const dots = 3;
  const grid = calendarSize * 0.56;
  const startX = calendarX + (calendarSize - grid) / 2;
  const startY = calendarY + header + (calendarSize - header - grid) / 2;
  const step = grid / (dots - 1);
  const dot = Math.max(1.2, calendarSize * 0.055);
  ctx.fillStyle = INK_SOFT;
  for (let row = 0; row < dots; row += 1) {
    for (let col = 0; col < dots; col += 1) {
      ctx.beginPath();
      ctx.arc(startX + col * step, startY + row * step, dot, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (!showWordmark) return;

  const maxWidth = size * 0.78;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = INK;
  ctx.font = `600 ${Math.round(size * 0.098)}px Inter, system-ui, -apple-system, sans-serif`;
  ctx.fillText("FamCal", size / 2, size * (label ? 0.68 : 0.72));

  if (!label) return;
  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 ${Math.round(size * 0.064)}px Inter, system-ui, -apple-system, sans-serif`;
  ctx.fillText(fitText(ctx, label, maxWidth), size / 2, size * 0.8);
}

async function waitForIconFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load("600 48px Inter"),
      document.fonts.load("500 32px Inter"),
      document.fonts.ready,
    ]);
  } catch {
    /* use the fallback stack */
  }
}

function makeIcon(size: number, groupName: string, compact = false): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  drawHomeIcon(canvas, groupName, compact);
  return canvas;
}

export async function applyHomeScreenBrand(groupName?: string) {
  if (typeof document === "undefined") return;
  const id = ++generation;
  const name = String(groupName || "").trim();
  const title = homeScreenTitle(name);
  document.title = title;
  setMeta("apple-mobile-web-app-title", title);
  await waitForIconFonts();

  const [favicon, touch, icon192, icon512] = await Promise.all([
    canvasToUrl(makeIcon(32, name, true)),
    canvasToUrl(makeIcon(180, name)),
    canvasToUrl(makeIcon(192, name)),
    canvasToUrl(makeIcon(512, name)),
  ]);
  if (id !== generation) {
    URL.revokeObjectURL(favicon);
    URL.revokeObjectURL(touch);
    URL.revokeObjectURL(icon192);
    URL.revokeObjectURL(icon512);
    return;
  }

  revokeLive();
  icon192Url = keep(icon192);
  keep(favicon);
  keep(touch);
  keep(icon512);

  setLink("icon", favicon, { type: "image/png", sizes: "32x32" });
  setLink("apple-touch-icon", touch);

  const manifest = {
    id: "/",
    name: title,
    short_name: homeScreenShortName(name),
    description: "A shared household calendar, dinners, and shopping list.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: PAPER,
    theme_color: PAPER,
    lang: document.documentElement.lang || "en",
    categories: ["lifestyle", "productivity"],
    icons: [
      { src: icon192, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: icon512, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: icon192, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: icon512, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  const manifestUrl = keep(URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" })));
  setLink("manifest", manifestUrl);
}

export function noticeIconUrl(): string {
  return icon192Url;
}

export async function defaultIconDataUrl(size: number, groupName = "", compact = false): Promise<string> {
  await waitForIconFonts();
  return makeIcon(size, groupName, compact).toDataURL("image/png");
}
