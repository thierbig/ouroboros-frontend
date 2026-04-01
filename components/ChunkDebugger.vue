<template>
  <div class="space-y-2">
    <div
      v-for="chunk in chunks"
      :key="chunk._id"
      class="border border-gray-800 rounded-lg overflow-hidden"
    >
      <!-- Header (clickable) -->
      <div
        class="flex items-center gap-2 px-4 py-3 bg-gray-900 cursor-pointer hover:bg-gray-800 transition-colors flex-wrap"
        @click="toggle(chunk.chunk_index)"
      >
        <span class="font-mono text-sm font-semibold">Chunk #{{ chunk.chunk_index }}</span>
        <UBadge color="neutral" variant="subtle" size="xs">{{ chunk.provider }}</UBadge>
        <span class="text-xs text-gray-400">{{ chunk.model }}</span>
        <UBadge
          :color="chunk.status === 'ok' ? 'success' : 'error'"
          variant="subtle"
          size="xs"
        >
          {{ chunk.status }}
        </UBadge>
        <template v-if="chunk.tool_calls && chunk.tool_calls.length">
          <UBadge
            v-for="(tc, i) in chunk.tool_calls"
            :key="i"
            color="warning"
            variant="subtle"
            size="xs"
          >
            {{ tc.name }}
          </UBadge>
        </template>
        <span class="ml-auto text-gray-500 text-xs">
          {{ expanded.has(chunk.chunk_index) ? '▲' : '▼' }}
        </span>
      </div>

      <!-- Body (collapsible) -->
      <div v-if="expanded.has(chunk.chunk_index)" class="p-4 bg-gray-950">
        <div class="grid grid-cols-2 gap-4">
          <!-- Prompt -->
          <div>
            <div class="text-xs font-semibold text-gray-400 mb-2">Prompt</div>
            <pre class="bg-gray-900 rounded p-3 text-xs text-gray-300 overflow-auto max-h-[400px] whitespace-pre-wrap break-words">{{ formatJson(chunk.prompt) }}</pre>
          </div>
          <!-- Response -->
          <div>
            <div class="text-xs font-semibold text-gray-400 mb-2">Response</div>
            <pre class="bg-gray-900 rounded p-3 text-xs text-gray-300 overflow-auto max-h-[400px] whitespace-pre-wrap break-words">{{ formatJson(chunk.response) }}</pre>
          </div>
        </div>
        <!-- Footer stats -->
        <div class="flex items-center gap-4 mt-3 text-xs text-gray-500 flex-wrap">
          <span>{{ chunk.prompt_size_kb }} KB prompt</span>
          <span>{{ chunk.response_size_kb }} KB response</span>
          <span>{{ chunk.total_tokens.toLocaleString() }} tokens</span>
          <span>{{ chunk.latency_ms }} ms</span>
          <span>${{ chunk.cost.toFixed(6) }}</span>
        </div>
        <!-- Error -->
        <div v-if="chunk.error" class="mt-2 text-xs text-red-400">
          Error: {{ chunk.error }}
        </div>
      </div>
    </div>

    <div v-if="chunks.length === 0" class="text-gray-500 text-sm py-4 text-center">
      No chunks found.
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Chunk } from '~/types'

defineProps<{
  chunks: Chunk[]
}>()

const expanded = ref<Set<number>>(new Set())

function toggle(index: number) {
  if (expanded.value.has(index)) {
    expanded.value.delete(index)
  } else {
    expanded.value.add(index)
  }
  // Trigger reactivity
  expanded.value = new Set(expanded.value)
}

function formatJson(data: any): string {
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}
</script>
