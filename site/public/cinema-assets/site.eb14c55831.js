const one = (selector, root = document) => (root ? root.querySelector(selector) : null)
const all = (selector, root = document) => (root ? Array.from(root.querySelectorAll(selector)) : [])
const still = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false }
const part = (name, run) => {
  try {
    run()
  } catch (error) {
    console.error(`getexo.app: ${name} stopped`, error)
  }
}
document.documentElement.classList.add('js')
document.addEventListener('keydown', () => document.documentElement.classList.add('keys'), true)
document.addEventListener('pointerdown', () => document.documentElement.classList.remove('keys'), true)
part('statements', () => {
  const open = () => {
    const target = document.getElementById(location.hash.slice(1))
    const statement = target?.closest('details.statement')
    if (!statement) return
    statement.open = true
    requestAnimationFrame(() => target.scrollIntoView())
  }
  window.addEventListener('hashchange', open)
  open()
})
/** Runs once the element comes within the margin of the screen (at once where IntersectionObserver is missing). */
const near = (el, run, margin = '300px') => {
  if (!el) return
  if (!('IntersectionObserver' in window)) return run()
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return
    io.disconnect()
    run()
  }, { rootMargin: margin })
  io.observe(el)
}
/** Starts a picture loading and resolves once it can be drawn, or after a moment, whichever is first. */
const ready = (img) => {
  if (!img) return Promise.resolve()
  img.loading = 'eager'
  const loaded = img.complete && img.naturalWidth
    ? Promise.resolve()
    : new Promise((done) => { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }) })
  const decoded = loaded.then(() => (img.decode ? img.decode() : undefined)).catch(() => {})
  return Promise.race([decoded, new Promise((done) => setTimeout(done, 900))])
}
/** A change in place: the old view goes and the new one comes in with the browser's view transition, where there is one. */
const move = (el, change) => {
  if (!document.startViewTransition || still.matches || document.documentElement.classList.contains('keys')) return change()
  el.classList.add('moving')
  try {
    document.startViewTransition(change).finished.finally(() => el.classList.remove('moving'))
  } catch {
    el.classList.remove('moving')
    change()
  }
}
/** A group's one lit choice travels to the one you pick, on the spring (DESIGN.md › Motion › Choose). */
const glider = (group) => {
  if (!group) return () => {}
  const buttons = all('button', group)
  const place = () => {
    const on = buttons.find((b) => b.getAttribute('aria-pressed') === 'true')
    if (!on) return
    group.style.setProperty('--gx', `${on.offsetLeft}px`)
    group.style.setProperty('--gw', `${on.offsetWidth}px`)
  }
  requestAnimationFrame(() => {
    place()
    if ('ResizeObserver' in window) new ResizeObserver(place).observe(group)
    requestAnimationFrame(() => group.classList.add('ready'))
  })
  return place
}
const warm = (root) => all('img[loading="lazy"]', root).forEach((img) => { img.loading = 'eager' })
/** The light behind the page: the picture named (an app on the home page, a story's picture on an app's page) fades
    up; anything else fades it all down. Says whether the page has that light. */
