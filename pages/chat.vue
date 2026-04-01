<template>
  <div class="h-screen flex flex-col" style="background: var(--ob-deep);">
    <!-- Connection error banner -->
    <div
      v-if="!isConnected && messages.length > 0"
      class="px-4 py-2 text-sm text-center ob-animate-up"
      style="background: rgba(239, 68, 68, 0.08); border-bottom: 1px solid rgba(239, 68, 68, 0.15); color: #f87171;"
    >
      Disconnected from server. Messages may not be delivered.
    </div>

    <AppHeader
      v-model:config="agentConfig"
      :is-streaming="isStreaming"
      :is-self-correcting="isSelfCorrecting"
      :current-iteration="currentIteration"
      :max-iterations="maxIterations"
      @stop="stop"
    />

    <div class="flex-1 flex flex-col md:flex-row overflow-hidden">
      <!-- Left panel: Chat -->
      <div class="flex flex-col" :class="rightPanel ? 'w-full md:w-1/2' : 'w-full'">
        <!-- Chat messages -->
        <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
          <!-- Empty state -->
          <div v-if="messages.length === 0" class="flex-1 flex items-center justify-center h-full">
            <div class="text-center max-w-md ob-animate-up">
              <h2 class="text-2xl font-semibold text-[var(--ob-text)] mb-2" style="font-family: var(--font-display);">
                {{ projectName }}
              </h2>
              <p class="text-sm text-[var(--ob-text-3)]">
                {{ projectHasCode ? 'What would you like to do?' : 'Describe what you want to build' }}
              </p>
              <p v-if="!projectHasCode" class="text-xs text-[var(--ob-text-3)] mt-2 opacity-60">
                The agent will ask you questions to understand your requirements, then scaffold the project.
              </p>
            </div>
          </div>

          <ChatMessage
            v-for="msg in visibleMessages"
            :key="msg.id"
            :message="msg"
            :hide-tool-calls="rightPanel"
          />

          <!-- Progress indicator when agent is working but no visible streaming content -->
          <div
            v-if="isStreaming && !hasVisibleStreamingContent"
            class="flex justify-start"
          >
            <div class="max-w-[80%] rounded-xl px-4 py-3 ob-glass">
              <div class="flex items-center gap-2 mb-1">
                <span class="ob-dot ob-dot-live" />
                <span class="text-sm text-emerald-400 font-medium" style="font-family: var(--font-display);">
                  {{ currentIteration ? `Working — step ${currentIteration}/${maxIterations}` : 'Working...' }}
                </span>
              </div>
              <div v-if="streamingProgressSummary" class="text-xs text-[var(--ob-text-3)]" style="font-family: var(--font-mono);">
                {{ streamingProgressSummary }}
              </div>
              <div v-else class="text-xs text-[var(--ob-text-3)]">
                The agent is analyzing and building your project...
              </div>
            </div>
          </div>
        </div>

        <!-- Stuck indicator -->
        <div
          v-if="isStuck"
          class="flex items-center gap-3 px-4 py-3 border-t border-[var(--ob-border)]"
          style="background: rgba(245, 158, 11, 0.06);"
        >
          <span class="ob-dot bg-amber-400" style="animation: ob-breathe 2s infinite;" />
          <span class="text-xs text-amber-300">
            Agent unresponsive for <strong>{{ secondsSinceLastEvent }}s</strong>
          </span>
          <button
            class="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium text-white cursor-pointer ob-transition-fast"
            style="background: rgba(239, 68, 68, 0.7);"
            @click="stop"
          >
            Force Stop
          </button>
          <button
            class="px-3 py-1.5 rounded-lg text-xs font-medium text-white cursor-pointer ob-transition-fast"
            style="background: rgba(245, 158, 11, 0.5);"
            @click="retrySend"
          >
            Retry
          </button>
        </div>

        <!-- Error recovery banner -->
        <div
          v-if="sessionError && !isStreaming"
          class="border-t border-[var(--ob-border)] px-4 py-3 flex items-center gap-3"
          style="background: rgba(239, 68, 68, 0.05);"
        >
          <span class="text-xs text-red-400">
            Agent stopped unexpectedly.
            <span v-if="agentError" class="block mt-1 truncate opacity-70" style="font-family: var(--font-mono);">{{ agentError }}</span>
          </span>
          <button
            class="ml-auto px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium cursor-pointer shrink-0 ob-transition-fast"
            @click="retrySend"
          >
            Resume
          </button>
        </div>

        <!-- Deploy updates offer -->
        <div
          v-if="showDeployOffer && !isStreaming && !sessionError"
          class="border-t border-[var(--ob-border)] px-4 py-3 flex items-center gap-3"
          style="background: rgba(0, 216, 158, 0.04);"
        >
          <span class="text-xs text-emerald-300">Changes ready — deploy updates?</span>
          <button
            class="ml-auto px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium cursor-pointer shrink-0 ob-transition-fast"
            @click="showDeployOffer = false; handleSend('Deploy the updated code. Rebuild and deploy.')"
          >
            Deploy
          </button>
          <button
            class="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer shrink-0 ob-transition-fast"
            style="background: rgba(255,255,255,0.05); color: var(--ob-text-2);"
            @click="showDeployOffer = false"
          >
            Skip
          </button>
        </div>

        <!-- Input -->
        <div class="border-t border-[var(--ob-border)] p-4" style="background: rgba(10, 12, 18, 0.6);">
          <form @submit.prevent="submitInput" class="flex gap-2 items-end">
            <UTextarea
              v-model="input"
              placeholder="Describe what you want to build or fix..."
              :rows="1"
              autoresize
              class="flex-1"
              @keydown.enter.exact.prevent="submitInput"
            />
            <UButton
              type="submit"
              :disabled="!input.trim() || isStreaming"
              color="primary"
              size="lg"
              class="shrink-0"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
              </svg>
            </UButton>
          </form>
        </div>
      </div>

      <!-- Right panel -->
      <div v-if="rightPanel" class="w-full md:w-1/2 border-t md:border-t-0 md:border-l border-[var(--ob-border)] flex flex-col max-h-[50vh] md:max-h-none">
        <!-- Panel tabs -->
        <div class="flex items-center border-b border-[var(--ob-border)] px-2" style="background: rgba(10, 12, 18, 0.6);">
          <button
            class="px-3 py-2.5 text-[11px] font-medium ob-transition-fast relative"
            :class="activeTab === 'activity' ? 'text-[var(--ob-text)]' : 'text-[var(--ob-text-3)] hover:text-[var(--ob-text-2)]'"
            @click="activeTab = 'activity'"
          >
            Activity
            <span v-if="activeTab === 'activity'" class="absolute bottom-0 left-3 right-3 h-[2px] bg-emerald-500 rounded-full" />
          </button>
          <span v-if="sessionStartedAt" class="text-[10px] text-[var(--ob-text-3)] ml-1" style="font-family: var(--font-mono);">
            {{ formatSessionTime(sessionStartedAt) }}
          </span>
          <button
            v-if="lastViewedFile"
            class="px-3 py-2.5 text-[11px] font-medium ob-transition-fast relative"
            :class="activeTab === 'file' ? 'text-[var(--ob-text)]' : 'text-[var(--ob-text-3)] hover:text-[var(--ob-text-2)]'"
            @click="activeTab = 'file'"
          >
            File
            <span v-if="activeTab === 'file'" class="absolute bottom-0 left-3 right-3 h-[2px] bg-emerald-500 rounded-full" />
          </button>
          <button
            v-if="deployUrl && projectType !== 'api'"
            class="px-3 py-2.5 text-[11px] font-medium ob-transition-fast relative"
            :class="activeTab === 'preview' ? 'text-[var(--ob-text)]' : 'text-[var(--ob-text-3)] hover:text-[var(--ob-text-2)]'"
            @click="activeTab = 'preview'"
          >
            Live Preview
            <span v-if="activeTab === 'preview'" class="absolute bottom-0 left-3 right-3 h-[2px] bg-emerald-500 rounded-full" />
          </button>
          <button
            v-if="deployUrl && projectType === 'api'"
            class="px-3 py-2.5 text-[11px] font-medium ob-transition-fast relative"
            :class="activeTab === 'api' ? 'text-[var(--ob-text)]' : 'text-[var(--ob-text-3)] hover:text-[var(--ob-text-2)]'"
            @click="activeTab = 'api'"
          >
            API Tester
            <span v-if="activeTab === 'api'" class="absolute bottom-0 left-3 right-3 h-[2px] bg-emerald-500 rounded-full" />
          </button>
          <button
            v-if="detectedContractAddress || projectType === 'entropy-game'"
            class="px-3 py-2.5 text-[11px] font-medium ob-transition-fast relative"
            :class="activeTab === 'contract' ? 'text-[var(--ob-text)]' : 'text-[var(--ob-text-3)] hover:text-[var(--ob-text-2)]'"
            @click="activeTab = 'contract'"
          >
            Contract
            <span v-if="activeTab === 'contract'" class="absolute bottom-0 left-3 right-3 h-[2px] bg-emerald-500 rounded-full" />
          </button>
        </div>

        <!-- Activity log -->
        <ActivityLog v-if="activeTab === 'activity'" :messages="messages" :agent-status="agentStatus" :iteration="currentIteration" :max-iterations="maxIterations" class="flex-1" />

        <!-- File viewer -->
        <FileViewer v-if="activeTab === 'file' && lastViewedFile" :path="lastViewedFile" class="flex-1" />

        <!-- Live preview -->
        <div v-if="activeTab === 'preview' && deployUrl" class="flex-1 flex flex-col">
          <div class="flex items-center gap-2 px-3 py-2 border-b border-[var(--ob-border)]" style="background: rgba(10, 12, 18, 0.6);">
            <div class="flex-1 rounded-md px-3 py-1 text-xs truncate" style="background: rgba(255,255,255,0.04); color: var(--ob-text-3); font-family: var(--font-mono);">
              {{ deployUrl }}
            </div>
            <a
              :href="deployUrl"
              target="_blank"
              class="text-xs text-emerald-400 hover:text-emerald-300 shrink-0 ob-transition-fast"
            >
              Open
            </a>
            <button
              class="text-xs text-[var(--ob-text-3)] hover:text-[var(--ob-text-2)] shrink-0 cursor-pointer ob-transition-fast"
              @click="refreshPreview"
            >
              Reload
            </button>
          </div>
          <iframe
            :key="previewKey"
            :src="deployUrl"
            class="flex-1 w-full bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>

        <!-- API Tester -->
        <ApiTester v-if="activeTab === 'api' && deployUrl" :base-url="deployUrl" :endpoints="discoveredEndpoints" class="flex-1" />

        <!-- Contract Explorer -->
        <ContractExplorer
          v-if="activeTab === 'contract'"
          :address="detectedContractAddress"
          :contract-name="detectedContractName"
          class="flex-1"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AgentConfig } from '~/types'

