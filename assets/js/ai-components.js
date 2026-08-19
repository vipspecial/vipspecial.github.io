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
      var parsed = new URL(value, global.location.href)
      return /^https?:$/.test(parsed.protocol) ? parsed.href : '#'
    } catch (error) {
      return '#'
    }
  }

  function compactNumber(value) {
    return new Intl.NumberFormat('zh-CN', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value || 0)
  }

  function relativeDate(value) {
    var timestamp = new Date(value).getTime()
    var elapsed = Date.now() - timestamp
    var day = 24 * 60 * 60 * 1000

    if (!Number.isFinite(timestamp)) return '时间未知'
    if (elapsed < 60 * 60 * 1000) return Math.max(1, Math.floor(elapsed / 60000)) + ' 分钟前'
    if (elapsed < day) return Math.floor(elapsed / (60 * 60 * 1000)) + ' 小时前'
    if (elapsed < day * 30) return Math.floor(elapsed / day) + ' 天前'
    return new Date(timestamp).toLocaleDateString('zh-CN')
  }

  function sourceDomain(value) {
    try {
      return new URL(value).hostname.replace(/^www\./, '')
    } catch (error) {
      return 'external link'
    }
  }

  function loadingMarkup(count) {
    var cards = Array.from({ length: count || 3 }, function () {
      return '<span class="skeleton-card"></span>'
    }).join('')
    return '<div class="skeleton-grid" aria-label="正在加载公网数据">' + cards + '</div>'
  }

  function errorMessage(error) {
    if (error && error.status === 403) {
      return 'GitHub 公共 API 当前触发匿名限流，请稍后重试。'
    }
    if (error && error.name === 'AbortError') {
      return '公网数据源响应超时，请检查网络后重试。'
    }
    return '暂时无法连接公网数据源，站点其他内容不受影响。'
  }

  function errorMarkup(error, kind) {
    return [
      '<div class="data-state" role="status">',
      '<strong>动态数据未加载</strong>',
      '<p>', escapeHtml(errorMessage(error)), '</p>',
      '<button type="button" data-ai-retry="', kind, '">重新请求</button>',
      '</div>'
    ].join('')
  }

  function footnote(result, sourceName) {
    var status = result.stale ? '网络不可用，正在显示缓存' : '数据来自 ' + sourceName
    return '<div class="data-footnote">' + escapeHtml(status) + ' · ' + relativeDate(result.updatedAt) + '更新</div>'
  }

  function repositoryCard(repository) {
    var topics = repository.topics.map(function (topic) {
      return '<span>' + escapeHtml(topic) + '</span>'
    }).join('')

    return [
      '<a class="repo-card" href="', safeUrl(repository.url), '" target="_blank" rel="noopener noreferrer">',
      '<div class="repo-card__top">',
      '<span class="repo-card__owner">', escapeHtml(repository.owner), '</span>',
      '<span class="repo-card__stars">★ ', compactNumber(repository.stars), '</span>',
      '</div>',
      '<h3>', escapeHtml(repository.name), '</h3>',
      '<p>', escapeHtml(repository.description), '</p>',
      topics ? '<div class="topic-list">' + topics + '</div>' : '',
      '<div class="repo-card__footer">',
      '<span><i class="language-dot"></i>', escapeHtml(repository.language), '</span>',
      '<span>', compactNumber(repository.forks), ' forks</span>',
      '<span>', relativeDate(repository.updatedAt), '更新</span>',
      '</div>',
      '</a>'
    ].join('')
  }

  function newsCard(item) {
    return [
      '<a class="news-card" href="', safeUrl(item.url), '" target="_blank" rel="noopener noreferrer">',
      '<div class="news-card__top">',
      '<span>', escapeHtml(sourceDomain(item.url)), '</span>',
      '<span>', relativeDate(item.createdAt), '</span>',
      '</div>',
      '<h3>', escapeHtml(item.title), '</h3>',
      '<p>来自 Hacker News 的近期 AI 主题。打开原文后可通过讨论链接查看社区反馈。</p>',
      '<div class="news-card__footer">',
      '<span>', compactNumber(item.points), ' points</span>',
      '<span>', compactNumber(item.comments), ' comments</span>',
      '<span>by ', escapeHtml(item.author), '</span>',
      '</div>',
      '</a>'
    ].join('')
  }

  function renderCollection(element, result, renderer, className, sourceName) {
    if (!element.isConnected) return
    if (!result.data.length) {
      element.innerHTML = '<div class="data-state"><strong>暂无匹配数据</strong><p>数据源请求成功，但当前查询没有返回结果。</p></div>'
      return
    }

    element.innerHTML = [
      '<div class="', className, '">',
      result.data.map(renderer).join(''),
      '</div>',
      footnote(result, sourceName)
    ].join('')
  }

  function loadRepositories(element, force) {
    var category = element.getAttribute('data-ai-repositories') || 'featured'
    var limit = Number(element.getAttribute('data-limit')) || 6
    element.innerHTML = loadingMarkup(Math.min(limit, 3))

    return global.AiDataService.getRepositories(category, {
      limit: limit,
      force: Boolean(force)
    }).then(function (result) {
      renderCollection(element, result, repositoryCard, 'repo-grid', 'GitHub Public API')
    }).catch(function (error) {
      if (element.isConnected) element.innerHTML = errorMarkup(error, 'repositories')
    })
  }

  function loadNews(element, force) {
    var limit = Number(element.getAttribute('data-limit')) || 6
    element.innerHTML = loadingMarkup(Math.min(limit, 3))

    return global.AiDataService.getAiNews({
      limit: limit,
      force: Boolean(force)
    }).then(function (result) {
      renderCollection(element, result, newsCard, 'news-grid', 'Hacker News API')
    }).catch(function (error) {
      if (element.isConnected) element.innerHTML = errorMarkup(error, 'news')
    })
  }

  function explorerTabs(activeCategory) {
    return Object.keys(global.AiDataService.categories).map(function (key) {
      var category = global.AiDataService.categories[key]
      var activeClass = key === activeCategory ? ' class="is-active"' : ''
      return '<button type="button"' + activeClass + ' data-ai-category="' + escapeHtml(key) + '">' + escapeHtml(category.label) + '</button>'
    }).join('')
  }

  function loadExplorer(element, category, force) {
    var activeCategory = category || element.getAttribute('data-default-category') || 'featured'
    var limit = Number(element.getAttribute('data-limit')) || 9
    element.setAttribute('data-active-category', activeCategory)
    element.innerHTML = [
      '<div class="explorer-tabs" role="tablist">', explorerTabs(activeCategory), '</div>',
      '<div class="explorer-results">', loadingMarkup(3), '</div>'
    ].join('')

    var resultsElement = element.querySelector('.explorer-results')
    return global.AiDataService.getRepositories(activeCategory, {
      limit: limit,
      force: Boolean(force)
    }).then(function (result) {
      renderCollection(resultsElement, result, repositoryCard, 'repo-grid', 'GitHub Public API')
    }).catch(function (error) {
      if (resultsElement.isConnected) resultsElement.innerHTML = errorMarkup(error, 'explorer')
    })
  }

  function bindEvents() {
    if (eventsBound) return
    eventsBound = true

    document.addEventListener('click', function (event) {
      var categoryButton = event.target.closest('[data-ai-category]')
      if (categoryButton) {
        var explorer = categoryButton.closest('[data-ai-explorer]')
        if (explorer) loadExplorer(explorer, categoryButton.getAttribute('data-ai-category'), false)
        return
      }

      var retryButton = event.target.closest('[data-ai-retry]')
      if (!retryButton) return

      var kind = retryButton.getAttribute('data-ai-retry')
      var repositoryElement = retryButton.closest('[data-ai-repositories]')
      var newsElement = retryButton.closest('[data-ai-news]')
      var explorerElement = retryButton.closest('[data-ai-explorer]')

      if (kind === 'repositories' && repositoryElement) loadRepositories(repositoryElement, true)
      if (kind === 'news' && newsElement) loadNews(newsElement, true)
      if (kind === 'explorer' && explorerElement) {
        loadExplorer(explorerElement, explorerElement.getAttribute('data-active-category'), true)
      }
    })
  }

  function mount(root) {
    if (!global.AiDataService) return
    bindEvents()
    root.querySelectorAll('[data-ai-repositories]').forEach(function (element) {
      loadRepositories(element, false)
    })
    root.querySelectorAll('[data-ai-news]').forEach(function (element) {
      loadNews(element, false)
    })
    root.querySelectorAll('[data-ai-explorer]').forEach(function (element) {
      loadExplorer(element, null, false)
    })
  }

  global.AiPortalPlugin = function (hook) {
    hook.doneEach(function () {
      global.requestAnimationFrame(function () {
        mount(document)
      })
    })
  }
})(window)