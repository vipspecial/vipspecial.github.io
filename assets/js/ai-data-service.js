(function (global) {
  'use strict'

  var GITHUB_SEARCH_URL = 'https://api.github.com/search/repositories'
  var HN_SEARCH_URL = 'https://hn.algolia.com/api/v1/search_by_date'
  var CACHE_PREFIX = 'ai-lab:data:'
  var DEFAULT_TTL = 15 * 60 * 1000
  var memoryCache = new Map()

  var repositoryCategories = Object.freeze({
    featured: {
      label: 'AI 热门',
      query: 'topic:artificial-intelligence stars:>1000'
    },
    rag: {
      label: 'RAG',
      query: 'rag in:name,description stars:>100'
    },
    agents: {
      label: 'AI Agent',
      query: 'ai-agent in:name,description stars:>100'
    },
    mcp: {
      label: 'MCP',
      query: 'mcp server in:name,description stars:>50'
    },
    llmops: {
      label: 'LLMOps',
      query: 'llmops in:name,description stars:>20'
    }
  })

  function readStorage(key) {
    try {
      var rawValue = global.localStorage.getItem(CACHE_PREFIX + key)
      return rawValue ? JSON.parse(rawValue) : null
    } catch (error) {
      return null
    }
  }

  function writeStorage(key, value) {
    try {
      global.localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value))
    } catch (error) {
      // 内存缓存仍可工作，存储配额或隐私模式不应阻断页面。
    }
  }

  function getCachedValue(key) {
    return memoryCache.get(key) || readStorage(key)
  }

  function saveCachedValue(key, data) {
    var entry = {
      data: data,
      savedAt: Date.now()
    }
    memoryCache.set(key, entry)
    writeStorage(key, entry)
    return entry
  }

  function toResult(entry, source, stale) {
    return {
      data: entry.data,
      source: source,
      stale: Boolean(stale),
      updatedAt: entry.savedAt
    }
  }

  function withCache(key, ttl, loader, options) {
    var settings = options || {}
    var cached = getCachedValue(key)
    var isFresh = cached && Date.now() - cached.savedAt < ttl

    if (!settings.force && isFresh) {
      return Promise.resolve(toResult(cached, 'cache', false))
    }

    return loader()
      .then(function (data) {
        return toResult(saveCachedValue(key, data), 'network', false)
      })
      .catch(function (error) {
        if (cached) {
          return toResult(cached, 'cache', true)
        }
        throw error
      })
  }

  function fetchJson(url, requestOptions) {
    var controller = new AbortController()
    var timeout = global.setTimeout(function () {
      controller.abort()
    }, 10000)
    var options = requestOptions || {}

    return global.fetch(url, {
      headers: options.headers || {},
      signal: controller.signal
    }).then(function (response) {
      if (!response.ok) {
        var error = new Error('Public API request failed with status ' + response.status)
        error.status = response.status
        error.rateLimitReset = response.headers.get('x-ratelimit-reset')
        throw error
      }
      return response.json()
    }).finally(function () {
      global.clearTimeout(timeout)
    })
  }

  function normalizeRepository(item) {
    return {
      id: item.id,
      name: item.name,
      fullName: item.full_name,
      owner: item.owner && item.owner.login ? item.owner.login : 'unknown',
      description: item.description || '该项目暂未提供简介。',
      url: item.html_url,
      stars: item.stargazers_count || 0,
      forks: item.forks_count || 0,
      language: item.language || '多语言',
      topics: Array.isArray(item.topics) ? item.topics.slice(0, 3) : [],
      updatedAt: item.updated_at
    }
  }

  function getRepositories(categoryName, options) {
    var category = repositoryCategories[categoryName] || repositoryCategories.featured
    var settings = options || {}
    var limit = Math.min(Math.max(Number(settings.limit) || 6, 1), 12)
    var params = new URLSearchParams({
      q: category.query,
      sort: 'stars',
      order: 'desc',
      per_page: String(limit)
    })
    var cacheKey = 'github:' + categoryName + ':' + limit

    return withCache(cacheKey, DEFAULT_TTL, function () {
      return fetchJson(GITHUB_SEARCH_URL + '?' + params.toString(), {
        headers: {
          Accept: 'application/vnd.github+json'
        }
      }).then(function (payload) {
        return (payload.items || []).map(normalizeRepository)
      })
    }, settings)
  }

  function normalizeNewsItem(item) {
    return {
      id: item.objectID,
      title: item.title || item.story_title || 'Untitled discussion',
      url: item.url || ('https://news.ycombinator.com/item?id=' + item.objectID),
      discussionUrl: 'https://news.ycombinator.com/item?id=' + item.objectID,
      author: item.author || 'anonymous',
      points: item.points || 0,
      comments: item.num_comments || 0,
      createdAt: item.created_at
    }
  }

  function getAiNews(options) {
    var settings = options || {}
    var limit = Math.min(Math.max(Number(settings.limit) || 6, 1), 12)
    var ninetyDaysAgo = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000)
    var params = new URLSearchParams({
      query: 'AI',
      tags: 'story',
      numericFilters: 'created_at_i>' + ninetyDaysAgo,
      hitsPerPage: String(limit)
    })

    return withCache('hn:ai:' + limit, 10 * 60 * 1000, function () {
      return fetchJson(HN_SEARCH_URL + '?' + params.toString())
        .then(function (payload) {
          return (payload.hits || []).map(normalizeNewsItem)
        })
    }, settings)
  }

  global.AiDataService = Object.freeze({
    categories: repositoryCategories,
    getRepositories: getRepositories,
    getAiNews: getAiNews
  })
})(window)