const route = useRoute()
const router = useRouter()
const runtimeConfig = useRuntimeConfig()
const apiUrl = runtimeConfig.public.apiUrl as string

// Get project from query params
const projectPath = (route.query.project as string) || ''
const initialPrompt = (route.query.prompt as string) || ''
const sessionIdParam = (route.query.session as string) || ''

const agentConfig = ref<AgentConfig>({
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  api_key: '',
  working_dir: projectPath,
})

const workingDirRef = computed(() => agentConfig.value.working_dir)

const {
  messages,
  isConnected,
  isStreaming,
  tokensUsed,
  maxTokens,
  currentIteration,
  maxIterations,
  isSelfCorrecting,
  lastViewedFile,
  sendMessage,
  stop,
  clearMessages,
  connect,
  disconnect,
  loadSession,
  loadSessionById,
  sessionStartedAt,
  secondsSinceLastEvent,
  isStuck,
  detectedDeployUrl,
  agentStatus,
  error: agentError,
} = useAgent(workingDirRef)

const input = ref('')
const sessionError = ref(false)

// Track when agent errors out
watch(agentError, (val) => {
  if (val) sessionError.value = true
})

// Clear error banner when user sends a new message
watch(isStreaming, (val) => {
  if (val) sessionError.value = false
})

function retrySend() {
  sessionError.value = false
  sendMessage('Continue where you left off. If something failed, try a different approach.', agentConfig.value)
}
const messagesContainer = ref<HTMLElement>()
const deployUrl = ref<string | null>(null)
const activeTab = ref<'activity' | 'file' | 'preview' | 'api' | 'contract'>('activity')
const previewKey = ref(0)

