(function (global) {
  'use strict'

  var mountedElement = null
  var activeConversationId = null
  var sending = false
  var autoFollow = true
  var conversationLoadSequence = 0
  var messageCache = Object.create(null)
  var messageCacheOrder = []
  var messageLoads = Object.create(null)
  var MODEL_KEY = 'ai-systems:selected-model:v2'
  var DEFAULT_MODEL = 'glm-4-flash'
  var selectedModel = global.localStorage.getItem(MODEL_KEY) || DEFAULT_MODEL
  var speechVoice = null
  var speechTarget = null

  function pickChineseVoice() {
    if (!global.speechSynthesis) return null
    var voices = global.speechSynthesis.getVoices()
    // 优先微软中文神经语音（Edge 内置，免费）
    var preferred = voices.filter(function (voice) {
      return /^zh([-_]CN)?$/i.test(voice.lang) && /microsoft|微软/i.test(voice.name)
    })
    var fallback = voices.filter(function (voice) { return /^zh/i.test(voice.lang) })
    return preferred[0] || fallback[0] || null
  }

  function initSpeechVoices() {
    if (!global.speechSynthesis) return
    speechVoice = pickChineseVoice()
    global.speechSynthesis.onvoiceschanged = function () {
      speechVoice = pickChineseVoice()
    }
  }

  function stopSpeaking() {
    if (global.speechSynthesis) global.speechSynthesis.cancel()
    if (speechTarget) {
      speechTarget.classList.remove('is-speaking')
      var label = speechTarget.querySelector('span')
      if (label) label.textContent = '朗读'
      speechTarget = null
    }
  }

  function speakAnswer(button) {
    if (!global.speechSynthesis) {
      showNotice('当前浏览器不支持语音朗读。')
      return
    }
    var isSame = speechTarget === button
    stopSpeaking()
    if (isSame) return

    var content = button.closest('.chat-message__body').querySelector('[data-answer-content]')
    var text = (content.dataset.raw || content.textContent || '').replace(/[#*`>~-]/g, '').trim()
    if (!text) return

    var utterance = new global.SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    if (speechVoice || pickChineseVoice()) {
      utterance.voice = speechVoice || pickChineseVoice()
    }
    utterance.rate = 1
    speechTarget = button
    button.classList.add('is-speaking')
    var speakLabel = button.querySelector('span')
    if (speakLabel) speakLabel.textContent = '停止'
    utterance.onend = function () {
      button.classList.remove('is-speaking')
      if (speakLabel) speakLabel.textContent = '朗读'
      if (speechTarget === button) speechTarget = null
    }
    utterance.onerror = function () {
      button.classList.remove('is-speaking')
      if (speakLabel) speakLabel.textContent = '朗读'
      if (speechTarget === button) speechTarget = null
    }
    global.speechSynthesis.speak(utterance)
  }

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
      '<div class="chat-history__head"><div><span>CONVERSATIONS</span><strong>会话列表</strong></div><button type="button" data-new-chat aria-label="新建对话">＋</button></div>',
      '<div class="chat-history__list" data-conversation-list><div class="history-loading">正在读取历史...</div></div>',
      '</aside>',
      '<div class="chat-main" role="main">',
      '<header class="chat-topbar">',
      '<button class="history-toggle" type="button" data-history-toggle aria-label="显示历史" aria-controls="chat-history-panel" aria-expanded="false">↺</button>',
      '<div class="chat-topbar__title"><span>AI 对话</span><small>多模型 · 流式回答</small></div>',
      '</header>',
      '<div class="chat-messages" data-chat-messages>', emptyMarkup(), '</div>',
      '<button class="scroll-latest" type="button" data-scroll-bottom>回到最新 <span>↓</span></button>',
      '<form class="chat-composer" data-chat-form>',
      '<div class="chat-composer__box">',
      '<textarea name="message" rows="1" maxlength="6000" placeholder="输入问题，Enter 发送，Shift + Enter 换行" aria-label="消息"></textarea>',
      '<div class="chat-composer__actions">',
      '<div class="model-picker" data-model-picker>',
      '<select data-model-select aria-hidden="true" tabindex="-1" hidden>',
      '<option value="glm-4-flash">GLM-4 Flash</option>',
      '<option value="qwen/qwen3.6-27b">Qwen3.6-27B</option>',
      '</select>',
      '<button class="model-picker__trigger" type="button" data-model-trigger aria-label="选择 AI 模型" aria-haspopup="listbox" aria-expanded="false" aria-controls="model-picker-menu">',
      '<span class="model-picker__dot"></span><strong data-model-label>GLM-4 Flash</strong><i></i>',
      '</button>',
      '<div class="model-picker__menu" id="model-picker-menu" data-model-menu role="listbox" hidden>',
      '<span class="model-picker__menu-title">选择回答模型</span>',
      '<button type="button" data-model-option data-model-value="glm-4-flash" data-model-name="GLM-4 Flash" role="option" aria-selected="true"><span><strong>GLM-4 Flash</strong><small>智谱 AI</small></span><i>✓</i></button>',
      '<button type="button" data-model-option data-model-value="qwen/qwen3.6-27b" data-model-name="Qwen3.6-27B" role="option" aria-selected="false"><span><strong>Qwen3.6-27B</strong><small>Groq</small></span><i>✓</i></button>',
      '</div>',
      '</div>',
      '<button type="submit" aria-label="发送消息"><span>↑</span></button>',
      '</div>',
      '</div>',
      '<p>回答仅供参考，请核对重要信息</p>',
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
      '<h1>有什么可以<br><em>帮你</em><span class="chat-empty__cursor" aria-hidden="true"></span></h1>',
      '<p>描述目标，或直接粘贴需要处理的内容。</p>',
      '<div class="chat-prompts">',
      '<button type="button" data-prompt="帮我总结并提炼这段内容的重点"><span>总结内容<small>提炼关键信息</small></span><i>↗</i></button>',
      '<button type="button" data-prompt="帮我分析这个问题并给出清晰的解决方案"><span>分析问题<small>拆解并给出方案</small></span><i>↗</i></button>',
      '<button type="button" data-prompt="帮我把这个想法整理成可执行的步骤"><span>整理思路<small>转换为行动步骤</small></span><i>↗</i></button>',
      '</div>',
      '</div>'
    ].join('')
  }

  function reasoningMarkup(thought, status, open) {
    return [
      '<details class="chat-reasoning', thought ? ' has-content' : '', '"', open ? ' open' : '', '>',
      '<summary><span class="reasoning-icon">✦</span><span class="reasoning-title">思考过程</span><small data-reasoning-status>', escapeHtml(status), '</small><i></i></summary>',
      '<div class="chat-reasoning__content" data-reasoning-content data-raw="', escapeHtml(thought), '">',
      thought ? renderRichText(thought) : '',
      '</div>',
      '</details>'
    ].join('')
  }

  function messageMarkup(role, content, pending, reasoning) {
    var label = role === 'user' ? 'YOU' : 'AI'
    var normalized = role === 'assistant'
      ? normalizeAssistantContent(content, reasoning)
      : { answer: String(content || ''), reasoning: '' }
    var thought = normalized.reasoning
    var thoughtMarkup = role === 'assistant' && thought
      ? reasoningMarkup(thought, '已完成', false)
      : ''
    var processingMarkup = role === 'assistant' && pending
      ? '<div class="chat-processing" data-processing role="status"><i></i><span>正在处理</span></div>'
      : ''
    var speakMarkup = role === 'assistant' && !pending
      ? '<button type="button" class="message-speak" data-speak aria-label="朗读这条回答" title="朗读 / 停止"><i></i><span>朗读</span></button>'
      : ''
    return [
      '<article class="chat-message chat-message--', role, pending ? ' is-pending' : '', '" data-role="', role, '">',
      '<div class="chat-message__avatar">', label, '</div>',
      '<div class="chat-message__body"><div class="chat-message__meta"><span>', role === 'user' ? '你' : 'AI', '</span>', speakMarkup, '</div>',
      processingMarkup,
      thoughtMarkup,
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

  function cacheMessages(conversationId, items) {
    messageCache[conversationId] = items
    messageCacheOrder = messageCacheOrder.filter(function (id) { return id !== conversationId })
    messageCacheOrder.push(conversationId)
    while (messageCacheOrder.length > 8) {
      delete messageCache[messageCacheOrder.shift()]
    }
  }

  function forgetCachedMessages(conversationId) {
    delete messageCache[conversationId]
    delete messageLoads[conversationId]
    messageCacheOrder = messageCacheOrder.filter(function (id) { return id !== conversationId })
  }

  function loadConversationMessages(conversationId) {
    if (messageCache[conversationId]) return Promise.resolve(messageCache[conversationId])
    if (messageLoads[conversationId]) return messageLoads[conversationId]
    messageLoads[conversationId] = global.AiChatApi.messages(conversationId).then(function (payload) {
      var messages = payload.messages || []
      cacheMessages(conversationId, messages)
      delete messageLoads[conversationId]
      return messages
    }).catch(function (error) {
      delete messageLoads[conversationId]
      throw error
    })
    return messageLoads[conversationId]
  }

  function prefetchRecentConversations(items) {
    items.slice(0, 3).forEach(function (item) {
      loadConversationMessages(item.id).catch(function () { /* Retry when opened. */ })
    })
  }

  function markActiveConversation() {
    if (!mountedElement) return
    mountedElement.querySelectorAll('[data-conversation-id]').forEach(function (item) {
      item.classList.toggle(
        'is-active',
        item.getAttribute('data-conversation-id') === activeConversationId
      )
    })
  }

  function loadConversations() {
    if (!mountedElement) return Promise.resolve()
    var list = mountedElement.querySelector('[data-conversation-list]')
    return global.AiChatApi.conversations().then(function (payload) {
      var conversations = payload.conversations || []
      if (list.isConnected) {
        list.innerHTML = listMarkup(conversations)
        prefetchRecentConversations(conversations)
      }
    }).catch(function () {
      if (list.isConnected) list.innerHTML = '<div class="history-error">历史记录暂时不可用</div>'
    })
  }

  function loadModels() {
    if (!mountedElement) return Promise.resolve()
    var select = mountedElement.querySelector('[data-model-select]')
    var menu = mountedElement.querySelector('[data-model-menu]')
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
      menu.innerHTML = '<span class="model-picker__menu-title">选择回答模型</span>' + models.map(function (model) {
        return '<button type="button" data-model-option data-model-value="' + escapeHtml(model.id) +
          '" data-model-name="' + escapeHtml(model.name) + '" role="option" aria-selected="false">' +
          '<span><strong>' + escapeHtml(model.name) + '</strong><small>' + escapeHtml(model.provider) +
          '</small></span><i>✓</i></button>'
      }).join('')
      global.localStorage.setItem(MODEL_KEY, selectedModel)
      syncModelPicker()
    }).catch(function () {
      if (select.isConnected) {
        select.value = selectedModel
        syncModelPicker()
      }
    })
  }

  function syncModelPicker() {
    if (!mountedElement) return
    var select = mountedElement.querySelector('[data-model-select]')
    var label = mountedElement.querySelector('[data-model-label]')
    var options = mountedElement.querySelectorAll('[data-model-option]')
    var activeName = ''
    options.forEach(function (option) {
      var active = option.getAttribute('data-model-value') === selectedModel
      option.setAttribute('aria-selected', String(active))
      if (active) activeName = option.getAttribute('data-model-name') || ''
    })
    if (select) select.value = selectedModel
    if (label) label.textContent = activeName || selectedModel
  }

  function closeModelPicker() {
    if (!mountedElement) return
    var picker = mountedElement.querySelector('[data-model-picker]')
    var trigger = mountedElement.querySelector('[data-model-trigger]')
    var menu = mountedElement.querySelector('[data-model-menu]')
    if (picker) picker.classList.remove('is-open')
    if (trigger) trigger.setAttribute('aria-expanded', 'false')
    if (menu) menu.hidden = true
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

  function renderConversationLoading() {
    var container = mountedElement.querySelector('[data-chat-messages]')
    container.innerHTML = '<div class="conversation-loading" role="status"><i></i><span>正在读取会话</span></div>'
  }

  function openConversation(conversationId) {
    if (sending) return
    var loadSequence = ++conversationLoadSequence
    activeConversationId = conversationId
    closeHistory()
    markActiveConversation()
    if (messageCache[conversationId]) {
      renderMessages(messageCache[conversationId])
      return Promise.resolve()
    }
    renderConversationLoading()
    return loadConversationMessages(conversationId).then(function (messages) {
      if (loadSequence !== conversationLoadSequence || activeConversationId !== conversationId) return
      renderMessages(messages)
    }).catch(function () {
      if (loadSequence !== conversationLoadSequence || activeConversationId !== conversationId) return
      showNotice('无法读取该对话，请稍后重试。')
    })
  }

  function newChat() {
    if (sending) return
    conversationLoadSequence += 1
    activeConversationId = null
    closeHistory()
    markActiveConversation()
    renderMessages([])
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
    var processing = assistant.querySelector('[data-processing]')
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

    function ensureReasoning() {
      if (reasoning) return
      content.insertAdjacentHTML('beforebegin', reasoningMarkup('', '分析中', true))
      reasoning = assistant.querySelector('.chat-reasoning')
      reasoningContent = assistant.querySelector('[data-reasoning-content]')
      reasoningStatus = assistant.querySelector('[data-reasoning-status]')
    }

    function elapsedLabel() {
      var seconds = Math.max(0.1, (global.performance.now() - startedAt) / 1000)
      return '已思考 ' + seconds.toFixed(seconds < 10 ? 1 : 0) + 's'
    }

    function finalize() {
      if (!completed || queue.length || timer) return
      assistant.classList.remove('is-pending')
      if (processing) processing.hidden = true
      if (!assistant.querySelector('[data-speak]')) {
        var meta = assistant.querySelector('.chat-message__meta')
        if (meta) {
          meta.insertAdjacentHTML('beforeend', '<button type="button" class="message-speak" data-speak aria-label="朗读这条回答" title="朗读 / 停止"><i></i><span>朗读</span></button>')
        }
      }
      if (reasoning) {
        reasoning.classList.remove('is-streaming')
        reasoning.open = false
        reasoningStatus.textContent = failed ? '已中止' : elapsedLabel()
      }
      resolveDone()
    }

    function renderPiece(kind, text) {
      if (processing) processing.hidden = true
      if (kind === 'reasoning') {
        ensureReasoning()
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
          if (reasoning) {
            reasoning.open = false
            reasoning.classList.remove('is-streaming')
            reasoningStatus.textContent = elapsedLabel()
          }
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
    var modelTrigger = mountedElement.querySelector('[data-model-trigger]')
    selectedModel = modelSelect.value || selectedModel
    form.classList.add('is-sending')
    modelSelect.disabled = true
    modelTrigger.disabled = true
    closeModelPicker()
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
        forgetCachedMessages(activeConversationId)
        loadConversations()
      }
      if (eventName === 'delta') {
        streamRenderer.enqueue('answer', payload.content || '')
      }
      if (eventName === 'reasoning') {
        streamRenderer.enqueue('reasoning', payload.content || '')
      }
      if (eventName === 'done') {
        forgetCachedMessages(activeConversationId)
        streamRenderer.complete()
      }
      if (eventName === 'error') {
        forgetCachedMessages(activeConversationId)
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
      modelTrigger.disabled = false
      loadConversations()
      textarea.focus()
    })
  }

  function bindEvents(element) {
    element.addEventListener('change', function (event) {
      if (!event.target.matches('[data-model-select]')) return
      selectedModel = event.target.value
      global.localStorage.setItem(MODEL_KEY, selectedModel)
      syncModelPicker()
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
        closeModelPicker()
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
      var speakButton = event.target.closest('[data-speak]')
      if (speakButton) {
        speakAnswer(speakButton)
        return
      }

      var modelOption = event.target.closest('[data-model-option]')
      if (modelOption) {
        selectedModel = modelOption.getAttribute('data-model-value')
        global.localStorage.setItem(MODEL_KEY, selectedModel)
        syncModelPicker()
        closeModelPicker()
        return
      }

      var modelTrigger = event.target.closest('[data-model-trigger]')
      if (modelTrigger) {
        var picker = element.querySelector('[data-model-picker]')
        var menu = element.querySelector('[data-model-menu]')
        var willOpen = !picker.classList.contains('is-open')
        picker.classList.toggle('is-open', willOpen)
        modelTrigger.setAttribute('aria-expanded', String(willOpen))
        menu.hidden = !willOpen
        return
      }

      if (!event.target.closest('[data-model-picker]')) closeModelPicker()

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
          forgetCachedMessages(id)
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
    stopSpeaking()
    initSpeechVoices()
    element.innerHTML = shellMarkup()
    bindEvents(element)
    element.querySelector('[data-model-select]').value = selectedModel
    syncModelPicker()
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
