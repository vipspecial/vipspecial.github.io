(function (global) {
  'use strict'

  var isLocalPreview = /^(localhost|127\.0\.0\.1)$/.test(global.location.hostname)
  var API_BASE = isLocalPreview
    ? 'http://127.0.0.1:8000'
    : 'https://vipspecial-github-io-vercel.vercel.app'
  var CLIENT_KEY = 'ai-systems:client-id'

  function logEvent(level, eventName, details) {
    if (!global.console) return
    var method = global.console[level] || global.console.log
    method.call(global.console, '[AI Chat] ' + eventName, details || {})
  }

  function clientId() {
    var stored = global.localStorage.getItem(CLIENT_KEY)
    if (stored) return stored
    var id = global.crypto && global.crypto.randomUUID
      ? global.crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (character) {
          var random = Math.random() * 16 | 0
          var value = character === 'x' ? random : (random & 3 | 8)
          return value.toString(16)
        })
    global.localStorage.setItem(CLIENT_KEY, id)
    return id
  }

  function request(path, options) {
    var settings = options || {}
    var safePath = path.split('?')[0]
    return global.fetch(API_BASE + path, {
      method: settings.method || 'GET',
      headers: settings.body ? { 'Content-Type': 'application/json' } : {},
      body: settings.body ? JSON.stringify(settings.body) : undefined
    }).then(function (response) {
      return response.json().catch(function () { return {} }).then(function (payload) {
        if (!response.ok) {
          var error = new Error(payload.detail || payload.error || '请求失败')
          error.status = response.status
          throw error
        }
        return payload
      })
    }).catch(function (error) {
      logEvent('error', 'api_request_failed', {
        method: settings.method || 'GET',
        path: safePath,
        status: error.status || 0,
        message: error.message
      })
      throw error
    })
  }

  function conversations() {
    return request('/api/conversations?client_id=' + encodeURIComponent(clientId()))
  }

  function messages(conversationId) {
    return request('/api/conversations/' + encodeURIComponent(conversationId) + '/messages?client_id=' + encodeURIComponent(clientId()))
  }

  function removeConversation(conversationId) {
    return request('/api/conversations/' + encodeURIComponent(conversationId) + '?client_id=' + encodeURIComponent(clientId()), {
      method: 'DELETE'
    })
  }

  function streamMessage(conversationId, message, onEvent) {
    var requestId = null
    logEvent('info', 'stream_requested', {
      conversation_id: conversationId || null,
      message_chars: message.length
    })
    return global.fetch(API_BASE + '/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId(),
        conversation_id: conversationId || null,
        message: message
      })
    }).then(function (response) {
      requestId = response.headers.get('X-Request-ID') || requestId
      logEvent('info', 'stream_response_opened', {
        request_id: requestId,
        status: response.status
      })
      if (!response.ok) {
        return response.json().catch(function () { return {} }).then(function (payload) {
          throw new Error(payload.detail || 'AI 服务请求失败')
        })
      }
      if (!response.body) throw new Error('当前浏览器不支持流式响应')

      var reader = response.body.getReader()
      var decoder = new TextDecoder()
      var buffer = ''
      var terminalEventReceived = false

      function emitBlock(block) {
        var eventName = 'message'
        var dataLines = []
        block.split('\n').forEach(function (line) {
          if (line.indexOf('event:') === 0) eventName = line.slice(6).trim()
          if (line.indexOf('data:') === 0) dataLines.push(line.slice(5).trim())
        })
        if (!dataLines.length) return
        try {
          var payload = JSON.parse(dataLines.join('\n'))
          if (payload.request_id) requestId = payload.request_id
          if (eventName === 'done' || eventName === 'error') {
            terminalEventReceived = true
            logEvent(eventName === 'done' ? 'info' : 'warn', 'stream_' + eventName, {
              request_id: requestId,
              conversation_id: payload.conversation_id || conversationId || null,
              finish_reason: payload.finish_reason,
              completion_tokens: payload.completion_tokens,
              error_type: payload.error_type,
              upstream_status: payload.upstream_status,
              saved: payload.saved,
              message: eventName === 'error' ? payload.message : undefined
            })
          } else if (eventName === 'meta') {
            logEvent('info', 'stream_identified', {
              request_id: requestId,
              conversation_id: payload.conversation_id
            })
          }
          onEvent(eventName, payload)
        } catch (error) {
          logEvent('error', 'stream_parse_failed', {
            request_id: requestId,
            message: error.message
          })
          onEvent('error', { message: '流式响应解析失败' })
        }
      }

      function read() {
        return reader.read().then(function (result) {
          buffer += decoder.decode(result.value || new Uint8Array(), { stream: !result.done })
          var blocks = buffer.split(/\r?\n\r?\n/)
          buffer = blocks.pop() || ''
          blocks.forEach(emitBlock)
          if (!result.done) return read()
          if (buffer.trim()) emitBlock(buffer)
          if (!terminalEventReceived) throw new Error('输出连接意外中断，请重试或发送“继续”')
        })
      }

      return read()
    }).catch(function (error) {
      logEvent('error', 'stream_failed', {
        request_id: requestId,
        conversation_id: conversationId || null,
        message: error.message
      })
      throw error
    })
  }

  global.AiChatApi = Object.freeze({
    baseUrl: API_BASE,
    clientId: clientId,
    conversations: conversations,
    messages: messages,
    removeConversation: removeConversation,
    streamMessage: streamMessage
  })
})(window)
