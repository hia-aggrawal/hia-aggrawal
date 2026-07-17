import { mkdirSync, writeFileSync } from 'node:fs'

const USERNAME = process.env.GH_USERNAME || 'hia-aggrawal'
const YEAR = new Date().getUTCFullYear()

const PAD_X = 30
const PAD_TOP = 34
const PAD_BOTTOM = 30
const CELL_W = 24
const CELL_H = 46
const K_NEAREST = 2

async function fetchContributionDays(username, year) {
  const url = `https://github.com/users/${username}/contributions?from=${year}-01-01&to=${year}-12-31`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; contribution-constellation-script)' },
  })
  if (!res.ok) throw new Error(`Failed to fetch contributions page: ${res.status}`)
  const html = await res.text()

  const dateById = new Map()
  for (const [, date, id] of html.matchAll(/data-date="([0-9-]+)"[^>]*id="(contribution-day-component-[0-9-]+)"/g)) {
    dateById.set(id, date)
  }

  const countById = new Map()
  for (const [, id, text] of html.matchAll(/for="(contribution-day-component-[0-9-]+)"[^>]*>([^<]*)/g)) {
    const match = text.match(/^\s*(\d+)\s+contributions?/)
    countById.set(id, match ? Number(match[1]) : 0)
  }

  const byDate = new Map()
  for (const [id, date] of dateById) byDate.set(date, countById.get(id) ?? 0)

  const start = new Date(Date.UTC(year, 0, 1))
  const end = new Date(Date.UTC(year, 11, 31))
  const days = []
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10)
    days.push({ date: new Date(d), count: byDate.get(iso) || 0, dow: d.getUTCDay() })
  }
  return days
}

function layoutColumns(days) {
  const cols = []
  let col = new Array(7).fill(null)
  for (const day of days) {
    if (day.dow === 0 && col.some((c) => c !== null)) {
      cols.push(col)
      col = new Array(7).fill(null)
    }
    col[day.dow] = day
  }
  cols.push(col)
  return cols
}

function monthLabelForColumn(col) {
  const firstOfMonth = col.find((day) => day && day.date.getUTCDate() <= 7)
  if (!firstOfMonth) return null
  return firstOfMonth.date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
}

// Deterministic per-day jitter so layout only changes when the underlying
// contribution data changes, not on every scheduled run.
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

function stageColor(t) {
  const cool = [159, 201, 255]
  const warm = [255, 246, 224]
  const r = Math.round(cool[0] + (warm[0] - cool[0]) * t)
  const g = Math.round(cool[1] + (warm[1] - cool[1]) * t)
  const b = Math.round(cool[2] + (warm[2] - cool[2]) * t)
  return `${r}, ${g}, ${b}`
}

function buildStars(days) {
  const cols = layoutColumns(days)
  const maxCount = Math.max(1, ...days.map((d) => d.count))
  const stars = []
  cols.forEach((col, ci) => {
    col.forEach((day, ri) => {
      if (!day || day.count <= 0) return
      const baseX = PAD_X + ci * CELL_W
      const baseY = PAD_TOP + ri * CELL_H
      const rand = seededRandom(day.date.toISOString().slice(0, 10))
      const jitterX = (rand() - 0.5) * CELL_W * 0.8
      const jitterY = (rand() - 0.5) * CELL_H * 0.7
      const intensity = day.count / maxCount
      const radius = 2.2 + Math.sqrt(day.count) * 2.1
      const duration = 2.4 + rand() * 2.2
      const delay = -rand() * duration
      stars.push({
        x: baseX + jitterX,
        y: baseY + jitterY,
        r: radius,
        color: stageColor(intensity),
        date: day.date,
        count: day.count,
        duration,
        delay,
      })
    })
  })
  return { stars, weeks: cols.length, cols }
}

