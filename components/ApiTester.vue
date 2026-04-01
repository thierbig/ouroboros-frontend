<template>
  <div class="flex-1 flex flex-col bg-gray-950">
    <!-- Request bar -->
    <div class="border-b border-gray-800 p-3 space-y-2">
      <div class="flex gap-2">
        <select
          v-model="method"
          class="bg-gray-800 text-xs text-white rounded px-2 py-1.5 border border-gray-700 focus:border-primary-500 outline-none"
        >
          <option>GET</option>
          <option>POST</option>
          <option>PUT</option>
          <option>PATCH</option>
          <option>DELETE</option>
        </select>
        <input
          v-model="url"
          placeholder="https://your-api.netlify.app/api/endpoint"
          class="flex-1 bg-gray-800 text-xs text-white rounded px-3 py-1.5 border border-gray-700 focus:border-primary-500 outline-none font-mono"
          @keydown.enter="send"
        />
        <button
          class="px-4 py-1.5 rounded text-xs font-medium transition-colors shrink-0"
          :class="loading ? 'bg-gray-700 text-gray-400' : 'bg-primary-600 hover:bg-primary-500 text-white cursor-pointer'"
          :disabled="loading"
          @click="send"
        >
          {{ loading ? 'Sending...' : 'Send' }}
        </button>
      </div>

      <!-- Body input for POST/PUT/PATCH -->
      <div v-if="['POST', 'PUT', 'PATCH'].includes(method)">
        <textarea
          v-model="body"
          placeholder='{"key": "value"}'
          class="w-full bg-gray-800 text-xs text-white rounded px-3 py-2 border border-gray-700 focus:border-primary-500 outline-none font-mono resize-none"
          rows="3"
        />
      </div>
    </div>

    <!-- Discovered endpoints -->
    <div v-if="endpoints.length > 0" class="border-b border-gray-800 px-3 py-2">
      <p class="text-[10px] text-gray-600 mb-1.5">Discovered Endpoints</p>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="(ep, i) in endpoints"
          :key="i"
          class="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono bg-gray-800 border border-gray-700 hover:border-gray-500 transition-colors cursor-pointer"
          @click="selectEndpoint(ep)"
        >
          <span :class="methodColor(ep.method)" class="font-bold text-[10px]">{{ ep.method }}</span>
          <span class="text-gray-400">{{ ep.path }}</span>
        </button>
      </div>
    </div>

    <!-- Response -->
    <div class="flex-1 overflow-y-auto p-3">
      <div v-if="!response && !error && !loading" class="flex items-center justify-center h-full">
        <p class="text-xs text-gray-600">{{ endpoints.length > 0 ? 'Select an endpoint above or enter a URL' : 'Enter a URL and click Send to test your API' }}</p>
      </div>

      <div v-if="loading" class="flex items-center justify-center h-full">
        <p class="text-xs text-gray-400 animate-pulse">Sending request...</p>
      </div>

      <div v-if="response || error" class="space-y-2">
        <!-- Status -->
        <div class="flex items-center gap-2">
          <span
            class="text-xs font-mono font-bold"
            :class="statusColor"
          >
            {{ status }}
          </span>
          <span v-if="responseTime" class="text-[10px] text-gray-600">{{ responseTime }}ms</span>
        </div>

        <!-- Response body -->
        <pre
          v-if="response"
          class="text-xs font-mono bg-gray-900 border border-gray-800 rounded p-3 overflow-x-auto whitespace-pre-wrap max-h-[70vh] overflow-y-auto"
          :class="isJsonResponse ? 'text-emerald-400' : 'text-gray-300'"
        >{{ formattedResponse }}</pre>

        <!-- Error -->
        <div v-if="error" class="text-xs text-red-400 font-mono bg-red-950/30 border border-red-900/50 rounded p-3">
          {{ error }}
        </div>
      </div>
    </div>

    <!-- History -->
    <div v-if="history.length > 0" class="border-t border-gray-800 px-3 py-2 max-h-24 overflow-y-auto">
      <p class="text-[10px] text-gray-600 mb-1">History</p>
      <button
        v-for="(h, i) in history"
        :key="i"
        class="block w-full text-left text-[11px] font-mono text-gray-500 hover:text-gray-300 truncate py-0.5 cursor-pointer"
        @click="url = h.url; method = h.method"
      >
        <span :class="methodColor(h.method)">{{ h.method }}</span> {{ h.url }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Endpoint { method: string; path: string }
const props = defineProps<{ baseUrl: string; endpoints?: Endpoint[] }>()

const method = ref('GET')
const url = ref(props.baseUrl ? `${props.baseUrl}/api` : '')
const body = ref('')
const loading = ref(false)
const response = ref<string | null>(null)
const error = ref<string | null>(null)
const status = ref('')
const responseTime = ref<number | null>(null)
const isJsonResponse = ref(false)

interface HistoryEntry { method: string; url: string }
const history = ref<HistoryEntry[]>([])

watch(() => props.baseUrl, (newUrl) => {
  if (newUrl && !url.value) {
    url.value = `${newUrl}/api`
  }
})

// Auto-select first endpoint if available
watch(() => props.endpoints, (eps) => {
  if (eps && eps.length > 0 && !response.value && !loading.value) {
    selectEndpoint(eps[0])
  }
}, { immediate: true })

const formattedResponse = computed(() => {
  if (!response.value) return ''
  if (isJsonResponse.value) {
    try {
      return JSON.stringify(JSON.parse(response.value), null, 2)
    } catch {
      return response.value
    }
  }
  return response.value
})

const statusColor = computed(() => {
  const code = parseInt(status.value)
  if (code >= 200 && code < 300) return 'text-emerald-400'
  if (code >= 300 && code < 400) return 'text-yellow-400'
  if (code >= 400) return 'text-red-400'
  return 'text-gray-400'
})

function selectEndpoint(ep: Endpoint) {
  method.value = ep.method
  url.value = `${props.baseUrl}${ep.path}`
}

function methodColor(m: string) {
  switch (m) {
    case 'GET': return 'text-emerald-500'
    case 'POST': return 'text-blue-500'
    case 'PUT': return 'text-yellow-500'
    case 'PATCH': return 'text-orange-500'
    case 'DELETE': return 'text-red-500'
    default: return 'text-gray-500'
  }
}

async function send() {
  if (!url.value.trim() || loading.value) return

  loading.value = true
  response.value = null
  error.value = null
  status.value = ''
  responseTime.value = null

  const start = Date.now()

  try {
    const opts: RequestInit = {
      method: method.value,
      headers: { 'Content-Type': 'application/json' },
    }
    if (['POST', 'PUT', 'PATCH'].includes(method.value) && body.value.trim()) {
      opts.body = body.value
    }

    const res = await fetch(url.value, opts)
    responseTime.value = Date.now() - start
    status.value = `${res.status} ${res.statusText}`

    const text = await res.text()
    response.value = text
    isJsonResponse.value = res.headers.get('content-type')?.includes('json') || false

    // Try to detect JSON even without header
    if (!isJsonResponse.value && text.startsWith('{') || text.startsWith('[')) {
      try { JSON.parse(text); isJsonResponse.value = true } catch {}
    }

    // Add to history (dedup)
    const entry = { method: method.value, url: url.value }
    if (!history.value.some(h => h.method === entry.method && h.url === entry.url)) {
      history.value.unshift(entry)
      if (history.value.length > 10) history.value.pop()
    }
  } catch (e: any) {
    responseTime.value = Date.now() - start
    error.value = e.message || 'Request failed'
    status.value = 'Error'
  } finally {
    loading.value = false
  }
}
</script>
