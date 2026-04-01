<template>
  <div ref="logContainer" class="flex-1 overflow-y-auto p-3 space-y-2" style="background: var(--ob-deep);">
    <!-- No messages at all -->
    <div v-if="entries.length === 0 && !isThinking" class="flex items-center justify-center h-full">
      <p class="text-sm text-[var(--ob-text-3)]">No tool activity in this session</p>
    </div>

    <!-- Current thinking indicator (centered when no entries) -->
    <div v-if="isThinking && entries.length === 0" class="flex items-center justify-center h-full">
      <div class="text-center ob-animate-up">
        <div class="flex items-center gap-2 text-emerald-400 mb-2 justify-center">
          <span class="ob-dot ob-dot-live" />
          <span class="text-sm" style="font-family: var(--font-display);">
            {{ iteration ? `Step ${iteration}` : 'Thinking...' }}
          </span>
        </div>
        <p class="text-xs text-[var(--ob-text-3)]">Analyzing your request and planning actions...</p>
      </div>
    </div>

    <!-- Timeline entries -->
    <div
      v-for="(entry, i) in entries"
      :key="i"
      class="border-l-2 pl-3 py-1.5 ob-animate-up"
      :class="borderColor(entry.type)"
      :style="{ animationDelay: `${Math.min(i * 0.03, 0.3)}s` }"
    >
      <!-- Header -->
      <div class="flex items-center gap-2 mb-0.5">
        <span class="ob-badge" :class="badgeClass(entry.type)">{{ entry.label }}</span>
        <span v-if="entry.isRunning" class="text-[10px] text-amber-400" style="animation: ob-breathe 1.5s infinite; font-family: var(--font-mono);">
          running
        </span>
        <span v-if="entry.time" class="text-[9px] text-[var(--ob-text-3)] ml-auto" style="font-family: var(--font-mono);">
          {{ entry.time }}
        </span>
      </div>

      <!-- Terminal: show command + output -->
      <template v-if="entry.type === 'terminal'">
        <div class="text-xs text-blue-400 mb-1" style="font-family: var(--font-mono);">$ {{ entry.command }}</div>
        <div
          v-if="entry.output"
          class="text-[11px] text-emerald-400/70 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg px-2.5 py-1.5"
          style="background: rgba(0,0,0,0.4); font-family: var(--font-mono);"
        >{{ truncate(entry.output, 1000) }}</div>
        <div v-if="entry.error" class="text-[11px] text-red-400 mt-1" style="font-family: var(--font-mono);">{{ entry.error }}</div>
      </template>

      <!-- File operations -->
      <template v-else-if="entry.type === 'file'">
        <div class="text-xs text-[var(--ob-text-2)] truncate" style="font-family: var(--font-mono);">{{ entry.path }}</div>
      </template>

      <!-- Search -->
      <template v-else-if="entry.type === 'search'">
        <div class="text-xs text-[var(--ob-text-2)]">{{ entry.detail }}</div>
      </template>

      <!-- Pyth tool results -->
      <template v-else-if="entry.type === 'pyth'">
        <div class="text-xs text-emerald-300">{{ entry.detail }}</div>
        <pre v-if="entry.result" class="text-[11px] text-[var(--ob-text-2)] mt-1 whitespace-pre-wrap" style="font-family: var(--font-mono);">{{ truncate(entry.result, 500) }}</pre>
      </template>

      <!-- Deploy results -->
      <template v-else-if="entry.type === 'deploy'">
        <div class="text-xs text-[var(--ob-gold)]">{{ entry.detail }}</div>
        <pre v-if="entry.result" class="text-[11px] text-[var(--ob-text-2)] mt-1 whitespace-pre-wrap" style="font-family: var(--font-mono);">{{ truncate(entry.result, 500) }}</pre>
      </template>

      <!-- Generic tool -->
      <template v-else>
        <div class="text-xs text-[var(--ob-text-3)]">{{ entry.detail }}</div>
      </template>
    </div>

    <!-- Progress recap at bottom when entries exist and agent is thinking -->
    <div v-if="isThinking && entries.length > 0" class="border-l-2 border-emerald-500/20 pl-3 py-2">
      <div class="flex items-center gap-2 mb-1">
        <span class="ob-dot ob-dot-live" style="width: 5px; height: 5px;" />
        <span class="text-[10px] text-emerald-400" style="font-family: var(--font-mono);">
          {{ iteration ? `Step ${iteration}/${maxIterations || '?'}` : 'Processing...' }}
        </span>
      </div>
      <div v-if="progressRecap.summary" class="text-[10px] text-[var(--ob-text-3)] mb-1">
        {{ progressRecap.summary }} completed
      </div>
      <div v-if="progressRecap.recent.length" class="space-y-0.5">
        <div v-for="(activity, i) in progressRecap.recent" :key="i" class="text-[10px] text-[var(--ob-text-3)] flex items-center gap-1">
          <span class="text-emerald-600">&#10003;</span>
          <span>{{ activity }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChatMessage } from '~/types'

