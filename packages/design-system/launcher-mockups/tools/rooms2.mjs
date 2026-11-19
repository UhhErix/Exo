// Boards: the game page, PC, Devices, Settings.
import { G, GLASS, INK2, INK3, LIVE, WARN, BAD, RIM, PANEL, marker, TRACK, SELECTED, art, scene, bar, board, btn, choice, cover, dot, esc, heading, icon, iconBtn, meter, mouseMini, musicMini, panel, row, segmented, slider, state, toggle } from './lib.mjs'

const live = { end: musicMini({ size: 'small' }) + mouseMini({ wide: false }) }
/** The room behind a sheet: covers, dimmed and out of focus, as the app leaves the Library under one. */
const behind = (titles) => `<div aria-hidden="true" style="position: absolute; inset: 52px 0 0 0; padding: 0 ${G}px; display: flex; flex-wrap: wrap; gap: ${G}px; align-content: flex-start; filter: brightness(0.3); pointer-events: none">${titles.map((t) => cover(t, { w: 194 })).join('')}</div>`
const sheet = (inner, { w, h }) => `<div style="position: absolute; inset: 52px 0 0 0; display: grid; place-items: center"><section role="dialog" style="position: relative; width: ${w}px; height: ${h}px; box-sizing: border-box; border-radius: 24px; background: #000; box-shadow: ${RIM}; overflow: hidden">${inner}</section></div>`
const TITLES = ['Ashen Vale', 'Starfall Circuit', 'Iron Tide', 'Paper Lanterns', 'Deep Signal', 'Glasswing', 'Northwind', 'Emberwake', 'Low Orbit', 'Saltwater', 'Redline 88', 'Kingsfall', 'Neon Drift', 'Hollow Reach', 'Night Harbor', 'Quiet Engine', 'Sable Coast', 'Tin Stars', 'Marrow', 'Overgrowth', 'Lumen']
const fact = (value, label) => `<div><div style="font-size: 20px; line-height: 26px; font-weight: 600; font-variant-numeric: tabular-nums">${esc(value)}</div><div style="font-size: 12px; color: ${INK2}">${esc(label)}</div></div>`

// ---------------------------------------------------------------- Game
const clip = (t, len) => `<div style="position: relative; flex: 1 1 0; aspect-ratio: 16 / 9; border-radius: 10px; overflow: hidden; ${art(t)}">${scene(t)}<span style="position: absolute; right: 6px; bottom: 6px; height: 18px; padding: 0 6px; display: flex; align-items: center; border-radius: 999px; font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums; ${GLASS}">${len}</span></div>`
board('Game', 'Game page', `
${bar({ active: 'library', ...live })}
${behind(TITLES)}
${sheet(`
<div style="position: absolute; inset: 0 0 auto 0; height: 250px; ${art('Night Harbor', 6)}">${scene('Night Harbor', 6)}<div style="position: absolute; inset: 0; background: linear-gradient(to top, #000 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0) 100%)"></div></div>
${iconBtn('x', { label: 'Close', style: 'position: absolute; right: 16px; top: 16px' })}
<div style="position: relative; padding: 168px 32px 28px; display: flex; flex-direction: column; gap: 22px">
<div style="display: flex; align-items: flex-end; gap: 16px">
<div style="flex: 1 1 0; min-width: 0"><div style="font-size: 12px; font-weight: 500; color: ${INK2}">Steam</div><h1 style="margin: 2px 0 0; font-size: 34px; line-height: 40px; font-weight: 600; letter-spacing: -0.015em">Night Harbor</h1></div>
${iconBtn('heart', { size: 44, glyph: 18, label: 'Favorite' })}${iconBtn('settings', { size: 44, glyph: 18, label: 'Properties' })}${btn('Play', { primary: true, h: 44, ic: 'play', pad: 44 })}
</div>
<div style="display: flex; gap: 44px; align-items: flex-start">${fact('20 hr 40 min', 'Played')}${fact('Yesterday', 'Last played')}${fact('15 GB', 'Storage')}
<div style="flex: 1 1 0"><div style="display: flex; align-items: baseline; justify-content: space-between"><span style="font-size: 20px; line-height: 26px; font-weight: 600; font-variant-numeric: tabular-nums">23 of 50</span><span style="font-size: 12px; color: ${INK2}">Achievements</span></div><div style="margin-top: 8px">${meter(0.46)}</div></div></div>
<div>
${row('Upscaler', state('DLSS 4.5') + btn('Update'), { first: true, h: 52 })}
${row('Frame generation', segmented(['Off', '2x', '3x'], 1), { h: 52 })}
${row('HDR', toggle(true), { h: 52 })}
${row('Shaders', state('Ready', true), { h: 52 })}
</div>
<div><div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px"><span style="font-size: 13px; font-weight: 600">Captures</span><span style="font-size: 13px; color: ${INK2}; display: inline-flex; align-items: center; gap: 2px">All 12 ${icon('right', 14)}</span></div>
<div style="display: flex; gap: 8px">${clip('harbor clip one', '0:42')}${clip('harbor clip two', '1:15')}${clip('harbor clip three', '0:18')}${clip('harbor clip four', '2:03')}</div></div>
</div>`, { w: 940, h: 752 })}`)

