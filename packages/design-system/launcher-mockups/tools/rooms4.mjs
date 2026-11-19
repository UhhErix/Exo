// Boards: what tells you something. Notices in the app, the achievement banner and the counter over a game.
import { G, INK2, INK3, LIVE, BAD, LINE, HAIR, SLAB, PLATE, art, scene, bar, board, btn, cover, dot, esc, icon, musicMini } from './lib.mjs'

const GOLD = '#f1cf8d', ICE = '#b9c6ff'
const caption = (t, style = '') => `<div style="font-size: 13px; font-weight: 600; color: ${INK2}; ${style}">${esc(t)}</div>`
const square = (seed, pal, size, r = 8) => `<span style="position: relative; width: ${size}px; height: ${size}px; flex: none; border-radius: ${r}px; overflow: hidden; ${art(seed, pal)}">${scene(seed, pal)}</span>`
const glyph = (ic, tone = '#fff') => `<span style="width: 36px; height: 36px; flex: none; display: grid; place-items: center; border-radius: 8px; color: ${tone}; box-shadow: inset 0 0 0 ${HAIR} ${LINE}">${icon(ic, 18)}</span>`

// ---- a notice: its picture or glyph, a title over one line, its one button, its close. 360 wide, bottom right.
const notice = (lead, title, line, action = '', { tone = INK3 } = {}) => `<div style="width: 360px; min-height: 60px; padding: 12px; box-sizing: border-box; display: flex; align-items: center; gap: 12px; border-radius: 14px; ${SLAB}">
${lead}<div style="flex: 1 1 0; min-width: 0"><div style="font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${esc(title)}</div><div style="margin-top: 2px; font-size: 12px; color: ${tone}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${esc(line)}</div></div>
${action}<span style="width: 24px; height: 24px; flex: none; display: grid; place-items: center; color: ${INK3}">${icon('x', 14)}</span></div>`
const act = (label) => btn(label, { primary: true, h: 28, pad: 12 })
const stack = `<div style="position: absolute; right: ${G}px; bottom: ${G}px; display: flex; flex-direction: column; gap: 8px">
${notice(glyph('refresh'), 'Exo Launcher 3.26 is ready', 'Restarts in a few seconds', act('Restart'))}
${notice(glyph('x', BAD), "Epic didn't answer", 'Your Epic games are as of 2 hours ago', act('Try again'), { tone: INK3 })}
${notice(square('Hollow Reach', 0, 36), 'Hollow Reach is ready', '38 GB · 6 min', act('Play'))}
</div>`

// ---- over the game: a still of a game, with Exo's two surfaces on it.
const game = (seed, pal, inner, { w = 700, h = 394 } = {}) => `<div style="position: relative; width: ${w}px; height: ${h}px; flex: none; border-radius: 14px; overflow: hidden; ${art(seed, pal)}">${scene(seed, pal)}${inner}</div>`
// The counter: one black plate, inset from the corner, round all the way. The number is white, its unit a step dimmer.
const part = (n, unit) => `<span><b style="font-weight: 600">${n}</b><span style="margin-left: 3px; color: rgba(255,255,255,0.7)">${unit}</span></span>`
const counter = (parts, pos = 'right: 8px; top: 8px') => `<div style="position: absolute; ${pos}; height: 24px; padding: 0 10px; display: flex; align-items: center; gap: 10px; border-radius: 999px; background: rgba(0,0,0,0.78); font-size: 12px; line-height: 1; font-variant-numeric: tabular-nums; letter-spacing: 0.01em">${parts.join('')}</div>`
// The banner: black, the one line, the picture at 64. Its tier is the colour of its line and of its bar, and a word.
const banner = (name, line, n, total, share, { tier = '', edge = LINE, fill = '#fff', pal = 5, pos = 'left: 50%; top: 16px; transform: translateX(-50%)' } = {}) => `<div style="position: absolute; ${pos}; width: 380px; padding: 12px 16px 12px 12px; box-sizing: border-box; display: flex; align-items: center; gap: 14px; border-radius: 16px; background: #000; box-shadow: inset 0 0 0 ${HAIR} ${edge}">
${square(name, pal, 64, 10)}<div style="flex: 1 1 0; min-width: 0"><div style="display: flex; align-items: baseline; gap: 8px"><span style="font-size: 15px; line-height: 20px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${esc(name)}</span>${tier ? `<span style="flex: none; font-size: 12px; font-weight: 600; color: ${fill}">${tier}</span>` : ''}</div>
<div style="font-size: 12px; line-height: 16px; color: ${INK3}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${esc(line)}</div>
<div style="height: 2px; margin-top: 8px; border-radius: 999px; background: #262626; overflow: hidden"><div style="width: ${Math.round(n / total * 100)}%; height: 100%; background: ${fill}"></div></div>
<div style="margin-top: 5px; display: flex; justify-content: space-between; font-size: 12px; line-height: 14px; color: ${INK3}; font-variant-numeric: tabular-nums"><span>${n} of ${total}</span><span>${share}% of players</span></div></div></div>`

board('Alerts', 'Notices, the achievement banner and the counter', `
${bar({ active: 'library', end: musicMini({ size: 'small' }) })}
<main style="position: relative; flex: 1 1 0; min-height: 0; padding: 4px ${G}px ${G}px; display: flex; gap: 28px; overflow: hidden">
<section style="flex: none; display: flex; flex-direction: column; gap: 12px">
${caption('Over a game: the counter sits in off the corner, the banner at the top')}
${game('Night Harbor', 6, counter([part(142, 'FPS')]) + banner('First light', 'Reach the harbour before dawn', 12, 50, '41', {}))}
${game('Starfall Circuit', 3, counter([part(238, 'FPS'), part(171, 'LOW'), part('4.2', 'MS'), part('98%', 'GPU'), part('71°', 'C')], 'left: 8px; top: 8px') + banner('No stone unturned', 'Find every relic in the Vale', 31, 50, '3.2', { tier: 'Epic', edge: '#3f4459', fill: ICE, pal: 1, pos: 'right: 16px; bottom: 16px' }))}
</section>
<section style="flex: none; display: flex; flex-direction: column; gap: 12px">
${caption('Rare things say so in one colour, nothing else changes')}
<div style="position: relative; width: 380px; height: 88px">${banner('Old habits', 'Finish a run without healing', 44, 50, '0.8', { tier: 'Legendary', edge: '#5f533a', fill: GOLD, pal: 9, pos: 'left: 0; top: 0' })}</div>
<div style="position: relative; width: 380px; height: 88px">${banner('Hollow Reach', 'Every achievement in Hollow Reach', 50, 50, '0.3', { tier: 'Complete', edge: '#5f533a', fill: GOLD, pal: 0, pos: 'left: 0; top: 0' })}</div>
${caption('In Exo: notices stack at the bottom right, newest lowest', 'margin-top: 20px')}
<div style="font-size: 13px; color: ${INK3}; max-width: 380px">One button each, the white one. They leave on their own; a failure stays until you close it.</div>
</section>
${stack}
</main>`, { w: 1440, h: 900 })
