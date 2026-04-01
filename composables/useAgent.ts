// composables/useAgent.ts
import type { AgentConfig, AgentEvent, ChatMessage, ToolCallWithResult, SessionDetail } from '~/types'

export function useAgent(workingDirRef?: Ref<string>) {
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string

  const messages = ref<ChatMessage[]>([])
  const isConnected = ref(false)
  const isStreaming = ref(false)
  const currentSessionId = ref<string | null>(null)
  const tokensUsed = ref(0)
  const maxTokens = ref(2000000)
  const currentIteration = ref(0)
  const maxIterations = ref(25)
  const isSelfCorrecting = ref(false)
  const error = ref<string | null>(null)
  const lastViewedFile = ref<string | null>(null)
  const detectedDeployUrl = ref<string | null>(null)
  const agentStatus = ref<string | null>(null)

  function scanForUrl(text: string) {
    if (!text) return
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.netlify\.app/i)
    if (match) detectedDeployUrl.value = match[0]
  }
  const sessionStartedAt = ref<string | null>(null)
  const secondsSinceLastEvent = ref(0)
  const isStuck = computed(() => isStreaming.value && secondsSinceLastEvent.value >= 15)

  let ws: WebSocket | null = null
  let currentAssistantMessage: ChatMessage | null = null
  let currentToolCalls: ToolCallWithResult[] = []
  let lastEventTime = 0
  let stuckTimer: ReturnType<typeof setInterval> | null = null

  let lastSyncedMsgCount = 0

  function startStuckTimer() {
    lastEventTime = Date.now()
    secondsSinceLastEvent.value = 0
    lastSyncedMsgCount = messages.value.length
    if (stuckTimer) clearInterval(stuckTimer)
    stuckTimer = setInterval(async () => {
      if (isStreaming.value) {
        secondsSinceLastEvent.value = Math.floor((Date.now() - lastEventTime) / 1000)

        // Every 8s while streaming, check if backend has more messages than we show
        if (secondsSinceLastEvent.value >= 8 && secondsSinceLastEvent.value % 8 === 0 && currentSessionId.value) {
          try {
            const session = await $fetch<any>(`${apiUrl}/admin/sessions/${currentSessionId.value}`)
            if (!session) return
            const backendMsgCount = session.messages?.length || 0
            const isDone = session.status === 'completed' || session.status === 'error'

            // Backend has more messages or is done — reload
            if (isDone || backendMsgCount > lastSyncedMsgCount + 2) {
              await reloadFromApi()
              lastSyncedMsgCount = messages.value.length
              if (isDone) {
                isStreaming.value = false
                isSelfCorrecting.value = false
                stopStuckTimer()
              }
            }
          } catch {
            // API not available
          }
        }
      } else {
        secondsSinceLastEvent.value = 0
      }
    }, 1000)
  }

  function stopStuckTimer() {
    secondsSinceLastEvent.value = 0
    if (stuckTimer) {
      clearInterval(stuckTimer)
      stuckTimer = null
    }
  }

  function touchEvent() {
    lastEventTime = Date.now()
    secondsSinceLastEvent.value = 0
  }

  async function reloadFromApi() {
    if (!currentSessionId.value) return
    try {
      const session = await $fetch<any>(`${apiUrl}/admin/sessions/${currentSessionId.value}`)
      if (session?.messages?.length) {
        const rebuilt = rebuildMessages(session.messages)
        tokensUsed.value = session.total_tokens || 0
        messages.value = rebuilt
        // Re-scan for deploy URLs and files
        for (const msg of messages.value) {
          if (msg.content) scanForUrl(msg.content)
          if (msg.toolCalls) {
            for (const tc of msg.toolCalls) {
              if (tc.result) scanForUrl(tc.result)
              if (tc.terminalOutput) scanForUrl(tc.terminalOutput)
              if (['read_file', 'write_file', 'patch'].includes(tc.name) && tc.args.path) {
                lastViewedFile.value = tc.args.path as string
              }
            }
          }
        }
        if (session.status === 'error') {
          error.value = session.error_message || 'Session ended with an error'
        }
      }
    } catch {
      // API not available
    }
  }

  function connect() {
    if (ws?.readyState === WebSocket.OPEN) return

    ws = new WebSocket(config.public.wsUrl as string)

    ws.onopen = () => {
      isConnected.value = true
      error.value = null
    }

    ws.onclose = () => {
      const wasStreaming = isStreaming.value
      isConnected.value = false
      isStreaming.value = false
      stopStuckTimer()
      // If connection dropped mid-stream, reload session from API and reconnect
      if (wasStreaming && currentSessionId.value) {
        reloadFromApi()
      }
      // Auto-reconnect after 2s
      setTimeout(() => {
        if (!isConnected.value) connect()
      }, 2000)
    }

    ws.onerror = () => {
      error.value = 'WebSocket connection failed'
      isConnected.value = false
    }

    ws.onmessage = (event: MessageEvent) => {
      const data: AgentEvent = JSON.parse(event.data)
      handleEvent(data)
    }
  }

  function handleEvent(event: AgentEvent) {
    touchEvent()
    switch (event.type) {
      case 'session':
        currentSessionId.value = event.session_id
        sessionStartedAt.value = new Date().toISOString()
        break

      case 'resumed':
        // Server restored history, nothing extra needed
        break

      case 'tool_call': {
        isSelfCorrecting.value = false
        agentStatus.value = `Running ${event.name}...`
        const toolCall: ToolCallWithResult = {
          name: event.name,
          args: event.args,
          isRunning: true,
        }
        currentToolCalls.push(toolCall)

        if (event.name === 'read_file' || event.name === 'write_file' || event.name === 'patch') {
          let filePath = event.args.path as string
          // Resolve relative paths against working directory
          const wd = workingDirRef?.value
          if (wd && filePath && !filePath.match(/^[A-Za-z]:[/\\]/) && !filePath.startsWith('/')) {
            filePath = wd.replace(/\\/g, '/') + '/' + filePath
          }
          lastViewedFile.value = filePath
        }

        // Resolve image path for analyze_xray
        if (event.name === 'analyze_xray' && event.args.image_path) {
          const wd = workingDirRef?.value
          let imgPath = event.args.image_path as string
          if (wd && imgPath && !imgPath.match(/^[A-Za-z]:[/\\]/) && !imgPath.startsWith('/')) {
            imgPath = wd.replace(/\\/g, '/') + '/' + imgPath
          }
          toolCall.args = { ...toolCall.args, _resolved_path: imgPath }
        }

        if (!currentAssistantMessage) {
          currentAssistantMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '',
            toolCalls: currentToolCalls,
            isStreaming: true,
            timestamp: new Date().toISOString(),
          }
          messages.value.push(currentAssistantMessage)
        } else {
          currentAssistantMessage.toolCalls = [...currentToolCalls]
          currentAssistantMessage.isStreaming = false
        }
        break
      }

      case 'tool_result': {
        const tc = currentToolCalls.find(t => t.name === event.name && t.isRunning)
        if (tc) {
          tc.result = event.result
          tc.isRunning = false
        }
        if (currentAssistantMessage) {
          currentAssistantMessage.toolCalls = [...currentToolCalls]
        }
        scanForUrl(event.result)
        break
      }

      case 'terminal_output': {
        const runningTerminal = currentToolCalls.findLast(t => t.name === 'terminal' && t.isRunning)
        if (runningTerminal) {
          runningTerminal.terminalOutput = (runningTerminal.terminalOutput || '') + event.line
          scanForUrl(event.line)
          if (currentAssistantMessage) {
            currentAssistantMessage.toolCalls = [...currentToolCalls]
            messages.value = [...messages.value]
          }
        }
        break
      }

      case 'status':
        agentStatus.value = event.message || null
        break

      case 'self_correcting':
        isSelfCorrecting.value = true
        break

      case 'usage':
        tokensUsed.value = event.tokens_used
        currentIteration.value = event.iteration
        maxIterations.value = event.max_iterations
        break

      case 'stream':
        // If current message has tool calls, start a fresh message for new text
        if (!currentAssistantMessage || currentAssistantMessage.toolCalls?.length) {
          if (currentAssistantMessage) {
            currentAssistantMessage.isStreaming = false
          }
          currentAssistantMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '',
            isStreaming: true,
            timestamp: new Date().toISOString(),
          }
          currentToolCalls = []
          messages.value.push(currentAssistantMessage)
        }
        currentAssistantMessage.content += event.token
        messages.value = [...messages.value]
        break

      case 'response':
        scanForUrl(event.content)
        if (currentAssistantMessage && !currentAssistantMessage.toolCalls?.length) {
          // Same message (was streaming text) — finalize it
          currentAssistantMessage.content = event.content
          currentAssistantMessage.isStreaming = false
        } else {
          // New message — either no current message or current one had tool calls
          if (currentAssistantMessage) {
            currentAssistantMessage.isStreaming = false
          }
          if (event.content) {
            messages.value.push({
              id: crypto.randomUUID(),
              role: 'assistant',
              content: event.content,
              timestamp: new Date().toISOString(),
            })
          }
        }
        isStreaming.value = false
        isSelfCorrecting.value = false
        agentStatus.value = null
        stopStuckTimer()
        currentAssistantMessage = null
        currentToolCalls = []
        break

      case 'error':
        error.value = event.message
        isStreaming.value = false
        isSelfCorrecting.value = false
        agentStatus.value = null
        stopStuckTimer()
        currentAssistantMessage = null
        currentToolCalls = []
        break

      case 'done':
        isStreaming.value = false
        isSelfCorrecting.value = false
        agentStatus.value = null
        stopStuckTimer()
        if (currentAssistantMessage) {
          currentAssistantMessage.isStreaming = false
        }
        currentAssistantMessage = null
        currentToolCalls = []
        break
    }
  }

  /**
   * Rebuild frontend ChatMessage[] from the raw MongoDB messages array.
   * Groups user messages, assistant messages (with tool_calls), and tool results.
   */
  function rebuildMessages(rawMessages: SessionDetail['messages']) {
    const rebuilt: ChatMessage[] = []

    for (let i = 0; i < rawMessages.length; i++) {
      const msg = rawMessages[i]

      if (msg.role === 'user') {
        rebuilt.push({
          id: crypto.randomUUID(),
          role: 'user',
          content: msg.content,
          timestamp: (msg as any).timestamp || undefined,
        })
      } else if (msg.role === 'assistant') {
        // Collect tool calls and their results
        const toolCalls: ToolCallWithResult[] = []
        if (msg.tool_calls?.length) {
          for (const tc of msg.tool_calls) {
            const fn = tc.function || tc
            const name = fn.name
            let args: Record<string, any> = {}
            try {
              args = typeof fn.arguments === 'string'
                ? JSON.parse(fn.arguments)
                : (fn.arguments || fn.args || fn.input || {})
            } catch {
              args = {}
            }
            // Find the matching tool result in subsequent messages
            const resultMsg = rawMessages.slice(i + 1).find(
              m => m.role === 'tool' && m.tool_call_id === tc.id
            )
            toolCalls.push({
              name,
              args,
              result: resultMsg?.content,
              isRunning: false,
            })
          }
        }
        rebuilt.push({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: msg.content,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          timestamp: (msg as any).timestamp || undefined,
        })
      }
      // Skip 'tool' role messages — they're consumed by the assistant message above
    }

    return rebuilt
  }

  /**
   * Load the latest session for a project from the REST API and restore it.
   * Also sends a resume message to the WebSocket so server-side history is restored.
   */
  async function loadSessionById(sessionId: string) {
    try {
      const session = await $fetch<SessionDetail | null>(`${apiUrl}/admin/sessions/${sessionId}`)
      if (!session || !session.messages?.length) return
      await restoreSession(session)
    } catch {
      // Session not found
    }
  }

  async function loadSession(workingDir: string) {
    try {
      const session = await $fetch<SessionDetail | null>(`${apiUrl}/sessions/latest`, {
        params: { working_dir: workingDir },
      })
      if (!session || !session.messages?.length) return
      await restoreSession(session)
    } catch {
      // No session found or backend not reachable — start fresh
    }
  }

  async function restoreSession(session: SessionDetail) {
    let rebuilt = rebuildMessages(session.messages)
    currentSessionId.value = session._id
    tokensUsed.value = session.total_tokens || 0
    sessionStartedAt.value = session.created_at || null
    // Surface error state for restored sessions
    if (session.status === 'error') {
      error.value = 'Session ended with an error'
    }

    // If no tool calls in messages, try reconstructing from chunks
    const hasToolCalls = rebuilt.some(m => m.toolCalls?.length)
    if (!hasToolCalls && session._id) {
      try {
        const chunks = await $fetch<any[]>(`${apiUrl}/admin/sessions/${session._id}/chunks`)
        if (chunks?.length) {
          // Inject tool calls from chunks into the last assistant message before response
          const chunkToolCalls: ToolCallWithResult[] = []
          for (const chunk of chunks) {
            if (chunk.tool_calls?.length) {
              for (const tc of chunk.tool_calls) {
                chunkToolCalls.push({
                  name: tc.name,
                  args: tc.args || {},
                  result: undefined,
                  isRunning: false,
                })
              }
            }
          }
          if (chunkToolCalls.length > 0) {
            // Find the last assistant message or create a synthetic one
            const lastAssistant = [...rebuilt].reverse().find(m => m.role === 'assistant')
            if (lastAssistant) {
              lastAssistant.toolCalls = chunkToolCalls
            } else {
              rebuilt.push({
                id: crypto.randomUUID(),
                role: 'assistant',
                content: '',
                toolCalls: chunkToolCalls,
              })
            }
          }
        }
      } catch {
        // Chunks endpoint not available, continue without
      }
    }

    messages.value = rebuilt

    // Reconstruct lastViewedFile from restored tool calls
    for (const msg of messages.value) {
      if (msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          if (['read_file', 'write_file', 'patch'].includes(tc.name) && tc.args.path) {
            let filePath = tc.args.path as string
            const wd = workingDirRef?.value
            if (wd && filePath && !filePath.match(/^[A-Za-z]:[/\\]/) && !filePath.startsWith('/')) {
              filePath = wd.replace(/\\/g, '/') + '/' + filePath
            }
            lastViewedFile.value = filePath
          }
        }
      }
    }

    // Scan restored messages for deploy URLs
    for (const msg of messages.value) {
      if (msg.content) scanForUrl(msg.content)
      if (msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          if (tc.result) scanForUrl(tc.result)
          if (tc.terminalOutput) scanForUrl(tc.terminalOutput)
        }
      }
    }

    const doResume = () => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resume', session_id: session._id }))
      }
    }

    if (ws?.readyState === WebSocket.OPEN) {
      doResume()
    } else {
      const interval = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          clearInterval(interval)
          doResume()
        }
      }, 100)
    }
  }

  function sendMessage(content: string, agentConfig: AgentConfig) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      connect()
      const interval = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          clearInterval(interval)
          doSend(content, agentConfig)
        }
      }, 100)
      return
    }
    doSend(content, agentConfig)
  }

  function doSend(content: string, agentConfig: AgentConfig) {
    messages.value.push({
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    })

    isStreaming.value = true
    error.value = null
    currentAssistantMessage = null
    currentToolCalls = []
    startStuckTimer()

    ws!.send(JSON.stringify({
      type: 'message',
      content,
      config: agentConfig,
    }))
  }

  function stop() {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'stop' }))
    }
  }

  function disconnect() {
    ws?.close()
    ws = null
  }

  function clearMessages() {
    messages.value = []
    tokensUsed.value = 0
    currentIteration.value = 0
    currentSessionId.value = null
    sessionStartedAt.value = null
    currentAssistantMessage = null
    currentToolCalls = []
  }

  onMounted(connect)
  onUnmounted(() => {
    disconnect()
    stopStuckTimer()
  })

  return {
    messages,
    isConnected,
    isStreaming,
    currentSessionId,
    tokensUsed,
    maxTokens,
    currentIteration,
    maxIterations,
    isSelfCorrecting,
    error,
    lastViewedFile,
    sendMessage,
    stop,
    connect,
    disconnect,
    clearMessages,
    loadSession,
    loadSessionById,
    sessionStartedAt,
    secondsSinceLastEvent,
    isStuck,
    detectedDeployUrl,
    agentStatus,
  }
}
