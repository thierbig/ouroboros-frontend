<template>
  <div class="min-h-screen bg-gray-950 text-gray-100 p-6">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">Analytics</h1>
        <NuxtLink to="/" class="text-sm text-blue-400 hover:text-blue-300">
          &larr; Back to Chat
        </NuxtLink>
      </div>

      <!-- Stats Overview (top) -->
      <StatsOverview :sessions="sessions" :stats="stats" />

      <!-- Sessions Table -->
      <div class="mt-10">
        <h2 class="text-lg font-semibold mb-4">Sessions</h2>

        <div v-if="loading" class="space-y-3 py-4">
          <div v-for="i in 6" :key="i" class="h-12 bg-gray-800 rounded-lg animate-pulse" />
        </div>

        <div v-else-if="error" class="text-red-400 py-8 text-center">{{ error }}</div>

        <div v-else class="overflow-x-auto rounded-lg border border-gray-800">
          <table class="w-full text-sm">
            <thead class="bg-gray-900 text-gray-400 text-left">
              <tr>
                <th class="px-4 py-3">Date</th>
                <th class="px-4 py-3">Project</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3">Model</th>
                <th class="px-4 py-3 text-right">Tokens</th>
                <th class="px-4 py-3 text-right">Cost</th>
                <th class="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="session in sessions"
                :key="session._id"
                class="border-t border-gray-800 hover:bg-gray-900 transition-colors"
              >
                <td class="px-4 py-3 whitespace-nowrap">
                  {{ new Date(session.created_at).toLocaleString() }}
                </td>
                <td class="px-4 py-3 text-gray-300">
                  {{ projectName(session.working_dir) }}
                </td>
                <td class="px-4 py-3">
                  <UBadge
                    :color="statusColor(session.status)"
                    variant="subtle"
                    size="sm"
                  >
                    {{ session.status }}
                  </UBadge>
                </td>
                <td class="px-4 py-3 text-gray-300 text-xs">{{ shortModel(session.model) }}</td>
                <td class="px-4 py-3 text-right text-gray-300">
                  {{ session.total_tokens.toLocaleString() }}
                </td>
                <td class="px-4 py-3 text-right text-gray-300">
                  ${{ session.total_cost.toFixed(4) }}
                </td>
                <td class="px-4 py-3 text-right">
                  <NuxtLink
                    :to="`/admin/${session._id}`"
                    class="text-xs text-gray-500 hover:text-gray-300"
                  >
                    Debug
                  </NuxtLink>
                </td>
              </tr>
              <tr v-if="sessions.length === 0">
                <td colspan="8" class="px-4 py-8 text-center text-gray-500">
                  No sessions yet. Start a conversation to see analytics.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { sessions, stats, loading, error, fetchSessions } = useAdmin()

function projectName(workingDir?: string): string {
  if (!workingDir) return '—'
  const parts = workingDir.replace(/\\/g, '/').split('/').filter(Boolean)
  const name = parts[parts.length - 1] || '—'
  return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function shortModel(model: string): string {
  if (model.includes('sonnet')) return 'Sonnet 4'
  if (model.includes('opus')) return 'Opus 4'
  if (model.includes('haiku')) return 'Haiku 3.5'
  if (model.includes('gpt-4o-mini')) return 'GPT-4o Mini'
  if (model.includes('gpt-4o')) return 'GPT-4o'
  return model
}

function statusColor(status: string) {
  const map: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    completed: 'success',
    running: 'warning',
    error: 'error',
  }
  return map[status] ?? 'neutral'
}

onMounted(() => {
  fetchSessions()
})
</script>
