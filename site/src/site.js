// Progressive enhancement for getexo.app. Strict-CSP & Trusted-Types safe (DOM node APIs only).
const root = document.documentElement
root.classList.add('js')

const SVG_NS = 'http://www.w3.org/2000/svg'
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function svgIcon(pathData) {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('class', 'i')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute('d', pathData)
  svg.appendChild(path)
  return svg
}

// 1. Sticky bar scroll state
const bar = document.querySelector('[data-bar]')
if (bar) {
  let ticking = false
  const syncBar = () => {
    ticking = false
    bar.dataset.scrolled = window.scrollY > 8 ? 'true' : 'false'
  }
  syncBar()
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true
      requestAnimationFrame(syncBar)
    }
  }, { passive: true })
}

// 2. Responsive navigation menu
const wrap = document.querySelector('[data-menu-wrap]')
const menuBtn = wrap?.querySelector('.bar-menu')
if (wrap && menuBtn) {
  const close = () => {
    wrap.classList.remove('open')
    menuBtn.setAttribute('aria-expanded', 'false')
  }
  menuBtn.addEventListener('click', (event) => {
    event.stopPropagation()
    const next = !wrap.classList.contains('open')
    wrap.classList.toggle('open', next)
    menuBtn.setAttribute('aria-expanded', String(next))
  })
  document.addEventListener('click', (event) => {
    if (wrap.classList.contains('open') && !wrap.contains(event.target)) close()
  })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && wrap.classList.contains('open')) {
      close()
      menuBtn.focus()
    }
  })
}

// 3. Scroll reveals via single IntersectionObserver
const reveals = [...document.querySelectorAll('[data-reveal]')]
if (reveals.length) {
  if (reducedMotion() || !('IntersectionObserver' in window)) {
    for (const el of reveals) el.classList.add('is-visible')
  } else {
    const vh = window.innerHeight || 900
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      }
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 })
    for (const el of reveals) {
      if (el.getBoundingClientRect().top < vh * 0.95) el.classList.add('is-visible')
      else observer.observe(el)
    }
  }
}

// 4. Sliding pill segmented tabs (apps switcher & Launcher 3.28 room tour)
for (const container of document.querySelectorAll('[data-tabs]')) {
  const tablist = container.querySelector('[role="tablist"]')
  const pill = container.querySelector('[data-tab-pill]')
  const tabs = [...container.querySelectorAll('[role="tab"]')]
  const panels = new Map(
    [...container.querySelectorAll('[role="tabpanel"]')].map((panel) => [panel.id, panel]),
  )
  if (!tablist || !tabs.length) continue

  const positionPill = (activeTab) => {
    if (!pill || !activeTab) return
    const width = activeTab.offsetWidth
    const x = activeTab.offsetLeft
    if (!width) return
    pill.style.width = `${width}px`
    pill.style.transform = `translate3d(${x}px, 0, 0)`
    pill.classList.add('ready')
  }

  const selectTab = (nextTab, { focus = false, animate = true } = {}) => {
    for (const tab of tabs) {
      const selected = tab === nextTab
      tab.setAttribute('aria-selected', String(selected))
      tab.tabIndex = selected ? 0 : -1
      const panel = panels.get(tab.getAttribute('aria-controls'))
      if (!panel) continue
      if (selected) {
        panel.hidden = false
        panel.classList.remove('is-animating')
        if (animate && !reducedMotion()) {
          void panel.offsetWidth
          panel.classList.add('is-animating')
        }
      } else {
        panel.hidden = true
        panel.classList.remove('is-animating')
      }
    }
    positionPill(nextTab)
    if (focus) nextTab.focus()
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => selectTab(tab))
    tab.addEventListener('keydown', (event) => {
      const i = tabs.indexOf(tab)
      let target = null
      if (event.key === 'ArrowRight') target = tabs[(i + 1) % tabs.length]
      else if (event.key === 'ArrowLeft') target = tabs[(i - 1 + tabs.length) % tabs.length]
      else if (event.key === 'Home') target = tabs[0]
      else if (event.key === 'End') target = tabs[tabs.length - 1]
      if (!target) return
      event.preventDefault()
      selectTab(target, { focus: true })
    })
  }

  const initial = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0]
  selectTab(initial, { animate: false })

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => {
      const current = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0]
      positionPill(current)
    })
    ro.observe(tablist)
  }
}

// 5. One-click SHA-256 copy with clipboard -> check morph
const COPY_PATH = 'M8 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2M10 10h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z'
const CHECK_PATH = 'M5 13l4 4L19 7'
const copyTimers = new WeakMap()

document.addEventListener('click', async (event) => {
  const button = event.target instanceof Element ? event.target.closest('[data-copy-sha]') : null
  if (!button) return
  const container = button.closest('[data-release], [data-archive]')
  const value = button.dataset.copySha || container?.querySelector('[data-release-sha]')?.textContent?.trim()
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    button.classList.add('is-copied')
    const label = button.querySelector('span')
    if (label && button.dataset.copyLabel === undefined) button.dataset.copyLabel = label.textContent || 'Copy'
    const useEl = button.querySelector('svg use')
    const pathEl = button.querySelector('svg path')
    if (useEl) useEl.setAttribute('href', '#i-check')
    else if (pathEl) pathEl.setAttribute('d', CHECK_PATH)
    if (label) label.textContent = 'Copied'
    const prev = copyTimers.get(button)
    if (prev) clearTimeout(prev)
    copyTimers.set(button, setTimeout(() => {
      button.classList.remove('is-copied')
      if (useEl) useEl.setAttribute('href', '#i-copy')
      else if (pathEl) pathEl.setAttribute('d', COPY_PATH)
      if (label) label.textContent = button.dataset.copyLabel || 'Copy'
    }, 1800))
  } catch {
    // Clipboard unavailable
  }
})

