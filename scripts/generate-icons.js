// Generates minimal PNG icons for the FleetFlow PWA manifest
// Uses only Node.js built-ins (zlib + fs) — no external deps required
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

function crc32(data) {
  let crc = 0xffffffff
  for (const byte of data) {
    crc ^= byte
    for (let i = 0; i < 8; i++) {
      crc = (crc & 1) ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function u32be(n) {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(n, 0)
  return b
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const crc = u32be(crc32(Buffer.concat([t, data])))
  return Buffer.concat([u32be(data.length), t, data, crc])
}

function createPNG(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = chunk('IHDR', Buffer.concat([u32be(size), u32be(size), Buffer.from([8, 2, 0, 0, 0])]))

  // FleetFlow blue #2563eb
  const BR = 0x25, BG = 0x63, BB = 0xeb

  const rows = []
  const pad = Math.floor(size * 0.15)
  const innerW = size - pad * 2

  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3)
    row[0] = 0 // filter: None
    for (let x = 0; x < size; x++) {
      // Normalised coords within the inner area
      const ix = x - pad, iy = y - pad
      let isWhite = false

      if (ix >= 0 && ix < innerW && iy >= 0 && iy < innerW) {
        const nx = ix / innerW, ny = iy / innerW
        const sw = 0.12 // stroke width ratio

        // Vertical bar of "F": left column, full height
        const leftEdge = 0.10, rightEdge = leftEdge + sw
        const topEdge = 0.08, botEdge = 0.92
        const isVertBar = nx >= leftEdge && nx <= rightEdge && ny >= topEdge && ny <= botEdge

        // Top horizontal bar: spans 10–72%, top 8–22%
        const isTopBar = nx >= leftEdge && nx <= 0.72 && ny >= topEdge && ny <= topEdge + sw * 1.1

        // Middle bar: spans 10–58%, at y 42–56%
        const isMidBar = nx >= leftEdge && nx <= 0.58 && ny >= 0.42 && ny <= 0.56

        isWhite = isVertBar || isTopBar || isMidBar
      }

      const off = 1 + x * 3
      row[off]     = isWhite ? 255 : BR
      row[off + 1] = isWhite ? 255 : BG
      row[off + 2] = isWhite ? 255 : BB
    }
    rows.push(row)
  }

  const raw = Buffer.concat(rows)
  const compressed = zlib.deflateSync(raw, { level: 6 })
  const idat = chunk('IDAT', compressed)
  const iend = chunk('IEND', Buffer.alloc(0))

  return Buffer.concat([sig, ihdr, idat, iend])
}

const dir = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(dir, { recursive: true })
fs.writeFileSync(path.join(dir, 'icon-192.png'), createPNG(192))
fs.writeFileSync(path.join(dir, 'icon-512.png'), createPNG(512))
console.log('✓ PWA icons created: public/icons/icon-192.png & icon-512.png')
