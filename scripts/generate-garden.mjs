import { writeFile } from 'node:fs/promises'

const username = process.env.GARDEN_USERNAME || 'hia-aggrawal'
const token = process.env.GITHUB_TOKEN
if (!token) throw new Error('GITHUB_TOKEN is required')

const query = `query($login:String!) {
  user(login:$login) {
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
  headers: { authorization: `bearer ${token}`, 'content-type': 'application/json', 'user-agent': 'contribution-garden' },
  body: JSON.stringify({ query, variables: { login: username } }),
})
if (!response.ok) throw new Error(`GitHub API returned ${response.status}`)
const payload = await response.json()
if (payload.errors) throw new Error(JSON.stringify(payload.errors))

const calendar = payload.data.user.contributionsCollection.contributionCalendar
const weeks = calendar.weeks
const W = 1000, H = 270, startX = 48, startY = 76, stepX = 17.1, stepY = 24
const colors = ['#c9486f', '#e8c83f', '#76243a', '#7ca06f', '#e8a6b7']

const hash = (text) => [...text].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7)
const flower = (x, y, size, color, delay, tilt) => `
  <g class="flower" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${tilt})" style="animation-delay:${delay}s">
    <path d="M0 8V${(18 + size).toFixed(1)}" stroke="#587354" stroke-width="1.2" stroke-linecap="round"/>
    <g transform="translate(0 7)">
      <circle cx="0" cy="-${size}" r="${size}" fill="${color}"/><circle cx="${size}" cy="0" r="${size}" fill="${color}"/>
      <circle cx="0" cy="${size}" r="${size}" fill="${color}"/><circle cx="-${size}" cy="0" r="${size}" fill="${color}"/>
      <circle r="${Math.max(1.3, size * .55)}" fill="#17182c"/>
    </g>
  </g>`

let plants = ''
weeks.forEach((week, wi) => week.contributionDays.forEach((day) => {
  const x = startX + wi * stepX
  const ground = startY + day.weekday * stepY + 14
  if (!day.contributionCount) {
    plants += `<circle cx="${x.toFixed(1)}" cy="${ground}" r="1" fill="#587354" opacity=".22"/>`
    return
  }
  const seed = hash(day.date)
  const visibleBlooms = Math.min(day.contributionCount, 7)
  for (let n = 0; n < visibleBlooms; n++) {
    const spread = visibleBlooms === 1 ? 0 : (n - (visibleBlooms - 1) / 2) * 2.3
    const jitter = ((seed >> (n % 16)) % 5) - 2
    const size = 2.1 + Math.min(day.contributionCount, 18) * .07 + (n % 2) * .35
    const stem = 8 + ((seed + n * 7) % 12)
    plants += flower(x + spread, ground - stem + jitter, size, colors[(seed + n) % colors.length], ((wi + day.weekday + n) % 13 / 10).toFixed(1), -8 + ((seed + n * 11) % 17))
  }
}))

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="270" viewBox="0 0 1000 270" role="img" aria-labelledby="title desc">
<title id="title">${username}'s contribution garden</title><desc id="desc">A flower field generated from ${calendar.totalContributions} GitHub contributions in the last year.</desc>
<defs><pattern id="paper" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#17182c" stroke-opacity=".05"/></pattern></defs>
<style>
  .flower{transform-box:fill-box;transform-origin:50% 100%;animation:sway 3.8s ease-in-out infinite alternate}
  .wing{transform-box:fill-box;transform-origin:center;animation:wing .16s ease-in-out infinite alternate}
  #bee{animation:fly 13s ease-in-out infinite}
  @keyframes sway{to{rotate:3deg}} @keyframes wing{to{scale:.7 .35}}
  @keyframes fly{0%,100%{transform:translate(0,4px) rotate(-3deg)}50%{transform:translate(0,-7px) rotate(4deg)}}
  @media(prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<rect width="1000" height="270" rx="18" fill="#f2eadb"/><rect width="1000" height="270" rx="18" fill="url(#paper)"/>
<text x="40" y="40" fill="#76243a" font-family="monospace" font-size="10" letter-spacing="2">CONTRIBUTION FIELD / ${calendar.totalContributions} SEEDS THIS YEAR</text>
<path d="M25 247Q150 225 300 245t300 0 300 0 150 0" fill="none" stroke="#587354" stroke-opacity=".3"/>
${plants}
<g id="bee" transform="translate(920 38)"><path d="M-48 12C-180-17-244 48-360 12" fill="none" stroke="#17182c" stroke-width="1.3" stroke-dasharray="2 7" opacity=".55"/><g transform="translate(-3 0) rotate(-8)"><ellipse class="wing" cx="12" cy="4" rx="9" ry="6" fill="#fff9e9" stroke="#17182c"/><ellipse class="wing" cx="12" cy="20" rx="9" ry="6" fill="#fff9e9" stroke="#17182c"/><path d="M5 12c0-6 5-10 13-8 6 1 11 5 12 8-1 4-6 8-12 9-8 2-13-2-13-9Z" fill="#e8c83f" stroke="#17182c" stroke-width="1.4"/><path d="M14 4c-3 5-3 12 0 17M21 5c-3 5-3 10 0 14" fill="none" stroke="#17182c"/><circle cx="5" cy="12" r="5" fill="#17182c"/></g></g>
<text x="955" y="250" text-anchor="end" fill="#17182c" font-family="Georgia,serif" font-size="12" font-style="italic">observe · connect · grow</text>
</svg>`

await writeFile('assets/contribution-garden.svg', svg)
console.log(`Grew ${calendar.totalContributions} contributions into ${username}'s garden.`)
