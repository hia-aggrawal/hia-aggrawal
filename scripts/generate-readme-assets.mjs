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

// ---------- Label/value card: dark sky, ambient dust, rounded corners, baked text ----------
function generateLabelValueCard(filename, entries) {
  const W = 1120
  const ROW_H = 74
  const PAD_TOP = 40
  const PAD_BOTTOM = 32
  const H = PAD_TOP + entries.length * ROW_H + PAD_BOTTOM
  const textX = 60
  const dust = ambientDust(filename, W, H, 22)

  const rows = entries.map((entry, i) => {
    const cy = PAD_TOP + i * ROW_H + 10
    return `<text x="${textX}" y="${cy}" font-size="12.5" font-weight="600" letter-spacing="0.06em" fill="#6f7d99">${entry.label.toUpperCase()}</text>
  <text x="${textX}" y="${cy + 26}" font-size="18" fill="#e8ecf5">${entry.value}</text>`
  }).join('\n  ')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
  <defs>
    <radialGradient id="sky" cx="50%" cy="0%" r="100%">
      <stop offset="0%" stop-color="#0a0d1c"/>
      <stop offset="60%" stop-color="#060812"/>
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

  const sx = 980, sy = 46, sr = 5
  const sColor = stageColor(0.75, darkPalette)

  const domeX = 168, domeY = 200, domeR = 30
  const hillPath = `M0 ${H} L0 ${210} Q ${W * 0.18} ${188} ${domeX - domeR - 20} ${198} L ${domeX - domeR} ${200} A ${domeR} ${domeR} 0 0 1 ${domeX + domeR} ${200} L ${domeX + domeR + 30} ${196} Q ${W * 0.55} ${206} ${W} ${214} L ${W} ${H} Z`

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
  <defs>
    <radialGradient id="sky" cx="50%" cy="0%" r="100%">
      <stop offset="0%" stop-color="#0a0d1c"/>
      <stop offset="60%" stop-color="#060812"/>
    </radialGradient>
    <radialGradient id="heroGlow"><stop offset="0%" stop-color="rgb(${sColor})" stop-opacity="0.55"/><stop offset="100%" stop-color="rgb(${sColor})" stop-opacity="0"/></radialGradient>
    <radialGradient id="moon" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#f5f3ea"/>
      <stop offset="100%" stop-color="#c9c6ba"/>
    </radialGradient>
    <clipPath id="heroFrame"><rect x="0" y="0" width="${W}" height="${H}" rx="18"/></clipPath>
  </defs>
  <style>
    @keyframes twinkle { 0%, 100% { opacity: 0.5; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1); } }
    .twinkle { transform-origin: center; transform-box: fill-box; animation: twinkle 3.4s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) { .twinkle { animation: none; } }
  </style>
  <g clip-path="url(#heroFrame)">
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#sky)"/>
    ${dust}
    <circle cx="1040" cy="54" r="20" fill="url(#moon)" opacity="0.9"/>
    <g class="twinkle">
      <circle cx="${sx}" cy="${sy}" r="${(sr * 1.6).toFixed(1)}" fill="url(#heroGlow)"/>
      <path d="${sparklePath(sx, sy, sr, sr)}" fill="rgb(${sColor})"/>
    </g>
    <path d="${hillPath}" fill="#03040a" opacity="0.9"/>
    <rect x="${domeX - 3}" y="${domeY - domeR - 6}" width="6" height="10" fill="#03040a" opacity="0.9"/>
    <text x="60" y="108" font-size="30" font-weight="600" fill="#e8ecf5" letter-spacing="0.2">Hia Aggrawal</text>
  </g>
</svg>
`
  writeFileSync(`${OUT}/hero-banner.svg`, svg)
  console.log('wrote hero-banner.svg')
}

// ---------- Expeditions timeline: dashed rail + sparkle markers, baked-in text ----------
function generateExpeditionsTimeline() {
  const ENTRIES = [
    {
      role: 'AI Engineering Intern',
      org: 'IBM',
      dates: 'May 2026 – Present',
      desc: 'Mapping business goals into strategic opportunities through agent workflows and context-aware systems.',
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
  const PAD_TOP = 54
  const PAD_BOTTOM = 44
  const H = PAD_TOP + ENTRIES.length * ROW_H + PAD_BOTTOM
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
    const role = `<text x="${textX}" y="${cy - 12}" font-size="20" font-weight="600" fill="#e8ecf5">${escape(entry.role)} <tspan fill="#6f7d99" font-weight="400">&#183; ${escape(entry.org)}</tspan></text>`
    const dates = `<text x="${textX}" y="${cy + 12}" font-size="14" fill="#5b6b86" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace">${escape(entry.dates)}</text>`
    const desc = `<text x="${textX}" y="${cy + 38}" font-size="16" font-style="italic" fill="#8a97b8">${escape(entry.desc)}</text>`
    return `${marker}\n  ${role}\n  ${dates}\n  ${desc}`
  }).join('\n  ')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
  <defs>
    <radialGradient id="sky" cx="50%" cy="0%" r="100%">
      <stop offset="0%" stop-color="#0a0d1c"/>
      <stop offset="60%" stop-color="#060812"/>
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
  <text x="11" y="15.5" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif" font-size="9" font-weight="700" fill="rgb(${color})" text-anchor="middle">in</text>
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
generateLabelValueCard('field-notes-card', [
  { label: 'Studying', value: 'Honours B.Sc., Computer Science (PEY Co-op), University of Toronto Mississauga &#183; 2022&#8211;2027' },
  { label: 'Currently', value: 'AI Engineering Intern at IBM, building agent workflows and context-aware systems' },
  { label: 'Focus', value: 'Applied AI, backend systems, and full-stack product engineering' },
  { label: 'Beyond', value: 'Music, art, crochet, and travel' },
])
generateLabelValueCard('skills-card', [
  { label: 'Languages', value: 'Python &#183; Java &#183; JavaScript &#183; TypeScript &#183; C/C++ &#183; C#' },
  { label: 'AI &amp; Data', value: 'scikit-learn &#183; XGBoost &#183; Hugging Face &#183; TensorFlow &#183; PyTorch &#183; pandas' },
  { label: 'Frameworks', value: 'React &#183; Flask &#183; Spring Boot &#183; Tailwind CSS' },
  { label: 'Cloud &amp; Platform', value: 'Azure &#183; Docker &#183; Kubernetes &#183; Power Platform' },
])
generateAsteroidBelt()
generateDivider()
generateContactIcons()
generatePlanets()
generateGalaxies()
console.log('All README assets generated.')
