import { mkdirSync, writeFileSync } from 'node:fs'

const OUT = 'assets'
mkdirSync(OUT, { recursive: true })

const PALETTES = {
  dark: { cool: [159, 201, 255], warm: [255, 246, 224], strokeGray: [140, 150, 175], highlightOpacity: 0.18 },
  light: { cool: [40, 74, 148], warm: [172, 88, 40], strokeGray: [90, 96, 112], highlightOpacity: 0.22 },
}

function stageColor(t, palette) {
  const { cool, warm } = palette
  const r = Math.round(cool[0] + (warm[0] - cool[0]) * t)
  const g = Math.round(cool[1] + (warm[1] - cool[1]) * t)
  const b = Math.round(cool[2] + (warm[2] - cool[2]) * t)
  return `${r}, ${g}, ${b}`
}

function seededRandom(seed) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    h >>>= 0
    return h / 4294967296
  }
}

function sparklePath(cx, cy, l, w) {
  const k = 0.16
  const p = (n) => n.toFixed(1)
  return `M ${p(cx)} ${p(cy - l)} Q ${p(cx + w * k)} ${p(cy - l * k)} ${p(cx + w)} ${p(cy)} Q ${p(cx + w * k)} ${p(cy + l * k)} ${p(cx)} ${p(cy + l)} Q ${p(cx - w * k)} ${p(cy + l * k)} ${p(cx - w)} ${p(cy)} Q ${p(cx - w * k)} ${p(cy - l * k)} ${p(cx)} ${p(cy - l)} Z`
}

function ambientDust(seed, W, H, count) {
  const rand = seededRandom(seed)
  const darkPalette = PALETTES.dark
  let dust = ''
  for (let i = 0; i < count; i++) {
    const x = rand() * W
    const y = rand() * H
    const r = 0.5 + rand() * 1.0
    const alpha = (0.12 + rand() * 0.28).toFixed(2)
    dust += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="rgba(${stageColor(rand(), darkPalette)},${alpha})"/>\n  `
  }
  return dust
}

// ---------- Field Notes constellation: 4 colorful stars in a vertical chain, transparent bg, light/dark ----------
function generateFieldNotesConstellation() {
  const ENTRIES = [
    { label: 'Studying', value: 'Honours B.Sc., Computer Science (PEY Co-op), University of Toronto Mississauga · 2022–2027' },
    { label: 'Currently', value: 'AI Engineering Intern at IBM, building agent workflows and context-aware systems' },
    { label: 'Focus', value: 'Applied AI, backend systems, and full-stack product engineering' },
    { label: 'Beyond', value: 'Music, art, crochet, and travel' },
  ]

  const W = 1120
  const ROW_H = 74
  const PAD_TOP = 40
  const H = 2 * PAD_TOP + (ENTRIES.length - 1) * ROW_H
  const railX = 50
  const jitter = [10, -8, 6, -4]
  const textX = 90
  const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

  for (const mode of ['dark', 'light']) {
    const palette = PALETTES[mode]
    const lineColor = palette.strokeGray.join(',')
    const labelColor = mode === 'light' ? '5b6472' : '6f7d99'
    const valueColor = mode === 'light' ? '1f2937' : 'e8ecf5'

    const starX = ENTRIES.map((_, i) => railX + jitter[i])
    const starY = ENTRIES.map((_, i) => PAD_TOP + i * ROW_H)

    const lines = starX
      .slice(0, -1)
      .map((x, i) => `<line x1="${x}" y1="${starY[i]}" x2="${starX[i + 1]}" y2="${starY[i + 1]}" stroke="rgba(${lineColor},0.35)" stroke-width="1" stroke-dasharray="2 3"/>`)
      .join('\n  ')

    const defs = []
    const stars = ENTRIES.map((entry, i) => {
      const x = starX[i]
      const y = starY[i]
      const r = 7
      const color = stageColor(i / (ENTRIES.length - 1), palette)
      const gradId = `fnGlow-${mode}-${i}`
      defs.push(`<radialGradient id="${gradId}"><stop offset="0%" stop-color="rgb(${color})" stop-opacity="0.55"/><stop offset="100%" stop-color="rgb(${color})" stop-opacity="0"/></radialGradient>`)
      return `<g class="twinkle" style="--dur:${(2.8 + i * 0.4).toFixed(1)}s;--delay:${(-i * 0.6).toFixed(1)}s">
      <circle cx="${x}" cy="${y}" r="${r * 2.2}" fill="url(#${gradId})"/>
      <path d="${sparklePath(x, y, r, r)}" fill="rgb(${color})"/>
    </g>
    <text x="${textX}" y="${y - 8}" font-size="14" font-weight="600" letter-spacing="0.06em" fill="#${labelColor}">${escape(entry.label.toUpperCase())}</text>
    <text x="${textX}" y="${y + 14}" font-size="18" fill="#${valueColor}">${escape(entry.value)}</text>`
    })

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
  <defs>
    ${defs.join('\n    ')}
  </defs>
  <style>
    @keyframes twinkle { 0%, 100% { opacity: 0.55; transform: scale(0.88); } 50% { opacity: 1; transform: scale(1); } }
    .twinkle { transform-origin: center; transform-box: fill-box; animation: twinkle var(--dur, 3s) ease-in-out infinite; animation-delay: var(--delay, 0s); }
    @media (prefers-reduced-motion: reduce) { .twinkle { animation: none; } }
  </style>
  ${lines}
  ${stars.join('\n  ')}
</svg>
`
    writeFileSync(`${OUT}/field-notes-constellation-${mode}.svg`, svg)
  }
  console.log('wrote field-notes-constellation-{dark,light}.svg')
}

