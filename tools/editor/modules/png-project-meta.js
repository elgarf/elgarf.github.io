const readU32BE = (arr, off) => (((arr[off] << 24) >>> 0) | ((arr[off + 1] << 16) >>> 0) | ((arr[off + 2] << 8) >>> 0) | (arr[off + 3] >>> 0)) >>> 0;
const writeU32BE = (arr, off, val) => {
  arr[off] = (val >>> 24) & 255;
  arr[off + 1] = (val >>> 16) & 255;
  arr[off + 2] = (val >>> 8) & 255;
  arr[off + 3] = val & 255;
};
const pngSig = () => new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const bytesEq = (a, b) => {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};
const concatBytes = (...parts) => {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
};

let pngCrcTable = null;
const getPngCrcTable = () => {
  if (pngCrcTable) return pngCrcTable;
  pngCrcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    pngCrcTable[n] = c >>> 0;
  }
  return pngCrcTable;
};
const pngCrc32 = bytes => {
  const table = getPngCrcTable();
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = table[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
};
const makePngChunk = (typeStr, data) => {
  const type = new TextEncoder().encode(typeStr);
  const len = data.length >>> 0;
  const out = new Uint8Array(12 + len);
  writeU32BE(out, 0, len);
  out.set(type, 4);
  out.set(data, 8);
  const crc = pngCrc32(out.subarray(4, 8 + len));
  writeU32BE(out, 8 + len, crc);
  return out;
};

export const injectProjectToPngBytes = (pngBytes, projectText, metaKey) => {
  if (!(pngBytes instanceof Uint8Array) || pngBytes.length < 12) throw new Error("Некорректный PNG");
  const sig = pngSig();
  if (!bytesEq(pngBytes.subarray(0, 8), sig)) throw new Error("Некорректная PNG сигнатура");
  let off = 8;
  let insertPos = -1;
  while (off + 12 <= pngBytes.length) {
    const len = readU32BE(pngBytes, off);
    const type = new TextDecoder().decode(pngBytes.subarray(off + 4, off + 8));
    const next = off + 12 + len;
    if (next > pngBytes.length) break;
    if (type === "IEND") { insertPos = off; break; }
    off = next;
  }
  if (insertPos < 0) throw new Error("PNG IEND не найден");
  const enc = new TextEncoder();
  const keyword = enc.encode(metaKey);
  const text = enc.encode(String(projectText || ""));
  const data = new Uint8Array(keyword.length + 1 + 1 + 1 + 1 + 1 + text.length);
  let p = 0;
  data.set(keyword, p); p += keyword.length;
  data[p++] = 0;
  data[p++] = 0;
  data[p++] = 0;
  data[p++] = 0;
  data[p++] = 0;
  data.set(text, p);
  const chunk = makePngChunk("iTXt", data);
  return concatBytes(pngBytes.subarray(0, insertPos), chunk, pngBytes.subarray(insertPos));
};

export const extractProjectFromPngBytes = (pngBytes, metaKey) => {
  if (!(pngBytes instanceof Uint8Array) || pngBytes.length < 12) throw new Error("Некорректный PNG");
  const sig = pngSig();
  if (!bytesEq(pngBytes.subarray(0, 8), sig)) throw new Error("Некорректная PNG сигнатура");
  const dec = new TextDecoder();
  let off = 8;
  while (off + 12 <= pngBytes.length) {
    const len = readU32BE(pngBytes, off);
    const type = dec.decode(pngBytes.subarray(off + 4, off + 8));
    const dataStart = off + 8;
    const dataEnd = dataStart + len;
    const next = off + 12 + len;
    if (dataEnd > pngBytes.length || next > pngBytes.length) break;
    if (type === "iTXt") {
      const d = pngBytes.subarray(dataStart, dataEnd);
      let p = 0;
      while (p < d.length && d[p] !== 0) p++;
      const keyword = dec.decode(d.subarray(0, p));
      if (keyword === metaKey) {
        p++;
        const compFlag = (p < d.length ? d[p] : 0); p++;
        p++;
        while (p < d.length && d[p] !== 0) p++;
        p++;
        while (p < d.length && d[p] !== 0) p++;
        p++;
        if (compFlag !== 0) throw new Error("Сжатые PNG метаданные не поддерживаются");
        return dec.decode(d.subarray(Math.min(p, d.length)));
      }
    } else if (type === "tEXt") {
      const d = pngBytes.subarray(dataStart, dataEnd);
      let p = 0;
      while (p < d.length && d[p] !== 0) p++;
      const keyword = dec.decode(d.subarray(0, p));
      if (keyword === metaKey) {
        p++;
        return dec.decode(d.subarray(Math.min(p, d.length)));
      }
    }
    if (type === "IEND") break;
    off = next;
  }
  return null;
};

export const embedProjectIntoPngBlob = async (pngBlob, projectData, metaKey) => {
  const text = JSON.stringify(projectData);
  const bytes = new Uint8Array(await pngBlob.arrayBuffer());
  const outBytes = injectProjectToPngBytes(bytes, text, metaKey);
  return new Blob([outBytes], { type: "image/png" });
};
