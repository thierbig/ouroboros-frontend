<template>
  <div class="min-h-screen flex flex-col" style="background: var(--ob-deep);">
    <AppHeader
      v-model:config="agentConfig"
      :is-streaming="false"
      :is-self-correcting="false"
      :current-iteration="0"
      :max-iterations="25"
    />

    <div class="flex-1 flex items-center justify-center px-4 py-10">
      <div class="w-full max-w-2xl">

        <!-- Hero -->
        <div class="text-center mb-10 ob-animate-up">
          <h1 class="ob-logo text-5xl sm:text-6xl mb-3 tracking-tight">Ouroboros</h1>
          <p class="text-sm text-[var(--ob-text-3)] font-light tracking-wide" style="font-family: var(--font-body);">
            AI agent for Pyth Network games
          </p>
        </div>

        <!-- Gate: require API key -->
        <div v-if="!agentConfig.api_key" class="text-center ob-animate-up ob-delay-2">
          <div class="ob-glass rounded-xl px-6 py-8 max-w-sm mx-auto">
            <div class="w-10 h-10 rounded-full border border-[var(--ob-border-hi)] flex items-center justify-center mx-auto mb-4">
              <svg class="w-5 h-5 text-[var(--ob-text-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"/>
              </svg>
            </div>
            <p class="text-sm text-[var(--ob-text-2)]">Enter your API key in the header to get started.</p>
          </div>
        </div>

        <!-- Step 1: Pick or create -->
        <template v-else-if="step === 'pick'">
          <!-- Existing projects -->
          <div v-if="projects.length > 0" class="mb-8 ob-animate-up ob-delay-1">
            <p class="text-xs font-medium text-[var(--ob-text-3)] uppercase tracking-wider mb-4 text-center" style="font-family: var(--font-mono);">
              Your Projects
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
              <button
                v-for="(p, idx) in projects"
                :key="p.id"
                class="ob-glass ob-glass-hover text-left p-4 rounded-xl cursor-pointer group relative ob-animate-scale"
                :class="[
                  selectedProject?.id === p.id ? 'ob-glass-active' : '',
                  `ob-delay-${idx + 2}`
                ]"
                @click="selectProject(p)"
              >
                <div class="flex items-center gap-2.5 mb-1">
                  <span class="w-2 h-2 rounded-full shrink-0" :class="p.has_code ? 'bg-emerald-400' : 'bg-[var(--ob-text-3)]'" />
                  <p class="text-sm font-medium text-[var(--ob-text)] truncate" style="font-family: var(--font-display);">
                    {{ p.name }}
                  </p>
                </div>
                <p class="text-[11px] text-[var(--ob-text-3)] ml-[18px]">
                  {{ p.has_code ? 'Open project' : 'New project' }}
                </p>
                <span
                  role="button"
                  tabindex="0"
                  class="absolute top-3 right-3 text-red-400/60 hover:text-red-400 text-xs w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-400/10 opacity-0 group-hover:opacity-100 ob-transition-fast"
                  title="Delete project"
                  @click.stop="deleteProject(p)"
                  @keydown.enter.stop="deleteProject(p)"
                >
                  &times;
                </span>
              </button>
            </div>
          </div>

          <!-- Project detail panel -->
          <div
            v-if="selectedProject"
            class="max-w-lg mx-auto mb-8 ob-glass rounded-xl overflow-hidden ob-animate-scale"
          >
            <!-- Sessions list -->
            <div v-if="projectSessions.length > 0" class="border-b border-[var(--ob-border)]">
              <p class="text-[10px] font-medium text-[var(--ob-text-3)] uppercase tracking-wider px-4 pt-3 pb-2" style="font-family: var(--font-mono);">
                Previous sessions
              </p>
              <div class="max-h-48 overflow-y-auto">
                <button
                  v-for="s in projectSessions"
                  :key="s._id"
                  class="w-full text-left px-4 py-2.5 hover:bg-white/[0.03] ob-transition-fast flex items-center gap-3 border-t border-[var(--ob-border)] cursor-pointer"
                  @click="resumeSession(s)"
                >
                  <div class="flex-1 min-w-0">
                    <p class="text-xs text-[var(--ob-text)] truncate">{{ s.preview || 'Empty session' }}</p>
                    <p class="text-[10px] text-[var(--ob-text-3)] mt-0.5" style="font-family: var(--font-mono);">
                      {{ formatDate(s.created_at) }}
                      <span v-if="s.message_count" class="ml-2">{{ s.message_count }} msgs</span>
                      <span v-if="s.model" class="ml-2 text-[var(--ob-gold-dim)]">{{ shortModel(s.model) }}</span>
                    </p>
                  </div>
                  <span
                    role="button"
                    tabindex="0"
                    class="text-red-400/60 hover:text-red-400 text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-red-400/10 shrink-0"
                    title="Delete session"
                    @click.stop="deleteSession(s)"
                    @keydown.enter.stop="deleteSession(s)"
                  >
                    &times;
                  </span>
                  <span class="text-[10px] text-[var(--ob-text-3)] shrink-0">Resume &rarr;</span>
                </button>
              </div>
            </div>

            <!-- Actions -->
            <div class="p-4">
              <p class="text-[10px] font-medium text-[var(--ob-text-3)] uppercase tracking-wider mb-3" style="font-family: var(--font-mono);">
                {{ selectedProject.has_code ? 'Start new session' : 'Get started' }}
              </p>

              <!-- Fresh project: show template options -->
              <template v-if="!selectedProject.has_code">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <button
                    v-for="t in templates"
                    :key="t.id"
                    class="text-left p-3 rounded-lg border border-[var(--ob-border)] hover:border-[var(--ob-border-hi)] hover:bg-white/[0.03] ob-transition cursor-pointer"
                    @click="openWithPrompt(selectedProject!, t.prompt(selectedProject!.name))"
                  >
                    <p class="text-xs font-medium text-[var(--ob-text)]">{{ t.icon }} {{ t.name }}</p>
                    <p class="text-[10px] text-[var(--ob-text-3)] mt-0.5">{{ t.description }}</p>
                  </button>
                </div>
              </template>

              <!-- Project with code: show suggestions -->
              <template v-else>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    v-for="suggestion in activeSuggestions"
                    :key="suggestion.label"
                    class="text-left p-3 rounded-lg border ob-transition cursor-pointer"
                    :class="suggestion.glow
                      ? 'col-span-1 sm:col-span-2 border-emerald-500/40 bg-emerald-950/20 hover:border-emerald-400/60 hover:bg-emerald-950/30 ob-glow-teal'
                      : 'border-[var(--ob-border)] hover:border-[var(--ob-border-hi)] hover:bg-white/[0.03]'"
                    @click="suggestion.action ? suggestion.action() : openWithPrompt(selectedProject!, suggestion.prompt || '')"
                  >
                    <p class="text-xs font-medium" :class="suggestion.glow ? 'text-emerald-300' : 'text-[var(--ob-text)]'">
                      {{ suggestion.label }}
                    </p>
                    <p class="text-[10px] mt-0.5" :class="suggestion.glow ? 'text-emerald-500/60' : 'text-[var(--ob-text-3)]'">
                      {{ suggestion.description }}
                    </p>
                  </button>
                </div>
              </template>
            </div>

            <!-- Close -->
            <div class="border-t border-[var(--ob-border)] px-4 py-2.5 text-center">
              <button
                class="text-[11px] text-[var(--ob-text-3)] hover:text-[var(--ob-text-2)] cursor-pointer ob-transition-fast"
                @click="selectedProject = null; projectSessions = []"
              >
                Close
              </button>
            </div>
          </div>

          <div v-if="projects.length > 0 && !selectedProject" class="text-center mb-6">
            <div class="ob-divider max-w-[60px] mx-auto mb-4" />
          </div>

          <!-- Create new project button -->
          <div v-if="!selectedProject" class="text-center ob-animate-up ob-delay-4">
            <button
              class="ob-glass ob-glass-hover w-full max-w-xs mx-auto rounded-xl px-6 py-5 cursor-pointer block group"
              @click="step = 'name'"
            >
              <div class="w-10 h-10 rounded-full border border-dashed border-[var(--ob-border-hi)] group-hover:border-emerald-500/30 flex items-center justify-center mx-auto mb-3 ob-transition">
                <svg class="w-5 h-5 text-[var(--ob-text-3)] group-hover:text-emerald-400 ob-transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.5v15m7.5-7.5h-15"/>
                </svg>
              </div>
              <p class="text-sm font-medium text-[var(--ob-text)]" style="font-family: var(--font-display);">
                Create new project
              </p>
              <p class="text-[11px] text-[var(--ob-text-3)] mt-1">
                Pick a Pyth game template and start building
              </p>
            </button>
          </div>
        </template>

        <!-- Step 2: Name -->
        <template v-else-if="step === 'name'">
          <div class="text-center ob-animate-up">
            <p class="text-sm text-[var(--ob-text-2)] mb-5" style="font-family: var(--font-display);">Name your project</p>
            <div class="w-72 mx-auto space-y-3">
              <UInput
                v-model="newProjectName"
                placeholder="My Pyth Game"
                size="lg"
                autofocus
                @keydown.enter="goToTemplates"
              />
              <UButton
                class="w-full"
                color="primary"
                :disabled="!newProjectName.trim()"
                @click="goToTemplates"
              >
                Next
              </UButton>
              <button
                class="text-[11px] text-[var(--ob-text-3)] hover:text-[var(--ob-text-2)] cursor-pointer ob-transition-fast"
                @click="step = 'pick'; newProjectName = ''"
              >
                Cancel
              </button>
            </div>
          </div>
        </template>

        <!-- Step 3: Template -->
        <template v-else-if="step === 'template'">
          <div class="text-center ob-animate-up">
            <p class="text-sm text-[var(--ob-text-2)] mb-1" style="font-family: var(--font-display);">What are you building?</p>
            <p class="text-[11px] text-[var(--ob-gold-dim)] mb-6" style="font-family: var(--font-mono);">{{ newProjectName }}</p>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5 max-w-lg mx-auto">
              <button
                v-for="(t, idx) in templates"
                :key="t.id"
                class="ob-glass ob-glass-hover text-left p-5 rounded-xl cursor-pointer relative ob-animate-scale"
                :class="`ob-delay-${idx + 1}`"
                :disabled="creating"
                @click="createWithTemplate(t)"
              >
                <span
                  v-if="t.badge"
                  class="absolute top-3 right-3 ob-badge"
                  :class="t.badge === 'Recommended' ? 'ob-badge-teal' : 'ob-badge-gray'"
                >
                  {{ t.badge }}
                </span>
                <p class="text-2xl mb-2">{{ t.icon }}</p>
                <p class="text-sm font-medium text-[var(--ob-text)]" style="font-family: var(--font-display);">
                  {{ t.name }}
                </p>
                <p class="text-[11px] text-[var(--ob-text-3)] mt-1">{{ t.description }}</p>
              </button>
            </div>

            <button
              class="text-[11px] text-[var(--ob-text-3)] hover:text-[var(--ob-text-2)] cursor-pointer ob-transition-fast"
              @click="step = 'name'"
            >
              &larr; Back
            </button>
            <p v-if="createError" class="text-xs text-red-400 mt-3">{{ createError }}</p>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AgentConfig } from '~/types'

