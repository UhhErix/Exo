// Boards: Discord, remade (owner, 2026-11-10: "redesign the whole ux and layout", "is this what you would call perfect
// discord if it was remade?"). Not Discord's layout cleaned up: its three real problems answered.
//   1. Where is everyone? Discord makes you click round servers to find out. Here the room opens on Now: the voice rooms
//      your friends are in (Join is one press), who is playing what, and what is unread, on one page.
//   2. Two columns of navigation (a rail of pictures with no names, then a list). Here it is one list with names: Now and
//      Friends, your conversations, then your servers, each opening to its channels in place.
//   3. A chat squeezed between a channel list and a member list that is always open. Here the conversation is one centred
//      column you can read; the people are a row of faces in its head that opens on a press.
// Familiar: servers, # channels, voice channels, faces with a status dot, messages as Discord lays them out.
// Open, as the Library is: nothing is boxed; the only outlines are things you act on.
import { G, INK2, INK3, LIVE, WARN, BAD, RIM, marker, art, scene, bar, board, btn, callMini, esc, icon, musicMini } from './lib.mjs'

const face = (seed, pal, size = 32, status = '', ring = '#000') => `<span style="position: relative; width: ${size}px; height: ${size}px; flex: none"><span style="position: absolute; inset: 0; border-radius: 999px; overflow: hidden; ${art(seed, pal)}"></span>${status ? `<span style="position: absolute; right: -1px; bottom: -1px; width: ${Math.round(size / 3.4)}px; height: ${Math.round(size / 3.4)}px; border-radius: 999px; background: ${status}; box-shadow: 0 0 0 2px ${ring}"></span>` : ''}</span>`
const faces = (list, size = 26) => `<span style="display: inline-flex">${list.map(([n, p], i) => `<span style="margin-left: ${i ? -7 : 0}px; border-radius: 999px; box-shadow: 0 0 0 2px #000; display: grid">${face(n, p, size)}</span>`).join('')}</span>`
const count = (n) => `<span style="min-width: 18px; height: 18px; padding: 0 5px; box-sizing: border-box; flex: none; display: inline-grid; place-items: center; border-radius: 999px; background: ${BAD}; color: #000; font-size: 11px; font-weight: 700; font-variant-numeric: tabular-nums">${n}</span>`
const glyph = (ic, color = INK2, box = 32, size = 18) => `<span style="width: ${box}px; height: ${box}px; flex: none; display: grid; place-items: center; color: ${color}">${icon(ic, size)}</span>`
const h1 = (t, lead = '') => `<span style="display: inline-flex; align-items: center; gap: 8px; font-size: 20px; line-height: 30px; font-weight: 600; white-space: nowrap">${lead}${esc(t)}</span>`
const label = (t, right = '', pad = 8) => `<div style="height: 30px; margin-top: 12px; padding: 0 ${pad}px; display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 600; color: ${INK3}">${esc(t)}${right}</div>`
const tile = (seed, pal, size = 22) => `<span style="width: ${size}px; height: ${size}px; flex: none; border-radius: 6px; ${art(seed, pal)}"></span>`
const small = (ic) => `<span style="width: 22px; flex: none; display: grid; place-items: center">${icon(ic, 16)}</span>`
const hash = `<span style="width: 22px; flex: none; text-align: center; font-size: 15px; font-weight: 500">#</span>`

// ---- the one list. A row is quiet until it is yours: chosen, the marker and full ink; news, bold with its count.
const row = (lead, name, { on = false, fresh = false, end = '', sub = '', h = 34, indent = 0 } = {}) => `<div style="position: relative; height: ${h}px; padding: 0 8px 0 ${8 + indent}px; display: flex; align-items: center; gap: 10px; color: ${on || fresh ? '#fff' : INK3}">${on ? marker(0) : ''}${lead}<span style="flex: 1 1 0; min-width: 0"><span style="display: block; font-size: 13px; font-weight: ${on || fresh ? 600 : 500}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${esc(name)}</span>${sub ? `<span style="display: block; font-size: 12px; font-weight: 400; color: ${INK3}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${esc(sub)}</span>` : ''}</span>${end}</div>`
const you = `<div style="height: 44px; flex: none; margin: 0 4px; padding: 0 6px 0 8px; display: flex; align-items: center; gap: 10px; border-radius: 999px; box-shadow: ${RIM}">${face('You', 4, 28, LIVE)}<span style="flex: 1 1 0; min-width: 0; font-size: 13px; font-weight: 600">You</span>${glyph('callmic')}${glyph('callphones')}</div>`
const chev = (open) => `<span style="color: ${INK3}; display: grid; ${open ? '' : 'transform: rotate(-90deg)'}">${icon('chevron', 14)}</span>`
const list = (at) => `<div style="width: 280px; flex: none; padding: 0 12px 0 14px; display: flex; flex-direction: column"><div style="flex: 1 1 0; min-height: 0; padding-top: 6px; overflow: hidden">
${row(small('bolt'), 'Now', { on: at === 'now' })}${row(small('callphones'), 'Friends', { end: `<span style="font-size: 12px; color: ${INK3}">13 online</span>` })}
${label('Conversations', `<span style="color: ${INK3}">${icon('plus', 14)}</span>`)}
${row(face('Ada', 2, 24, LIVE), 'Ada', { fresh: true, end: count(2), sub: 'you on tonight?', h: 44 })}${row(face('Kai', 6, 24, WARN), 'Kai, Ada', { sub: 'Kai: gg', h: 44 })}${row(face('Rowan', 4, 24, LIVE), 'Rowan', { sub: 'sent a clip', h: 44 })}
${label('Servers', `<span style="color: ${INK3}">${icon('plus', 14)}</span>`)}
${row(tile('Night Raid', 7), 'Night Raid', { fresh: at !== 'chan', end: chev(true) })}
${row(hash, 'welcome', { on: at === 'chan', indent: 14 })}${row(hash, 'general', { fresh: true, end: count(1), indent: 14 })}${row(hash, 'patch-notes', { indent: 14 })}
${row(small('volume'), 'Lobby', { indent: 14, end: faces([['Ada', 2], ['Kai', 6]], 20) })}
${row(tile('Vale', 4), 'Vale', { fresh: true, end: `${count(2)}${chev(false)}` })}${row(tile('Circuit', 3), 'Starfall Circuit', { end: chev(false) })}${row(tile('Harbor', 6), 'Night Harbor', { fresh: true, end: `${count(12)}${chev(false)}` })}${row(tile('Lanterns', 10), 'Paper Lanterns', { end: chev(false) })}
</div>${you}</div>`
const frame = (inner) => `<main style="flex: 1 1 0; min-height: 0; padding: 2px ${G}px ${G}px 0; display: flex">${inner}</main>`