// 6. Hydrate /source archive cards safely via DOM node APIs (matches workers/exo-site/src/source.js schema)
const sourceHost = document.querySelector('[data-source]')
if (sourceHost) {
  fetch('/source/index.json')
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error('unavailable'))))
    .then((data) => {
      const addons = Array.isArray(data?.addons) ? data.addons : []
      if (!addons.length) throw new Error('empty')
      const frag = document.createDocumentFragment()
      for (const addon of addons) {
        const card = document.createElement('article')
        card.className = 'card'
        card.dataset.archive = addon.name || ''

        const title = document.createElement('h3')
        title.textContent = addon.title || addon.name || 'Archive'

        const lic = document.createElement('p')
        const latest = Array.isArray(addon.releases) ? addon.releases[0] : null
        lic.textContent = [addon.license, latest ? `v${latest.version}` : ''].filter(Boolean).join(' · ')
        card.append(title, lic)

        if (latest) {
          const shaWrap = document.createElement('div')
          shaWrap.className = 'release-strip'
          const meta = document.createElement('div')
          meta.className = 'release-meta'
          const mb = typeof latest.bytes === 'number' ? `${(latest.bytes / (1024 * 1024)).toFixed(2)} MB` : ''
          meta.textContent = [latest.file, mb].filter(Boolean).join(' · ')

          const shaRow = document.createElement('div')
          shaRow.className = 'release-sha-row'
          const code = document.createElement('code')
          code.dataset.releaseSha = ''
          code.textContent = latest.sha256 || ''
          const copyBtn = document.createElement('button')
          copyBtn.type = 'button'
          copyBtn.className = 'btn copy'
          copyBtn.dataset.copySha = latest.sha256 || ''
          copyBtn.appendChild(svgIcon(COPY_PATH))
          const copyTxt = document.createElement('span')
          copyTxt.textContent = 'Copy'
          copyBtn.appendChild(copyTxt)
          shaRow.append(code, copyBtn)
          shaWrap.append(meta, shaRow)
          card.appendChild(shaWrap)

          const actions = document.createElement('div')
          actions.className = 'row'
          if (typeof addon.name === 'string' && typeof latest.file === 'string') {
            const link = document.createElement('a')
            link.className = 'btn small primary'
            link.href = `/source/${encodeURIComponent(addon.name)}/${encodeURIComponent(latest.file)}`
            link.textContent = 'Download archive'
            actions.appendChild(link)
          }
          card.appendChild(actions)
        }
        frag.appendChild(card)
      }
      sourceHost.replaceChildren(frag)
    })
    .catch(() => {
      const state = sourceHost.querySelector('[data-source-state]')
      if (state) state.textContent = 'Open-source archive index is unavailable right now. Check /source/index.json in a moment.'
    })
}

// 7. Contact form on /help -> https://reports.getexo.app/v1/contact
const form = document.querySelector('[data-contact]')
if (form) {
  const email = form.querySelector('[data-field="email"]')
  const message = form.querySelector('[data-field="message"]')
  const appField = form.querySelector('[data-field="app"]')
  const status = form.querySelector('[data-status]')
  const submitBtn = form.querySelector('button[type="submit"]')
  const done = document.querySelector('[data-contact-done]')

  const setFieldError = (name, text) => {
    const el = form.querySelector(`[data-error="${name}"]`)
    const input = form.querySelector(`[data-field="${name}"]`)
    if (el) {
      el.textContent = text || ''
      el.hidden = !text
    }
    if (input) input.setAttribute('aria-invalid', text ? 'true' : 'false')
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    setFieldError('email', '')
    setFieldError('message', '')
    setFieldError('app', '')
    if (status) {
      status.textContent = ''
      status.hidden = true
    }

    const emailVal = email?.value.trim() || ''
    const msgVal = message?.value.trim() || ''
    const appVal = form.querySelector('input[name="app"]:checked')?.value || ''
    const hpVal = form.querySelector('input[name="website"]')?.value || ''

    let invalid = false
    if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      setFieldError('email', 'Enter a valid email address, or leave it blank.')
      invalid = true
    }
    if (!['launcher', 'cinema', 'other'].includes(appVal)) {
      setFieldError('app', 'Pick which app this is about.')
      invalid = true
    }
    if (msgVal.length < 5) {
      setFieldError('message', 'Write a short message before sending.')
      invalid = true
    }
    if (invalid) return

    if (submitBtn) {
      submitBtn.disabled = true
      submitBtn.setAttribute('aria-busy', 'true')
    }
    try {
      const response = await fetch('https://reports.getexo.app/v1/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: emailVal, app: appVal, message: msgVal, website: hpVal }),
      })
      if (!response.ok) {
        let errText = 'Could not send your message right now. Try again in a moment, or write on Discord.'
        if (response.status === 429) errText = 'Too many messages from this connection. Wait a minute and try again.'
        if (status) {
          status.textContent = errText
          status.hidden = false
        }
        return
      }
      form.hidden = true
      if (done) {
        done.hidden = false
        done.focus()
      }
    } catch {
      if (status) {
        status.textContent = 'Could not reach reports.getexo.app. Try again, or use Discord.'
        status.hidden = false
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.removeAttribute('aria-busy')
      }
    }
  })
}