// ---------- Label/value card: dark sky, ambient dust, rounded corners, baked text ----------
function generateLabelValueCard(filename, entries, { width = 1120, rowHeight = 74 } = {}) {
  const W = width
  const ROW_H = rowHeight
  const PAD_TOP = 40
  const lastEntry = entries[entries.length - 1]
  const lastLines = Array.isArray(lastEntry.value) ? lastEntry.value.length : 1
  const lastCy = PAD_TOP + (entries.length - 1) * ROW_H + 10
  const lastLineY = lastCy + 26 + (lastLines - 1) * 23
  const H = lastLineY + PAD_TOP
  const textX = 60
  const dust = ambientDust(filename, W, H, 22)

  const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

  const rows = entries.map((entry, i) => {
    const cy = PAD_TOP + i * ROW_H + 10
    const values = Array.isArray(entry.value) ? entry.value : [entry.value]
    const valueLines = values
      .map((value, line) => `<text x="${textX}" y="${cy + 26 + line * 23}" font-size="${W < 700 ? 15 : 18}" fill="#e8ecf5">${escape(value)}</text>`)
      .join('\n  ')
    return `<text x="${textX}" y="${cy}" font-size="12.5" font-weight="600" letter-spacing="0.06em" fill="#6f7d99">${escape(entry.label.toUpperCase())}</text>
  ${valueLines}`
  }).join('\n  ')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
  <defs>
    <radialGradient id="sky" cx="50%" cy="0%" r="100%">
      <stop offset="0%" stop-color="#241a47"/>
      <stop offset="30%" stop-color="#3a2262"/>
      <stop offset="55%" stop-color="#5c2a5a"/>
      <stop offset="75%" stop-color="#431f3f"/>
      <stop offset="100%" stop-color="#060812"/>
    </radialGradient>
    <clipPath id="frame-${filename}"><rect x="0" y="0" width="${W}" height="${H}" rx="18"/></clipPath>
  </defs>
  <g clip-path="url(#frame-${filename})">
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#sky)"/>
    ${dust}
    ${rows}
  </g>
</svg>
`
  writeFileSync(`${OUT}/${filename}.svg`, svg)
  console.log(`wrote ${filename}.svg`)
}

function asteroidPolygon(cx, cy, avgR, points, seed) {
  const rand = seededRandom(seed)
  let path = ''
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2
    const r = avgR * (0.7 + rand() * 0.6)
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    path += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `
  }
  return path + 'Z'
}

