<template>
  <div class="min-h-screen bg-gray-950 text-gray-100 p-6">
    <div class="max-w-7xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold">Admin</h1>
          <p class="text-xs text-gray-500 mt-1">Debug, project config, and analytics</p>
        </div>
        <NuxtLink to="/" class="text-xs text-blue-400 hover:text-blue-300">Home</NuxtLink>
      </div>

      <!-- Tabs -->
      <div class="flex items-center gap-1 border-b border-gray-800 mb-6">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="px-4 py-2 text-sm transition-colors"
          :class="activeTab === tab.id
            ? 'text-white border-b-2 border-primary-500'
            : 'text-gray-500 hover:text-gray-300'"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Sessions Tab -->
      <template v-if="activeTab === 'sessions'">
        <!-- Global stats -->
        <div class="flex gap-4 mb-6">
          <div class="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex-1">
            <div class="text-gray-500 text-[10px] uppercase">Sessions</div>
            <div class="text-lg font-bold">{{ stats.session_count }}</div>
          </div>
          <div class="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex-1">
            <div class="text-gray-500 text-[10px] uppercase">Total Tokens</div>
            <div class="text-lg font-bold">{{ stats.total_tokens.toLocaleString() }}</div>
          </div>
          <div class="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex-1">
            <div class="text-gray-500 text-[10px] uppercase">Total Cost</div>
            <div class="text-lg font-bold">${{ stats.total_cost.toFixed(4) }}</div>
          </div>
        </div>

        <!-- Filter -->
        <div class="flex items-center gap-3 mb-4">
          <UInput
            v-model="search"
            placeholder="Filter by project..."
            size="sm"
            class="w-64"
          />
          <span class="text-xs text-gray-500">{{ filteredSessions.length }} sessions</span>
        </div>

        <!-- Sessions list -->
        <div v-if="loading" class="space-y-2">
          <div v-for="i in 8" :key="i" class="h-14 bg-gray-800 rounded-lg animate-pulse" />
        </div>

        <div v-else class="space-y-1">
          <div
            v-for="session in filteredSessions"
            :key="session._id"
            class="border border-gray-800 rounded-lg hover:border-gray-700 transition-colors overflow-hidden"
          >
            <!-- Session row -->
            <div
              class="flex items-center gap-3 px-4 py-3 cursor-pointer"
              @click="toggleSession(session._id)"
            >
              <span class="text-[10px] font-mono text-gray-600 w-20 shrink-0">
                {{ session._id.slice(-8) }}
              </span>
              <span class="text-xs text-gray-300 w-32 shrink-0">
                {{ extractProjectName(session.working_dir) }}
              </span>
              <UBadge
                :color="isStuck(session) ? 'error' : statusColor(session.status)"
                variant="subtle"
                size="xs"
              >
                {{ isStuck(session) ? 'STUCK' : session.status }}
              </UBadge>
              <span v-if="session.status === 'running'" class="text-[10px] font-mono" :class="isStuck(session) ? 'text-red-400' : 'text-yellow-400'">
                {{ elapsedTime(session) }}
              </span>
              <span class="text-[10px] text-gray-500">{{ shortModel(session.model) }}</span>
              <span class="text-[10px] text-gray-500">
                {{ session.total_tokens?.toLocaleString() || 0 }} tok
              </span>
              <span class="text-[10px] text-gray-500">
                {{ msgCount(session) }} msgs
              </span>
              <span class="text-[10px] text-gray-600 ml-auto">
                {{ new Date(session.created_at).toLocaleString() }}
              </span>
              <NuxtLink
                :to="`/admin/${session._id}`"
                class="text-[10px] text-blue-400 hover:text-blue-300 ml-1"
                @click.stop
              >
                Debug
              </NuxtLink>
              <NuxtLink
                v-if="session.status === 'error'"
                :to="`/chat?project=${encodeURIComponent(session.working_dir)}&session=${session._id}`"
                class="text-[10px] text-green-400 hover:text-green-300 ml-1"
                @click.stop
              >
                Resume
              </NuxtLink>
              <span class="text-gray-600 text-xs">{{ expandedSessions.has(session._id) ? '▲' : '▼' }}</span>
            </div>

            <!-- Error details -->
            <div
              v-if="session.error_message && !expandedSessions.has(session._id)"
              class="px-4 py-2 border-t border-red-900/30 bg-red-950/20"
            >
              <p class="text-[11px] text-red-400 font-mono truncate">{{ session.error_message }}</p>
            </div>

            <!-- Inline message preview -->
            <div v-if="expandedSessions.has(session._id)" class="border-t border-gray-800 bg-gray-950 max-h-[500px] overflow-y-auto">
              <div v-if="!sessionMessages[session._id]" class="p-4 text-xs text-gray-500">
                Loading...
              </div>
              <div v-else class="divide-y divide-gray-800/50">
                <div
                  v-for="(msg, idx) in sessionMessages[session._id]"
                  :key="idx"
                  class="px-4 py-2"
                >
                  <div class="flex items-center gap-2 mb-1">
                    <span
                      class="text-[10px] font-bold uppercase"
                      :class="{
                        'text-blue-400': msg.role === 'user',
                        'text-gray-400': msg.role === 'assistant',
                        'text-amber-500': msg.role === 'tool',
                        'text-purple-400': msg.role === 'system',
                      }"
                    >
                      {{ msg.role }}
                    </span>
                    <span v-if="msg.role === 'tool' && msg.tool_call_id" class="text-[9px] text-gray-600 font-mono">
                      {{ msg.tool_call_id }}
                    </span>
                  </div>

                  <template v-if="msg.role === 'system'">
                    <button
                      class="text-[10px] text-gray-500 hover:text-gray-300 cursor-pointer"
                      @click="toggleSystem(session._id + '-' + idx)"
                    >
                      {{ expandedSystem.has(session._id + '-' + idx) ? 'Hide' : 'Show' }} system prompt ({{ msg.content?.length || 0 }} chars)
                    </button>
                    <pre
                      v-if="expandedSystem.has(session._id + '-' + idx)"
                      class="mt-1 text-[11px] text-gray-500 whitespace-pre-wrap max-h-60 overflow-y-auto bg-gray-900 rounded p-2"
                    >{{ msg.content }}</pre>
                  </template>

                  <template v-else>
                    <pre
                      v-if="msg.content"
                      class="text-[11px] whitespace-pre-wrap max-h-40 overflow-y-auto"
                      :class="msg.role === 'user' ? 'text-blue-200' : msg.role === 'tool' ? 'text-amber-200/70' : 'text-gray-300'"
                    >{{ truncate(msg.content, 2000) }}</pre>
                  </template>

                  <div v-if="msg.tool_calls?.length" class="mt-2 space-y-1">
                    <div
                      v-for="(tc, tIdx) in msg.tool_calls"
                      :key="tIdx"
                      class="bg-gray-900 rounded px-2 py-1.5 text-[11px] border border-gray-800"
                    >
                      <span class="text-amber-400 font-mono font-bold">{{ tc.name || tc.function?.name }}</span>
                      <span v-if="tc.id" class="text-gray-600 ml-2 font-mono">{{ tc.id }}</span>
                      <pre class="mt-1 text-gray-400 overflow-x-auto whitespace-pre-wrap">{{ formatArgs(tc) }}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Projects Tab -->
      <template v-if="activeTab === 'projects'">
        <div v-if="loadingProjects" class="space-y-2">
          <div v-for="i in 4" :key="i" class="h-20 bg-gray-800 rounded-lg animate-pulse" />
        </div>
        <div v-else-if="projects.length === 0" class="text-center text-gray-500 py-12">
          No projects found
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="p in projects"
            :key="p.id"
            class="border border-gray-800 rounded-lg hover:border-gray-700 transition-colors overflow-hidden"
          >
            <div
              class="flex items-center gap-3 px-4 py-3 cursor-pointer"
              @click="toggleProject(p.id)"
            >
              <span class="text-sm font-medium text-gray-200 w-40 shrink-0">{{ p.name }}</span>
              <UBadge v-if="p.has_code" color="success" variant="subtle" size="xs">Has code</UBadge>
              <UBadge v-else color="neutral" variant="subtle" size="xs">Empty</UBadge>
              <span class="text-[10px] text-gray-600 truncate flex-1">{{ p.path }}</span>
              <span class="text-gray-600 text-xs">{{ expandedProjects.has(p.id) ? '▲' : '▼' }}</span>
            </div>

            <!-- Project config (inline) -->
            <div v-if="expandedProjects.has(p.id)" class="border-t border-gray-800 bg-gray-950 p-4 space-y-4">
              <div v-if="!projectConfigs[p.id]" class="text-xs text-gray-500">Loading...</div>
              <template v-else>
                <!-- CLAUDE.md -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <p class="text-xs font-medium text-gray-400">CLAUDE.md</p>
                    <UButton
                      v-if="projectConfigs[p.id]._claudeDirty"
                      size="xs"
                      color="primary"
                      @click="saveProjectClaude(p.id)"
                      :loading="projectConfigs[p.id]._savingClaude"
                    >
                      Save
                    </UButton>
                  </div>
                  <textarea
                    v-model="projectConfigs[p.id].claude_md"
                    class="w-full h-40 bg-gray-900 border border-gray-800 rounded-lg p-3 text-xs font-mono text-gray-300 focus:outline-none focus:border-gray-600 resize-y"
                    @input="projectConfigs[p.id]._claudeDirty = true"
                  />
                </div>

                <!-- lessons.md -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <p class="text-xs font-medium text-gray-400">lessons.md</p>
                    <UButton
                      v-if="projectConfigs[p.id]._lessonsDirty"
                      size="xs"
                      color="primary"
                      @click="saveProjectLessons(p.id)"
                      :loading="projectConfigs[p.id]._savingLessons"
                    >
                      Save
                    </UButton>
                  </div>
                  <textarea
                    v-model="projectConfigs[p.id].lessons_md"
                    class="w-full h-32 bg-gray-900 border border-gray-800 rounded-lg p-3 text-xs font-mono text-gray-300 focus:outline-none focus:border-gray-600 resize-y"
                    @input="projectConfigs[p.id]._lessonsDirty = true"
                  />
                </div>

                <!-- Delete -->
                <div class="pt-2 border-t border-gray-800">
                  <button
                    class="text-[10px] text-red-400 hover:text-red-300"
                    @click="deleteProject(p)"
                  >
                    Delete project
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
import type { SessionDetail } from '~/types'

