<template>
  <div class="flex-1 flex flex-col">
    <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- Welcome screen — no messages yet -->
      <div v-if="messages.length === 0" class="flex-1 flex items-center justify-center h-full">
        <div class="text-center max-w-xl">
          <p class="text-3xl font-bold text-white mb-1">🐍 Ouroboros</p>
          <p class="text-sm text-gray-500 mb-8">AI agent for Pyth Network games</p>

          <!-- Step 1: No project selected — pick or create -->
          <template v-if="!hasProject && step === 'pick'">
            <p class="text-sm text-gray-400 mb-4">Select a project to get started, or create a new one.</p>

            <div class="flex flex-col items-center gap-3">
              <div class="w-64">
                <USelect
                  :model-value="selectedProject"
                  @update:model-value="$emit('selectProject', $event)"
                  :items="projectItems"
                  placeholder="Choose a project..."
                  size="lg"
                />
              </div>

              <div class="text-xs text-gray-600">or</div>

              <button
                class="w-64 px-4 py-3 rounded-lg border border-dashed border-gray-700 hover:border-primary-500 hover:bg-gray-900 transition-colors cursor-pointer"
                @click="step = 'name'"
              >
                <p class="text-sm font-medium text-gray-200">Create new project</p>
                <p class="text-xs text-gray-500 mt-1">Pick a template and scaffold from scratch</p>
              </button>
            </div>

            <NuxtLink
              to="/analytics"
              class="text-xs text-gray-500 hover:text-gray-300 transition-colors mt-6 inline-block"
            >
              Analytics
            </NuxtLink>
          </template>

          <!-- Step 2: Name the project -->
          <template v-else-if="step === 'name'">
            <p class="text-sm text-gray-400 mb-4">Name your project</p>
            <div class="w-64 mx-auto space-y-2">
              <UInput
                v-model="newProjectName"
                placeholder="My Awesome App"
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
              <button class="text-xs text-gray-500 hover:text-gray-300 cursor-pointer" @click="step = 'pick'; newProjectName = ''">
                Cancel
              </button>
            </div>
          </template>

          <!-- Step 3: Pick a template -->
          <template v-else-if="step === 'template'">
            <p class="text-sm text-gray-400 mb-2">What are you building?</p>
            <p class="text-xs text-gray-600 mb-6">{{ newProjectName }}</p>

            <div class="grid grid-cols-2 gap-3 mb-4">
              <button
                v-for="t in templates"
                :key="t.id"
                class="text-left p-4 rounded-lg border border-gray-800 hover:border-primary-500 hover:bg-gray-900 transition-colors cursor-pointer"
                @click="createWithTemplate(t)"
              >
                <p class="text-lg mb-1">{{ t.icon }}</p>
                <p class="text-sm font-medium text-gray-200">{{ t.label }}</p>
                <p class="text-xs text-gray-500 mt-1">{{ t.description }}</p>
              </button>
            </div>

            <button class="text-xs text-gray-500 hover:text-gray-300 cursor-pointer" @click="step = 'name'">
              Back
            </button>
            <p v-if="createError" class="text-xs text-red-400 mt-2">{{ createError }}</p>
          </template>

          <!-- Project selected — show action suggestions -->
          <template v-else-if="hasProject && step === 'pick'">
            <p class="text-lg font-semibold text-white mb-1">{{ selectedProjectName }}</p>
            <p class="text-sm text-gray-400 mb-6">What would you like to do?</p>

            <div class="grid grid-cols-2 gap-3 mb-6">
              <button
                v-for="suggestion in suggestions"
                :key="suggestion.label"
                class="text-left p-3 rounded-lg border border-gray-800 hover:border-gray-600 hover:bg-gray-900 transition-colors cursor-pointer"
                @click="emit('send', suggestion.prompt)"
              >
                <p class="text-sm font-medium text-gray-200">{{ suggestion.label }}</p>
                <p class="text-xs text-gray-500 mt-1">{{ suggestion.description }}</p>
              </button>
            </div>

            <div class="flex items-center justify-center gap-4">
              <NuxtLink
                v-if="selectedProjectId"
                :to="`/admin/project/${selectedProjectId}`"
                class="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                CLAUDE.md &amp; Lessons
              </NuxtLink>
              <span v-if="selectedProjectId" class="text-gray-700 text-xs">|</span>
              <NuxtLink
                to="/analytics"
                class="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Analytics
              </NuxtLink>
            </div>
          </template>
        </div>
      </div>

      <ChatMessage
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
      />
    </div>

    <div class="border-t border-gray-800 p-4">
      <form @submit.prevent="handleSubmit" class="flex gap-2">
        <UTextarea
          v-model="input"
          placeholder="Describe what you want to build or fix..."
          :rows="1"
          autoresize
          class="flex-1"
          @keydown.enter.exact.prevent="handleSubmit"
        />
        <UButton
          type="submit"
          :disabled="!input.trim() || isStreaming"
          color="primary"
          size="lg"
        >
          Send
        </UButton>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChatMessage as ChatMessageType } from '~/types'