// ---------- Asteroid belt: short strip to sit beside each mission planet, transparent bg ----------
function generateAsteroidBelt() {
  const W = 640
  const H = 50

  for (const mode of ['dark', 'light']) {
    const rand = seededRandom(`asteroid-belt-v2-${mode}`)
    const palette = PALETTES[mode]

    const rocks = []
    const count = 18
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1)
      const x = 12 + t * (W - 24) + (rand() - 0.5) * 16
      const y = H / 2 + (rand() - 0.5) * 20
      const r = 1.3 + rand() * 3
      const points = 6 + Math.floor(rand() * 3)
      const shade = 0.15 + rand() * 0.55
      const color = stageColor(shade, palette)
      const alpha = (mode === 'light' ? 0.55 : 0.5) + rand() * 0.35
      const seed = `asteroid-${mode}-${i}`
      const path = asteroidPolygon(x, y, r, points, seed)
      const animate = rand() < 0.4
      const dur = (14 + rand() * 10).toFixed(1)
      const delay = (-rand() * 20).toFixed(1)
      const cls = animate ? ' class="drift"' : ''
      const style = animate ? ` style="--ddur:${dur}s;--ddelay:${delay}s"` : ''
      rocks.push(`<path${cls}${style} d="${path}" fill="rgba(${color},${alpha.toFixed(2)})"/>`)
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>
    @keyframes drift { 0% { transform: translateX(-6px); } 100% { transform: translateX(6px); } }
    .drift { animation: drift var(--ddur, 16s) ease-in-out infinite alternate; animation-delay: var(--ddelay, 0s); }
    @media (prefers-reduced-motion: reduce) { .drift { animation: none; } }
  </style>
  ${rocks.join('\n  ')}
</svg>
`
    writeFileSync(`${OUT}/asteroid-belt-${mode}.svg`, svg)
  }
  console.log('wrote asteroid-belt-{dark,light}.svg')
}

// ---------- Hero banner: quiet night sky, small observatory silhouette, name only ----------
function generateHero() {
  const W = 1120
  const H = 260
  const darkPalette = PALETTES.dark
  const dust = ambientDust('hero-v2', W, H * 0.62, 26)

  const STARS = [
    { x: 62, y: 22, r: 3.5, t: 0.08 },
    { x: 470, y: 42, r: 4.5, t: 0.2 },
    { x: 640, y: 105, r: 5, t: 0.4 },
    { x: 790, y: 30, r: 4, t: 0.6 },
    { x: 900, y: 125, r: 5.5, t: 0.75 },
    { x: 550, y: 165, r: 4, t: 0.9 },
    { x: 980, y: 46, r: 5, t: 0.98 },
  ]
  const starDefs = []
  const starMarkup = STARS.map((s, i) => {
    const color = stageColor(s.t, darkPalette)
    const gradId = `heroGlow-${i}`
    starDefs.push(`<radialGradient id="${gradId}"><stop offset="0%" stop-color="rgb(${color})" stop-opacity="0.55"/><stop offset="100%" stop-color="rgb(${color})" stop-opacity="0"/></radialGradient>`)
    return `<g class="twinkle" style="--dur:${(2.6 + i * 0.35).toFixed(2)}s;--delay:${(-i * 0.5).toFixed(2)}s">
      <circle cx="${s.x}" cy="${s.y}" r="${(s.r * 1.6).toFixed(1)}" fill="url(#${gradId})"/>
      <path d="${sparklePath(s.x, s.y, s.r, s.r)}" fill="rgb(${color})"/>
    </g>`
  }).join('\n    ')

  const domeX = 168, domeY = 200, domeR = 30
  const hillPath = `M0 ${H} L0 ${210} Q ${W * 0.18} ${188} ${domeX - domeR - 20} ${198} L ${domeX - domeR} ${200} A ${domeR} ${domeR} 0 0 1 ${domeX + domeR} ${200} L ${domeX + domeR + 30} ${196} Q ${W * 0.55} ${206} ${W} ${214} L ${W} ${H} Z`

  const shootX1 = 750, shootY1 = 40, shootX2 = 860, shootY2 = 75

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
  <defs>
    <radialGradient id="sky" cx="50%" cy="0%" r="100%">
      <stop offset="0%" stop-color="#1a2450"/>
      <stop offset="45%" stop-color="#111a38"/>
      <stop offset="100%" stop-color="#060812"/>
    </radialGradient>
    ${starDefs.join('\n    ')}
    <radialGradient id="moon" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#fff3b0"/>
      <stop offset="100%" stop-color="#e0b83a"/>
    </radialGradient>
    <linearGradient id="horizonGlow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2c3a63" stop-opacity="0"/>
      <stop offset="100%" stop-color="#3a4a78" stop-opacity="0.8"/>
    </linearGradient>
    <clipPath id="heroFrame"><rect x="0" y="0" width="${W}" height="${H}" rx="18"/></clipPath>
    <filter id="auroraBlur" x="-20%" y="-50%" width="140%" height="200%">
      <feGaussianBlur stdDeviation="22"/>
    </filter>
    <linearGradient id="taglineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#fbcfe8"/>
      <stop offset="20%" stop-color="#f0abfc"/>
      <stop offset="40%" stop-color="#c4b5fd"/>
      <stop offset="60%" stop-color="#86efac"/>
      <stop offset="80%" stop-color="#7dd3fc"/>
      <stop offset="100%" stop-color="#fde68a"/>
    </linearGradient>
    <linearGradient id="shootingStar" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e8ecf5" stop-opacity="0"/>
      <stop offset="100%" stop-color="#e8ecf5" stop-opacity="0.85"/>
    </linearGradient>
  </defs>
  <style>
    @keyframes twinkle { 0%, 100% { opacity: 0.5; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1); } }
    .twinkle { transform-origin: center; transform-box: fill-box; animation: twinkle var(--dur, 3.4s) ease-in-out infinite; animation-delay: var(--delay, 0s); }
    @keyframes auroraDrift { 0% { transform: translateX(-16px); } 100% { transform: translateX(16px); } }
    .aurora { animation: auroraDrift 9s ease-in-out infinite alternate; }
    @media (prefers-reduced-motion: reduce) { .twinkle { animation: none; } .aurora { animation: none; } }
  </style>
  <g clip-path="url(#heroFrame)">
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#sky)"/>
    <g filter="url(#auroraBlur)" opacity="0.3">
      <path class="aurora" d="M -60 70 C 180 10 360 120 560 55 C 760 -10 940 90 1180 40" fill="none" stroke="#2fbf87" stroke-width="30" stroke-linecap="round"/>
      <path class="aurora" style="animation-delay:-3s" d="M -60 125 C 220 165 420 80 640 135 C 860 190 1000 110 1180 150" fill="none" stroke="#6fd9ae" stroke-width="24" stroke-linecap="round"/>
      <path class="aurora" style="animation-delay:-6s" d="M -60 30 C 200 65 400 5 620 45 C 840 85 1000 30 1180 15" fill="none" stroke="#c355c9" stroke-width="34" stroke-linecap="round"/>
      <path class="aurora" style="animation-delay:-1.5s" d="M -60 95 C 210 140 430 60 650 100 C 870 140 1010 70 1180 100" fill="none" stroke="#8f5fd6" stroke-width="30" stroke-linecap="round"/>
    </g>
    ${dust}
    <circle cx="1040" cy="54" r="20" fill="url(#moon)" opacity="0.9"/>
    ${starMarkup}
    <line x1="${shootX1}" y1="${shootY1}" x2="${shootX2}" y2="${shootY2}" stroke="url(#shootingStar)" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="${shootX2}" cy="${shootY2}" r="1.6" fill="#e8ecf5"/>
    <rect x="0" y="150" width="${W}" height="${H - 150}" fill="url(#horizonGlow)"/>
    <path d="${hillPath}" fill="#020306"/>
    <rect x="${domeX - 3}" y="${domeY - domeR - 6}" width="6" height="10" fill="#020306"/>
    <text x="60" y="108" font-size="32" font-weight="600" fill="#e8ecf5" letter-spacing="0.2">Hia Aggrawal</text>
    <text x="60" y="134" font-size="15" fill="url(#taglineGradient)">AI Engineer @ IBM | CS @ UofT</text>
  </g>
</svg>
`
  writeFileSync(`${OUT}/hero-banner.svg`, svg)
  console.log('wrote hero-banner.svg')
}

