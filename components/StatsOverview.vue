<template>
  <div>
    <!-- Summary Cards -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="bg-gray-800 rounded-lg p-4 text-center">
        <div class="text-gray-400 text-sm">Total Sessions</div>
        <div class="text-xl font-bold mt-1">{{ stats.session_count }}</div>
      </div>
      <div class="bg-gray-800 rounded-lg p-4 text-center">
        <div class="text-gray-400 text-sm">Total Tokens</div>
        <div class="text-xl font-bold mt-1">{{ stats.total_tokens.toLocaleString() }}</div>
      </div>
      <div class="bg-gray-800 rounded-lg p-4 text-center">
        <div class="text-gray-400 text-sm">Total Cost</div>
        <div class="text-xl font-bold mt-1">${{ stats.total_cost.toFixed(4) }}</div>
      </div>
    </div>

    <!-- Cost Timeline Chart -->
    <div v-if="sessions.length > 0" class="mb-6">
      <h3 class="text-md font-semibold mb-3">Cost Timeline</h3>
      <div class="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <!-- @vue-ignore -->
        <apexchart type="area" height="300" :options="chartOptions" :series="chartSeries" />
      </div>
    </div>

    <!-- Cost Breakdown Table -->
    <div v-if="breakdown.length > 0">
      <h3 class="text-md font-semibold mb-3">Cost Breakdown by Model</h3>
      <div class="overflow-x-auto rounded-lg border border-gray-800">
        <table class="w-full text-sm">
          <thead class="bg-gray-900 text-gray-400 text-left">
            <tr>
              <th class="px-4 py-3">Provider</th>
              <th class="px-4 py-3">Model</th>
              <th class="px-4 py-3 text-right">Sessions</th>
              <th class="px-4 py-3 text-right">Tokens</th>
              <th class="px-4 py-3 text-right">Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in breakdown"
              :key="`${row.provider}|${row.model}`"
              class="border-t border-gray-800"
            >
              <td class="px-4 py-3">{{ row.provider }}</td>
              <td class="px-4 py-3 text-gray-300">{{ row.model }}</td>
              <td class="px-4 py-3 text-right text-gray-300">{{ row.count }}</td>
              <td class="px-4 py-3 text-right text-gray-300">{{ row.tokens.toLocaleString() }}</td>
              <td class="px-4 py-3 text-right text-gray-300">${{ row.cost.toFixed(4) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SessionSummary, AdminStats } from '~/types'

const props = defineProps<{
  sessions: SessionSummary[]
  stats: AdminStats
}>()

const sortedSessions = computed(() =>
  [...props.sessions].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
)

const chartSeries = computed(() => {
  let cumulative = 0
  const data = sortedSessions.value.map(s => {
    cumulative += s.total_cost
    return { x: new Date(s.created_at).getTime(), y: Number(cumulative.toFixed(6)) }
  })
  return [{ name: 'Cumulative Cost', data }]
})

const chartOptions = computed(() => ({
  chart: {
    type: 'area' as const,
    toolbar: { show: false },
    background: 'transparent',
    foreColor: '#9ca3af',
  },
  theme: { mode: 'dark' as const },
  xaxis: { type: 'datetime' as const },
  yaxis: {
    title: { text: 'Cumulative Cost ($)' },
    labels: { formatter: (v: number) => `$${v.toFixed(4)}` },
  },
  stroke: { curve: 'smooth' as const, width: 2 },
  fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.1 } },
  colors: ['#6366f1'],
  tooltip: {
    theme: 'dark',
    y: { formatter: (v: number) => `$${v.toFixed(4)}` },
  },
  grid: { borderColor: '#374151' },
}))

const breakdown = computed(() => {
  const map = new Map<string, { provider: string; model: string; count: number; tokens: number; cost: number }>()
  for (const s of props.sessions) {
    const key = `${s.provider}|${s.model}`
    const existing = map.get(key) || { provider: s.provider, model: s.model, count: 0, tokens: 0, cost: 0 }
    existing.count++
    existing.tokens += s.total_tokens
    existing.cost += s.total_cost
    map.set(key, existing)
  }
  return Array.from(map.values())
})
</script>