// ---- Now
const room = (name, where, doing, people, pal) => `<div style="position: relative; flex: 1 1 0; min-width: 0; height: 148px; border-radius: 18px; overflow: hidden; ${art(where + name, pal)}">${scene(where + name, pal)}<div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.15) 70%)"></div>
<div style="position: absolute; left: 16px; right: 16px; bottom: 14px; display: flex; align-items: flex-end; gap: 12px"><div style="flex: 1 1 0; min-width: 0"><div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px">${faces(people, 28)}<span style="font-size: 12px; color: ${INK2}">${esc(doing)}</span></div><div style="font-size: 16px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${esc(name)}</div><div style="font-size: 12px; color: ${INK2}">${esc(where)}</div></div>${btn('Join', { primary: true, h: 36, pad: 18 })}</div></div>`
const playing = (name, pal, status, game, detail) => `<div style="height: 60px; padding: 0 12px; display: flex; align-items: center; gap: 12px; border-radius: 14px">${face(name, pal, 40, status)}<span style="flex: 1 1 0; min-width: 0"><span style="display: block; font-size: 14px; font-weight: 600">${esc(name)}</span><span style="display: block; font-size: 12px; color: ${INK3}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis"><span style="color: ${INK2}">${esc(game)}</span>${detail ? ` · ${esc(detail)}` : ''}</span></span></div>`
const unread = (lead, name, where, text, n, time) => `<div style="height: 56px; padding: 0 12px; display: flex; align-items: center; gap: 12px; border-radius: 14px">${lead}<span style="flex: 1 1 0; min-width: 0"><span style="display: flex; align-items: baseline; gap: 8px"><b style="font-size: 14px; font-weight: 600">${esc(name)}</b>${where ? `<span style="font-size: 12px; color: ${INK3}">${esc(where)}</span>` : ''}</span><span style="display: block; font-size: 13px; color: ${INK2}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${esc(text)}</span></span><span style="font-size: 12px; color: ${INK3}">${time}</span>${count(n)}</div>`
const big = (seed, pal) => `<span style="width: 40px; height: 40px; flex: none; border-radius: 12px; ${art(seed, pal)}"></span>`

board('Discord', 'Discord: Now', `
${bar({ active: 'discord', end: musicMini({ size: 'small' }) })}
${frame(`${list('now')}
<div style="flex: 1 1 0; min-width: 0; padding: 0 14px 0 16px; display: flex; flex-direction: column; overflow: hidden">
<div style="height: 44px; flex: none; display: flex; align-items: center">${h1('Now')}</div>
${label('In voice', '', 4).replace('margin-top: 12px', 'margin-top: 0')}
<div style="display: flex; gap: ${G}px">${room('Lobby', 'Night Raid', 'Ranked night', [['Ada', 2], ['Kai', 6]], 7)}${room('Late shift', 'Vale', 'Just talking', [['Bea', 7], ['Dex', 5], ['Wren', 10]], 4)}${room('Scrims', 'Starfall Circuit', 'Streaming VALORANT', [['Pixel', 1]], 3)}</div>
${label('Playing', '', 12)}
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2px 8px">${playing('Ada', 2, LIVE, 'VALORANT', 'Competitive · 8–6')}${playing('Bea', 7, LIVE, 'Marvel Rivals', 'Quick match')}${playing('Cole', 6, BAD, 'Marvel Rivals', 'Quick match')}${playing('Dex', 5, LIVE, 'Rocket League', 'Ranked 2v2')}${playing('Wren', 10, LIVE, 'Medieval Minecraft', '')}${playing('Kai', 3, WARN, 'Get Lucky', 'Daft Punk')}</div>
${label('Unread', `<span style="font-weight: 500">Mark all read</span>`, 12)}
<div>${unread(face('Ada', 2, 40, LIVE), 'Ada', '', 'you on tonight? we need a fifth', 2, '8:52 PM')}${unread(big('Night Raid', 7), '# general', 'Night Raid', 'Kai: new agent drops next week, four looks at the kit', 1, '8:39 PM')}${unread(big('Harbor', 6), '# clips', 'Night Harbor', 'Mira: this ace was not luck', 12, '7:15 PM')}${unread(big('Vale', 4), '# lfg', 'Vale', 'Sol: two spots, gold or above', 2, '6:02 PM')}</div>
</div>`)}
`, { w: 1440, h: 900 })