// ---------- Expeditions timeline: dashed rail + sparkle markers, full width, baked-in text ----------
function generateExpeditionsTimeline() {
  const ENTRIES = [
    {
      role: 'AI Engineering Intern',
      org: 'IBM',
      dates: 'May 2026 – Present',
      desc: 'Still in progress.',
    },
    {
      role: 'AI/ML Engineering Intern',
      org: 'Alphavima Technologies',
      dates: 'May 2025 – Apr 2026',
      desc: 'Built semantic recommendation, demand forecasting, and natural-language-to-SQL systems for enterprise CRM tooling.',
    },
    {
      role: 'Software Developer Intern',
      org: 'Alphavima Technologies',
      dates: 'May 2024 – Aug 2024',
      desc: 'Shipped two enterprise mobile apps end to end on the Microsoft Power Platform.',
    },
    {
      role: 'Software Developer Intern',
      org: 'The Home Depot Canada',
      dates: 'May 2023 – Aug 2023',
      desc: 'Strengthened delivery validation and order-tracking systems.',
    },
  ]

  const W = 1120
  const ROW_H = 122
  const PAD_TOP = 80
  const H = 2 * PAD_TOP + (ENTRIES.length - 1) * ROW_H
  const railX = 50
  const textX = 92
  const darkPalette = PALETTES.dark
  const dust = ambientDust('expeditions-timeline', W, H, 30)

  const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

  const railTop = PAD_TOP
  const railBottom = PAD_TOP + (ENTRIES.length - 1) * ROW_H
  const rail = `<line x1="${railX}" y1="${railTop}" x2="${railX}" y2="${railBottom}" stroke="rgba(${darkPalette.strokeGray.join(',')},0.4)" stroke-width="1" stroke-dasharray="2 4"/>`

  const rows = ENTRIES.map((entry, i) => {
    const cy = PAD_TOP + i * ROW_H
    const color = stageColor(i / (ENTRIES.length - 1), darkPalette)
    const marker = `<g class="twinkle" style="--dur:${(2.8 + i * 0.4).toFixed(1)}s;--delay:${(-i * 0.6).toFixed(1)}s">
      <circle cx="${railX}" cy="${cy}" r="11" fill="rgba(${color},0.28)"/>
      <path d="${sparklePath(railX, cy, 5.5, 5.5)}" fill="rgb(${color})"/>
    </g>`
    const role = `<text x="${textX}" y="${cy - 24}" font-size="22" font-weight="600" fill="#e8ecf5">${escape(entry.role)} <tspan fill="#6f7d99" font-weight="400">&#183; ${escape(entry.org)}</tspan></text>`
    const dates = `<text x="${textX}" y="${cy}" font-size="16" fill="#5b6b86" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace">${escape(entry.dates)}</text>`
    const desc = `<text x="${textX}" y="${cy + 24}" font-size="18" font-style="italic" fill="#8a97b8">${escape(entry.desc)}</text>`
    return `${marker}\n  ${role}\n  ${dates}\n  ${desc}`
  }).join('\n  ')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
  <defs>
    <radialGradient id="sky" cx="50%" cy="0%" r="100%">
      <stop offset="0%" stop-color="#241a47"/>
      <stop offset="30%" stop-color="#3a2262"/>
      <stop offset="55%" stop-color="#5c2a5a"/>
      <stop offset="75%" stop-color="#431f3f"/>
      <stop offset="100%" stop-color="#060812"/>
    </radialGradient>
    <clipPath id="timelineFrame"><rect x="0" y="0" width="${W}" height="${H}" rx="18"/></clipPath>
  </defs>
  <style>
    @keyframes twinkle { 0%, 100% { opacity: 0.55; transform: scale(0.88); } 50% { opacity: 1; transform: scale(1); } }
    .twinkle { transform-origin: center; transform-box: fill-box; animation: twinkle var(--dur, 3s) ease-in-out infinite; animation-delay: var(--delay, 0s); }
    @media (prefers-reduced-motion: reduce) { .twinkle { animation: none; } }
  </style>
  <g clip-path="url(#timelineFrame)">
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#sky)"/>
    ${dust}
    ${rail}
    ${rows}
  </g>
</svg>
`
  writeFileSync(`${OUT}/expeditions-timeline.svg`, svg)
  console.log('wrote expeditions-timeline.svg')
}

// ---------- Divider sparkle (light + dark) ----------
function generateDivider() {
  for (const mode of ['dark', 'light']) {
    const color = stageColor(0.4, PALETTES[mode])
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <path d="${sparklePath(8, 8, 7, 7)}" fill="rgb(${color})"/>
</svg>
`
    writeFileSync(`${OUT}/divider-sparkle-${mode}.svg`, svg)
  }
  console.log('wrote divider-sparkle-{dark,light}.svg')
}

