(function (global) {
  'use strict'

  var mountedElement = null
  var activeConversationId = null
  var sending = false
  var autoFollow = true
  var MODEL_KEY = 'ai-systems:selected-model:v2'
  var DEFAULT_MODEL = 'glm-4-flash'
  var selectedModel = global.localStorage.getItem(MODEL_KEY) || DEFAULT_MODEL

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function relativeTime(value) {
    var elapsed = Date.now() - new Date(value).getTime()
    if (!Number.isFinite(elapsed)) return ''
    if (elapsed < 60000) return '刚刚'
    if (elapsed < 3600000) return Math.floor(elapsed / 60000) + ' 分钟前'
    if (elapsed < 86400000) return Math.floor(elapsed / 3600000) + ' 小时前'
    return new Date(value).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  function shellMarkup() {
    return [
      '<section class="chat-shell">',
      '<button class="history-backdrop" type="button" data-history-close aria-label="关闭历史对话"></button>',
      '<aside class="chat-history" id="chat-history-panel" data-chat-history>',
      '<div class="chat-history__head"><div><span>HISTORY</span><strong>历史会话</strong></div><button type="button" data-new-chat aria-label="新建对话">＋</button></div>',
      '<div class="chat-history__list" data-conversation-list><div class="history-loading">正在读取历史...</div></div>',
      '<div class="chat-history__foot"><i></i><span>会话已同步</span></div>',
      '</aside>',
      '<div class="chat-main" role="main">',
      '<header class="chat-topbar">',
      '<button class="history-toggle" type="button" data-history-toggle aria-label="显示历史" aria-controls="chat-history-panel" aria-expanded="false">☰</button>',
      '<div><span>AI 对话</span><small>选择模型，开始对话</small></div>',
      '<b><i></i> 在线</b>',
      '</header>',
      '<div class="chat-messages" data-chat-messages>', emptyMarkup(), '</div>',
      '<button class="scroll-latest" type="button" data-scroll-bottom>回到最新 <span>↓</span></button>',
      '<form class="chat-composer" data-chat-form>',
      '<div class="chat-composer__box">',
      '<textarea name="message" rows="1" maxlength="6000" placeholder="写下你的问题，按 Enter 发送..." aria-label="消息"></textarea>',
      '<div class="chat-composer__actions">',
      '<label class="model-picker"><span>模型</span><select data-model-select aria-label="选择 AI 模型">',
      '<option value="glm-4-flash">GLM-4 Flash</option>',
      '<option value="qwen/qwen3.6-27b">Qwen 3.6</option>',
      '</select></label>',
      '<button type="submit" aria-label="发送消息"><span>↑</span></button>',
      '</div>',
      '</div>',
      '<p>AI 可能会犯错，请核对重要信息 · 会话记录保存在匿名会话中</p>',
      '</form>',
      '</div>',
      '</section>'
    ].join('')
  }

  function renderRichText(value) {
    var source = String(value == null ? '' : value)
    if (global.marked && global.DOMPurify) {
      var html = global.marked.parse(source, {
        breaks: true,
        gfm: true
      })
      return global.DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true }
      })
    }
    return escapeHtml(source).replace(/\n/g, '<br>')
  }

  function decorateRichText(root) {
    if (!root) return
    root.querySelectorAll('a[href]').forEach(function (link) {
      if (/^https?:/i.test(link.href)) {
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
      }
    })
    root.querySelectorAll('table').forEach(function (table) {
      if (table.parentElement.classList.contains('markdown-table-scroll')) return
      var wrapper = document.createElement('div')
      wrapper.className = 'markdown-table-scroll'
      table.parentNode.insertBefore(wrapper, table)
      wrapper.appendChild(table)
    })
    root.querySelectorAll('pre > code').forEach(function (code) {
      var pre = code.parentElement
      if (!pre.querySelector('.code-label')) {
        var language = Array.from(code.classList).find(function (name) {
          return name.indexOf('language-') === 0
        })
        var label = document.createElement('span')
        label.className = 'code-label'
        label.textContent = language ? language.slice(9) : 'code'
        pre.insertBefore(label, code)
      }
      if (global.Prism && code.className && !code.classList.contains('language-none')) {
        try { global.Prism.highlightElement(code) } catch (error) { /* Keep plain code. */ }
      }
    })
  }

  function setRichText(element, value) {
    element.dataset.raw = String(value == null ? '' : value)
    element.innerHTML = renderRichText(element.dataset.raw)
    decorateRichText(element)
  }

  function normalizeAssistantContent(content, reasoning) {
    var answer = String(content || '')
    var thought = String(reasoning || '')
    if (!thought && answer.indexOf('<think>') >= 0) {
      var start = answer.indexOf('<think>')
      var end = answer.indexOf('</think>', start + 7)
      thought = end >= 0
        ? answer.slice(start + 7, end)
        : answer.slice(start + 7)
      answer = end >= 0
        ? answer.slice(0, start) + answer.slice(end + 8)
        : answer.slice(0, start)
    }
    return { answer: answer.trim(), reasoning: thought.trim() }
  }

  function emptyMarkup() {
    return [
      '<div class="chat-empty">',
      '<div class="chat-empty__mark"><span>AI</span><i></i></div>',
      '<span class="chat-empty__eyebrow">AI WORKSPACE</span>',
      '<h1>有什么可以帮你？</h1>',
      '<p>选择一个模型，直接描述你的问题。</p>',
      '<div class="chat-prompts">',
      '<button type="button" data-prompt="帮我总结并提炼这段内容的重点">总结内容 <i>↗</i></button>',
      '<button type="button" data-prompt="帮我分析这个问题并给出清晰的解决方案">分析问题 <i>↗</i></button>',
      '<button type="button" data-prompt="帮我把这个想法整理成可执行的步骤">整理思路 <i>↗</i></button>',
      '</div>',
      '</div>'
    ].join('')
  }

  function messageMarkup(role, content, pending, reasoning) {
    var label = role === 'user' ? 'YOU' : 'AI'
    var normalized = role === 'assistant'
      ? normalizeAssistantContent(content, reasoning)
      : { answer: String(content || ''), reasoning: '' }
    var thought = normalized.reasoning
    var reasoningMarkup = role === 'assistant'
      ? [
          '<details class="chat-reasoning', thought ? ' has-content' : '', '"', pending ? ' open' : '', '>',
          '<summary><span class="reasoning-icon">✦</span><span class="reasoning-title">思考过程</span><small data-reasoning-status>', pending ? '分析中' : '已完成', '</small><i></i></summary>',
          '<div class="chat-reasoning__content" data-reasoning-content data-raw="', escapeHtml(thought), '">',
          thought ? renderRichText(thought) : '<span class="reasoning-placeholder">', pending ? '正在分析问题...' : '模型未返回可展示的独立思考内容', '</span>',
          '</div>',
          '</details>'
        ].join('')
      : ''
    return [
      '<article class="chat-message chat-message--', role, pending ? ' is-pending' : '', '" data-role="', role, '">',
      '<div class="chat-message__avatar">', label, '</div>',
      '<div class="chat-message__body"><span>', role === 'user' ? '你' : 'AI', '</span>',
      reasoningMarkup,
      '<div class="chat-message__content" data-answer-content data-raw="', escapeHtml(normalized.answer), '">', renderRichText(normalized.answer), '</div></div>',
      '</article>'
    ].join('')
  }

  function listMarkup(items) {
    if (!items.length) {
      return '<div class="history-empty"><span>还没有历史对话</span><small>发送第一条消息后会显示在这里</small></div>'
    }
    return items.map(function (item) {
      return [
        '<div class="history-item', item.id === activeConversationId ? ' is-active' : '', '" data-conversation-id="', escapeHtml(item.id), '">',
        '<button class="history-item__open" type="button"><strong>', escapeHtml(item.title), '</strong><small>', relativeTime(item.updated_at), ' · ', item.message_count, ' 条消息</small></button>',
        '<button class="history-item__delete" type="button" data-delete-conversation aria-label="删除对话">×</button>',
        '</div>'
      ].join('')
    }).join('')
  }

  function loadConversations() {
    if (!mountedElement) return Promise.resolve()
    var list = mountedElement.querySelector('[data-conversation-list]')
    return global.AiChatApi.conversations().then(function (payload) {
      if (list.isConnected) list.innerHTML = listMarkup(payload.conversations || [])
    }).catch(function () {
      if (list.isConnected) list.innerHTML = '<div class="history-error">历史记录暂时不可用</div>'
    })
  }

  function loadModels() {
    if (!mountedElement) return Promise.resolve()
    var select = mountedElement.querySelector('[data-model-select]')
    return global.AiChatApi.models().then(function (payload) {
      var models = payload.models || []
      if (!models.length || !select.isConnected) return
      select.innerHTML = models.map(function (model) {
        return '<option value="' + escapeHtml(model.id) + '">' +
          escapeHtml(model.name + ' · ' + model.provider) + '</option>'
      }).join('')
      var available = models.some(function (model) { return model.id === selectedModel })
      selectedModel = available ? selectedModel : (payload.default_model || models[0].id)
      select.value = selectedModel
      global.localStorage.setItem(MODEL_KEY, selectedModel)
    }).catch(function () {
      if (select.isConnected) select.value = selectedModel
    })
  }

  function closeHistory() {
    if (!mountedElement) return
    mountedElement.classList.remove('is-history-open')
    var toggle = mountedElement.querySelector('[data-history-toggle]')
    if (toggle) toggle.setAttribute('aria-expanded', 'false')
  }

  function renderMessages(items) {
    var container = mountedElement.querySelector('[data-chat-messages]')
    if (!items.length) {
      container.innerHTML = emptyMarkup()
      return
    }
    container.innerHTML = '<div class="message-stack">' + items.map(function (item) {
      return messageMarkup(item.role, item.content, false, item.reasoning)
    }).join('') + '</div>'
    decorateRichText(container)
    autoFollow = true
    scrollToBottom(true)
  }

  function openConversation(conversationId) {
    if (sending) return
    activeConversationId = conversationId
    closeHistory()
    return global.AiChatApi.messages(conversationId).then(function (payload) {
      renderMessages(payload.messages || [])
      return loadConversations()
    }).catch(function () {
      showNotice('无法读取该对话，请稍后重试。')
    })
  }

  function newChat() {
    if (sending) return
    activeConversationId = null
    closeHistory()
    renderMessages([])
    loadConversations()
    var input = mountedElement.querySelector('textarea[name="message"]')
    if (input) input.focus()
  }

  function showNotice(message) {
    var container = mountedElement.querySelector('[data-chat-messages]')
    var notice = document.createElement('div')
    notice.className = 'chat-notice'
    notice.textContent = message
    container.appendChild(notice)
    scrollToBottom(true)
  }

  function updateScrollButton() {
    if (!mountedElement) return
    var button = mountedElement.querySelector('[data-scroll-bottom]')
    if (button) button.classList.toggle('is-visible', !autoFollow)
  }

  function scrollToBottom(force) {
    var container = mountedElement && mountedElement.querySelector('[data-chat-messages]')
    if (!container || (!force && !autoFollow)) return
    global.requestAnimationFrame(function () {
      container.scrollTop = container.scrollHeight
      if (force) autoFollow = true
      updateScrollButton()
    })
  }

  function ensureStack() {
    var container = mountedElement.querySelector('[data-chat-messages]')
    var stack = container.querySelector('.message-stack')
    if (!stack) {
      container.innerHTML = '<div class="message-stack"></div>'
      stack = container.querySelector('.message-stack')
    }
    return stack
  }

  function resizeTextarea(textarea) {
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px'
  }

  function createStreamRenderer(assistant) {
    var content = assistant.querySelector('[data-answer-content]')
    var reasoning = assistant.querySelector('.chat-reasoning')
    var reasoningContent = assistant.querySelector('[data-reasoning-content]')
    var reasoningStatus = assistant.querySelector('[data-reasoning-status]')
    var queue = []
    var timer = null
    var completed = false
    var failed = false
    var answerStarted = false
    var hasReasoning = false
    var startedAt = global.performance.now()
    var resolveDone
    var done = new Promise(function (resolve) { resolveDone = resolve })

    function elapsedLabel() {
      var seconds = Math.max(0.1, (global.performance.now() - startedAt) / 1000)
      return '已思考 ' + seconds.toFixed(seconds < 10 ? 1 : 0) + 's'
    }

    function finalize() {
      if (!completed || queue.length || timer) return
      assistant.classList.remove('is-pending')
      reasoning.classList.remove('is-streaming')
      reasoning.open = false
      reasoningStatus.textContent = failed ? '已中止' : elapsedLabel()
      if (!hasReasoning && !reasoningContent.dataset.raw) {
        reasoningContent.innerHTML = '<span class="reasoning-placeholder">模型未返回可展示的独立思考内容</span>'
      }
      resolveDone()
    }

    function renderPiece(kind, text) {
      if (kind === 'reasoning') {
        if (!hasReasoning) {
          hasReasoning = true
          reasoningContent.dataset.raw = ''
        }
        reasoning.open = true
        reasoning.classList.add('has-content', 'is-streaming')
        reasoningStatus.textContent = '分析中'
        setRichText(reasoningContent, reasoningContent.dataset.raw + text)
      } else {
        if (!answerStarted) {
          answerStarted = true
          assistant.classList.remove('is-pending')
          reasoning.open = false
          reasoning.classList.remove('is-streaming')
          reasoningStatus.textContent = elapsedLabel()
        }
        setRichText(content, content.dataset.raw + text)
      }
      scrollToBottom()
    }

    function pump() {
      timer = null
      if (!queue.length) {
        finalize()
        return
      }
      var queuedCharacters = queue.reduce(function (total, item) {
        return total + item.text.length
      }, 0)
      var item = queue[0]
      var characterCount = Math.max(1, Math.min(12, Math.ceil(queuedCharacters / 180)))
      var characters = Array.from(item.text)
      var piece = characters.slice(0, characterCount).join('')
      item.text = characters.slice(characterCount).join('')
      if (!item.text) queue.shift()
      renderPiece(item.kind, piece)
      timer = global.setTimeout(pump, 18)
    }

    function enqueue(kind, text) {
      if (completed || !text) return
      var last = queue[queue.length - 1]
      if (last && last.kind === kind) last.text += String(text)
      else queue.push({ kind: kind, text: String(text) })
      if (!timer) timer = global.setTimeout(pump, 0)
    }

    function complete() {
      completed = true
      finalize()
    }

    function fail(message) {
      while (queue.length) {
        var queued = queue.shift()
        renderPiece(queued.kind, queued.text)
      }
      failed = true
      completed = true
      if (timer) global.clearTimeout(timer)
      timer = null
      assistant.classList.add('is-error')
      var existing = content.dataset.raw || ''
      var errorMessage = message || 'AI 服务暂时不可用'
      setRichText(content, existing ? existing + '\n\n> ' + errorMessage : errorMessage)
      finalize()
    }

    return { enqueue: enqueue, complete: complete, fail: fail, done: done }
  }

  function sendMessage(textarea) {
    var message = textarea.value.trim()
    if (!message || sending) return

    sending = true
    var form = mountedElement.querySelector('[data-chat-form]')
    var modelSelect = mountedElement.querySelector('[data-model-select]')
    selectedModel = modelSelect.value || selectedModel
    form.classList.add('is-sending')
    modelSelect.disabled = true
    textarea.value = ''
    resizeTextarea(textarea)

    var stack = ensureStack()
    stack.insertAdjacentHTML('beforeend', messageMarkup('user', message, false))
    stack.insertAdjacentHTML('beforeend', messageMarkup('assistant', '', true))
    var assistant = stack.lastElementChild
    decorateRichText(stack)
    var streamRenderer = createStreamRenderer(assistant)
    autoFollow = true
    scrollToBottom(true)

    var streamRequest = global.AiChatApi.streamMessage(activeConversationId, message, selectedModel, function (eventName, payload) {
      if (eventName === 'meta') {
        activeConversationId = payload.conversation_id
        loadConversations()
      }
      if (eventName === 'delta') {
        streamRenderer.enqueue('answer', payload.content || '')
      }
      if (eventName === 'reasoning') {
        streamRenderer.enqueue('reasoning', payload.content || '')
      }
      if (eventName === 'done') {
        streamRenderer.complete()
      }
      if (eventName === 'error') {
        streamRenderer.fail(payload.message || 'AI 服务暂时不可用')
      }
    })

    streamRequest.then(function () {
      streamRenderer.complete()
    }).catch(function (error) {
      streamRenderer.fail(error.message || '发送失败，请稍后重试')
    })

    streamRenderer.done.finally(function () {
      sending = false
      form.classList.remove('is-sending')
      modelSelect.disabled = false
      loadConversations()
      textarea.focus()
    })
  }

  function bindEvents(element) {
    element.addEventListener('change', function (event) {
      if (!event.target.matches('[data-model-select]')) return
      selectedModel = event.target.value
      global.localStorage.setItem(MODEL_KEY, selectedModel)
    })

    element.addEventListener('submit', function (event) {
      var form = event.target.closest('[data-chat-form]')
      if (!form) return
      event.preventDefault()
      sendMessage(form.querySelector('textarea[name="message"]'))
    })

    element.addEventListener('input', function (event) {
      if (event.target.matches('textarea[name="message"]')) resizeTextarea(event.target)
    })

    element.querySelector('[data-chat-messages]').addEventListener('scroll', function (event) {
      var container = event.currentTarget
      autoFollow = container.scrollHeight - container.scrollTop - container.clientHeight < 96
      updateScrollButton()
    }, { passive: true })

    element.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeHistory()
        return
      }
      if (!event.target.matches('textarea[name="message"]')) return
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        sendMessage(event.target)
      }
    })

    element.addEventListener('click', function (event) {
      var prompt = event.target.closest('[data-prompt]')
      if (prompt) {
        var textarea = element.querySelector('textarea[name="message"]')
        textarea.value = prompt.getAttribute('data-prompt')
        resizeTextarea(textarea)
        textarea.focus()
        return
      }

      if (event.target.closest('[data-new-chat]')) {
        newChat()
        return
      }

      if (event.target.closest('[data-history-toggle]')) {
        element.classList.toggle('is-history-open')
        event.target.closest('[data-history-toggle]').setAttribute(
          'aria-expanded',
          String(element.classList.contains('is-history-open'))
        )
        return
      }

      if (event.target.closest('[data-history-close]')) {
        closeHistory()
        return
      }

      if (event.target.closest('[data-scroll-bottom]')) {
        scrollToBottom(true)
        return
      }

      var item = event.target.closest('[data-conversation-id]')
      if (!item) return
      var id = item.getAttribute('data-conversation-id')
      if (event.target.closest('[data-delete-conversation]')) {
        global.AiChatApi.removeConversation(id).then(function () {
          if (activeConversationId === id) newChat()
          return loadConversations()
        }).catch(function () { showNotice('删除失败，请稍后重试。') })
        return
      }
      openConversation(id)
    })
  }

  function mount(element) {
    mountedElement = element
    activeConversationId = null
    element.innerHTML = shellMarkup()
    bindEvents(element)
    element.querySelector('[data-model-select]').value = selectedModel
    loadModels()
    loadConversations()
  }

  global.AiPortalPlugin = function (hook) {
    hook.doneEach(function () {
      var element = document.querySelector('[data-chat-app]')
      document.body.classList.toggle('is-chat-route', Boolean(element))
      if (element) mount(element)
    })
  }
})(window)