const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl as string
const router = useRouter()

const agentConfig = ref<AgentConfig>({
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  api_key: '',
  working_dir: '',
})

interface Project {
  id: string
  name: string
  path: string
  has_code?: boolean
  deploy_url?: string | null
  deploy_session_id?: string | null
}

interface SessionSummary {
  _id: string
  created_at: string
  model: string
  total_tokens: number
  message_count: number
  preview: string
}

const projects = ref<Project[]>([])
const step = ref<'pick' | 'name' | 'template'>('pick')
const newProjectName = ref('')
const creating = ref(false)
const createError = ref<string | null>(null)
const selectedProject = ref<Project | null>(null)
const projectSessions = ref<SessionSummary[]>([])

async function fetchProjects() {
  try {
    projects.value = await $fetch<Project[]>(`${apiUrl}/projects`)
  } catch {
    // Backend not reachable
  }
}

onMounted(fetchProjects)

async function selectProject(p: Project) {
  if (selectedProject.value?.id === p.id) {
    selectedProject.value = null
    projectSessions.value = []
    return
  }
  selectedProject.value = p
  projectSessions.value = []
  try {
    projectSessions.value = await $fetch<SessionSummary[]>(`${apiUrl}/sessions`, {
      params: { working_dir: p.path },
    })
  } catch {
    // No sessions or backend error
  }
}