// ---------- Contact icons: plain envelope + "in" monogram, muted, not brand-colored ----------
function mailIcon(mode, palette) {
  const color = stageColor(0.35, palette)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
  <rect x="3" y="5" width="16" height="12" rx="2" fill="none" stroke="rgb(${color})" stroke-width="1.4"/>
  <path d="M4 6.5 L11 12 L18 6.5" fill="none" stroke="rgb(${color})" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`
}

function linkedinIcon(mode, palette) {
  const color = stageColor(0.35, palette)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
  <rect x="3" y="3" width="16" height="16" rx="3" fill="none" stroke="rgb(${color})" stroke-width="1.4"/>
  <text x="11" y="15.5" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif" font-size="11" font-weight="700" fill="rgb(${color})" text-anchor="middle">in</text>
</svg>
`
}

function generateContactIcons() {
  for (const mode of ['dark', 'light']) {
    const palette = PALETTES[mode]
    writeFileSync(`${OUT}/icon-mail-${mode}.svg`, mailIcon(mode, palette))
    writeFileSync(`${OUT}/icon-linkedin-${mode}.svg`, linkedinIcon(mode, palette))
  }
  console.log('wrote icon-{mail,linkedin}-{dark,light}.svg')
}

// ---------- Mission planets (light + dark) ----------
const W = 96, H = 96, cx = W / 2, cy = H / 2