function buildLinks(stars, maxDist, k) {
  const links = []
  const seen = new Set()
  for (let i = 0; i < stars.length; i++) {
    const dists = []
    for (let j = 0; j < stars.length; j++) {
      if (i === j) continue
      const dx = stars[i].x - stars[j].x
      const dy = stars[i].y - stars[j].y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= maxDist) dists.push([dist, j])
    }
    dists.sort((a, b) => a[0] - b[0])
    for (const [dist, j] of dists.slice(0, k)) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`
      if (seen.has(key)) continue
      seen.add(key)
      links.push({ a: stars[i], b: stars[j], dist })
    }
  }
  return links
}

function sparklePath(cx, cy, l, w) {
  const k = 0.16
  const p = (n) => n.toFixed(1)
  return `M ${p(cx)} ${p(cy - l)} Q ${p(cx + w * k)} ${p(cy - l * k)} ${p(cx + w)} ${p(cy)} Q ${p(cx + w * k)} ${p(cy + l * k)} ${p(cx)} ${p(cy + l)} Q ${p(cx - w * k)} ${p(cy + l * k)} ${p(cx - w)} ${p(cy)} Q ${p(cx - w * k)} ${p(cy - l * k)} ${p(cx)} ${p(cy - l)} Z`
}

const CAPTION_BAND = 44

function renderSvg({ stars, weeks, cols, links, total, year }) {
  const width = PAD_X * 2 + weeks * CELL_W
  const boxHeight = PAD_TOP + 6 * CELL_H + PAD_BOTTOM
  const height = CAPTION_BAND + boxHeight
  const maxDist = Math.max(CELL_W, CELL_H) * 2.3

  // Other README cards are baked at a 1120px reference width. This grid can be
  // wider, and since GitHub scales every image down to the same content-column
  // width, a wider source image shrinks its own text more on screen than the
  // others unless font sizes are scaled up to compensate.
  const REFERENCE_WIDTH = 1120
  const textScale = width / REFERENCE_WIDTH

  const months = []
  let lastMonth = null
  cols.forEach((col, ci) => {
    const label = monthLabelForColumn(col)
    if (label && label !== lastMonth) {
      const x = PAD_X + ci * CELL_W
      months.push(`<text x="${x.toFixed(1)}" y="${(PAD_TOP - 10).toFixed(1)}" font-size="${(12 * textScale).toFixed(1)}" fill="#5b6b7f">${label}</text>`)
      lastMonth = label
    }
  })

  const minR = Math.min(...stars.map((s) => s.r))
  const maxR = Math.max(...stars.map((s) => s.r))
  const sparkleThreshold = minR + (maxR - minR) * 0.5

  const lines = links
    .map((l) => {
      const alpha = Math.max(0.04, 0.32 * (1 - l.dist / maxDist)).toFixed(2)
      return `<line x1="${l.a.x.toFixed(1)}" y1="${l.a.y.toFixed(1)}" x2="${l.b.x.toFixed(1)}" y2="${l.b.y.toFixed(1)}" stroke="rgba(255,255,255,${alpha})" stroke-width="1"/>`
    })
    .join('\n  ')

  const defs = []
  const marks = stars
    .map((s, i) => {
      if (s.r < sparkleThreshold) {
        return `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${(s.r * 0.45).toFixed(1)}" fill="rgba(${s.color},0.85)"/>`
      }
      const l = s.r * 1.0
      const w = s.r * 1.0
      const gradId = `g${i}`
      defs.push(
        `<radialGradient id="${gradId}"><stop offset="0%" stop-color="rgb(${s.color})" stop-opacity="0.65"/><stop offset="100%" stop-color="rgb(${s.color})" stop-opacity="0"/></radialGradient>`
      )
      const style = `--dur:${s.duration.toFixed(2)}s;--delay:${s.delay.toFixed(2)}s`
      const glow = `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${(l * 1.4).toFixed(1)}" fill="url(#${gradId})"/>`
      const path = `<path d="${sparklePath(s.x, s.y, l, w)}" fill="rgb(${s.color})"/>`
      return `<g class="twinkle" style="${style}">\n    ${glow}\n    ${path}\n  </g>`
    })
    .join('\n  ')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
  <defs>
    <radialGradient id="sky" cx="50%" cy="0%" r="100%">
      <stop offset="0%" stop-color="#0a0d1c"/>
      <stop offset="60%" stop-color="#060812"/>
    </radialGradient>
    <clipPath id="constellationFrame"><rect x="0" y="0" width="${width}" height="${boxHeight}" rx="18"/></clipPath>
    ${defs.join('\n    ')}
  </defs>
  <style>
    @keyframes twinkle { 0%, 100% { opacity: 0.55; transform: scale(0.88); } 50% { opacity: 1; transform: scale(1); } }
    .twinkle {
      transform-origin: center;
      transform-box: fill-box;
      animation: twinkle var(--dur, 3s) ease-in-out infinite;
      animation-delay: var(--delay, 0s);
    }
    @media (prefers-reduced-motion: reduce) {
      .twinkle { animation: none; }
    }
  </style>
  <text x="0" y="${(20 * textScale).toFixed(1)}" font-size="${(18 * textScale).toFixed(1)}" fill="#7f8bab">${year} &#183; ${total} contributions</text>
  <g transform="translate(0, ${CAPTION_BAND})" clip-path="url(#constellationFrame)">
    <rect x="0" y="0" width="${width}" height="${boxHeight}" fill="url(#sky)"/>
    ${months.join('\n    ')}
    ${lines}
    ${marks}
  </g>
</svg>
`
}

const days = await fetchContributionDays(USERNAME, YEAR)
const { stars, weeks, cols } = buildStars(days)
const maxDist = Math.max(CELL_W, CELL_H) * 2.3
const links = buildLinks(stars, maxDist, K_NEAREST)
const total = days.reduce((sum, d) => sum + d.count, 0)

const svg = renderSvg({ stars, weeks, cols, links, total, year: YEAR })

mkdirSync('assets', { recursive: true })
writeFileSync('assets/contribution-constellation.svg', svg)
console.log(`Wrote assets/contribution-constellation.svg (${total} contributions in ${YEAR})`)
