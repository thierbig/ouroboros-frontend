<template>
  <div class="ob-glass rounded-lg overflow-hidden">
    <!-- Header -->
    <div
      class="flex items-center justify-between cursor-pointer px-3 py-2 hover:bg-white/[0.02] ob-transition-fast"
      @click="isExpanded = !isExpanded"
    >
      <div class="flex items-center gap-2 min-w-0">
        <span class="text-sm text-[var(--ob-text-2)] shrink-0" style="font-family: var(--font-mono);">{{ toolCall.name }}</span>
        <span v-if="toolCall.isRunning" class="ob-badge ob-badge-gold">Running</span>
        <span v-else class="ob-badge ob-badge-teal">Done</span>
        <span v-if="quickSummary" class="text-xs text-[var(--ob-text-3)] truncate">
          {{ quickSummary }}
        </span>
      </div>
      <span class="text-[var(--ob-text-3)] text-xs shrink-0 ml-2 ob-transition-fast" :class="isExpanded ? 'rotate-180' : ''">
        &#9662;
      </span>
    </div>

    <!-- Terminal: always show command + live output when running -->
    <div v-if="toolCall.name === 'terminal'" class="px-3 pb-3">
      <div class="rounded-lg p-3" style="background: rgba(0,0,0,0.5); font-family: var(--font-mono);">
        <div class="text-[var(--ob-text-3)] mb-1 text-xs">$</div>
        <div class="text-blue-400 mb-2 text-xs">{{ toolCall.args.command }}</div>

        <!-- Live output -->
        <div
          v-if="toolCall.terminalOutput"
          ref="outputRef"
          class="text-emerald-400/70 max-h-80 overflow-y-auto whitespace-pre-wrap border-t border-[var(--ob-border)] pt-2 text-[11px]"
        >{{ toolCall.terminalOutput }}</div>

        <!-- Waiting indicator -->
        <div v-else-if="toolCall.isRunning" class="text-[var(--ob-text-3)] text-xs" style="animation: ob-breathe 2s infinite;">
          Waiting for output...
        </div>

        <!-- Final result -->
        <div v-if="!toolCall.isRunning && parsedResult" class="border-t border-[var(--ob-border)] pt-2 mt-2 text-[11px]">
          <div v-if="parsedResult.exit_code !== 0" class="text-red-400">
            Exit code: {{ parsedResult.exit_code }}
          </div>
          <div v-if="parsedResult.stderr" class="text-amber-400 whitespace-pre-wrap max-h-40 overflow-y-auto">{{ parsedResult.stderr }}</div>
          <div v-if="parsedResult.error" class="text-red-400">{{ parsedResult.error }}</div>
        </div>
      </div>
    </div>

    <!-- Non-terminal tools: collapsible details -->
    <div v-else-if="isExpanded" class="px-3 pb-3 space-y-2 ob-animate-up">
      <div class="text-[10px] text-[var(--ob-text-3)] uppercase tracking-wider" style="font-family: var(--font-mono);">Arguments</div>
      <pre class="text-xs rounded-lg p-2.5 overflow-x-auto text-[var(--ob-text-2)]" style="background: rgba(0,0,0,0.4); font-family: var(--font-mono);">{{ JSON.stringify(toolCall.args, null, 2) }}</pre>

      <template v-if="toolCall.result">
        <div class="text-[10px] text-[var(--ob-text-3)] uppercase tracking-wider" style="font-family: var(--font-mono);">Result</div>
        <pre class="text-xs rounded-lg p-2.5 overflow-x-auto max-h-64 overflow-y-auto text-[var(--ob-text-2)]" style="background: rgba(0,0,0,0.4); font-family: var(--font-mono);">{{ truncatedResult }}</pre>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ToolCallWithResult } from '~/types'

const props = defineProps<{ toolCall: ToolCallWithResult }>()

const isExpanded = ref(false)
const outputRef = ref<HTMLElement>()

const quickSummary = computed(() => {
  const args = props.toolCall.args
  switch (props.toolCall.name) {
    case 'read_file': return args.path
    case 'write_file': return args.path
    case 'patch': return args.path
    case 'search_files': return `${args.target}: ${args.pattern}`
    case 'pyth_price': return args.symbol
    case 'pyth_search': return args.query
    case 'pyth_deploy': return `${args.contract_name} → Base Sepolia`
    default: return ''
  }
})

const parsedResult = computed(() => {
  if (!props.toolCall.result) return null
  try {
    return JSON.parse(props.toolCall.result)
  } catch {
    return null
  }
})

const truncatedResult = computed(() => {
  const result = props.toolCall.result || ''
  if (result.length > 2000) {
    return result.slice(0, 2000) + '\n\n[... truncated for display ...]'
  }
  return result
})

watch(() => props.toolCall.terminalOutput, () => {
  nextTick(() => {
    if (outputRef.value) {
      outputRef.value.scrollTop = outputRef.value.scrollHeight
    }
  })
})
</script>
