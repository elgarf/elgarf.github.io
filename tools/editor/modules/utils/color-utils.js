export const hexRgb = h => {
  const n = String(h || "").replace("#", "");
  const v = n.length === 3 ? n.split("").map(x => x + x).join("") : n;
  const num = parseInt(v || "000000", 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

export const rgbToHsl = (r, g, b) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0));
        break;
      case gn:
        h = ((bn - rn) / d + 2);
        break;
      default:
        h = ((rn - gn) / d + 4);
        break;
    }
    h *= 60;
  }
  return { h, s, l };
};

export const hslToRgb = (h, s, l) => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs(hh % 2 - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hh < 1) {
    r1 = c; g1 = x;
  } else if (hh < 2) {
    r1 = x; g1 = c;
  } else if (hh < 3) {
    g1 = c; b1 = x;
  } else if (hh < 4) {
    g1 = x; b1 = c;
  } else if (hh < 5) {
    r1 = x; b1 = c;
  } else {
    r1 = c; b1 = x;
  }
  const m = l - c / 2;
  const to255 = v => Math.max(0, Math.min(255, Math.round((v + m) * 255)));
  return { r: to255(r1), g: to255(g1), b: to255(b1) };
};

export const relLum = (r, g, b) => {
  const f = v => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

export const contrastRatio = (a, b) => {
  const l1 = relLum(a.r, a.g, a.b);
  const l2 = relLum(b.r, b.g, b.b);
  const mx = Math.max(l1, l2);
  const mn = Math.min(l1, l2);
  return (mx + 0.05) / (mn + 0.05);
};

export const rgbHex = ({ r, g, b }) => `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;

export const pickByContrast = (base, h, s, target) => {
  let bestMeet = null;
  let bestAny = null;
  for (let i = 0; i <= 100; i++) {
    const l = i / 100;
    const cand = hslToRgb(h, s, l);
    const cr = contrastRatio(base, cand);
    const diff = Math.abs(cr - target);
    if (!bestAny || cr > bestAny.cr) bestAny = { cand, cr };
    if (cr >= target && (!bestMeet || diff < bestMeet.diff)) bestMeet = { cand, cr, diff };
  }
  return (bestMeet || bestAny).cand;
};

export const shadeHex = (h, amount) => {
  const { r, g, b } = hexRgb(h || "#2fcaaf");
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
  const mix = (c, target) => clamp(c + (target - c) * amount);
  const rr = mix(r, amount >= 0 ? 255 : 0);
  const gg = mix(g, amount >= 0 ? 255 : 0);
  const bb = mix(b, amount >= 0 ? 255 : 0);
  return `#${rr.toString(16).padStart(2, "0")}${gg.toString(16).padStart(2, "0")}${bb.toString(16).padStart(2, "0")}`;
};

export const autoContrast = h => {
  const base = h || "#2fcaaf";
  const { r, g, b } = hexRgb(base);
  const lum = (r * 299 + g * 587 + b * 114) / 1000;
  return shadeHex(base, lum > 127.5 ? -0.5 : 0.5);
};

export const randomColor = () => {
  const h = Math.random() * 360, s = 1, v = 0.5, c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) { r1 = c; g1 = x; b1 = 0; }
  else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
  else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }
  const toHex = n => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
};

export const rectTextTheme = r => {
  const a = hexRgb((r && r.colorA) || "#2fcaaf"), b = hexRgb((r && r.colorB) || autoContrast((r && r.colorA) || "#2fcaaf"));
  const lumA = (a.r * 299 + a.g * 587 + a.b * 114) / 1000, lumB = (b.r * 299 + b.g * 587 + b.b * 114) / 1000, lum = (lumA + lumB) / 2;
  if (lum >= 145) return { text: "rgba(0,0,0,.92)", textStrong: "rgba(0,0,0,.97)", bg: "rgba(255,255,255,.70)", bgStrong: "rgba(255,255,255,.76)" };
  return { text: "rgba(255,255,255,.95)", textStrong: "rgba(255,255,255,.97)", bg: "rgba(11,17,24,.60)", bgStrong: "rgba(11,17,24,.65)" };
};

export const bwTextForRgb = (r, g, b) => {
  const toLin = v => { const c = Math.max(0, Math.min(255, +v || 0)) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
  const cBlack = (L + 0.05) / 0.05, cWhite = 1.05 / (L + 0.05);
  return cBlack >= cWhite ? "#000" : "#fff";
};

export const noteTextColorForBackground = value => {
  const hex = String(value || "").trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return "#000000";
  const { r, g, b } = hexRgb(`#${hex}`);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#000000" : "#ffffff";
};