function glowDefs(id, color, mode) {
  const opacity = mode === 'light' ? 0.28 : 0.5
  return `<radialGradient id="${id}"><stop offset="0%" stop-color="rgb(${color})" stop-opacity="${opacity}"/><stop offset="100%" stop-color="rgb(${color})" stop-opacity="0"/></radialGradient>`
}

function highlight(r, palette) {
  return `<ellipse cx="${cx - r * 0.35}" cy="${cy - r * 0.35}" rx="${r * 0.4}" ry="${r * 0.28}" fill="#ffffff" opacity="${palette.highlightOpacity}"/>`
}

function ringed(color, r, mode, palette) {
  const gradId = `glowRinged-${mode}`
  const ringAlpha = mode === 'light' ? 0.5 : 0.55
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${glowDefs(gradId, color, mode)}</defs>
  <circle cx="${cx}" cy="${cy}" r="${r * 2.3}" fill="url(#${gradId})"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${r * 2.0}" ry="${r * 0.62}" fill="none" stroke="rgba(${color},${ringAlpha})" stroke-width="2" transform="rotate(-14 ${cx} ${cy})"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgb(${color})"/>
  ${highlight(r, palette)}
</svg>
`
}

function banded(color, r, mode, palette) {
  const gradId = `glowBanded-${mode}`
  const clipId = `clipBanded-${mode}`
  const darkBand = mode === 'light' ? 'rgba(0,0,0,0.18)' : 'rgba(10,13,28,0.22)'
  let bands = ''
  const bandCount = 5
  for (let i = 0; i < bandCount; i++) {
    const y = cy - r + (i * (2 * r)) / bandCount
    const h = (2 * r) / bandCount
    if (i % 2 !== 0) bands += `<rect x="${cx - r}" y="${y.toFixed(1)}" width="${2 * r}" height="${h.toFixed(1)}" fill="${darkBand}"/>\n  `
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    ${glowDefs(gradId, color, mode)}
    <clipPath id="${clipId}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${r * 2.3}" fill="url(#${gradId})"/>
  <g clip-path="url(#${clipId})">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgb(${color})"/>
    ${bands}
  </g>
  ${highlight(r, palette)}
</svg>
`
}

