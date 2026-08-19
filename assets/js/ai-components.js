(function (global) {
  'use strict'

  var mountedElement = null
  var activeConversationId = null
  var sending = false
  var autoFollow = true

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
      '<div class="chat-history__head"><div><span>MEMORY</span><strong>历史对话</strong></div><button type="button" data-new-chat aria-label="新建对话">＋</button></div>',
      '<div class="chat-history__list" data-conversation-list><div class="history-loading">正在读取历史...</div></div>',
      '<div class="chat-history__foot"><i></i><span>MySQL 持久化</span></div>',
      '</aside>',
      '<div class="chat-main" role="main">',
      '<header class="chat-topbar">',
      '<button class="history-toggle" type="button" data-history-toggle aria-label="显示历史" aria-controls="chat-history-panel" aria-expanded="false">☰</button>',
      '<div><span>AI 对话</span><small>Qwen 3.6 · Groq</small></div>',
      '<b><i></i> STREAM READY</b>',
      '</header>',
      '<div class="chat-messages" data-chat-messages>', emptyMarkup(), '</div>',
      '<button class="scroll-latest" type="button" data-scroll-bottom>回到最新 <span>↓</span></button>',
      '<form class="chat-composer" data-chat-form>',
      '<div class="chat-composer__box">',
      '<textarea name="message" rows="1" maxlength="6000" placeholder="输入问题，按 Enter 发送..." aria-label="消息"></textarea>',
      '<button type="submit" aria-label="发送消息"><span>↑</span></button>',
      '</div>',
      '<p>AI 可能会犯错，请核对重要信息 · 对话保存在你的匿名会话中</p>',
      '</form>',
      '</div>',
      '</section>'
    ].join('')
  }

  function renderInline(value) {
    return escapeHtml(value)
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
  }

  function renderRichText(value) {
    var source = String(value == null ? '' : value)
    var output = []
    var pattern = /```([\w-]*)\n?([\s\S]*?)```/g
    var lastIndex = 0
    var match
    while ((match = pattern.exec(source))) {
      output.push(renderInline(source.slice(lastIndex, match.index)))
      output.push(
        '<pre><span class="code-label">' + escapeHtml(match[1] || 'code') +
        '</span><code>' + escapeHtml(match[2].replace(/\n$/, '')) + '</code></pre>'
      )
      lastIndex = pattern.lastIndex
    }
    output.push(renderInline(source.slice(lastIndex)))
    return output.join('')
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
      '<span class="chat-empty__eyebrow">A FRESH CONVERSATION</span>',
      '<h1>今天想一起解决什么？</h1>',
      '<p>可以聊技术、梳理思路，或把一个模糊想法变成可执行方案。</p>',
      '<div class="chat-prompts">',
      '<button type="button" data-prompt="帮我设计一个 RAG 系统的最小可行架构">设计 RAG 架构 <i>↗</i></button>',
      '<button type="button" data-prompt="解释 AI Agent 的核心组成，并给出工程建议">理解 Agent <i>↗</i></button>',
      '<button type="button" data-prompt="帮我把一个复杂问题拆成清晰的执行步骤">拆解复杂问题 <i>↗</i></button>',
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
          '<details class="chat-reasoning', thought ? ' has-content' : '', '"', pending && thought ? ' open' : '', thought ? '' : ' hidden', '>',
          '<summary><span class="reasoning-icon">✦</span><span class="reasoning-title">思考过程</span><small>', pending ? '分析中' : '已完成', '</small><i></i></summary>',
          '<div class="chat-reasoning__content" data-reasoning-content data-raw="', escapeHtml(thought), '">', renderRichText(thought), '</div>',
          '</details>'
        ].join('')
      : ''
    return [
      '<article class="chat-message chat-message--', role, pending ? ' is-pending' : '', '" data-role="', role, '">',
      '<div class="chat-message__avatar">', label, '</div>',
      '<div class="chat-message__body"><span>', role === 'user' ? '你' : 'AI 助手', '</span>',
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

  function sendMessage(textarea) {
    var message = textarea.value.trim()
    if (!message || sending) return

    sending = true
    var form = mountedElement.querySelector('[data-chat-form]')
    form.classList.add('is-sending')
    textarea.value = ''
    resizeTextarea(textarea)

    var stack = ensureStack()
    stack.insertAdjacentHTML('beforeend', messageMarkup('user', message, false))
    stack.insertAdjacentHTML('beforeend', messageMarkup('assistant', '', true))
    var assistant = stack.lastElementChild
    var content = assistant.querySelector('[data-answer-content]')
    var reasoning = assistant.querySelector('.chat-reasoning')
    var reasoningContent = assistant.querySelector('[data-reasoning-content]')
    autoFollow = true
    scrollToBottom(true)

    global.AiChatApi.streamMessage(activeConversationId, message, function (eventName, payload) {
      if (eventName === 'meta') {
        activeConversationId = payload.conversation_id
        loadConversations()
      }
      if (eventName === 'delta') {
        assistant.classList.remove('is-pending')
        if (reasoning && reasoning.classList.contains('has-content') && !content.dataset.raw) {
          reasoning.open = false
        }
        content.dataset.raw += payload.content || ''
        content.innerHTML = renderRichText(content.dataset.raw)
        scrollToBottom()
      }
      if (eventName === 'reasoning') {
        reasoning.hidden = false
        reasoning.open = true
        reasoning.classList.add('has-content', 'is-streaming')
        reasoning.querySelector('small').textContent = '分析中'
        reasoningContent.dataset.raw += payload.content || ''
        reasoningContent.innerHTML = renderRichText(reasoningContent.dataset.raw)
        scrollToBottom()
      }
      if (eventName === 'done') {
        assistant.classList.remove('is-pending')
        if (reasoning && reasoning.classList.contains('has-content')) {
          reasoning.classList.remove('is-streaming')
          reasoning.open = false
          reasoning.querySelector('small').textContent = '已完成'
        }
      }
      if (eventName === 'error') {
        assistant.classList.remove('is-pending')
        assistant.classList.add('is-error')
        if (reasoning && reasoning.classList.contains('has-content')) {
          reasoning.classList.remove('is-streaming')
          reasoning.querySelector('small').textContent = '已中止'
        }
        content.dataset.raw = payload.message || 'AI 服务暂时不可用'
        content.textContent = content.dataset.raw
      }
    }).catch(function (error) {
      assistant.classList.remove('is-pending')
      assistant.classList.add('is-error')
      if (reasoning && reasoning.classList.contains('has-content')) {
        reasoning.classList.remove('is-streaming')
        reasoning.querySelector('small').textContent = '已中止'
      }
      content.dataset.raw = error.message || '发送失败，请稍后重试'
      content.textContent = content.dataset.raw
    }).finally(function () {
      sending = false
      form.classList.remove('is-sending')
      loadConversations()
      textarea.focus()
    })
  }

  function bindEvents(element) {
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