// ---- a conversation: one centred column; the people are faces in its head.
const msg = (name, pal, time, inner, tone = '#fff') => `<div style="padding: 8px 0; display: flex; gap: 14px">${face(name, pal, 38)}<div style="flex: 1 1 0; min-width: 0"><div style="display: flex; align-items: baseline; gap: 8px"><b style="font-size: 14px; font-weight: 600; color: ${tone}">${esc(name)}</b><span style="font-size: 12px; color: ${INK3}">${time}</span></div>${inner}</div></div>`
const words = (t) => `<div style="margin-top: 2px; font-size: 14px; line-height: 20px; color: ${INK2}">${t}</div>`
const card = (inner, w = 420) => `<div style="width: ${w}px; max-width: 100%; margin-top: 8px; padding: 12px; box-sizing: border-box; border-radius: 14px; box-shadow: ${RIM}">${inner}</div>`
const file = (name, size) => card(`<div style="display: flex; align-items: center; gap: 12px">${glyph('folder')}<span style="flex: 1 1 0; min-width: 0"><span style="display: block; font-size: 13px; font-weight: 600">${esc(name)}</span><span style="display: block; font-size: 12px; color: ${INK3}">${size}</span></span>${glyph('download')}</div>`, 340)
const pic = (seed, pal) => `<span style="display: block; height: 112px; border-radius: 8px; ${art(seed, pal)}"></span>`
const fresh = (t) => `<div style="height: 28px; display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 600; color: ${BAD}">${esc(t)}<span style="color: ${INK3}; font-weight: 500">Mark as read</span></div>`
const composer = (hint) => `<div style="height: 44px; flex: none; padding: 0 8px 0 6px; display: flex; align-items: center; gap: 4px; border-radius: 999px; box-shadow: ${RIM}">${glyph('plus')}<span style="flex: 1 1 0; font-size: 14px; color: ${INK3}">${esc(hint)}</span>${glyph('gift')}${glyph('sparkles')}</div>`

board('DiscordFriends', 'Discord: a channel', `
${bar({ active: 'discord', start: callMini({ place: 'Lobby', server: 'Night Raid', faces: ['A', 'K'], speaking: 0 }), end: musicMini({ size: 'small' }) })}
${frame(`${list('chan')}
<div style="flex: 1 1 0; min-width: 0; display: flex; justify-content: center">
<div style="width: 100%; max-width: 860px; padding: 0 16px; box-sizing: border-box; display: flex; flex-direction: column">
<div style="height: 44px; flex: none; display: flex; align-items: center; gap: 12px">${h1('welcome', `<span style="color: ${INK3}; font-weight: 500">#</span>`)}<span style="font-size: 13px; color: ${INK3}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">Night Raid · Scrims are Tuesdays at 8</span><span style="flex: 1 1 0"></span><span style="display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 10px 0 4px; border-radius: 999px; box-shadow: ${RIM}; font-size: 12px; font-weight: 600">${faces([['Ada', 2], ['Kai', 6], ['Scrim Bot', 11]], 24)}4</span>${glyph('search')}${glyph('dots')}</div>
<div style="flex: 1 1 0; min-height: 0; padding-top: 6px; overflow: hidden">
${msg('Ada', 2, 'Yesterday at 9:12 PM', words('Scrims moved to 8. Bring the new comp.'), '#ff9ad5')}
${fresh('10 new messages')}
${msg('Kai', 6, '8:39 PM', `${words('New agent drops next week. Four looks at the kit:')}${card(`<div style="font-size: 13px; font-weight: 600">VALORANT</div><div style="margin: 2px 0 10px; font-size: 13px; color: ${INK3}">x.com</div><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px">${pic('kit one', 5)}${pic('kit two', 3)}${pic('kit three', 1)}${pic('kit four', 2)}</div>`)}`)}
${msg('You', 4, '8:41 PM', `${words('my config')}${file('autoexec.cfg', '2 KB · 15 lines')}${file('patch-notes.pdf', '1.8 MB')}`)}
</div>
${composer('Message #welcome')}
</div>
</div>`)}
`, { w: 1440, h: 900 })