const glowLayer = one('.ambient')
const glow = (key) => {
  if (!glowLayer) return false
  let hit = false
  for (const span of all(':scope > span', glowLayer)) {
    const on = span.dataset.for === key
    span.classList.toggle('on', on)
    hit = hit || on
  }
  return hit
}
part('version', () => {
  const apps = new Set(all('[data-release]').map((line) => line.dataset.release))
  for (const app of apps) {
    fetch(`/api/${app}.json`)
      .then((response) => (response.ok ? response.json() : null))
      .then((release) => {
        if (!release || !release.version) return
        for (const line of all(`[data-release="${app}"]`)) {
          const version = one('[data-version]', line)
          if (version) version.textContent = `Version ${release.version}`
          const sha = one('[data-sha]', line)
          if (sha && release.sha256) {
            sha.textContent = release.sha256
            const check = one('[data-check]', line)
            if (check) check.textContent = `(Get-FileHash "$HOME\\Downloads\\${check.dataset.file}").Hash -eq '${release.sha256}'`
          } else one('.sha', line)?.remove()
          line.classList.add('is-ready')
        }
      })
      .catch(() => {})
  }
})
document.addEventListener('click', async (e) => {
  const button = e.target instanceof Element ? e.target.closest('[data-check-copy]') : null
  const check = button && one('[data-check]', button.parentElement)
  if (!check?.textContent) return
  const label = one('span', button)
  try {
    await navigator.clipboard.writeText(check.textContent)
    if (label) label.textContent = 'Copied'
  } catch {
    getSelection()?.selectAllChildren(check)
    if (label) label.textContent = 'Press Ctrl+C'
  }
})
/** Only Windows can run the apps; anywhere else a Download opens the note on sending it to the PC instead. */
const windows = (navigator.userAgentData?.platform ?? navigator.userAgent).includes('Windows')
part('elsewhere', () => {
  const panel = one('#pc')
  if (windows || !panel || typeof panel.showPopover !== 'function') return
  const nameEl = one('[data-pc-name]', panel)
  const file = one('[data-pc-file]', panel)
  const copied = one('[data-pc-copied]', panel)
  const send = one('[data-pc-send]', panel)
  let target = { name: 'Exo', url: location.origin }
  if (!navigator.share) send.hidden = true
  document.addEventListener('click', (e) => {
    const link = e.target instanceof Element ? e.target.closest('a[href^="/download/"]') : null
    if (!link || link === file) return
    e.preventDefault()
    const key = link.getAttribute('href').split('/')[2]
    const name = one(`#apps a[href="/${key}"] b`)?.textContent ?? 'Exo'
    target = { name, url: `${location.origin}/${key}` }
    nameEl.textContent = name
    file.href = link.getAttribute('href')
    copied.textContent = 'Copy link'
    one('#get')?.hidePopover?.()
    panel.showPopover()
  })
  send.addEventListener('click', () => {
    navigator.share({ title: `${target.name} for Windows 11`, text: `${target.name}, to install on my PC`, url: target.url }).catch(() => {})
  })
  one('[data-pc-copy]', panel).addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(target.url)
      copied.textContent = 'Link copied'
    } catch {
      copied.textContent = target.url
    }
  })
})
part('download note', () => {
  const note = one('#dl-note')
  if (!note || typeof note.showPopover !== 'function') return
  const key = 'exo-download-note'
  const seen = () => { try { return sessionStorage.getItem(key) === '1' } catch { return false } }
  const remember = () => { try { sessionStorage.setItem(key, '1') } catch {} }
  document.addEventListener('click', (e) => {
    const link = e.target instanceof Element ? e.target.closest('a[href^="/download/"]') : null
    if (!link || seen() || (!windows && !link.hasAttribute('data-pc-file'))) return
    remember()
    const fromKeys = e.detail === 0
    requestAnimationFrame(() => {
      try { note.showPopover() } catch { return }
      if (fromKeys) (one('a', note) ?? one('.dl-close', note))?.focus()
    })
  })
})
part('reveals', () => {
  if (window.CSS?.supports?.('animation-timeline: view()')) return
  const items = all('.reveal')
  if (!('IntersectionObserver' in window)) return items.forEach((el) => el.classList.add('in'))
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      entry.target.classList.add('in')
      io.unobserve(entry.target)
    }
  }, { rootMargin: '0px 0px -8% 0px' })
  items.forEach((el) => io.observe(el))
})
part('light on glass', () => {
  document.addEventListener('pointermove', (e) => {
    const glass = e.target instanceof Element ? e.target.closest('.glow') : null
    if (!glass) return
    const r = glass.getBoundingClientRect()
    glass.style.setProperty('--mx', `${e.clientX - r.left}px`)
    glass.style.setProperty('--my', `${e.clientY - r.top}px`)
  }, { passive: true })
})
for (const demo of all('[data-rooms]')) {
  part('rooms', () => {
    const view = one('.rooms-view', demo)
    const bar = one('.rooms-tabs', demo)
    if (!view || !bar) return
    const tabs = all('button', bar)
    const glide = glider(bar)
    near(demo, () => warm(view), '600px')
    const library = one('[data-room="library"] img', view)
    const lifts = () => { if (library?.currentSrc) view.style.setProperty('--shot', `url("${library.currentSrc}")`) }
    if (library) {
      if (library.complete) lifts()
      library.addEventListener('load', lifts)
    }
    const roomImg = (tab) => one(`[data-room="${tab.dataset.go}"] img`, view)
    const go = async (tab, scrolled = false) => {
      if (!tab || tab.getAttribute('aria-pressed') === 'true') return
      const from = tabs.findIndex((t) => t.getAttribute('aria-pressed') === 'true')
      await ready(roomImg(tab))
      document.documentElement.dataset.dir = tabs.indexOf(tab) > from ? 'next' : 'back'
      const change = () => {
        tabs.forEach((t) => t.setAttribute('aria-pressed', String(t === tab)))
        all('[data-room]', view).forEach((room) => { room.hidden = room.dataset.room !== tab.dataset.go })
        glide()
        demo.dispatchEvent(new Event('exo-shown'))
      }
      if (!scrolled) return move(view, change)
      view.classList.remove('fading')
      void view.offsetWidth
      view.classList.add('fading')
      change()
    }
    demo.addEventListener('exo-go', (e) => go(tabs.find((t) => t.dataset.go === e.detail), true))
    for (const tab of tabs) {
      tab.addEventListener('pointerenter', () => ready(roomImg(tab)))
      tab.addEventListener('focus', () => ready(roomImg(tab)))
      tab.addEventListener('click', () => go(tab))
    }
  })
}
const quiet = still.matches || navigator.connection?.saveData === true
const webm = (() => { try { return document.createElement('video').canPlayType('video/webm; codecs="vp9"') !== '' } catch { return true } })()
const load = (video) => {
  if (!video || video.getAttribute('src')) return
  const src = webm || !video.dataset.mp4 ? video.dataset.src : video.dataset.mp4
  if (src) video.src = src
}
const roll = (video, failed) => {
  if (!video) return
  load(video)
  try {
    const playing = video.play()
    if (playing && playing.catch) playing.catch(() => failed?.())
  } catch {
    failed?.()
  }
}
/** Whether any part of the element is on screen now (an observer only reports on its next frame). */
const onScreen = (el) => {
  const r = el.getBoundingClientRect()
  return r.bottom > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight) && r.width > 0
}
/** Runs show() while the element is on screen and hide() when it leaves it. The observer's first report says where it
    starts (on the first frame, so startup never waits on a layout to ask). */
