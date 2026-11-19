// Boards: Library, the Bar and its mini players.
import { G, GLASS, INK2, INK3, LIVE, BAD, RIM, PANEL, TRACK, art, scene, bar, board, btn, callMini, choice, cover, dot, downloadMini, esc, heading, icon, iconBtn, meter, mouseMini, musicMini, segmented, slider } from './lib.mjs'

// ---------------------------------------------------------------- Library
const playingHero = `<article style="position: relative; flex: 2 1 0; min-width: 0; border-radius: 18px; overflow: hidden; ${art('Hollow Reach', 0)}; box-shadow: 0 0 0 var(--hair, 1px) ${LIVE}">
${scene('Hollow Reach', 0)}
<div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0) 55%)"></div>
<div style="position: absolute; left: 24px; right: 24px; bottom: 22px; display: flex; align-items: flex-end; gap: 16px">
<div style="flex: 1 1 0; min-width: 0"><div style="font-size: 28px; line-height: 34px; font-weight: 600; letter-spacing: -0.01em">Hollow Reach</div>
<div style="margin-top: 4px; display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: ${LIVE}">${dot(LIVE, 8)}Playing · 1 hr 12 min</div></div>
${btn('Stop', { h: 40, pad: 18 })}
</div></article>`
const next = (title, meta, pal) => `<article style="position: relative; flex: 1 1 0; min-height: 0; border-radius: 18px; overflow: hidden; ${art(title, pal)}">
${scene(title, pal)}
<div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0) 70%)"></div>
<div style="position: absolute; left: 18px; right: 14px; bottom: 14px; display: flex; align-items: flex-end; gap: 12px">
<div style="flex: 1 1 0; min-width: 0"><div style="font-size: 20px; line-height: 26px; font-weight: 600">${esc(title)}</div><div style="font-size: 13px; color: ${INK2}">${esc(meta)}</div></div>
${btn('Play', { primary: true, h: 40, ic: 'play', pad: 18 })}
</div></article>`
const gifts = `<div style="height: 52px; flex: none; padding: 0 10px 0 16px; display: flex; align-items: center; gap: 12px; border-radius: 14px; ${GLASS}">
<span style="color: ${INK2}">${icon('gift', 18)}</span><span style="font-size: 13px"><b style="font-weight: 600">Night Harbor</b> <span style="color: ${INK2}">from Mira</span></span>
<span style="flex: 1 1 0"></span><span style="font-size: 13px; color: ${INK3}">1 more gift</span>${btn('Decline')}${btn('Accept', { primary: true })}</div>`
const folder = `<div style="width: 194px; height: 291px; flex: none; padding: 10px; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px; border-radius: 14px; ${GLASS}">
<div style="flex: 1 1 0; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 6px">${['Ashen Vale', 'Low Orbit', 'Saltwater', 'Redline 88'].map((t) => `<span style="border-radius: 8px; ${art(t)}"></span>`).join('')}</div>
<div style="display: flex; align-items: baseline; justify-content: space-between; padding: 0 2px 2px"><b style="font-size: 13px; font-weight: 600">Favorites</b><span style="font-size: 12px; color: ${INK3}">12</span></div></div>`
const row1 = ['Ashen Vale', 'Starfall Circuit', 'Iron Tide', 'Paper Lanterns', 'Deep Signal', 'Glasswing']
const row2 = [['Northwind', {}], ['Emberwake', { dim: true, glyph: 'download' }], ['Low Orbit', { tag: 'Update' }], ['Saltwater', {}], ['Redline 88', { dim: true, glyph: 'download' }], ['Kingsfall', {}], ['Neon Drift', {}]]
board('Library', 'Library', `
${bar({ active: 'library', end: musicMini({ size: 'small' }) + mouseMini({ wide: false }) })}
<main style="flex: 1 1 0; min-height: 0; padding: 0 ${G}px; display: flex; flex-direction: column; gap: 18px; overflow: hidden">
<section aria-label="Continue" style="height: 300px; flex: none; display: flex; gap: ${G}px">
${playingHero}
<div style="flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: ${G}px">${next('Night Harbor', '20 hr 40 min · Yesterday', 6)}${next('Starfall Circuit', '52 hr · 2 days ago', 3)}</div>
</section>
${gifts}
<section style="display: flex; flex-direction: column; gap: 12px; min-height: 0">
<div style="display: flex; align-items: center; gap: 14px">${heading('All games', '148')}${segmented(['All', 'Installed', 'Favorites'], 0)}<span style="flex: 1 1 0"></span>${choice('Recent')}${iconBtn('dots', { label: 'More' })}</div>
<div style="display: flex; gap: ${G}px">${folder}${row1.map((t) => cover(t, { w: 194 })).join('')}</div>
<div style="display: flex; gap: ${G}px">${row2.map(([t, o]) => cover(t, { w: 194, ...o })).join('')}</div>
</section>
</main>`)