const props = defineProps<{
  messages: ChatMessage[]
  agentStatus?: string | null
  iteration?: number
  maxIterations?: number
}>()
const logContainer = ref<HTMLElement>()

const runtimeConfig = useRuntimeConfig()
const apiUrl = runtimeConfig.public.apiUrl as string

interface Entry {
  type: 'terminal' | 'file' | 'search' | 'tool' | 'pyth' | 'deploy'
  label: string
  isRunning?: boolean
  command?: string
  output?: string
  error?: string
  exitCode?: number | null
  path?: string
  detail?: string
  time?: string
  result?: string
}

const isThinking = computed(() => {
  if (props.messages.length === 0) return false
  const last = props.messages[props.messages.length - 1]
  return last.role === 'user' || (last.role === 'assistant' && !!last.isStreaming)
})

const thinkingContext = computed(() => props.agentStatus || '')

// Build a unified timeline: conversation events + tool calls
const entries = computed<Entry[]>(() => {
  const result: Entry[] = []

  for (const msg of props.messages) {
    if (msg.role !== 'assistant' || !msg.toolCalls?.length) continue

    const time = msg.timestamp ? formatTime(msg.timestamp) : undefined

    for (const tc of msg.toolCalls) {
      switch (tc.name) {
        case 'terminal': {
          const parsed = parseTerminalResult(tc.result)
          result.push({
            type: 'terminal',
            label: 'Terminal',
            isRunning: tc.isRunning,
            command: tc.args.command,
            output: tc.terminalOutput || parsed?.output,
            error: parsed?.exitCode !== 0 ? parsed?.stderr : undefined,
            exitCode: parsed?.exitCode,
            time,
          })
          break
        }

        case 'read_file':
          result.push({ type: 'file', label: 'Read', isRunning: tc.isRunning, path: tc.args.path, time })
          break

        case 'write_file':
          result.push({ type: 'file', label: 'Write', isRunning: tc.isRunning, path: tc.args.path, time })
          break

        case 'patch':
          result.push({ type: 'file', label: 'Patch', isRunning: tc.isRunning, path: tc.args.path, time })
          break

        case 'search_files':
          result.push({
            type: 'search',
            label: 'Search',
            isRunning: tc.isRunning,
            detail: `${tc.args.target}: "${tc.args.pattern}"`,
            time,
          })
          break

        case 'pyth_price':
          result.push({
            type: 'pyth',
            label: `Price: ${tc.args.symbol || 'unknown'}`,
            isRunning: tc.isRunning,
            detail: tc.args.symbol ? `Fetching price for ${tc.args.symbol}` : 'Fetching price data',
            result: tc.result,
            time,
          })
          break

        case 'pyth_search':
          result.push({
            type: 'pyth',
            label: `Search: ${tc.args.query || 'unknown'}`,
            isRunning: tc.isRunning,
            detail: tc.args.query ? `Searching Pyth feeds for "${tc.args.query}"` : 'Searching Pyth feeds',
            result: tc.result,
            time,
          })
          break

        case 'pyth_deploy':
          result.push({
            type: 'deploy',
            label: `Deploy: ${tc.args.contract_name || 'contract'}`,
            isRunning: tc.isRunning,
            detail: tc.args.contract_name ? `Deploying ${tc.args.contract_name} to Base Sepolia` : 'Deploying contract',
            result: tc.result,
            time,
          })
          break

        case 'update_lessons':
          result.push({
            type: 'tool',
            label: 'Lesson',
            isRunning: tc.isRunning,
            detail: typeof tc.args.lesson === 'string' ? tc.args.lesson.slice(0, 100) : 'Saving lesson learned',
            time,
          })
          break

        default:
          result.push({
            type: 'tool',
            label: tc.name,
            isRunning: tc.isRunning,
            detail: Object.keys(tc.args).length > 0
              ? Object.entries(tc.args).map(([k, v]) => `${k}: ${String(v).slice(0, 50)}`).join(', ')
              : '',
            time,
          })
      }
    }
  }

  return result
})