const whileShown = (el, show, hide) => {
  if (!('IntersectionObserver' in window)) return show()
  new IntersectionObserver((entries) => {
    for (const entry of entries) (entry.isIntersecting ? show : hide)()
  }, { rootMargin: '100px 0px', threshold: 0 }).observe(el)
}
for (const player of all('[data-player]')) {
  part('player', () => {
    const view = one('.player-view', player)
    const films = all('.films button', player)
    const play = one('.play', player)
    const scrub = one('.scrub', player)
    let wanted = !quiet
    let shown = false
    let seeking = false
    const current = () => one('.film:not([hidden]) video', view)
    const paint = () => { if (scrub) player.style.setProperty('--p', `${scrub.value / 10}%`) }
    const state = () => {
      const video = current()
      const playing = Boolean(video && !video.paused)
      player.classList.toggle('playing', playing)
      play?.setAttribute('aria-label', playing ? 'Pause' : 'Play')
    }
    const start = () => roll(current(), () => { wanted = false; state() })
    const stop = () => all('video', view).forEach((video) => video.pause())
    for (const video of all('video', view)) {
      video.addEventListener('play', state)
      video.addEventListener('pause', state)
      video.addEventListener('timeupdate', () => {
        if (seeking || !scrub || video !== current() || !video.duration) return
        scrub.value = String(Math.round((video.currentTime / video.duration) * 1000))
        paint()
      })
    }
    whileShown(player, () => { shown = true; if (wanted) start() }, () => { shown = false; stop() })
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop()
      else if (wanted && shown) start()
    })
    play?.addEventListener('click', () => {
      const video = current()
      wanted = !video || video.paused
      if (wanted) start()
      else stop()
    })
    scrub?.addEventListener('input', () => {
      const video = current()
      seeking = true
      load(video)
      if (video?.duration) video.currentTime = (scrub.value / 1000) * video.duration
      paint()
    })
    scrub?.addEventListener('change', () => { seeking = false })
    if (!films.length) return
    const glide = glider(one('.films', player))
    const filmOf = (film) => one(`.film[data-film="${film.dataset.film}"]`, view)
    const warmFilm = (film) => {
      const target = filmOf(film)
      const video = one('video', target)
      if (video && !quiet) { load(video); return Promise.resolve() }
      return ready(one('img', target))
    }
    near(player, () => warm(view), '600px')
    const pick = async (film, scrolled = false) => {
      if (!film || film.getAttribute('aria-pressed') === 'true') return
      await warmFilm(film)
      stop()
      const change = () => {
        films.forEach((f) => f.setAttribute('aria-pressed', String(f === film)))
        all('.film', view).forEach((shot) => { shot.hidden = shot.dataset.film !== film.dataset.film })
        glide()
        if (scrub) { scrub.value = '0'; paint() }
        player.dispatchEvent(new Event('exo-shown'))
      }
      if (scrolled) {
        view.classList.remove('fading')
        void view.offsetWidth
        view.classList.add('fading')
        change()
      } else move(view, change)
      if (wanted && shown) start()
      state()
    }
    player.addEventListener('exo-film', (e) => pick(films.find((f) => f.dataset.film === e.detail), true))
    for (const film of films) {
      film.addEventListener('pointerenter', () => warmFilm(film))
      film.addEventListener('focus', () => warmFilm(film))
      film.addEventListener('click', () => pick(film))
    }
  })
}
for (const story of all('[data-story]')) {
  part('story clips', () => {
    const clips = all('video', story)
    if (!clips.length || quiet) return
    whileShown(story, () => clips.forEach((video) => roll(video)), () => clips.forEach((video) => video.pause()))
  })
}
for (const compare of all('[data-compare]')) {
  part('shield', () => {
    const range = one('input', compare)
    if (!range) return
    const set = () => compare.style.setProperty('--pos', `${range.value}%`)
    range.addEventListener('input', () => { compare.classList.add('touched'); set() })
    set()
    if (still.matches) return
    near(compare, () => {
      let t0 = 0
      const sweep = (now) => {
        if (compare.classList.contains('touched')) return
        if (!t0) t0 = now
        const k = Math.min(1, (now - t0) / 1400)
        range.value = String(Math.round(88 - 38 * (1 - Math.pow(1 - k, 4))))
        set()
        if (k < 1) requestAnimationFrame(sweep)
      }
      if ('requestIdleCallback' in window) requestIdleCallback(() => requestAnimationFrame(sweep), { timeout: 1200 })
      else setTimeout(() => requestAnimationFrame(sweep), 400)
    }, '-20% 0px')
  })
}
for (const vault of all('[data-vault]')) {
  part('vault', () => {
    const button = one('button', vault)
    const word = one('.vault-word', vault)
    if (!button) return
    const clip = quiet ? null : one('.vault-clip', vault)
    const set = (open, playing) => {
      button.setAttribute('aria-pressed', String(open))
      vault.classList.toggle('open', open && !playing)
      vault.classList.toggle('playing', playing)
      if (word) word.textContent = open ? 'Lock' : 'Unlock'
    }
    const wake = () => {
      warm(vault)
      if (clip) { clip.preload = 'auto'; load(clip) }
    }
    button.addEventListener('pointerenter', wake, { once: true })
    button.addEventListener('focus', wake, { once: true })
    button.addEventListener('click', async () => {
      const open = button.getAttribute('aria-pressed') !== 'true'
      if (open && clip) {
        button.setAttribute('aria-pressed', 'true')
        if (word) word.textContent = 'Lock'
        clip.currentTime = 0
        clip.addEventListener('playing', () => {
          if (button.getAttribute('aria-pressed') === 'true') move(vault, () => set(true, true))
        }, { once: true })
        roll(clip, () => move(vault, () => set(true, false)))
        return
      }
      clip?.pause()
      await ready(one(open ? '.opened img' : '.locked img', vault))
      move(vault, () => set(open, false))
    })
  })
}
for (const story of all('[data-story]')) {
  near(story, () => part('story', () => {
    const shots = all('.stage-shot', story)
    const steps = all('.step', story)
    const rail = one('.rail', story)
    if (!shots.length || !steps.length) return
    let current = null
    const app = one('main[data-app]')?.dataset.app
    const light = (step) => requestAnimationFrame(() => { if (current === step && onScreen(story) && !glow(step.dataset.shot)) glow(app) })
    const apply = (step, lit = true) => {
      if (step === current) { if (lit) light(step); return }
      current = step
      steps.forEach((s) => s.classList.toggle('on', s === step))
      rail?.style.setProperty('--done', String(steps.length > 1 ? steps.indexOf(step) / (steps.length - 1) : 1))
      if (lit) light(step)
      const focus = (step.dataset.focus || '0 0 1 1').split(' ').map(Number)
      const [x, y, w, h] = focus.length === 4 && focus.every(Number.isFinite) ? focus : [0, 0, 1, 1]
      const s = Math.min(1 / w, 1 / h, 2.4)
      const room = (1 - 1 / s) / 2
      const clamp = (v) => Math.max(-room, Math.min(room, v))
      for (const shot of shots) {
        const on = shot.dataset.shot === step.dataset.shot
        shot.classList.toggle('on', on)
        if (!on) continue
        shot.style.setProperty('--s', String(s))
        shot.style.setProperty('--x', `${clamp(0.5 - (x + w / 2)) * 100}%`)
        shot.style.setProperty('--y', `${clamp(0.5 - (y + h / 2)) * 100}%`)
      }
    }
    const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : null
    if (phone) {
      const moved = []
      const named = new Set()
      let prev = null
      for (const step of steps) {
        const same = prev && prev.dataset.shot === step.dataset.shot && prev.dataset.focus === step.dataset.focus
        prev = step
        const shot = shots.find((s) => s.dataset.shot === step.dataset.shot)
        if (same || !shot) continue
        const crop = document.createElement('div')
        crop.className = 'crop'
        const video = one('video', shot)
        if (video) {
          if (moved.some(([v]) => v === video)) continue
          moved.push([video, shot, crop])
        } else {
          const picture = one('picture', shot)?.cloneNode(true)
          const img = picture && one('img', picture)
          if (!img) continue
          img.removeAttribute('fetchpriority')
          img.loading = 'lazy'
          if (named.has(step.dataset.shot)) img.alt = ''
          named.add(step.dataset.shot)
          const f = (step.dataset.focus || '').split(' ').map(Number)
          const [x, y, w, h] = f.length === 4 && f.every(Number.isFinite) ? f : [0, 0, 1, 1]
          const a = (w * 16) / (h * 9)
          const want = Math.min(16 / 9, Math.max(1, a))
          const rw = Math.min(1, a < want ? (h * 9 * want) / 16 : w)
          const rh = Math.min(1, a < want ? h : (w * 16) / (9 * want))
          const rx = Math.max(0, Math.min(1 - rw, x + w / 2 - rw / 2))
          const ry = Math.max(0, Math.min(1 - rh, y + h / 2 - rh / 2))
          crop.style.setProperty('--ar', ((rw * 16) / (rh * 9)).toFixed(4))
          img.style.setProperty('--cw', `${(100 / rw).toFixed(2)}%`)
          img.style.setProperty('--ch', `${(100 / rh).toFixed(2)}%`)
          img.style.setProperty('--cl', `${((-rx / rw) * 100).toFixed(2)}%`)
          img.style.setProperty('--ct', `${((-ry / rh) * 100).toFixed(2)}%`)
          const sizes = `${Math.round(Math.min(100 / rw, 300))}vw`
          for (const el of [img, ...all('source', picture)]) el.setAttribute('sizes', sizes)
          crop.append(picture)
        }
        step.insertBefore(crop, one('h3', step))
      }
      const place = () => {
        story.classList.toggle('cropped', phone.matches)
        for (const [video, home, crop] of moved) (phone.matches ? crop : home).append(video)
      }
      phone.addEventListener?.('change', place)
      place()
    }    apply(steps[0], false)
    if (!('IntersectionObserver' in window)) return
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) apply(entry.target)
    }, { rootMargin: '-45% 0px -45% 0px' })
    steps.forEach((step) => io.observe(step))
  }), '100% 0px')
}
for (const together of all('[data-together]')) {
  part('together', () => {
    const map = one('.tg-map', together)
    const wrap = one('.tg-scenes', together)
    const scenes = all('.tg-scene', together)
    const picks = all('.tg-picks button', together)
    const field = one('canvas.field', together)
    if (!map || !wrap || !scenes.length) return
    const edges = all('[data-edge]', map)
    const nodes = all('[data-node]', map)
    let current = scenes.find((scene) => scene.classList.contains('on')) ?? scenes[0]
    let shown = false
    const aim = () => {
      if (!field) return
      const lit = edges.filter((edge) => edge.classList.contains('on'))
      const box = field.getBoundingClientRect()
      if (!lit.length || !box.width || !box.height) return
      let x = 0
      let y = 0
      for (const edge of lit) {
        const r = edge.getBoundingClientRect()
        x += (r.left + r.width / 2) / lit.length
        y += (r.top + r.height / 2) / lit.length
      }
      field.dataset.focus = `${((x - box.left) / box.width).toFixed(4)} ${((y - box.top) / box.height).toFixed(4)}`
      field.dispatchEvent(new Event('exo-focus'))
    }
    const light = (scene, measure = true) => {
      const links = (scene.dataset.links || '').split(' ').filter(Boolean).map((link) => link.split(':'))
      const apps = new Set((scene.dataset.apps || '').split(' ').filter(Boolean))
      for (const edge of edges) {
        const link = links.find(([key]) => key === edge.dataset.edge)
        if (link) edge.dataset.dir = link[1]
        edge.classList.toggle('on', Boolean(link))
      }
      for (const node of nodes) {
        node.classList.toggle('on', apps.has(node.dataset.node))
        node.classList.toggle('off', !apps.has(node.dataset.node))
      }
      map.classList.toggle('family', links.some(([, dir]) => dir === 'b'))
      if (measure) aim()
    }
    const play = () => {
      for (const scene of scenes) {
        for (const video of all('video', scene)) {
          if (scene === current && shown && !quiet && !document.hidden && !video.dataset.held) roll(video)
          else video.pause()
        }
      }
    }
    whileShown(together, () => { shown = true; play() }, () => { shown = false; play() })
    document.addEventListener('visibilitychange', play)
    const choose = (scene, now = false) => {
      if (scene === current) return light(scene)
      document.documentElement.dataset.dir = scenes.indexOf(scene) > scenes.indexOf(current) ? 'next' : 'back'
      current = scene
      warm(scene)
      const change = () => {
        scenes.forEach((s) => s.classList.toggle('on', s === scene))
        picks.forEach((pick) => pick.setAttribute('aria-pressed', String(pick.dataset.pick === scene.dataset.scene)))
      }
      if (now) change()
      else move(wrap, change)
      light(scene)
      play()
    }
    let resting = 0
    for (const pick of picks) {
      const scene = scenes.find((s) => s.dataset.scene === pick.dataset.pick)
      if (!scene) continue
      pick.addEventListener('click', () => { clearTimeout(resting); choose(scene) })
      pick.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse') return
        warm(scene)
        light(scene)
        clearTimeout(resting)
        resting = setTimeout(() => choose(scene), 260)
      })
      pick.addEventListener('pointerleave', () => { clearTimeout(resting); light(current) })
    }
    const stageBox = one('.tg-stage', together) ?? together
    const margins = () => {
      const top = stageBox.getBoundingClientRect().top
      scenes.forEach((s) => s.style.setProperty('scroll-margin-top', `${Math.round(s.getBoundingClientRect().top - top)}px`))
    }
    const fromLink = () => {
      const scene = scenes.find((s) => location.hash === `#${s.id}`)
      if (!scene) return false
      choose(scene, true)
      scene.scrollIntoView({ block: 'start' })
      return true
    }
    const measure = () => { aim(); margins() }
    if (location.hash && scenes.some((s) => location.hash === `#${s.id}`)) { margins(); fromLink() } else light(current, false)
    window.addEventListener('hashchange', fromLink)
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(together)
    else requestAnimationFrame(measure)
    for (const demo of all('[data-upscale]', together)) {
      const group = one('.tabs', demo)
      const choices = all('button', group)
      const glide = glider(group)
      for (const choice of choices) {
        choice.addEventListener('click', () => {
          choices.forEach((c) => c.setAttribute('aria-pressed', String(c === choice)))
          demo.classList.toggle('on', choice.dataset.vsr === 'on')
          glide()
        })
      }
    }
    for (const demo of all('[data-now]', together)) {
      const video = one('video', demo)
      const toggle = one('.tg-mini-play', demo)
      if (!video || !toggle) continue
      const state = () => {
        demo.classList.toggle('paused', video.paused)
        toggle.setAttribute('aria-label', video.paused ? 'Play video' : 'Pause video')
      }
      video.addEventListener('play', state)
      video.addEventListener('pause', state)
      state()
      toggle.addEventListener('click', () => {
        if (video.paused) {
          delete video.dataset.held
          roll(video, () => { video.dataset.held = '1'; state() })
        } else {
          video.dataset.held = '1'
          video.pause()
        }
      })
      for (const jump of all('[data-jump]', demo)) {
        jump.addEventListener('click', () => {
          load(video)
          const length = video.duration
          if (!length) return
          video.currentTime = (((video.currentTime + Number(jump.dataset.jump)) % length) + length) % length
        })
      }
    }
    for (const demo of all('[data-games], [data-little]', together)) {
      const button = one('.btn', demo)
      button?.addEventListener('click', () => {
        const on = button.getAttribute('aria-pressed') !== 'true'
        button.setAttribute('aria-pressed', String(on))
        demo.classList.toggle('on', on)
      })
    }
  })
}
/** A focus [x, y, w, h] (fractions of a picture) as the zoom that fills a frame with it: scale and offsets in %. */
const zoomTo = (focus) => {
  const f = String(focus || '0 0 1 1').split(' ').map(Number)
  const [x, y, w, h] = f.length === 4 && f.every(Number.isFinite) ? f : [0, 0, 1, 1]
  const s = Math.min(1 / w, 1 / h, 2.4)
  const room = (1 - 1 / s) / 2
  const clamp = (v) => Math.max(-room, Math.min(room, v))
  return { s, x: `${clamp(0.5 - (x + w / 2)) * 100}%`, y: `${clamp(0.5 - (y + h / 2)) * 100}%` }
}
/** A zoomed picture asks for a source as sharp as it's drawn: its sizes become its drawn width times the zoom. The
    sharper one is fetched and decoded aside first, so the picture never blanks while it comes: it sharpens in place. */
