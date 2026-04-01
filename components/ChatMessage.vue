<template>
  <div
    v-if="!isEmpty"
    :class="[
      'flex ob-animate-up',
      message.role === 'user' ? 'justify-end' : 'justify-start',
    ]"
  >
    <div :class="[
      'max-w-[80%] rounded-xl px-4 py-3',
      message.role === 'user'
        ? 'bg-emerald-600/80 text-white'
        : 'ob-glass text-[var(--ob-text)]',
    ]">
      <div v-if="message.toolCalls?.length && !hideToolCalls" class="space-y-2 mb-3">
        <ToolCallCard
          v-for="(tc, i) in message.toolCalls"
          :key="i"
          :tool-call="tc"
        />
      </div>

      <div
        v-if="cleanContent"
        class="text-sm prose-chat"
        v-html="renderMarkdown(cleanContent)"
      />
      <span v-if="message.isStreaming" class="inline-block w-1.5 h-4 bg-emerald-400 animate-pulse ml-0.5 rounded-sm" />

      <div v-if="message.timestamp" class="mt-1.5" :class="message.role === 'user' ? 'text-emerald-200/40' : 'text-[var(--ob-text-3)]'">
        <span class="text-[10px]" style="font-family: var(--font-mono);">{{ formatTime(message.timestamp) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChatMessage } from '~/types'

const props = defineProps<{ message: ChatMessage; hideToolCalls?: boolean }>()

const cleanContent = computed(() => {
  const text = props.message.content?.trim() || ''
  return text.replace(/:$/, '').trim()
})

const isEmpty = computed(() => {
  const hasContent = !!cleanContent.value
  const hasVisibleTools = !!props.message.toolCalls?.length && !props.hideToolCalls
  const isStreaming = !!props.message.isStreaming
  if (props.hideToolCalls && props.message.toolCalls?.length && !hasContent) return true
  return !hasContent && !hasVisibleTools && !isStreaming
})

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-black/40 rounded-lg p-3 my-2 overflow-x-auto text-xs" style="font-family: var(--font-mono);"><code>$2</code></pre>')
  html = html.replace(/`([^`]+)`/g, '<code class="bg-black/30 px-1.5 py-0.5 rounded text-xs" style="font-family: var(--font-mono);">$1</code>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/^### (.+)$/gm, '<h4 class="font-semibold text-sm mt-3 mb-1" style="font-family: var(--font-display);">$1</h4>')
  html = html.replace(/^## (.+)$/gm, '<h3 class="font-semibold text-base mt-3 mb-1" style="font-family: var(--font-display);">$1</h3>')
  html = html.replace(/^# (.+)$/gm, '<h2 class="font-semibold text-lg mt-3 mb-1" style="font-family: var(--font-display);">$1</h2>')
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
  html = html.replace(/\n\n/g, '</p><p class="mt-2">')
  html = html.replace(/\n/g, '<br>')

  return `<p>${html}</p>`
}
</script>