function openProject(p: Project) {
  localStorage.setItem('ouroboros_last_project', p.path)
  router.push(`/chat?project=${encodeURIComponent(p.path)}`)
}

function openWithPrompt(p: Project, prompt: string) {
  localStorage.setItem('ouroboros_last_project', p.path)
  router.push(`/chat?project=${encodeURIComponent(p.path)}&prompt=${encodeURIComponent(prompt)}`)
}

function resumeSession(s: SessionSummary) {
  if (!selectedProject.value) return
  localStorage.setItem('ouroboros_last_project', selectedProject.value.path)
  router.push(`/chat?project=${encodeURIComponent(selectedProject.value.path)}&session=${s._id}`)
}

async function deleteSession(s: SessionSummary) {
  if (!confirm('Delete this session? Stats will be preserved.')) return
  try {
    await $fetch(`${apiUrl}/sessions/${s._id}`, { method: 'DELETE' })
    projectSessions.value = projectSessions.value.filter(x => x._id !== s._id)
  } catch (e: any) {
    alert(e.data?.detail || e.message || 'Failed to delete session')
  }
}

async function deleteProject(p: Project) {
  if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return
  try {
    await $fetch(`${apiUrl}/projects/${p.id}`, { method: 'DELETE' })
    if (selectedProject.value?.id === p.id) {
      selectedProject.value = null
      projectSessions.value = []
    }
    await fetchProjects()
  } catch (e: any) {
    alert(e.data?.detail || e.message || 'Failed to delete project')
  }
}