// Show right panel whenever there are messages (activity log, file viewer, or preview)
const rightPanel = computed(() => messages.value.length > 0)

// Extract project name and id from path
const projectId = computed(() => {
  const dir = agentConfig.value.working_dir
  if (!dir) return null
  const parts = dir.replace(/\\/g, '/').split('/').filter(Boolean)
  return parts[parts.length - 1] || null
})

interface Project {
  id: string
  name: string
  path: string
  has_code?: boolean
  project_type?: string
}

const projectName = ref('')
const projectHasCode = ref(false)
const projectType = ref('web-app')
const projectDeployUrl = ref<string | null>(null)
const showDeployOffer = ref(false)

// When agent finishes and project is deployed, offer to redeploy
watch(isStreaming, (streaming, wasStreaming) => {
  if (!streaming && wasStreaming && projectDeployUrl.value && messages.value.length > 2) {
    showDeployOffer.value = true
  }
})

// Discover API endpoints from agent messages
const discoveredEndpoints = computed(() => {
  const endpoints: { method: string; path: string }[] = []
  const seen = new Set<string>()
  const pattern = /\b(GET|POST|PUT|PATCH|DELETE)\s+(\/api\/\S+)/g
  for (const msg of messages.value) {
    if (msg.role !== 'assistant') continue
    let match
    while ((match = pattern.exec(msg.content)) !== null) {
      const key = `${match[1]} ${match[2]}`
      if (!seen.has(key)) {
        seen.add(key)
        const path = match[2].replace(/[.,;:)}\]]+$/, '')
        endpoints.push({ method: match[1], path })
      }
    }
  }
  return endpoints
})

