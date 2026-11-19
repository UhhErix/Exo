// Boards: Store, Music.
import { G, GLASS, INK2, INK3, LIVE, RIM, PANEL, marker, TRACK, SELECTED, art, scene, bar, board, btn, choice, cover, dot, esc, heading, icon, iconBtn, meter, mouseMini, musicMini, segmented } from './lib.mjs'

// ---------------------------------------------------------------- Store
const pick = (t, price, on, pal) => `<div style="height: 72px; padding: 8px; box-sizing: border-box; display: flex; align-items: center; gap: 12px; border-radius: 14px; position: relative">${on ? marker(-4) : ''}
<span style="position: relative; width: 100px; height: 56px; flex: none; border-radius: 8px; overflow: hidden; ${art(t, pal)}">${scene(t, pal)}</span>
<span style="min-width: 0"><span style="display: block; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${esc(t)}</span><span style="display: block; font-size: 13px; color: ${INK2}">${price}</span></span></div>`
const sale = (was, now, off) => `<span style="display: inline-flex; align-items: center; gap: 8px"><span style="height: 20px; padding: 0 7px; display: inline-flex; align-items: center; border-radius: 999px; background: ${LIVE}; color: #000; font-size: 12px; font-weight: 600">-${off}%</span><span style="color: ${INK3}; text-decoration: line-through">${was}</span><span style="color: #fff">${now}</span></span>`
const item = (t, line, opts = {}) => `<div style="width: 194px; flex: none">${cover(t, { w: 194, ...opts })}<div style="margin-top: 8px; font-size: 13px; color: ${INK2}; font-variant-numeric: tabular-nums">${line}</div></div>`
board('Store', 'Store', `
${bar({ active: 'store', end: musicMini({ size: 'small' }) + mouseMini({ wide: false }) })}
<main style="flex: 1 1 0; min-height: 0; padding: 4px ${G}px 0; display: flex; flex-direction: column; gap: 14px; overflow: hidden">
<div style="flex: none; display: flex; align-items: center; gap: 10px">${segmented(['Discover', 'Calendar', 'Wishlist'], 0)}<span style="flex: 1 1 0"></span>
<div style="width: 340px; height: 32px; padding: 0 12px; box-sizing: border-box; display: flex; align-items: center; gap: 8px; border-radius: 999px; color: ${INK3}; font-size: 13px; ${GLASS}">${icon('search', 14)}Search the store</div></div>
<section style="height: 372px; flex: none; display: flex; gap: ${G}px">
<article style="position: relative; flex: 1 1 0; min-width: 0; border-radius: 18px; overflow: hidden; ${art('Sable Coast', 5)}">${scene('Sable Coast', 5)}
<div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0) 58%)"></div>
<div style="position: absolute; left: 28px; right: 24px; bottom: 24px; display: flex; align-items: flex-end; gap: 16px">
<div style="flex: 1 1 0; min-width: 0"><div style="font-size: 13px; font-weight: 500; color: ${INK2}">Out now</div><h1 style="margin: 2px 0 0; font-size: 40px; line-height: 46px; font-weight: 600; letter-spacing: -0.02em">Sable Coast</h1>
<div style="margin-top: 8px; font-size: 15px; font-variant-numeric: tabular-nums">${sale('$59.99', '$44.99', 25)}</div></div>
${btn('Wishlist', { h: 44, ic: 'heart', pad: 18 })}${btn('Get on Steam', { primary: true, h: 44, pad: 26 })}
</div>
<div style="position: absolute; left: 28px; top: 22px; display: flex; gap: 6px">${[1, 0, 0, 0, 0].map((on) => `<span style="width: ${on ? 22 : 6}px; height: 6px; border-radius: 999px; background: ${on ? '#fff' : 'rgba(255,255,255,0.4)'}"></span>`).join('')}</div>
</article>
<aside style="width: 300px; flex: none; padding: 6px; box-sizing: border-box; display: flex; flex-direction: column; gap: 2px; ${PANEL}">
${pick('Sable Coast', sale('$59.99', '$44.99', 25), true, 5)}${pick('Quiet Engine', '$29.99')}${pick('Tin Stars', 'Free')}${pick('Overgrowth', 'Dec 12')}${pick('Lumen', '$19.99')}
</aside>
</section>
<section style="display: flex; flex-direction: column; gap: 12px">
<div style="display: flex; align-items: center; justify-content: space-between">${heading('Top sellers')}<span style="font-size: 13px; color: ${INK2}; display: inline-flex; align-items: center; gap: 2px">See all ${icon('right', 14)}</span></div>
<div style="display: flex; gap: ${G}px">
${item('Quiet Engine', '$29.99')}${item('Marrow', sale('$39.99', '$19.99', 50))}${item('Tin Stars', 'Free')}${item('Night Harbor', `<span style="display: inline-flex; align-items: center; gap: 6px; color: ${LIVE}">${icon('check', 14)}In your library</span>`)}${item('Overgrowth', 'Dec 12')}${item('Lumen', '$19.99')}${item('Kingsfall', sale('$49.99', '$34.99', 30))}
</div></section>
</main>`)

