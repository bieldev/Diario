/**
 * Gera pwa-192.png, pwa-512.png e apple-touch-icon.png
 * sem nenhuma dependência externa — só Node.js built-in.
 */
import { writeFileSync, mkdirSync } from 'fs'
import { deflateSync } from 'zlib'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../public')
mkdirSync(OUT, { recursive: true })

// ─── CRC32 ────────────────────────────────────────────────────────────────────
const crcTable = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
  crcTable[i] = c
}
function crc32(buf) {
  let c = 0xFFFFFFFF
  for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

// ─── PNG chunk ────────────────────────────────────────────────────────────────
function chunk(type, data) {
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length)
  const typeB = Buffer.from(type, 'ascii')
  const crcVal = crc32(Buffer.concat([typeB, data]))
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crcVal)
  return Buffer.concat([lenBuf, typeB, data, crcBuf])
}

// ─── Draw icon pixels ─────────────────────────────────────────────────────────
function drawIcon(size) {
  const cx = size / 2
  const cy = size / 2
  const r  = size / 2

  const rows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4) // filter + RGBA
    row[0] = 0 // filter: None
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy) / r  // 0=center, 1=edge

      let R, G, B, A

      if (dist > 1) {
        // Fora do círculo — transparente
        R = 0; G = 0; B = 0; A = 0
      } else if (dist > 0.82) {
        // Borda outer ring — roxo escuro (#5B21B6)
        R = 91; G = 33; B = 182; A = 255
      } else if (dist > 0.55) {
        // Meio — roxo principal (#7C3AED)
        R = 124; G = 58; B = 237; A = 255
      } else if (dist > 0.28) {
        // Inner ring — lilás (#A78BFA)
        R = 167; G = 139; B = 250; A = 255
      } else {
        // Centro — branco quase puro com leve tom rosê
        R = 255; G = 245; B = 255; A = 255
      }

      // "H" em pixel art no centro (só nas resoluções maiores)
      if (size >= 192 && dist < 0.22) {
        const nx = (dx / r)
        const ny = (dy / r)
        // Duas colunas verticais do H
        const inLeft  = nx > -0.14 && nx < -0.04 && ny > -0.12 && ny < 0.12
        const inRight = nx >  0.04 && nx <  0.14 && ny > -0.12 && ny < 0.12
        // Barra horizontal
        const inMid   = nx > -0.14 && nx <  0.14 && ny > -0.025 && ny < 0.025
        if (inLeft || inRight || inMid) {
          R = 124; G = 58; B = 237; A = 255
        }
      }

      const i = 1 + x * 4
      row[i]     = R
      row[i + 1] = G
      row[i + 2] = B
      row[i + 3] = A
    }
    rows.push(row)
  }
  return Buffer.concat(rows)
}

// ─── Build PNG buffer ─────────────────────────────────────────────────────────
function buildPNG(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8]  = 8  // bit depth
  ihdr[9]  = 6  // color type: RGBA
  ihdr[10] = 0  // compression
  ihdr[11] = 0  // filter
  ihdr[12] = 0  // interlace

  const raw        = drawIcon(size)
  const compressed = deflateSync(raw, { level: 9 })

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ─── Write files ──────────────────────────────────────────────────────────────
const sizes = [
  { file: 'pwa-192.png',          size: 192 },
  { file: 'pwa-512.png',          size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
]

for (const { file, size } of sizes) {
  const png = buildPNG(size)
  writeFileSync(join(OUT, file), png)
  console.log(`✅ ${file} (${size}x${size}) — ${png.length} bytes`)
}
