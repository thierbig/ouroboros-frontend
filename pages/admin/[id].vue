<template>
  <div class="min-h-screen bg-gray-950 text-gray-100 p-6">
    <div class="max-w-5xl mx-auto">
      <!-- Back link -->
      <NuxtLink to="/admin" class="text-sm text-blue-400 hover:text-blue-300 mb-4 inline-block">
        &larr; Back to Admin
      </NuxtLink>

      <!-- Loading -->
      <div v-if="loading" class="py-4 space-y-4">
        <div class="h-8 w-48 bg-gray-800 rounded animate-pulse" />
        <div class="flex gap-4">
          <div v-for="i in 3" :key="i" class="h-20 flex-1 bg-gray-800 rounded-lg animate-pulse" />
        </div>
        <div v-for="i in 4" :key="i" class="h-24 bg-gray-800 rounded-lg animate-pulse" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-red-400 py-8 text-center">{{ error }}</div>

      <!-- Session Detail -->
      <template v-else-if="currentSession">
        <!-- Session Header -->
        <div class="flex items-center gap-3 mb-6 flex-wrap">
          <span class="text-gray-500 text-xs font-mono">{{ sessionId }}</span>
          <UBadge
            :color="statusColor(currentSession.status)"
            variant="subtle"
          >
            {{ currentSession.status }}
          </UBadge>
          <UBadge color="neutral" variant="subtle">
            {{ currentSession.provider }}
          </UBadge>
          <span class="text-gray-300">{{ currentSession.model }}</span>
          <span class="text-gray-500 text-sm">
            {{ new Date(currentSession.created_at).toLocaleString() }}
          </span>
        </div>

        <!-- Summary Stats -->
        <div class="flex gap-4 mb-8">
          <div class="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex-1">
            <div class="text-gray-400 text-xs">Total Tokens</div>
            <div class="text-lg font-bold">{{ currentSession.total_tokens.toLocaleString() }}</div>
          </div>
          <div class="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex-1">
            <div class="text-gray-400 text-xs">Total Cost</div>
            <div class="text-lg font-bold">${{ currentSession.total_cost.toFixed(4) }}</div>
          </div>
          <div class="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex-1">
            <div class="text-gray-400 text-xs">Chunks</div>
            <div class="text-lg font-bold">{{ chunks.length }}</div>
          </div>
        </div>

        <!-- Conversation Replay -->
        <h2 class="text-lg font-semibold mb-4">Conversation</h2>
        <div class="space-y-3 mb-10">
          <div
            v-for="(msg, idx) in currentSession.messages"
            :key="idx"
            :class="messageClass(msg.role)"
            class="rounded-lg p-4"
          >
            <div class="text-xs font-semibold mb-1 uppercase tracking-wide"
              :class="msg.role === 'user' ? 'text-blue-400' : msg.role === 'assistant' ? 'text-gray-400' : 'text-amber-500'"
            >
              {{ msg.role }}
            </div>
            <div class="text-sm whitespace-pre-wrap">{{ msg.content }}</div>
            <!-- Tool calls for assistant messages -->
            <div v-if="msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length" class="mt-3 space-y-2">
              <div
                v-for="(tc, tIdx) in msg.tool_calls"
                :key="tIdx"
                class="bg-gray-950 rounded p-2 text-xs border border-gray-700"
              >
                <span class="text-amber-400 font-mono">{{ tc.name || tc.function?.name || 'tool' }}</span>
                <pre class="mt-1 text-gray-400 overflow-x-auto">{{ formatToolArgs(tc) }}</pre>
              </div>
            </div>
            <!-- Tool call ID for tool messages -->
            <div v-if="msg.role === 'tool' && msg.tool_call_id" class="mt-1 text-xs text-gray-500">
              tool_call_id: {{ msg.tool_call_id }}
            </div>
          </div>
        </div>

        <!-- Chunk Debugger -->
        <h2 class="text-lg font-semibold mb-4">Chunks</h2>
        <ChunkDebugger :chunks="chunks" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const sessionId = route.params.id as string
const { currentSession, chunks, loading, error, fetchSession } = useAdmin()

function statusColor(status: string) {
  const map: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    completed: 'success',
    running: 'warning',
    error: 'error',
  }
  return map[status] ?? 'neutral'
}

function messageClass(role: string): string {
  switch (role) {
    case 'user': return 'bg-blue-950 border border-blue-900'
    case 'assistant': return 'bg-gray-900 border border-gray-800'
    case 'tool': return 'bg-gray-900/50 border border-gray-800 text-gray-400 text-xs'
    default: return 'bg-gray-900 border border-gray-800'
  }
}

function formatToolArgs(tc: any): string {
  try {
    const args = tc.args || tc.function?.arguments
    if (typeof args === 'string') return args
    return JSON.stringify(args, null, 2)
  } catch {
    return String(tc)
  }
}

onMounted(() => {
  fetchSession(sessionId)
})
</script>