// ---------------------------------------------------------------- PC
const tile = (ic, name, what, action) => `<section style="flex: 1 1 0; min-width: 0; height: 132px; padding: 16px 16px 14px 18px; box-sizing: border-box; display: flex; flex-direction: column; ${PANEL}">
<div style="display: flex; align-items: center; gap: 10px"><span style="color: ${INK2}">${icon(ic, 18)}</span><span style="font-size: 15px; font-weight: 600">${esc(name)}</span></div>
<div style="flex: 1 1 0"></div>
<div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 12px"><span style="font-size: 28px; line-height: 30px; font-weight: 600; letter-spacing: -0.01em; font-variant-numeric: tabular-nums">${what}</span>${action}</div></section>`
const part = (label, name) => `<div style="height: 40px; display: flex; align-items: center; gap: 12px"><span style="width: 92px; flex: none; font-size: 13px; color: ${INK3}">${esc(label)}</span><span style="font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${esc(name)}</span></div>`
const drive = (name, free, share, { note = '', tone = WARN, fix = '', first = false } = {}) => `<div style="padding: 12px 0; ${first ? '' : 'border-top: var(--hair, 1px) solid #2e2e2e;'}">
<div style="display: flex; align-items: center; gap: 12px"><span style="color: ${INK2}">${icon('drive', 16)}</span><span style="flex: 1 1 0; font-size: 13px; font-weight: 500">${esc(name)}</span><span style="font-size: 13px; color: ${INK2}; font-variant-numeric: tabular-nums">${esc(free)}</span><span style="width: 150px">${meter(share, { tone: share > 0.9 ? WARN : '#fff' })}</span></div>
${note ? `<div style="margin: 8px 0 0 28px; display: flex; align-items: center; gap: 12px"><span style="flex: 1 1 0; font-size: 13px; color: ${tone}">${esc(note)}</span>${fix}</div>` : ''}</div>`
const head = (title, right = '') => `<div style="height: 32px; display: flex; align-items: center; justify-content: space-between">${heading(title)}${right}</div>`
const shader = (t, s, pal) => `<div style="width: 108px; flex: none"><div style="position: relative; height: 132px; border-radius: 12px; overflow: hidden; ${art(t, pal)}">${scene(t, pal)}</div><div style="margin-top: 8px; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${esc(t)}</div><div style="font-size: 12px; color: ${s === 'Ready' ? LIVE : INK2}">${s}</div></div>`
const need = (what, where, action, tone, first = false) => `<div style="min-height: 60px; padding: 4px 0; display: flex; align-items: center; gap: 12px; ${first ? '' : 'border-top: var(--hair, 1px) solid #2e2e2e;'}">${dot(tone, 8)}<div style="flex: 1 1 0; min-width: 0"><div style="font-size: 13px; font-weight: 500">${esc(what)}</div><div style="margin-top: 2px; font-size: 13px; color: ${INK2}">${esc(where)}</div></div>${action}</div>`
const disk = (name, free, share, first = false) => `<div style="height: 44px; display: flex; align-items: center; gap: 12px; ${first ? '' : 'border-top: var(--hair, 1px) solid #2e2e2e;'}"><span style="flex: 1 1 0; min-width: 0; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${esc(name)}</span><span style="font-size: 13px; color: ${INK2}; font-variant-numeric: tabular-nums">${esc(free)}</span><span style="width: 96px">${meter(share, { tone: share > 0.9 ? WARN : '#fff' })}</span></div>`
board('PC', 'PC', `
${bar({ active: 'pc', ...live })}
<main style="flex: 1 1 0; min-height: 0; padding: 4px ${G}px ${G}px; display: flex; flex-direction: column; gap: ${G}px">
<div style="height: 52px; flex: none; padding: 0 8px; display: flex; align-items: center; gap: 14px"><h1 style="margin: 0; font-size: 28px; line-height: 34px; font-weight: 600; letter-spacing: -0.01em">Erix-PC</h1>
<span style="height: 28px; padding: 0 12px 0 10px; display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; font-size: 13px; font-weight: 500; ${GLASS}">${dot(WARN, 8)}3 things need you</span></div>
<div style="flex: none; display: flex; gap: ${G}px">
${tile('sparkles', 'Best settings', '8 <span style="font-size: 13px; font-weight: 500; color: ' + INK2 + '">to set</span>', btn('Apply all'))}
${tile('bolt', 'Upscalers', '6 <span style="font-size: 13px; font-weight: 500; color: ' + INK2 + '">games</span>', btn('Update'))}
${tile('cpu', 'Auto tune', '<span style="font-size: 15px; font-weight: 500; color: ' + INK2 + '">Not tuned</span>', btn('Start'))}
${tile('apps', 'Apps', '2 <span style="font-size: 13px; font-weight: 500; color: ' + INK2 + '">to clean up</span>', btn('Open'))}
</div>
<div style="flex: none; display: flex; gap: ${G}px; align-items: stretch">
${panel(`${head('Needs you')}<div style="margin-top: 6px">
${need('12 bad sectors. Copy your files off it.', 'D: Samsung 870 EVO', btn('Open drive'), BAD, true)}
${need('fTPM security flaws', 'BIOS', btn('Get the update ready'), WARN)}
${need('A power cut can damage files.', 'C: Samsung 990 PRO', btn('Fix'), WARN)}</div>`, 'flex: 1 1 0; min-width: 0; padding: 18px 20px; box-sizing: border-box')}
${panel(`${head('Updates', btn('Update all', { primary: true }))}<div style="margin-top: 6px">
${row('NVIDIA driver', choice('Game Ready') + btn('Update'), { first: true, h: 60 })}
${row('AMD chipset driver', btn('Update'), { h: 60 })}
${row('Realtek Audio', btn('Install'), { h: 60 })}</div>`, 'flex: 1 1 0; min-width: 0; padding: 18px 20px; box-sizing: border-box')}
${panel(`${head('This PC')}<div style="margin-top: 6px">
${part('Processor', 'AMD Ryzen 5 5600X')}${part('Graphics', 'RTX 3070')}${part('Memory', '16 GB DDR4')}${part('Screen', 'VG248 · 165 Hz')}${part('Windows', '11 Pro 26H2')}</div>`, 'flex: 1 1 0; min-width: 0; padding: 18px 20px; box-sizing: border-box')}
</div>
<div style="flex: 1 1 0; min-height: 0; display: flex; gap: ${G}px">
${panel(`${head('Drives')}<div style="margin-top: 6px">
${disk('C: Samsung 990 PRO', '309 GB free', 0.83, true)}${disk('D: Samsung 870 EVO', '77 GB free', 0.92)}${disk('E: WDC 4 TB', '2.4 TB free', 0.34)}</div>`, 'width: 467px; flex: none; padding: 18px 20px; box-sizing: border-box')}
${panel(`${head('Shaders', btn('Compile all'))}<div style="margin-top: 12px; display: flex; gap: 12px">${shader('Night Harbor', 'Ready', 6)}${shader('Starfall Circuit', 'Ready', 3)}${shader('Ashen Vale', 'Compiling 62%')}${shader('Iron Tide', 'First launch')}${shader('Deep Signal', 'First launch')}${shader('Glasswing', 'First launch')}${shader('Northwind', 'First launch')}</div>`, 'flex: 1 1 0; min-width: 0; padding: 18px 20px; box-sizing: border-box; overflow: hidden')}
</div>
</main>`)