// ---------------------------------------------------------------- Music
const square = (t, pal, size) => `<span style="position: relative; display: block; width: ${size}px; height: ${size}px; flex: none; border-radius: ${size > 60 ? 12 : 8}px; overflow: hidden; ${art(t, pal)}">${scene(t, pal)}</span>`
const side = (t, sub, pal, on = false) => `<div style="height: 52px; padding: 0 8px; display: flex; align-items: center; gap: 12px; border-radius: 12px; position: relative">${on ? marker(-4) : ''}${square(t, pal, 36)}<span style="min-width: 0"><span style="display: block; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; ${on ? `color: ${LIVE}` : ''}">${esc(t)}</span><span style="display: block; font-size: 12px; color: ${INK2}">${esc(sub)}</span></span></div>`
const quick = (t, pal, playing = false) => `<div style="height: 56px; display: flex; align-items: center; gap: 12px; border-radius: 12px; overflow: hidden; ${GLASS}">${square(t, pal, 56).replace('border-radius: 8px', 'border-radius: 0')}<span style="flex: 1 1 0; min-width: 0; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${esc(t)}</span>${playing ? `<span style="margin-right: 14px; color: ${LIVE}">${icon('speaker', 16)}</span>` : ''}</div>`
const shelf = (t, sub, pal) => `<div style="width: 168px; flex: none">${square(t, pal, 168)}<div style="margin-top: 8px; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${esc(t)}</div><div style="font-size: 12px; color: ${INK2}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${esc(sub)}</div></div>`
const nav = (ic, t, on) => `<div style="height: 40px; padding: 0 12px; display: flex; align-items: center; gap: 12px; border-radius: 12px; position: relative; font-size: 13px; font-weight: 600; color: ${on ? '#fff' : INK3}">${on ? marker() : ''}${icon(ic, 18)}${t}</div>`
const round = (ic, { on = false, size = 36, glyph = 16, tone = '#fff' } = {}) => `<span style="width: ${size}px; height: ${size}px; flex: none; display: grid; place-items: center; border-radius: 999px; ${on ? 'background: #fff; color: #000;' : `color: ${tone};`}">${icon(ic, glyph)}</span>`
board('Music', 'Music', `
${bar({ active: 'music', end: mouseMini({ wide: false }) })}
<main style="flex: 1 1 0; min-height: 0; padding: 4px ${G}px ${G}px; display: flex; gap: ${G}px">
<aside style="width: 272px; flex: none; padding: 6px; box-sizing: border-box; display: flex; flex-direction: column; gap: 2px; ${PANEL}">
${nav('home', 'Home', true)}${nav('note', 'Songs', false)}
<div style="height: 32px; margin: 6px 0 8px; padding: 0 12px; display: flex; align-items: center; gap: 8px; border-radius: 999px; color: ${INK3}; font-size: 13px; ${GLASS}">${icon('search', 14)}Search</div>
<div style="height: 36px; padding: 0 6px 0 8px; display: flex; align-items: center; justify-content: space-between">${segmented(['Recents', 'Playlists', 'Albums'], 0, { h: 28 })}${iconBtn('plus', { size: 28, glyph: 14, label: 'New playlist' })}</div>
${side('Liked songs', '412 songs', 10)}${side('Late drive', 'Playlist', 2, true)}${side('Focus', 'Playlist', 8)}${side('Vela Park', 'Artist', 7)}${side('Low tide', 'Album · Sable', 6)}${side('Ranked nights', 'Playlist', 3)}${side('Paper suns', 'Album · Orlo', 5)}${side('Signal and noise', 'Podcast', 11)}${side('Gym', 'Playlist', 9)}
</aside>
<div style="flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 18px; padding: 6px 8px 0 18px; overflow: hidden">
<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: ${G}px">${quick('Late drive', 2, true)}${quick('Liked songs', 10)}${quick('Low tide', 6)}${quick('Focus', 8)}${quick('Ranked nights', 3)}${quick('Paper suns', 5)}${quick('Gym', 9)}${quick('Daily mix 1', 1)}</div>
<section style="display: flex; flex-direction: column; gap: 12px">${heading('Made for you')}<div style="display: flex; gap: 14px">${shelf('Daily mix 1', 'Vela Park, Orlo and more', 1)}${shelf('Daily mix 2', 'Sable, Ninefold and more', 4)}${shelf('Release radar', 'New from artists you follow', 0)}${shelf('Discover weekly', 'New for you every Monday', 7)}${shelf('On repeat', 'What you play most', 11)}${shelf('Night shift', 'Slow and low', 6)}</div></section>
<section style="display: flex; flex-direction: column; gap: 12px">${heading('Jump back in')}<div style="display: flex; gap: 14px">${shelf('Low tide', 'Sable', 6)}${shelf('Paper suns', 'Orlo', 5)}${shelf('Glass hours', 'Ninefold', 8)}${shelf('Northbound', 'Vela Park', 2)}${shelf('Static bloom', 'Hale', 3)}${shelf('Quiet rooms', 'Mire', 9)}</div></section>
</div>
</main>
<div style="position: absolute; left: 292px; right: ${G}px; bottom: ${G}px; height: 68px; padding: 0 16px 0 10px; box-sizing: border-box; display: flex; align-items: center; gap: 14px; border-radius: 999px; ${GLASS}">
${square('Late drive', 2, 48).replace('border-radius: 8px', 'border-radius: 999px')}
<div style="width: 190px; min-width: 0"><div style="font-size: 13px; font-weight: 600">Midnight Circuit</div><div style="font-size: 12px; color: ${INK2}">Vela Park</div></div>
${round('heart', { tone: LIVE })}
<div style="flex: 1 1 0; display: flex; flex-direction: column; gap: 6px; align-items: center">
<div style="display: flex; align-items: center; gap: 10px">${round('shuffle', { size: 30, glyph: 15 })}${round('prev', { size: 32 })}${round('pause', { on: true, size: 36, glyph: 18 })}${round('next', { size: 32 })}${round('repeat', { size: 30, glyph: 15 })}</div>
<div style="width: 100%; max-width: 460px; display: flex; align-items: center; gap: 10px; font-size: 12px; color: ${INK3}; font-variant-numeric: tabular-nums"><span>1:32</span><div style="flex: 1 1 0">${meter(0.38)}</div><span>4:03</span></div></div>
${round('lyrics')}${round('list')}${round('speaker')}<div style="width: 96px">${meter(0.6)}</div>
</div>`)