function cratered(color, r, mode, palette) {
  const gradId = `glowCratered-${mode}`
  const craterColor = mode === 'light' ? 'rgba(0,0,0,0.22)' : 'rgba(6,8,18,0.28)'
  const craters = [
    { dx: -0.35, dy: -0.1, cr: 0.16 },
    { dx: 0.25, dy: 0.3, cr: 0.12 },
    { dx: 0.1, dy: -0.35, cr: 0.09 },
    { dx: -0.15, dy: 0.15, cr: 0.07 },
  ]
  const craterMarks = craters
    .map((c) => `<circle cx="${(cx + c.dx * r).toFixed(1)}" cy="${(cy + c.dy * r).toFixed(1)}" r="${(c.cr * r).toFixed(1)}" fill="${craterColor}"/>`)
    .join('\n  ')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${glowDefs(gradId, color, mode)}</defs>
  <circle cx="${cx}" cy="${cy}" r="${r * 2.3}" fill="url(#${gradId})"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgb(${color})"/>
  ${craterMarks}
  ${highlight(r, palette)}
</svg>
`
}

function mooned(color, r, mode, palette) {
  const gradId = `glowMooned-${mode}`
  const moonR = r * 0.22
  const orbitR = r * 1.9
  const moonX = cx + orbitR * Math.cos((-40 * Math.PI) / 180)
  const moonY = cy + orbitR * Math.sin((-40 * Math.PI) / 180)
  const orbitStroke = mode === 'light' ? `rgba(${palette.strokeGray.join(',')},0.5)` : `rgba(${palette.strokeGray.join(',')},0.3)`
  const moonColor = mode === 'light' ? '#5b6472' : '#cfd6e6'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${glowDefs(gradId, color, mode)}</defs>
  <circle cx="${cx}" cy="${cy}" r="${r * 2.3}" fill="url(#${gradId})"/>
  <circle cx="${cx}" cy="${cy}" r="${orbitR.toFixed(1)}" fill="none" stroke="${orbitStroke}" stroke-width="1" stroke-dasharray="2 3"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgb(${color})"/>
  ${highlight(r, palette)}
  <circle cx="${moonX.toFixed(1)}" cy="${moonY.toFixed(1)}" r="${moonR.toFixed(1)}" fill="${moonColor}"/>
</svg>
`
}

function generatePlanets() {
  for (const mode of ['dark', 'light']) {
    const palette = PALETTES[mode]
    writeFileSync(`${OUT}/planet-ringed-${mode}.svg`, ringed(stageColor(0.15, palette), 15, mode, palette))
    writeFileSync(`${OUT}/planet-banded-${mode}.svg`, banded(stageColor(0.55, palette), 16, mode, palette))
    writeFileSync(`${OUT}/planet-cratered-${mode}.svg`, cratered(stageColor(0.85, palette), 14, mode, palette))
    writeFileSync(`${OUT}/planet-mooned-${mode}.svg`, mooned(stageColor(0.4, palette), 13, mode, palette))
  }
  console.log('wrote planet-{ringed,banded,cratered,mooned}-{dark,light}.svg')
}