// ---------------------------------------------------------------- Devices
const badge = (ic) => `<span style="width: 56px; height: 56px; flex: none; display: grid; place-items: center; border-radius: 999px; ${GLASS}">${icon(ic, 26)}</span>`
const battery = (p) => `<span style="display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: ${INK2}; font-variant-numeric: tabular-nums"><span style="width: 64px">${meter(p / 100)}</span>${p}%</span>`
const device = (ic, name, sub, rows, { soon = false, action = '' } = {}) => `<section style="flex: 1 1 0; min-width: 0; padding: 22px 24px 14px; box-sizing: border-box; display: flex; flex-direction: column; ${PANEL}; ${soon ? 'opacity: 0.55' : ''}">
<div style="display: flex; align-items: center; gap: 16px">${badge(ic)}<div style="flex: 1 1 0; min-width: 0"><div style="font-size: 20px; line-height: 26px; font-weight: 600">${esc(name)}</div><div style="margin-top: 2px; display: flex; align-items: center; gap: 12px; font-size: 13px; color: ${INK2}">${sub}</div></div>${action}</div>
<div style="margin-top: 14px">${rows}</div></section>`
board('Devices', 'Devices', `
${bar({ active: 'devices', ...live })}
<main style="flex: 1 1 0; min-height: 0; padding: 4px ${G}px ${G}px; display: flex; flex-direction: column; gap: ${G}px">
<div style="height: 52px; flex: none; padding: 0 8px; display: flex; align-items: center; gap: 10px"><h1 style="margin: 0; flex: 1 1 0; font-size: 28px; line-height: 34px; font-weight: 600; letter-spacing: -0.01em">Devices</h1>${btn('USB map', { ic: 'usb' })}${btn('Rescan', { ic: 'refresh' })}</div>
<div style="flex: none; display: flex; gap: ${G}px">
${device('devices', 'Starlight X', `<span>Wireless</span>${battery(82)}`, `
${row('Profile', choice('Valorant'), { first: true })}
${row('DPI', segmented(['400', '800', '1600', '3200'], 1))}
${row('Polling rate', segmented(['1000', '2000', '4000', '8000'], 2))}
${row('Lift-off distance', segmented(['Low', 'High'], 0))}`, { action: btn('Open') })}
${device('headphones', 'Headphones', '<span>3.5 mm jack</span>', `
${row('Volume', slider(0.62, { w: 220 }), { first: true })}
${row('Lucid EQ', toggle(true))}
${row('Preset', choice('HD 600'))}
${row('Output', choice('Realtek · Front jack'))}`, { action: btn('Open') })}
</div>
<div style="flex: none; display: flex; gap: ${G}px">
${device('gamepad', 'DualSense Edge', `<span>Wired</span><span style="color: ${LIVE}">Charging</span>`, `
${row('Profile', choice('Racing'), { first: true })}
${row('Stick test', state('Passed', true) + btn('Run again'))}
${row('Vibration', segmented(['Off', 'Weak', 'Full'], 2))}
${row('Port', btn('See USB map'), { note: 'A faster port is free on the back.', tone: WARN })}`, { action: btn('Open') })}
${device('keyboard', 'Wooting 60HE v2', '<span>Wired</span>', `<div style="height: 224px; display: grid; place-items: center; font-size: 13px; color: ${INK2}">Coming soon</div>`, { soon: true })}
</div>
</main>`)