const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl as string

const props = defineProps<{
  messages: ChatMessageType[]
  isStreaming?: boolean
  hasProject?: boolean
  selectedProject?: string
}>()

const emit = defineEmits<{
  send: [content: string]
  selectProject: [path: string]
}>()

const input = ref('')
const messagesContainer = ref<HTMLElement>()
const step = ref<'pick' | 'name' | 'template'>('pick')

interface Project {
  id: string
  name: string
  path: string
}

const projects = ref<Project[]>([])

const projectItems = computed(() =>
  projects.value.map(p => ({ label: p.name, value: p.path }))
)

const selectedProjectId = computed(() => {
  const p = projects.value.find(p => p.path === props.selectedProject)
  return p?.id
})

const selectedProjectName = computed(() => {
  const p = projects.value.find(p => p.path === props.selectedProject)
  return p?.name || ''
})

async function fetchProjects() {
  try {
    projects.value = await $fetch<Project[]>(`${apiUrl}/projects`)
  } catch {
    // Backend not reachable
  }
}

onMounted(fetchProjects)

// Re-fetch projects when selection changes (e.g. project deleted from header)
watch(() => props.selectedProject, fetchProjects)

// Templates
const templates = [
  {
    id: 'web-app',
    icon: '🌐',
    label: 'Web App',
    description: 'Full-stack web application with frontend and backend',
    prompt: (name: string) =>
      `I just created a project called "${name}". I want to build a web application. Ask me questions one at a time about what it should do, what stack to use (React, Vue, Express, etc.), and what features it needs. Then scaffold the project for me.`,
  },
  {
    id: 'api',
    icon: '⚡',
    label: 'REST API',
    description: 'Backend API with endpoints, validation, and data models',
    prompt: (name: string) =>
      `I just created a project called "${name}". I want to build a REST API. Ask me questions one at a time about what resources/endpoints it needs, what data models to use, and what framework (Express, FastAPI, etc.). Then scaffold it for me.`,
  },
  {
    id: 'cli',
    icon: '💻',
    label: 'CLI Tool',
    description: 'Command-line tool or script',
    prompt: (name: string) =>
      `I just created a project called "${name}". I want to build a CLI tool. Ask me questions one at a time about what it should do, what language to use, and what commands/flags it needs. Then scaffold it for me.`,
  },
  {
    id: 'freeform',
    icon: '✨',
    label: 'Something Else',
    description: 'Describe what you want and I\'ll help you build it',
    prompt: (name: string) =>
      `I just created a project called "${name}". Help me figure out what to build — ask me questions one at a time to understand what I need, then scaffold the code for me.`,
  },
]

// Suggestions for existing projects
const suggestions = [
  {
    label: 'Fix a bug',
    description: 'Find and fix issues in the codebase',
    prompt: 'Can you look through the code, find any bugs, and fix them?',
  },
  {
    label: 'Add a feature',
    description: 'Add new functionality to the project',
    prompt: 'Can you look at the existing code and suggest improvements? Start by reading the files to understand the project.',
  },
  {
    label: 'Refactor code',
    description: 'Improve code structure and quality',
    prompt: 'Can you review the code for any duplication or poor structure, and refactor it?',
  },
  {
    label: 'Explain code',
    description: 'Read and explain how the project works',
    prompt: 'Can you read through the project files and explain how the codebase is structured and what it does?',
  },
  {
    label: 'Deploy to Netlify',
    description: 'Build and deploy the project to see it live',
    prompt: 'Build this project and deploy it to Netlify so I can see it live. Create a Netlify site if one doesn\'t exist yet, then deploy the build output.',
  },
]

// Create project flow
const newProjectName = ref('')
const creatingProject = ref(false)
const createError = ref<string | null>(null)

function goToTemplates() {
  if (!newProjectName.value.trim()) return
  step.value = 'template'
}

async function createWithTemplate(template: typeof templates[number]) {
  const name = newProjectName.value.trim()
  if (!name) return
  creatingProject.value = true
  createError.value = null
  try {
    const data = await $fetch<{ id: string; name: string; path: string }>(`${apiUrl}/projects`, {
      method: 'POST',
      body: { name, template: template.id },
    })
    emit('selectProject', data.path)
    const refreshed = await $fetch<Project[]>(`${apiUrl}/projects`)
    projects.value = refreshed
    step.value = 'pick'
    newProjectName.value = ''
    emit('send', template.prompt(name))
  } catch (e: any) {
    createError.value = e.data?.detail || e.message || 'Failed to create project'
  } finally {
    creatingProject.value = false
  }
}

function handleSubmit() {
  const content = input.value.trim()
  if (!content) return
  emit('send', content)
  input.value = ''
}

watch(
  () => props.messages,
  () => {
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    })
  },
  { deep: true }
)
</script>