const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl as string

const tabs = [
  { id: 'sessions', label: 'Sessions' },
  { id: 'projects', label: 'Projects' },
]
const activeTab = ref('sessions')

// --- Sessions tab ---
const sessions = ref<any[]>([])
const stats = computed(() => ({
  session_count: sessions.value.length,
  total_tokens: sessions.value.reduce((sum: number, s: any) => sum + (s.total_tokens || 0), 0),
  total_cost: sessions.value.reduce((sum: number, s: any) => sum + (s.total_cost || 0), 0),
}))
const loading = ref(true)
const search = ref('')
const expandedSessions = ref<Set<string>>(new Set())
const expandedSystem = ref<Set<string>>(new Set())
const sessionMessages = ref<Record<string, any[]>>({})

const filteredSessions = computed(() => {
  if (!search.value) return sessions.value
  const q = search.value.toLowerCase()
  return sessions.value.filter(s =>
    extractProjectName(s.working_dir).toLowerCase().includes(q) ||
    s.model?.toLowerCase().includes(q) ||
    s._id.includes(q)
  )
})

function extractProjectName(wd?: string): string {
  if (!wd) return '—'
  const parts = wd.replace(/\\/g, '/').split('/').filter(Boolean)
  return parts[parts.length - 1] || '—'
}