// ---------------------------------------------------------------- Settings
const pages = ['Account', 'General', 'Library', 'Downloads', 'In game', 'Discord', 'Music', 'Privacy', 'About']
const group = (title, rows) => `<div style="margin-top: 26px"><div style="height: 32px; display: flex; align-items: center; font-size: 13px; font-weight: 600">${esc(title)}</div><div style="border-top: var(--hair, 1px) solid #2e2e2e">${rows}</div></div>`
board('Settings', 'Settings', `
${bar({ active: 'library', ...live, settingsOn: true })}
${behind(TITLES)}
${sheet(`<div style="display: flex; height: 100%">
<aside style="width: 232px; flex: none; padding: 26px 12px; box-sizing: border-box; border-right: var(--hair, 1px) solid #2e2e2e">
<div style="padding: 0 12px 16px; font-size: 20px; font-weight: 600">Settings</div>
<div style="height: 32px; margin: 0 0 10px; padding: 0 12px; display: flex; align-items: center; gap: 8px; border-radius: 999px; color: ${INK3}; font-size: 13px; ${GLASS}">${icon('search', 14)}Search settings</div>
${pages.map((p, i) => `<div style="height: 36px; padding: 0 12px; display: flex; align-items: center; border-radius: 12px; position: relative; font-size: 13px; font-weight: ${i === 0 ? 600 : 500}; color: ${i === 0 ? '#fff' : INK3}">${i === 0 ? marker() : ''}${p}</div>`).join('')}
</aside>
<div style="flex: 1 1 0; min-width: 0; padding: 26px 32px; box-sizing: border-box; position: relative">
${iconBtn('x', { label: 'Close', glass: false, style: 'position: absolute; right: 14px; top: 14px' })}
<div style="font-size: 20px; font-weight: 600">Account</div>
<div style="margin-top: 18px; border-top: var(--hair, 1px) solid #2e2e2e">${row('you@example.com', btn('Sign out'), { first: true })}</div>
${group('Security', row('Change password', btn('Change'), { first: true }) + row('Replace recovery code', btn('Replace')))}
${group('Sessions', row('Signed-in PCs', btn('Show'), { first: true }))}
${group('Your data', row('Export my data', btn('Save a copy'), { first: true }) + row('Delete account', btn('Delete', { danger: true })))}
</div></div>`, { w: 1080, h: 760 })}`)
