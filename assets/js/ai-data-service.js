(function (global) {
  'use strict'

  var GITHUB_URL = 'https://api.github.com/search/repositories'
  var BACKEND_URL = 'https://vipspecial-github-io-vercel.vercel.app/api/health'
  var CACHE_PREFIX = 'ai-systems:'
  var CACHE_TTL = 15 * 60 * 1000

  var categories = Object.freeze({
    featured: { label: '精选', query: 'topic:artificial-intelligence stars:>3000' },
    rag: { label: 'RAG', query: 'rag in:name,description stars:>300' },
    agents: { label: 'Agent', query: 'ai-agent in:name,description stars:>300' },
    mcp: { label: 'MCP', query: 'mcp-server in:name,description stars:>100' }
  })

  function requestJson(url, timeoutMs) {
    var controller = new AbortController()
    var timer = global.setTimeout(function () { controller.abort() }, timeoutMs || 9000)

    return global.fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    }).then(function (response) {
      return response.json().catch(function () { return {} }).then(function (payload) {
        if (!response.ok || payload.ok === false) {
          var error = new Error(payload.error || 'Request failed with status ' + response.status)
          error.status = response.status
          error.code = payload.errorCode
          throw error
        }
        return payload
      })
    }).finally(function () {
      global.clearTimeout(timer)
    })
  }

  function readCache(key) {
    try {
      var value = JSON.parse(global.localStorage.getItem(CACHE_PREFIX + key))
      return value && Date.now() - value.savedAt < CACHE_TTL ? value.data : null
    } catch (error) {
      return null
    }
  }

  function writeCache(key, data) {
    try {
      global.localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data: data, savedAt: Date.now() }))
    } catch (error) {
      // Public data still renders when browser storage is unavailable.
    }
    return data
  }

  function normalizeRepository(item) {
    return {
      id: item.id,
      name: item.name,
      owner: item.owner && item.owner.login ? item.owner.login : 'unknown',
      description: item.description || '该项目暂未提供简介。',
      url: item.html_url,
      stars: item.stargazers_count || 0,
      language: item.language || 'Multi',
      updatedAt: item.updated_at
    }
  }

  function getRepositories(categoryName, options) {
    var settings = options || {}
    var category = categories[categoryName] || categories.featured
    var limit = Math.min(Math.max(Number(settings.limit) || 3, 1), 12)
    var cacheKey = 'repos:' + categoryName + ':' + limit
    var cached = !settings.force && readCache(cacheKey)
    if (cached) return Promise.resolve(cached)

    var params = new URLSearchParams({
      q: category.query,
      sort: 'stars',
      order: 'desc',
      per_page: String(limit)
    })

    return requestJson(GITHUB_URL + '?' + params.toString())
      .then(function (payload) {
        return writeCache(cacheKey, (payload.items || []).map(normalizeRepository))
      })
  }

  function checkBackend() {
    var startedAt = Date.now()
    return requestJson(BACKEND_URL, 10000).then(function (payload) {
      return { payload: payload, roundTripMs: Date.now() - startedAt }
    })
  }

  global.AiDataService = Object.freeze({
    backendUrl: BACKEND_URL,
    categories: categories,
    getRepositories: getRepositories,
    checkBackend: checkBackend
  })
})(window)
