import { mkdir, writeFile } from 'node:fs/promises'

const username = process.env.GARDEN_USERNAME || 'hia-aggrawal'
const token = process.env.GITHUB_TOKEN
if (!token) throw new Error('GITHUB_TOKEN is required')

const query = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { contributionCount weekday date } }
      }
    }
  }
}`

const response = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: {
    authorization: `bearer ${token}`,
    'content-type': 'application/json',
    'user-agent': 'hia-flower-field',
  },
  body: JSON.stringify({ query, variables: { login: username } }),
})

if (!response.ok) throw new Error(`GitHub API returned ${response.status}`)
const payload = await response.json()
if (payload.errors) throw new Error(JSON.stringify(payload.errors))

const calendar = payload.data.user.contributionsCollection.contributionCalendar
const weeks = calendar.weeks
const palette = ['#ff76ad', '#ff9bc5', '#7f8cff', '#69c7f5', '#ffd85a', '#b98cff']
const hash = (value) => [...value].reduce((sum, char) => (sum * 33 + char.charCodeAt(0)) >>> 0, 17)

const flower = ({ x, y, count, seed, index }) => {
  const size = 2.7 + Math.min(count, 15) * .16
  const height = 8 + Math.min(count, 20) * .55 + seed % 8
  const color = palette[(seed + index) % palette.length]
  const petal = size.toFixed(1)
  return `<g class="plant" style="animation-delay:-${((seed + index) % 24 / 10).toFixed(1)}s" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">
    <path d="M0 0q${index % 2 ? -2 : 2} -${(height / 2).toFixed(1)} 0 -${height.toFixed(1)}" fill="none" stroke="#297a4a" stroke-width="1.25" stroke-linecap="round"/>
    <path d="M0 -${(height * .45).toFixed(1)}q${index % 2 ? 6 : -6} -4 ${index % 2 ? 7 : -7} 2q${index % 2 ? -5 : 5} 2 ${index % 2 ? -7 : 7} -2" fill="#53a85f"/>
    <g transform="translate(0 -${height.toFixed(1)})">
      <ellipse cx="0" cy="-${petal}" rx="${petal}" ry="${(size * 1.35).toFixed(1)}" fill="${color}"/>
      <ellipse cx="${petal}" cy="0" rx="${(size * 1.35).toFixed(1)}" ry="${petal}" fill="${color}"/>
      <ellipse cx="0" cy="${petal}" rx="${petal}" ry="${(size * 1.35).toFixed(1)}" fill="${color}"/>
      <ellipse cx="-${petal}" cy="0" rx="${(size * 1.35).toFixed(1)}" ry="${petal}" fill="${color}"/>
      <circle r="${(size * .62).toFixed(1)}" fill="#fff0a6" stroke="#df9b46" stroke-width=".6"/>
    </g>
  </g>`
}

let field = ''
weeks.forEach((week, weekIndex) => {
  week.contributionDays.forEach((day) => {
    const seed = hash(day.date)
    const x = 49 + weekIndex * 17.15
    const y = 166 + day.weekday * 20.5

    field += `<path d="M${(x - 5).toFixed(1)} ${y.toFixed(1)}q2-7 4 0q2-10 4 0" fill="none" stroke="#3c9354" stroke-width="1" opacity=".55"/>`
    if (!day.contributionCount) return

    // Each active contribution day becomes a flower patch. More activity grows
    // more blooms, up to five, while bloom size continues to reflect volume.
    const blooms = Math.min(5, Math.max(1, Math.ceil(day.contributionCount / 2)))
    for (let i = 0; i < blooms; i++) {
      const offsetX = (i - (blooms - 1) / 2) * 3.2
      const offsetY = (seed + i * 7) % 5
      field += flower({ x: x + offsetX, y: y + offsetY, count: day.contributionCount, seed, index: i })
    }
  })
})

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="330" viewBox="0 0 1000 330" role="img" aria-labelledby="title desc">
  <title id="title">Hia's contribution flower field</title>
  <desc id="desc">An anime-inspired meadow generated from ${calendar.totalContributions} public GitHub contributions during the last year.</desc>
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#70c9f4"/><stop offset=".72" stop-color="#cceeff"/><stop offset="1" stop-color="#f4f9d5"/></linearGradient>
    <linearGradient id="hill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#72c96f"/><stop offset="1" stop-color="#2f8b50"/></linearGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="9"/></filter>
    <filter id="glow"><feGaussianBlur stdDeviation="2.5"/></filter>
  </defs>
  <style>
    .plant{transform-box:fill-box;transform-origin:50% 100%;animation:sway 3.2s ease-in-out infinite alternate}
    .cloud{animation:cloud 18s ease-in-out infinite alternate}.spark{animation:twinkle 2.4s ease-in-out infinite alternate}
    .wing{transform-box:fill-box;transform-origin:center;animation:wing .13s ease-in-out infinite alternate}
    #bee{animation:bob 2.3s ease-in-out infinite alternate}
    @keyframes sway{to{rotate:4deg}}@keyframes cloud{to{transform:translateX(18px)}}@keyframes twinkle{to{opacity:.15;scale:.55}}@keyframes wing{to{scale:1 .28}}@keyframes bob{to{transform:translateY(-7px) rotate(3deg)}}
    @media(prefers-reduced-motion:reduce){*{animation:none!important}}
  </style>
  <rect width="1000" height="330" rx="20" fill="url(#sky)"/>
  <circle cx="840" cy="66" r="35" fill="#fff4b3" opacity=".9"/><circle cx="840" cy="66" r="49" fill="#fff4b3" opacity=".25" filter="url(#glow)"/>
  <g class="cloud" fill="#fff" opacity=".76"><ellipse cx="130" cy="62" rx="53" ry="13"/><circle cx="105" cy="52" r="19"/><circle cx="142" cy="48" r="24"/><ellipse cx="625" cy="92" rx="60" ry="14"/><circle cx="600" cy="80" r="22"/><circle cx="640" cy="78" r="27"/></g>
  <path d="M0 171Q135 112 274 166t255-8 258-7 213 1v178H0Z" fill="#8bd27b" opacity=".82"/>
  <path d="M0 202Q160 145 314 198t303-10 383-17v159H0Z" fill="url(#hill)"/>
  <path d="M0 271q115-31 225 0t225 0 225 0 225 0 100 0v59H0Z" fill="#267745" opacity=".72"/>
  <text x="38" y="35" fill="#174866" font-family="monospace" font-size="10" letter-spacing="2">HIA'S CONTRIBUTION FIELD · ${calendar.totalContributions} CONTRIBUTIONS</text>
  ${field}
  <g class="spark" fill="#fff"><path d="M237 82l2 7 7 2-7 2-2 7-2-7-7-2 7-2Z"/><path d="M765 125l1.5 5 5 1.5-5 1.5-1.5 5-1.5-5-5-1.5 5-1.5Z"/></g>
  <g id="bee" transform="translate(895 118) rotate(-9)">
    <path d="M-18 10C-72-13-106 39-157 13" fill="none" stroke="#174866" stroke-width="1.2" stroke-dasharray="2 7" opacity=".5"/>
    <ellipse class="wing" cx="11" cy="3" rx="10" ry="7" fill="#fff" fill-opacity=".8" stroke="#174866"/><ellipse class="wing" cx="11" cy="21" rx="10" ry="7" fill="#fff" fill-opacity=".8" stroke="#174866"/>
    <path d="M3 12C3 5 9 1 17 3c7 1 12 6 13 9-1 4-6 8-13 10C9 24 3 19 3 12Z" fill="#ffd85a" stroke="#174866" stroke-width="1.5"/>
    <path d="M12 3c-3 6-3 13 0 19M20 5c-3 5-3 10 0 15" fill="none" stroke="#174866" stroke-width="1.4"/><circle cx="3" cy="12" r="5.5" fill="#174866"/>
  </g>
  <text x="960" y="308" text-anchor="end" fill="#e7f8dc" font-family="Georgia,serif" font-size="13" font-style="italic">every active day grows something</text>
</svg>`

await mkdir('dist', { recursive: true })
await writeFile('dist/contribution-flower-field.svg', svg)
console.log(`Grew ${calendar.totalContributions} contributions into Hia's flower field.`)