const sharpen = (img, s) => {
  if (!img || img.tagName !== 'IMG' || s <= 1) return
  const want = Math.ceil(img.offsetWidth * s)
  if (!want || want <= parseInt(img.getAttribute('data-sized') || '0', 10)) return
  img.setAttribute('data-sized', String(want))
  const sources = all('source', img.parentElement)
  const apply = () => { for (const el of [img, ...sources]) el.setAttribute('sizes', `${want}px`) }
  const source = sources[0]
  if (!source || typeof Image !== 'function') return apply()
  const probe = new Image()
  probe.sizes = `${want}px`
  probe.srcset = source.getAttribute('srcset') || ''
  const done = probe.decode ? probe.decode() : Promise.resolve()
  done.then(apply, apply)
}
part('ambient', () => {
  if (!glowLayer || !('IntersectionObserver' in window)) return
  const page = one('main[data-app]')
  if (page) {
    glow(page.dataset.app)
    const opening = one('.opening', page)
    if (opening) new IntersectionObserver(([entry]) => { if (entry.isIntersecting) glow(page.dataset.app) }, { rootMargin: '-40% 0px -40% 0px' }).observe(opening)
    return
  }
  const bands = all('[data-band]')
  const seen = new Set()
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) (entry.isIntersecting ? seen.add(entry.target) : seen.delete(entry.target))
    glow(bands.find((b) => seen.has(b))?.dataset.band)
  }, { rootMargin: '-45% 0px -45% 0px' })
  bands.forEach((b) => io.observe(b))
})
for (const band of all('[data-band]')) {
  part('band', () => {
    near(band, () => band.classList.add('in'), '-20% 0px')
    const stage = one('.band-stage', band)
    const box = one('.band-demo', band)
    near(band, () => warm(box), '100% 0px')
    const row = one('.band-lines', band)
    const tiles = all('.bl', band)
    if (!stage || !box || !tiles.length) return
    const demo = one('.demo', box)
    const overlays = all('.ov', box)
    const compare = one('[data-compare]', box)
    const range = compare ? one('input', compare) : null
    const wide = window.matchMedia ? window.matchMedia('(min-width: 1024px) and (min-height: 640px)') : { matches: false }
    let step = -1
    const setPos = (value) => {
      if (!range || !compare) return
      compare.classList.add('touched')
      range.value = String(Math.round(value))
      compare.style.setProperty('--pos', `${range.value}%`)
    }
    const zoomed = () => all('.rooms-view [data-room]:not([hidden]) img, .player-view .film:not([hidden]) img, .player-view .film:not([hidden]) video, .compare > picture img', box)
    const aim = () => {
      const tile = tiles[step]
      if (!tile) return
      const z = zoomTo(tile.dataset.focus)
      box.style.setProperty('--s', String(z.s))
      box.style.setProperty('--x', z.x)
      box.style.setProperty('--y', z.y)
      box.toggleAttribute('data-zoomed', z.s > 1.001)
      zoomed().forEach((img) => sharpen(img, z.s))
    }
    const set = (i) => {
      if (i === step || !tiles[i]) return
      step = i
      const tile = tiles[i]
      tiles.forEach((t, k) => {
        t.classList.toggle('on', k === i)
        t.setAttribute('aria-pressed', String(k === i))
      })
      overlays.forEach((o) => o.classList.toggle('on', o.dataset.step === String(i)))
      box.dataset.step = String(i)
      if (tile.dataset.room) demo?.dispatchEvent(new CustomEvent('exo-go', { detail: tile.dataset.room }))
      if (tile.dataset.film) one('[data-player]', box)?.dispatchEvent(new CustomEvent('exo-film', { detail: tile.dataset.film }))
      if (tile.dataset.pos !== undefined && tile.dataset.pos !== 'sweep') setPos(Number(tile.dataset.pos))
      aim()
    }
    box.addEventListener('exo-shown', aim, true)
    set(0)
    let frame = 0
    const follow = () => {
      frame = 0
      if (!wide.matches) return
      const r = band.getBoundingClientRect()
      const run = band.offsetHeight - stage.offsetHeight
      if (run <= 0) return
      const top = parseFloat(getComputedStyle(stage).top) || 0
      const p = Math.max(0, Math.min(0.9999, (top - r.top) / run))
      const at = p * tiles.length
      const i = Math.floor(at)
      set(i)
      const along = at - i
      tiles.forEach((t, k) => t.style.setProperty('--along', k < i ? '1' : k === i ? along.toFixed(3) : '0'))
      if (tiles[i].dataset.pos === 'sweep') setPos(88 * (1 - Math.min(1, along * 1.4)))
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(follow) }
    let watching = false
    const watch = (on) => {
      if (on === watching) return
      watching = on
      if (on) { window.addEventListener('scroll', onScroll, { passive: true }); onScroll() }
      else window.removeEventListener('scroll', onScroll)
    }
    if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => watch(entry.isIntersecting), { rootMargin: '200px 0px' }).observe(band)
    else watch(true)
    window.addEventListener('resize', () => { onScroll(); aim() }, { passive: true })
    if (row && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (wide.matches) return
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (hit) {
          const i = tiles.indexOf(one('.bl', hit.target))
          set(i)
          if (tiles[i]?.dataset.pos === 'sweep') setPos(0)
        }
      }, { root: row, threshold: [0.6, 0.9] })
      all('li', row).forEach((li) => io.observe(li))
    }
    tiles.forEach((tile, i) => {
      tile.addEventListener('click', () => {
        const smooth = still.matches ? 'auto' : 'smooth'
        if (wide.matches) {
          const run = band.offsetHeight - stage.offsetHeight
          const top = parseFloat(getComputedStyle(stage).top) || 0
          window.scrollTo({ top: window.scrollY + band.getBoundingClientRect().top - top + run * ((i + 0.35) / tiles.length), behavior: smooth })
        } else {
          tile.parentElement?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: smooth })
          set(i)
          if (tile.dataset.pos === 'sweep') setPos(0)
        }
      })
    })
  })
}
for (const catalog of all('[data-catalog]')) {
  let started = false
  const start = () => part('feature search', () => {
    if (started) return
    started = true
    const field = one('input[type="search"]', catalog)
    const chips = all('[data-filter]', catalog)
    const areas = all('.cat', catalog)
    const none = one('.none', catalog)
    let area = 'all'
    const lines = all('li', catalog)
    lines.forEach((line) => { line.dataset.text = line.textContent })
    const mark = (line, query) => {
      const text = line.dataset.text || ''
      line.replaceChildren()
      if (!query) return line.append(text)
      const low = text.toLowerCase()
      let at = 0
      for (let hit = low.indexOf(query); hit >= 0; hit = low.indexOf(query, at)) {
        line.append(text.slice(at, hit))
        const found = document.createElement('mark')
        found.textContent = text.slice(hit, hit + query.length)
        line.append(found)
        at = hit + query.length
      }
      line.append(text.slice(at))
    }
    const run = () => {
      const query = (field?.value ?? '').trim().toLowerCase()
      catalog.classList.toggle('searching', Boolean(query))
      let shown = 0
      for (const card of areas) {
        let hits = 0
        for (const line of all('li', card)) {
          const hit = !query || (line.dataset.text || '').toLowerCase().includes(query)
          line.hidden = !hit
          mark(line, hit ? query : '')
          hits += hit ? 1 : 0
        }
        const count = one('.cat-count', card)
        if (count) count.textContent = query ? `${hits}` : String(all('li', card).length)
        card.hidden = !hits || (area !== 'all' && card.dataset.area !== area)
        shown += card.hidden ? 0 : 1
      }
      if (none) none.hidden = shown > 0
    }
    for (const button of all('.cat-more', catalog)) {
      button.addEventListener('click', () => {
        const card = button.closest('.cat')
        const open = !card.classList.contains('open')
        card.classList.toggle('open', open)
        button.setAttribute('aria-expanded', String(open))
        const label = one('span', button)
        if (label) label.textContent = open ? 'Show fewer' : `Show all ${all('li', card).length}`
      })
    }
    field?.addEventListener('input', run)
    for (const chip of chips) {
      chip.addEventListener('click', () => {
        area = chip.dataset.filter
        chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)))
        run()
      })
    }
  })
  catalog.addEventListener('focusin', start, { once: true })
  near(catalog, start, '100% 0px')
}