function goToTemplates() {
  if (!newProjectName.value.trim()) return
  step.value = 'template'
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString()
}

function shortModel(model: string) {
  if (model.includes('sonnet')) return 'Sonnet'
  if (model.includes('opus')) return 'Opus'
  if (model.includes('haiku')) return 'Haiku'
  if (model.includes('gpt-4o-mini')) return 'GPT-4o Mini'
  if (model.includes('gpt-4o')) return 'GPT-4o'
  return model
}

interface Suggestion {
  label: string
  description: string
  prompt?: string
  action?: () => void
  glow?: boolean
}

const activeSuggestions = computed<Suggestion[]>(() => {
  const base: Suggestion[] = [
    {
      label: 'Add Pyth integration',
      description: 'Add price feeds or entropy',
      prompt: 'Read the existing code to understand the project, then add Pyth Network integration. Use price feeds or Entropy depending on what fits best.',
    },
    {
      label: 'Fix a bug',
      description: 'Find and fix issues',
      prompt: 'Can you look through the code, find any bugs, and fix them?',
    },
    {
      label: 'Improve gameplay',
      description: 'Enhance game mechanics',
      prompt: 'Read the existing code to understand the game, then suggest and implement improvements to the gameplay mechanics.',
    },
  ]

  const deployUrl = selectedProject.value?.deploy_url
  if (deployUrl) {
    base.push({
      label: 'View / modify deployed game',
      description: deployUrl.replace('https://', ''),
      action: () => {
        const p = selectedProject.value!
        const sid = p.deploy_session_id
        if (sid) {
          localStorage.setItem('ouroboros_last_project', p.path)
          router.push(`/chat?project=${encodeURIComponent(p.path)}&session=${sid}`)
        } else {
          window.open(deployUrl, '_blank')
        }
      },
      glow: true,
    })
  } else {
    base.push({
      label: 'Deploy to Base Sepolia',
      description: 'Deploy smart contracts on-chain',
      prompt: 'Build this project and deploy the smart contracts to Base Sepolia testnet.',
    })
  }

  return base
})

const templates = [
  {
    id: 'entropy-game',
    name: 'Entropy Game',
    icon: '🎲',
    description: 'Mini game with on-chain randomness via Pyth Entropy (Base Sepolia)',
    badge: 'Recommended',
    prompt: (name: string) =>
      `I just created a project called "${name}". Read the CLAUDE.md for stack and rules. I want to build a mini game that uses Pyth Entropy for on-chain randomness on Base Sepolia. Do NOT mention the stack, CLAUDE.md, or internal details in your response. Just jump straight into asking me what kind of game I want to build — start with: "What kind of game should ${name} be?" and give examples like coin flip, dice roll, loot box, etc. One question at a time.`,
  },
  {
    id: 'price-game',
    name: 'Price Game',
    icon: '📈',
    description: 'Mini game using live crypto prices from Pyth MCP Server',
    badge: 'Recommended',
    prompt: (name: string) =>
      `I just created a project called "${name}". Read the CLAUDE.md for stack and rules. I want to build a mini game that uses Pyth Price Feeds for live crypto prices. Do NOT mention the stack, CLAUDE.md, or internal details in your response. Just ask me what kind of price-based game I want — start with: "What kind of price game should ${name} be?" and give examples like price prediction, trading simulator, price guessing, etc. One question at a time.`,
  },
  {
    id: 'custom-game',
    name: 'Custom Game',
    icon: '🎮',
    description: 'You decide — the agent picks the right Pyth features',
    badge: '',
    prompt: (name: string) =>
      `I just created a project called "${name}". Read the CLAUDE.md for stack and rules. I want to build a custom game using Pyth Network features. Do NOT mention the stack, CLAUDE.md, or internal details in your response. Just ask me what I want to build — one question at a time.`,
  },
]

async function createWithTemplate(template: typeof templates[number]) {
  const name = newProjectName.value.trim()
  if (!name) return
  creating.value = true
  createError.value = null
  try {
    const data = await $fetch<{ id: string; name: string; path: string }>(`${apiUrl}/projects`, {
      method: 'POST',
      body: { name, template: template.id },
    })
    localStorage.setItem('ouroboros_last_project', data.path)
    const prompt = template.prompt(name)
    router.push(`/chat?project=${encodeURIComponent(data.path)}&prompt=${encodeURIComponent(prompt)}`)
  } catch (e: any) {
    createError.value = e.data?.detail || e.message || 'Failed to create project'
  } finally {
    creating.value = false
  }
}
</script>