function shortModel(model: string): string {
  if (!model) return '—'
  if (model.includes('sonnet')) return 'Sonnet'
  if (model.includes('opus')) return 'Opus'
  if (model.includes('haiku')) return 'Haiku'
  if (model.includes('gpt-4o-mini')) return '4o-mini'
  if (model.includes('gpt-4o')) return '4o'
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

function msgCount(session: any): number {
  return session.messages?.length || 0
}

// Stuck detection for running sessions
const now = ref(Date.now())
let tickTimer: ReturnType<typeof setInterval> | null = null
let refreshTimer: ReturnType<typeof setInterval> | null = null

function isStuck(session: any): boolean {
  if (session.status !== 'running') return false
  const lastAct = session.last_activity || session.created_at
  if (!lastAct) return false
  const elapsed = now.value - new Date(lastAct).getTime()
  return elapsed > 60_000 // 60s = stuck
}

function elapsedTime(session: any): string {
  const lastAct = session.last_activity || session.created_at
  if (!lastAct) return ''
  const elapsed = Math.floor((now.value - new Date(lastAct).getTime()) / 1000)
  if (elapsed < 60) return `${elapsed}s`
  if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
  return `${Math.floor(elapsed / 3600)}h ${Math.floor((elapsed % 3600) / 60)}m`
}

async function toggleSession(id: string) {
  if (expandedSessions.value.has(id)) {
    expandedSessions.value.delete(id)
    expandedSessions.value = new Set(expandedSessions.value)
    return
  }
  expandedSessions.value.add(id)
  expandedSessions.value = new Set(expandedSessions.value)

  if (!sessionMessages.value[id]) {
    try {
      const session = await $fetch<SessionDetail>(`${apiUrl}/admin/sessions/${id}`)
      sessionMessages.value[id] = session.messages || []
    } catch {
      sessionMessages.value[id] = []
    }
  }
}

function toggleSystem(key: string) {
  if (expandedSystem.value.has(key)) {
    expandedSystem.value.delete(key)
  } else {
    expandedSystem.value.add(key)
  }
  expandedSystem.value = new Set(expandedSystem.value)
}

function formatArgs(tc: any): string {
  try {
    const args = tc.args || tc.function?.arguments
    if (typeof args === 'string') return args
    return JSON.stringify(args, null, 2)
  } catch {
    return String(tc)
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max) + '\n... [truncated]'
}

// --- Projects tab ---
interface Project {
  id: string
  name: string
  path: string
  has_code?: boolean
}

const projects = ref<Project[]>([])
const loadingProjects = ref(false)
const expandedProjects = ref<Set<string>>(new Set())
const projectConfigs = ref<Record<string, any>>({})

async function fetchProjects() {
  loadingProjects.value = true
  try {
    projects.value = await $fetch<Project[]>(`${apiUrl}/projects`)
  } catch {
    // Backend not reachable
  } finally {
    loadingProjects.value = false
  }
}

async function toggleProject(id: string) {
  if (expandedProjects.value.has(id)) {
    expandedProjects.value.delete(id)
    expandedProjects.value = new Set(expandedProjects.value)
    return
  }
  expandedProjects.value.add(id)
  expandedProjects.value = new Set(expandedProjects.value)

  if (!projectConfigs.value[id]) {
    try {
      const data = await $fetch<{ claude_md: string; lessons_md: string }>(`${apiUrl}/projects/${id}/config`)
      projectConfigs.value[id] = {
        ...data,
        _claudeDirty: false,
        _lessonsDirty: false,
        _savingClaude: false,
        _savingLessons: false,
      }
    } catch {
      projectConfigs.value[id] = {
        claude_md: '',
        lessons_md: '',
        _claudeDirty: false,
        _lessonsDirty: false,
        _savingClaude: false,
        _savingLessons: false,
      }
    }
  }
}

async function saveProjectClaude(id: string) {
  const cfg = projectConfigs.value[id]
  if (!cfg) return
  cfg._savingClaude = true
  try {
    await $fetch(`${apiUrl}/projects/${id}/claude-md`, {
      method: 'PUT',
      body: cfg.claude_md,
      headers: { 'Content-Type': 'text/plain' },
    })
    cfg._claudeDirty = false
  } catch {
    alert('Failed to save CLAUDE.md')
  } finally {
    cfg._savingClaude = false
  }
}

async function saveProjectLessons(id: string) {
  const cfg = projectConfigs.value[id]
  if (!cfg) return
  cfg._savingLessons = true
  try {
    await $fetch(`${apiUrl}/projects/${id}/lessons-md`, {
      method: 'PUT',
      body: cfg.lessons_md,
      headers: { 'Content-Type': 'text/plain' },
    })
    cfg._lessonsDirty = false
  } catch {
    alert('Failed to save lessons.md')
  } finally {
    cfg._savingLessons = false
  }
}

async function deleteProject(p: Project) {
  if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return
  try {
    await $fetch(`${apiUrl}/projects/${p.id}`, { method: 'DELETE' })
    projects.value = projects.value.filter(x => x.id !== p.id)
    delete projectConfigs.value[p.id]
    expandedProjects.value.delete(p.id)
    expandedProjects.value = new Set(expandedProjects.value)
  } catch {
    alert('Failed to delete project')
  }
}

// --- Init ---
async function fetchSessions() {
  try {
    sessions.value = await $fetch<any[]>(`${apiUrl}/admin/sessions`)
  } catch {
    // Backend not reachable
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchSessions()
  fetchProjects()

  // Tick every second for elapsed time display
  tickTimer = setInterval(() => { now.value = Date.now() }, 1000)

  // Auto-refresh sessions every 15s if any are running
  refreshTimer = setInterval(() => {
    const hasRunning = sessions.value.some(s => s.status === 'running')
    if (hasRunning) fetchSessions()
  }, 15_000)
})

onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer)
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>