// Detect contract addresses from agent messages (0x followed by 40 hex chars)
const detectedContractAddress = computed(() => {
  const addrPattern = /0x[a-fA-F0-9]{40}/g
  for (let i = messages.value.length - 1; i >= 0; i--) {
    const msg = messages.value[i]
    if (msg.role !== 'assistant') continue
    const matches = msg.content.match(addrPattern)
    if (matches) {
      return matches[matches.length - 1]
    }
  }
  return null
})

// Detect contract name from agent messages
const detectedContractName = computed(() => {
  const namePattern = /(?:deployed|deploying|contract)\s+(?:the\s+)?["`']?(\w+)["`']?\s+(?:contract|to)/i
  for (let i = messages.value.length - 1; i >= 0; i--) {
    const msg = messages.value[i]
    if (msg.role !== 'assistant') continue
    const match = msg.content.match(namePattern)
    if (match) return match[1]
  }
  return undefined
})

// Auto-switch to contract tab when a contract address is detected
watch(detectedContractAddress, (addr) => {
  if (addr && (projectType.value === 'entropy-game' || projectType.value === 'custom-game')) {
    activeTab.value = 'contract'
  }
})

// Hide the initial template prompt
const visibleMessages = computed(() => {
  if (
    messages.value.length > 0 &&
    messages.value[0].role === 'user' &&
    messages.value[0].content.startsWith('I just created a project called')
  ) {
    return messages.value.slice(1)
  }
  return messages.value
})

// Check if there's visible streaming content in the chat area
const hasVisibleStreamingContent = computed(() => {
  const last = visibleMessages.value[visibleMessages.value.length - 1]
  if (!last) return false
  if (last.role === 'assistant' && last.isStreaming && last.content?.trim()) return true
  if (last.role === 'assistant' && last.content?.trim() && !last.isStreaming) return true
  return false
})

// Build a progress summary from tool calls in messages
const streamingProgressSummary = computed(() => {
  const counts: Record<string, number> = { file: 0, terminal: 0, search: 0, deploy: 0, other: 0 }
  for (const msg of messages.value) {
    if (msg.role !== 'assistant' || !msg.toolCalls?.length) continue
    for (const tc of msg.toolCalls) {
      if (['read_file', 'write_file', 'patch'].includes(tc.name)) counts.file++
      else if (tc.name === 'terminal') counts.terminal++
      else if (tc.name === 'search_files') counts.search++
      else if (tc.name === 'pyth_deploy') counts.deploy++
      else counts.other++
    }
  }
  const parts: string[] = []
  if (counts.file) parts.push(`${counts.file} file op${counts.file > 1 ? 's' : ''}`)
  if (counts.terminal) parts.push(`${counts.terminal} command${counts.terminal > 1 ? 's' : ''}`)
  if (counts.search) parts.push(`${counts.search} search${counts.search > 1 ? 'es' : ''}`)
  if (counts.deploy) parts.push(`${counts.deploy} deploy${counts.deploy > 1 ? 's' : ''}`)
  if (counts.other) parts.push(`${counts.other} other`)
  if (parts.length === 0) return ''
  return `${parts.join(', ')} completed so far`
})

function formatSessionTime(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function handleSend(content: string) {
  if (!agentConfig.value.api_key) {
    alert('Please enter your API key in the header')
    return
  }
  sendMessage(content, agentConfig.value)
}

async function submitInput() {
  const content = input.value.trim()
  if (!content) return
  handleSend(content)
  input.value = ''
}

function refreshPreview() {
  previewKey.value++
}

// Auto-switch to Live Preview when a deploy URL is detected
watch(detectedDeployUrl, (url) => {
  if (url) {
    deployUrl.value = url
    activeTab.value = projectType.value === 'api' ? 'api' : 'preview'
  }
})

// Restore API key from localStorage
onMounted(async () => {
  if (projectPath) {
    try {
      const projects = await $fetch<Project[]>(`${apiUrl}/projects`)
      const p = projects.find(p => p.path === projectPath)
      if (p) {
        projectName.value = p.name
        projectHasCode.value = !!p.has_code
        projectDeployUrl.value = (p as any).deploy_url || null
        projectType.value = (p as any).project_type || 'web-app'
      }
    } catch {
      // Use folder name as fallback
    }
    if (!projectName.value && projectId.value) {
      projectName.value = projectId.value.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }

    if (initialPrompt) {
      const prompt = initialPrompt
      await nextTick()
      if (agentConfig.value.api_key) {
        handleSend(prompt)
        router.replace({ query: { project: route.query.project } })
      } else {
        const unwatch = watch(() => agentConfig.value.api_key, (key) => {
          if (key) {
            unwatch()
            handleSend(prompt)
            router.replace({ query: { project: route.query.project } })
          }
        })
      }
    } else if (sessionIdParam) {
      await loadSessionById(sessionIdParam)
    } else {
      await loadSession(projectPath)
    }
  }
})

// On project switch from header dropdown: reload
watch(workingDirRef, async (newDir, oldDir) => {
  if (oldDir && newDir !== oldDir) {
    clearMessages()
    lastViewedFile.value = null
    deployUrl.value = null
    activeTab.value = 'activity'
    disconnect()
    connect()
    if (newDir) {
      localStorage.setItem('ouroboros_last_project', newDir)
      await loadSession(newDir)
    }
  }
})

// Auto-scroll
watch(
  messages,
  () => {
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    })
  },
  { deep: true }
)
</script>
