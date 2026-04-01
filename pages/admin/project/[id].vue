<template>
  <div class="min-h-screen bg-gray-950 text-gray-100 p-6">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <NuxtLink to="/analytics" class="text-sm text-blue-400 hover:text-blue-300">
            &larr; Back to Analytics
          </NuxtLink>
          <h1 class="text-2xl font-bold mt-2">{{ projectName }}</h1>
          <p class="text-sm text-gray-500">Project configuration &amp; agent memory</p>
        </div>
        <UButton
          color="error"
          variant="subtle"
          size="sm"
          @click="confirmDelete"
          :loading="deleting"
        >
          Delete Project
        </UButton>
      </div>

      <div v-if="loading" class="space-y-4">
        <div class="h-48 bg-gray-800 rounded-lg animate-pulse" />
        <div class="h-48 bg-gray-800 rounded-lg animate-pulse" />
      </div>

      <div v-else-if="error" class="text-red-400 py-8 text-center">{{ error }}</div>

      <template v-else>
        <!-- CLAUDE.md -->
        <div class="mb-8">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h2 class="text-lg font-semibold">CLAUDE.md</h2>
              <p class="text-xs text-gray-500">Project instructions — injected into every agent session</p>
            </div>
            <UButton
              v-if="claudeDirty"
              size="sm"
              color="primary"
              @click="saveClaudeMd"
              :loading="savingClaude"
            >
              Save
            </UButton>
          </div>
          <textarea
            v-model="claudeMd"
            class="w-full h-56 bg-gray-900 border border-gray-800 rounded-lg p-4 text-sm font-mono text-gray-300 focus:outline-none focus:border-gray-600 resize-y"
            placeholder="# Project Instructions&#10;&#10;Write rules, conventions, and context for the agent..."
          />
        </div>

        <!-- lessons.md -->
        <div class="mb-8">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h2 class="text-lg font-semibold">lessons.md</h2>
              <p class="text-xs text-gray-500">Agent learnings — accumulated from past corrections, reviewed each session</p>
            </div>
            <UButton
              v-if="lessonsDirty"
              size="sm"
              color="primary"
              @click="saveLessonsMd"
              :loading="savingLessons"
            >
              Save
            </UButton>
          </div>
          <textarea
            v-model="lessonsMd"
            class="w-full h-56 bg-gray-900 border border-gray-800 rounded-lg p-4 text-sm font-mono text-gray-300 focus:outline-none focus:border-gray-600 resize-y"
            placeholder="# Lessons Learned&#10;&#10;The agent will add entries here after corrections..."
          />
        </div>

        <!-- Info -->
        <div class="bg-gray-900 border border-gray-800 rounded-lg p-4 text-sm text-gray-400">
          <p class="font-medium text-gray-300 mb-2">How it works</p>
          <ul class="space-y-1 text-xs">
            <li><strong>CLAUDE.md</strong> is read at the start of every session and injected into the system prompt. Write project rules, stack info, and conventions here.</li>
            <li><strong>lessons.md</strong> is also injected into the system prompt. The agent appends learnings after corrections so it doesn't repeat mistakes.</li>
            <li>Both files live in the project directory and are version-controllable.</li>
          </ul>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl as string

const projectId = route.params.id as string
const projectName = projectId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const claudeMd = ref('')
const lessonsMd = ref('')
const originalClaude = ref('')
const originalLessons = ref('')
const loading = ref(true)
const error = ref<string | null>(null)
const savingClaude = ref(false)
const savingLessons = ref(false)
const deleting = ref(false)
const router = useRouter()

async function confirmDelete() {
  if (!window.confirm(`Delete project "${projectName}"? This cannot be undone.`)) return
  deleting.value = true
  try {
    await $fetch(`${apiUrl}/projects/${projectId}`, { method: 'DELETE' })
    router.push('/')
  } catch (e: any) {
    error.value = e.message || 'Failed to delete project'
  } finally {
    deleting.value = false
  }
}

const claudeDirty = computed(() => claudeMd.value !== originalClaude.value)
const lessonsDirty = computed(() => lessonsMd.value !== originalLessons.value)

onMounted(async () => {
  try {
    const data = await $fetch<{ claude_md: string; lessons_md: string }>(`${apiUrl}/projects/${projectId}/config`)
    claudeMd.value = data.claude_md
    lessonsMd.value = data.lessons_md
    originalClaude.value = data.claude_md
    originalLessons.value = data.lessons_md
  } catch (e: any) {
    error.value = e.message || 'Failed to load project config'
  } finally {
    loading.value = false
  }
})

async function saveClaudeMd() {
  savingClaude.value = true
  try {
    await $fetch(`${apiUrl}/projects/${projectId}/claude-md`, {
      method: 'PUT',
      body: claudeMd.value,
      headers: { 'Content-Type': 'text/plain' },
    })
    originalClaude.value = claudeMd.value
  } catch (e: any) {
    error.value = e.message || 'Failed to save CLAUDE.md'
  } finally {
    savingClaude.value = false
  }
}

async function saveLessonsMd() {
  savingLessons.value = true
  try {
    await $fetch(`${apiUrl}/projects/${projectId}/lessons-md`, {
      method: 'PUT',
      body: lessonsMd.value,
      headers: { 'Content-Type': 'text/plain' },
    })
    originalLessons.value = lessonsMd.value
  } catch (e: any) {
    error.value = e.message || 'Failed to save lessons.md'
  } finally {
    savingLessons.value = false
  }
}
</script>