// ---------- Coming-soon galaxies (light + dark) ----------
function spiralArmPath(turns, maxRadius, startAngle, points) {
  let d = ''
  for (let i = 0; i <= points; i++) {
    const t = i / points
    const angle = startAngle + t * turns * Math.PI * 2
    const radius = maxRadius * Math.pow(t, 0.72)
    const x = cx + radius * Math.cos(angle)
    const y = cy + radius * Math.sin(angle) * 0.62
    d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `
  }
  return d
}

function spiralGalaxy(mode, palette) {
  const gray = palette.strokeGray.join(',')
  const armAlpha = mode === 'light' ? 0.4 : 0.28
  const coreAlpha = mode === 'light' ? 0.55 : 0.4
  const dotAlpha = mode === 'light' ? 0.5 : 0.32

  const arm1 = spiralArmPath(1.15, 34, 0.3, 26)
  const arm2 = spiralArmPath(1.15, 34, 0.3 + Math.PI, 26)

  const seedPoints = [
    [0.5, 0.35], [0.75, 0.9], [1.05, -0.2], [1.3, 2.0],
    [0.35, 1.9], [0.65, 3.4], [0.9, 3.9], [1.15, 5.0],
    [0.25, 4.6], [0.55, 5.6],
  ]
  const dots = seedPoints
    .map(([t, phase]) => {
      const angle = 0.3 + t * 1.15 * Math.PI * 2 + phase * 0.15
      const radius = 34 * Math.pow(t, 0.72)
      const x = cx + radius * Math.cos(angle)
      const y = cy + radius * Math.sin(angle) * 0.62
      const r = 0.5 + (t % 0.3)
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="rgba(${gray},${dotAlpha})"/>`
    })
    .join('\n  ')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="coreGlow-${mode}"><stop offset="0%" stop-color="rgba(${gray},${coreAlpha})"/><stop offset="100%" stop-color="rgba(${gray},0)"/></radialGradient>
  </defs>
  <g transform="rotate(-20 ${cx} ${cy})">
    <path d="${arm1}" fill="none" stroke="rgba(${gray},${armAlpha})" stroke-width="1.1" stroke-linecap="round"/>
    <path d="${arm2}" fill="none" stroke="rgba(${gray},${armAlpha})" stroke-width="1.1" stroke-linecap="round"/>
    ${dots}
  </g>
  <circle cx="${cx}" cy="${cy}" r="10" fill="url(#coreGlow-${mode})"/>
  <circle cx="${cx}" cy="${cy}" r="2.2" fill="rgba(${gray},${coreAlpha + 0.15})"/>
</svg>
`
}

function ellipticalGalaxy(mode, palette) {
  const gray = palette.strokeGray.join(',')
  const coreAlpha = mode === 'light' ? 0.55 : 0.4
  const haloAlpha = mode === 'light' ? 0.28 : 0.18
  const dotAlpha = mode === 'light' ? 0.45 : 0.3

  const dots = [
    [0.7, -0.3], [-0.9, 0.15], [1.1, 0.35], [-0.5, -0.55], [1.4, -0.1], [-1.3, 0.4],
  ]
    .map(([dx, dy], i) => {
      const x = cx + dx * 16
      const y = cy + dy * 7
      const r = 0.5 + (i % 2) * 0.4
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="rgba(${gray},${dotAlpha})"/>`
    })
    .join('\n  ')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="ellCore-${mode}"><stop offset="0%" stop-color="rgba(${gray},${coreAlpha})"/><stop offset="45%" stop-color="rgba(${gray},${haloAlpha})"/><stop offset="100%" stop-color="rgba(${gray},0)"/></radialGradient>
  </defs>
  <g transform="rotate(-24 ${cx} ${cy})">
    <ellipse cx="${cx}" cy="${cy}" rx="30" ry="13" fill="url(#ellCore-${mode})"/>
    <ellipse cx="${cx}" cy="${cy}" rx="30" ry="13" fill="none" stroke="rgba(${gray},${haloAlpha})" stroke-width="0.75"/>
    ${dots}
  </g>
  <circle cx="${cx}" cy="${cy}" r="2" fill="rgba(${gray},${coreAlpha + 0.15})"/>
</svg>
`
}

function generateGalaxies() {
  for (const mode of ['dark', 'light']) {
    const palette = PALETTES[mode]
    writeFileSync(`${OUT}/galaxy-spiral-${mode}.svg`, spiralGalaxy(mode, palette))
    writeFileSync(`${OUT}/galaxy-elliptical-${mode}.svg`, ellipticalGalaxy(mode, palette))
  }
  console.log('wrote galaxy-{spiral,elliptical}-{dark,light}.svg')
}

generateHero()
generateExpeditionsTimeline()
generateFieldNotesConstellation()
generateAsteroidBelt()
generateDivider()
generateContactIcons()
generatePlanets()
generateGalaxies()
console.log('All README assets generated.')