// Build a progress recap from completed entries
const progressRecap = computed(() => {
  const counts: Record<string, number> = {}
  const recentLabels: string[] = []
  for (const e of entries.value) {
    const key = e.type
    counts[key] = (counts[key] || 0) + 1
    if (e.type === 'terminal') recentLabels.push(`ran \`${(e.command || '').split(' ')[0]}\``)
    else if (e.type === 'file') recentLabels.push(`${e.label.toLowerCase()} ${(e.path || '').split(/[/\\]/).pop()}`)
    else if (e.type === 'search') recentLabels.push('searched files')
    else if (e.type === 'deploy') recentLabels.push('deployed')
    else recentLabels.push(e.label.toLowerCase())
  }

  const parts: string[] = []
  if (counts.file) parts.push(`${counts.file} file${counts.file > 1 ? 's' : ''}`)
  if (counts.terminal) parts.push(`${counts.terminal} command${counts.terminal > 1 ? 's' : ''}`)
  if (counts.search) parts.push(`${counts.search} search${counts.search > 1 ? 'es' : ''}`)
  if (counts.deploy) parts.push(`${counts.deploy} deploy${counts.deploy > 1 ? 's' : ''}`)
  if (counts.pyth) parts.push(`${counts.pyth} Pyth call${counts.pyth > 1 ? 's' : ''}`)
  if (counts.tool) parts.push(`${counts.tool} tool${counts.tool > 1 ? 's' : ''}`)

  const recent = [...new Set(recentLabels)].slice(-3)

  return { summary: parts.join(', '), recent, total: entries.value.length }
})

function formatTime(ts: string) {
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function parseTerminalResult(result?: string) {
  if (!result) return null
  try {
    const parsed = JSON.parse(result)
    return {
      output: parsed.output || parsed.stdout,
      stderr: parsed.stderr,
      exitCode: parsed.exit_code ?? null,
    }
  } catch {
    return null
  }
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text
  return text.slice(0, max) + '\n... (truncated)'
}

function borderColor(type: string) {
  switch (type) {
    case 'terminal': return 'border-blue-500/40'
    case 'file': return 'border-violet-500/40'
    case 'search': return 'border-amber-500/40'
    case 'pyth': return 'border-emerald-500/40'
    case 'deploy': return 'border-[var(--ob-gold-dim)]/40'
    default: return 'border-[var(--ob-border-hi)]'
  }
}

function badgeClass(type: string) {
  switch (type) {
    case 'terminal': return 'ob-badge-gray'
    case 'file': return 'ob-badge-gray'
    case 'search': return 'ob-badge-gray'
    case 'pyth': return 'ob-badge-teal'
    case 'deploy': return 'ob-badge-gold'
    default: return 'ob-badge-gray'
  }
}

function labelColor(type: string) {
  switch (type) {
    case 'terminal': return 'text-blue-400'
    case 'file': return 'text-violet-400'
    case 'search': return 'text-amber-400'
    case 'pyth': return 'text-emerald-400'
    case 'deploy': return 'text-[var(--ob-gold)]'
    default: return 'text-[var(--ob-text-3)]'
  }
}

// Auto-scroll
watch(entries, () => {
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
}, { deep: true })
</script>
