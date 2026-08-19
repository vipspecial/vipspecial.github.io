(function (global) {
  'use strict'

  var eventsBound = false

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function safeUrl(value) {
    try {
      var url = new URL(value)
      return /^https?:$/.test(url.protocol) ? url.href : '#'
    } catch (error) {
      return '#'
    }
  }

  function compactNumber(value) {
    return new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0)
  }

  function relativeDate(value) {
    var timestamp = new Date(value).getTime()
    var days = Math.floor((Date.now() - timestamp) / 86400000)
    if (!Number.isFinite(timestamp)) return '更新时间未知'
    if (days < 1) return '今天更新'
    if (days < 30) return days + ' 天前更新'
    return new Date(timestamp).toLocaleDateString('zh-CN')
  }

  function repositoryMarkup(repository) {
    return [
      '<a class="repo-card" href="', safeUrl(repository.url), '" target="_blank" rel="noopener noreferrer">',
      '<div class="repo-card__meta"><span>', escapeHtml(repository.owner), '</span><b>★ ', compactNumber(repository.stars), '</b></div>',
      '<h3>', escapeHtml(repository.name), '</h3>',
      '<p>', escapeHtml(repository.description), '</p>',
      '<footer><span>', escapeHtml(repository.language), '</span><span>', relativeDate(repository.updatedAt), '</span><i>↗</i></footer>',
      '</a>'
    ].join('')
  }

  function loadingMarkup(count) {
    return '<div class="repo-grid">' + Array.from({ length: count || 3 }, function () {
      return '<span class="skeleton-card"></span>'
    }).join('') + '</div>'
  }

  function repositoryErrorMarkup() {
    return '<div class="data-message"><b>暂时无法读取 GitHub 数据</b><span>可能触发匿名请求限制，请稍后重试。</span><button data-repo-retry>重新加载</button></div>'
  }

  function loadRepositories(element, force) {
    var category = element.getAttribute('data-ai-repositories') || 'featured'
    var limit = Number(element.getAttribute('data-limit')) || 3
    element.innerHTML = loadingMarkup(Math.min(limit, 3))

    return global.AiDataService.getRepositories(category, { limit: limit, force: force })
      .then(function (items) {
        if (element.isConnected) element.innerHTML = '<div class="repo-grid">' + items.map(repositoryMarkup).join('') + '</div>'
      }).catch(function () {
        if (element.isConnected) element.innerHTML = repositoryErrorMarkup()
      })
  }

  function explorerTabs(active) {
    return Object.keys(global.AiDataService.categories).map(function (key) {
      var category = global.AiDataService.categories[key]
      return '<button type="button" data-radar-category="' + key + '"' + (key === active ? ' class="is-active"' : '') + '>' + escapeHtml(category.label) + '</button>'
    }).join('')
  }

  function loadExplorer(element, category, force) {
    var active = category || element.getAttribute('data-default-category') || 'featured'
    var limit = Number(element.getAttribute('data-limit')) || 9
    element.setAttribute('data-active-category', active)
    element.innerHTML = '<div class="radar-tabs">' + explorerTabs(active) + '</div><div class="radar-results">' + loadingMarkup(3) + '</div>'
    var results = element.querySelector('.radar-results')

    return global.AiDataService.getRepositories(active, { limit: limit, force: force })
      .then(function (items) {
        if (results.isConnected) results.innerHTML = '<div class="repo-grid">' + items.map(repositoryMarkup).join('') + '</div>'
      }).catch(function () {
        if (results.isConnected) results.innerHTML = repositoryErrorMarkup()
      })
  }

  function healthFlow(apiState, databaseState, details) {
    return [
      '<div class="health-flow">',
      '<div class="health-node is-up"><span>01</span><strong>Pages</strong><small>browser</small></div><i></i>',
      '<div class="health-node ', apiState, '"><span>02</span><strong>API</strong><small>', escapeHtml(details.api), '</small></div><i></i>',
      '<div class="health-node ', databaseState, '"><span>03</span><strong>MySQL</strong><small>', escapeHtml(details.database), '</small></div>',
      '</div>'
    ].join('')
  }

  function healthLoadingMarkup() {
    return [
      '<div class="health-head"><span><i class="status-dot is-checking"></i>CHECKING SYSTEM</span><button data-health-retry disabled>检测中</button></div>',
      healthFlow('is-checking', '', { api: 'connecting', database: 'waiting' }),
      '<div class="health-meta"><span>正在请求生产环境</span><code>/api/health</code></div>'
    ].join('')
  }

  function healthSuccessMarkup(result) {
    var payload = result.payload
    var database = payload.database || {}
    return [
      '<div class="health-head"><span><i class="status-dot is-up"></i>ALL SYSTEMS OPERATIONAL</span><button data-health-retry>重新检测</button></div>',
      healthFlow('is-up', 'is-up', { api: (payload.latencyMs || result.roundTripMs) + ' ms', database: database.name || 'connected' }),
      '<div class="health-metrics">',
      '<div><span>ROUND TRIP</span><strong>', escapeHtml(result.roundTripMs), '<small>ms</small></strong></div>',
      '<div><span>DATABASE</span><strong>', escapeHtml(database.name || 'online'), '</strong></div>',
      '<div><span>CHECKED</span><strong>', escapeHtml(new Date(payload.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })), '</strong></div>',
      '</div>'
    ].join('')
  }

  function healthErrorMarkup(error) {
    var detail = error && error.name === 'AbortError' ? 'timeout' : (error.code || error.status || 'offline')
    return [
      '<div class="health-head"><span><i class="status-dot is-down"></i>SERVICE NEEDS ATTENTION</span><button data-health-retry>重新检测</button></div>',
      healthFlow('is-down', '', { api: detail, database: 'unknown' }),
      '<div class="health-alert"><b>后端暂时不可用</b><span>生产接口没有返回健康状态，请检查 Vercel Runtime Logs。</span></div>'
    ].join('')
  }

  function loadHealth(element) {
    element.innerHTML = healthLoadingMarkup()
    global.AiDataService.checkBackend().then(function (result) {
      if (element.isConnected) element.innerHTML = healthSuccessMarkup(result)
    }).catch(function (error) {
      if (element.isConnected) element.innerHTML = healthErrorMarkup(error)
    })
  }

  function bindEvents() {
    if (eventsBound) return
    eventsBound = true
    document.addEventListener('click', function (event) {
      var categoryButton = event.target.closest('[data-radar-category]')
      if (categoryButton) {
        var explorer = categoryButton.closest('[data-ai-explorer]')
        if (explorer) loadExplorer(explorer, categoryButton.getAttribute('data-radar-category'), false)
        return
      }

      var healthButton = event.target.closest('[data-health-retry]')
      if (healthButton) {
        var health = healthButton.closest('[data-api-health-check]')
        if (health) loadHealth(health)
        return
      }

      var retryButton = event.target.closest('[data-repo-retry]')
      if (!retryButton) return
      var repository = retryButton.closest('[data-ai-repositories]')
      var explorerElement = retryButton.closest('[data-ai-explorer]')
      if (repository) loadRepositories(repository, true)
      if (explorerElement) loadExplorer(explorerElement, explorerElement.getAttribute('data-active-category'), true)
    })
  }

  function mount(root) {
    if (!global.AiDataService) return
    bindEvents()
    root.querySelectorAll('[data-ai-repositories]').forEach(function (element) { loadRepositories(element, false) })
    root.querySelectorAll('[data-ai-explorer]').forEach(function (element) { loadExplorer(element, null, false) })
    root.querySelectorAll('[data-api-health-check]').forEach(function (element) { loadHealth(element) })
  }

  global.AiPortalPlugin = function (hook) {
    hook.doneEach(function () {
      global.requestAnimationFrame(function () { mount(document) })
    })
  }
})(window)
