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

// ---------- Hero banner: quiet night sky, small observatory silhouette, name only ----------
function generateHero() {
  const W = 1120
  const H = 260
  const rand = seededRandom('hero-v2')
  const darkPalette = PALETTES.dark

  let dust = ''
  for (let i = 0; i < 26; i++) {
    const x = rand() * W
    const y = rand() * (H * 0.62)
    const r = 0.5 + rand() * 1.0
    const alpha = (0.15 + rand() * 0.3).toFixed(2)
    dust += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="rgba(${stageColor(rand(), darkPalette)},${alpha})"/>\n  `
  }

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
  </defs>
  <style>
    @keyframes twinkle { 0%, 100% { opacity: 0.5; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1); } }
    .twinkle { transform-origin: center; transform-box: fill-box; animation: twinkle 3.4s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) { .twinkle { animation: none; } }
  </style>
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
</svg>
`
  writeFileSync(`${OUT}/hero-banner.svg`, svg)
  console.log('wrote hero-banner.svg')
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
generateDivider()
generateContactIcons()
generatePlanets()
generateGalaxies()
console.log('All README assets generated.')