// ---------------------------------------------------------------- Top bar and its mini players
const strip = (label, inner) => `<div style="display: flex; flex-direction: column; gap: 6px"><div style="padding-left: ${G}px; font-size: 12px; color: ${INK3}">${esc(label)}</div><div style="border-radius: 18px; overflow: hidden; ${art(label)}">${inner}</div></div>`
const card = (inner, w = 360) => `<section style="width: ${w}px; flex: none; padding: 16px; box-sizing: border-box; display: flex; flex-direction: column; gap: 14px; border-radius: 24px; background: #000; box-shadow: ${RIM}">${inner}</section>`
const round = (ic, { on = false, tone = '', size = 40, glyph = 18 } = {}) => `<span style="width: ${size}px; height: ${size}px; flex: none; display: grid; place-items: center; border-radius: 999px; ${on ? 'background: #fff; color: #000;' : `color: ${tone || '#fff'}; ${GLASS};`}">${icon(ic, glyph)}</span>`
const songCard = card(`
<div style="display: flex; gap: 14px; align-items: center"><span style="width: 72px; height: 72px; flex: none; border-radius: 12px; ${art('Midnight Circuit')}"></span>
<div style="flex: 1 1 0; min-width: 0"><div style="font-size: 15px; font-weight: 600">Midnight Circuit</div><div style="font-size: 13px; color: ${INK2}">Vela Park</div></div><span style="color: ${LIVE}">${icon('heart', 20)}</span></div>
<div><div style="position: relative; height: 4px; border-radius: 999px; background: ${TRACK}"><div style="width: 38%; height: 100%; border-radius: 999px; background: #fff"></div></div>
<div style="margin-top: 6px; display: flex; justify-content: space-between; font-size: 12px; color: ${INK3}; font-variant-numeric: tabular-nums"><span>1:32</span><span>4:03</span></div></div>
<div style="display: flex; align-items: center; justify-content: space-between">${round('shuffle', { size: 36, glyph: 16 })}${round('prev')}${round('pause', { on: true, size: 48, glyph: 22 })}${round('next')}${round('repeat', { size: 36, glyph: 16 })}</div>
<div style="display: flex; align-items: center; gap: 10px"><span style="color: ${INK2}">${icon('speaker', 16)}</span><div style="flex: 1 1 0">${meter(0.6)}</div></div>
<div style="display: flex; gap: 8px">${btn('Queue', { ic: 'list' })}${btn('Lyrics', { ic: 'lyrics' })}<span style="flex: 1 1 0"></span>${btn('Open Music')}</div>`)
const person = (name, ch, i, { speaking = false, muted = false } = {}) => `<div style="height: 40px; display: flex; align-items: center; gap: 10px"><span style="width: 28px; height: 28px; flex: none; display: grid; place-items: center; border-radius: 999px; font-size: 12px; font-weight: 600; background: ${['#3b4a6b', '#6b3b5c', '#3b6b52', '#6b5a3b'][i % 4]}; box-shadow: 0 0 0 2px ${speaking ? LIVE : 'transparent'}">${ch}</span><span style="flex: 1 1 0; font-size: 13px; font-weight: 500; ${muted ? `color: ${INK3}` : ''}">${esc(name)}</span>${slider(muted ? 0 : 0.7 - i * 0.12, { w: 96 })}</div>`
const callCard = card(`
<div style="display: flex; align-items: center; gap: 10px">${dot(LIVE, 8)}<div style="flex: 1 1 0"><div style="font-size: 15px; font-weight: 600">Lounge</div><div style="font-size: 13px; color: ${INK2}">Night Raid</div></div><span style="font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums">12:07</span></div>
<div>${person('Ada', 'A', 0)}${person('Rook', 'R', 1, { speaking: true })}${person('Mira', 'M', 2)}</div>
<div style="display: flex; align-items: center; justify-content: space-between">${round('callmic')}${round('callphones')}${round('screen')}${round('hangup', { tone: BAD })}</div>
<div style="display: flex">${btn('Open the call')}</div>`)
const mouseCard = card(`
<div style="display: flex; align-items: center; gap: 10px"><span style="color: ${INK2}">${icon('devices', 20)}</span><div style="flex: 1 1 0"><div style="font-size: 15px; font-weight: 600">Starlight X</div><div style="font-size: 13px; color: ${INK2}">82% · about 46 hours</div></div></div>
<div style="display: flex; align-items: center; justify-content: space-between"><span style="font-size: 13px; font-weight: 500">Profile</span>${choice('Valorant')}</div>
<div style="display: flex; align-items: center; justify-content: space-between"><span style="font-size: 13px; font-weight: 500">DPI</span>${segmented(['400', '800', '1600', '3200'], 1)}</div>
<div style="display: flex; align-items: center; justify-content: space-between"><span style="font-size: 13px; font-weight: 500">Polling</span>${segmented(['1000', '4000', '8000'], 1)}</div>
<div style="display: flex">${btn('Open Devices')}</div>`)
const queued = (t, what, pal) => `<div style="height: 44px; display: flex; align-items: center; gap: 10px"><span style="position: relative; display: block; width: 28px; height: 28px; flex: none; border-radius: 6px; overflow: hidden; ${art(t, pal)}">${scene(t, pal)}</span><span style="flex: 1 1 0; font-size: 13px; font-weight: 500">${esc(t)}</span><span style="font-size: 13px; color: ${INK2}">${what}</span></div>`
const downloadCard = card(`
<div style="display: flex; align-items: center; gap: 12px"><span style="position: relative; display: block; width: 48px; height: 72px; flex: none; border-radius: 8px; overflow: hidden; ${art('Hollow Reach', 0)}">${scene('Hollow Reach', 0)}</span><div style="flex: 1 1 0"><div style="font-size: 15px; font-weight: 600">Hollow Reach</div><div style="font-size: 13px; color: ${INK2}; font-variant-numeric: tabular-nums">64% · 6 min left</div></div>${round('pause', { size: 40 })}</div>
${meter(0.64)}
<div>${queued('Night Harbor', 'Update next', 6)}${queued('Iron Tide', 'Queued')}</div>
<div style="display: flex; gap: 8px">${btn('Pause all')}<span style="flex: 1 1 0"></span>${btn('Open downloads')}</div>`)
board('Bar', 'Top bar and its mini players', `
<div style="padding: 24px 14px 0; display: flex; flex-direction: column; gap: 18px">
${strip('Nothing live', bar({ active: 'library', wideSearch: true }))}
${strip('A song', bar({ active: 'store', end: musicMini() }))}
${strip('A call, a song and your mouse', bar({ active: 'pc', start: callMini(), end: musicMini({ size: 'mid' }) + mouseMini() }))}
${strip('A download and a song, while you record', bar({ active: 'library', start: downloadMini(), end: musicMini(), capturing: true }))}
</div>
<div style="padding: 34px 24px 0; display: flex; flex-direction: column; gap: 14px">
${heading('Press one and its card opens under it')}
<div style="display: flex; gap: 24px; align-items: flex-start">${songCard}${callCard}${downloadCard}${mouseCard}</div>
</div>`, { w: 1920, h: 830 })
