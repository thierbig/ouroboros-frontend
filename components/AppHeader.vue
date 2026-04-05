<template>
  <header class="ob-glass sticky top-0 z-50 border-b border-[var(--ob-border)]" style="background: rgba(6, 7, 11, 0.85); backdrop-filter: blur(20px);">
    <!-- Main row -->
    <div class="flex items-center gap-3 px-4 py-2.5">
      <!-- Logo -->
      <NuxtLink to="/" class="ob-logo text-lg shrink-0">
        Ouroboros
      </NuxtLink>

      <!-- Desktop controls -->
      <div class="hidden md:flex items-center gap-3 flex-1 min-w-0">
        <ModelSelector v-model:config="config" />

        <!-- API Key -->
        <div class="flex items-center gap-1.5 min-w-0">
          <template v-if="hasStoredKey && !showKeyInput">
            <span class="ob-badge ob-badge-teal">Key saved</span>
            <button
              class="text-[11px] text-[var(--ob-text-3)] hover:text-[var(--ob-text-2)] cursor-pointer ob-transition-fast"
              @click="showKeyInput = true"
            >
              Change
            </button>
          </template>
          <template v-else>
            <UInput
              v-model="keyInput"
              type="password"
              placeholder="API Key"
              size="sm"
              class="w-44"
              @keydown.enter="saveKey"
              @blur="saveKey"
            />
            <UButton size="xs" color="neutral" variant="subtle" @click="saveKey">Save</UButton>
          </template>
        </div>

        <WorkDirSelector v-model="config.working_dir" />
      </div>

      <div class="flex-1 md:hidden" />

      <!-- Always-visible status items -->
      <div class="flex items-center gap-2.5">
        <StepIndicator
          :is-streaming="isStreaming"
          :iteration="currentIteration"
          :max-iterations="maxIterations"
        />

        <StopButton :is-streaming="isStreaming" @stop="$emit('stop')" />

        <!-- Desktop nav links -->
        <nav class="hidden md:flex items-center gap-1">
          <NuxtLink
            to="/analytics"
            class="px-2.5 py-1 rounded-md text-[11px] font-medium text-[var(--ob-text-3)] hover:text-[var(--ob-text)] hover:bg-white/[0.04] ob-transition-fast"
          >
            Analytics
          </NuxtLink>
          <NuxtLink
            to="/admin"
            class="px-2.5 py-1 rounded-md text-[11px] font-medium text-[var(--ob-text-3)] hover:text-[var(--ob-text)] hover:bg-white/[0.04] ob-transition-fast"
          >
            Admin
          </NuxtLink>
        </nav>

        <!-- Mobile menu toggle -->
        <button
          class="md:hidden flex items-center justify-center w-8 h-8 rounded-md hover:bg-white/[0.05] cursor-pointer ob-transition-fast"
          @click="mobileOpen = !mobileOpen"
        >
          <svg v-if="!mobileOpen" class="w-4 h-4 text-[var(--ob-text-2)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
          <svg v-else class="w-4 h-4 text-[var(--ob-text-2)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile drawer -->
    <div
      v-if="mobileOpen"
      class="md:hidden border-t border-[var(--ob-border)] px-4 py-3 space-y-3 ob-animate-up"
      style="background: rgba(10, 12, 18, 0.95);"
    >
      <ModelSelector v-model:config="config" />

      <!-- API Key -->
      <div class="flex items-center gap-1.5">
        <template v-if="hasStoredKey && !showKeyInput">
          <span class="ob-badge ob-badge-teal">Key saved</span>
          <button
            class="text-[11px] text-[var(--ob-text-3)] hover:text-[var(--ob-text-2)] cursor-pointer"
            @click="showKeyInput = true"
          >
            Change
          </button>
        </template>
        <template v-else>
          <UInput
            v-model="keyInput"
            type="password"
            placeholder="API Key"
            size="sm"
            class="flex-1"
            @keydown.enter="saveKey"
            @blur="saveKey"
          />
          <UButton size="xs" color="neutral" variant="subtle" @click="saveKey">Save</UButton>
        </template>
      </div>

      <WorkDirSelector v-model="config.working_dir" />

      <div class="ob-divider" />

      <div class="flex gap-2">
        <NuxtLink
          to="/analytics"
          class="flex-1 text-center px-3 py-2 rounded-lg text-xs font-medium text-[var(--ob-text-2)] hover:text-[var(--ob-text)] bg-white/[0.03] hover:bg-white/[0.06] ob-transition-fast"
          @click="mobileOpen = false"
        >
          Analytics
        </NuxtLink>
        <NuxtLink
          to="/admin"
          class="flex-1 text-center px-3 py-2 rounded-lg text-xs font-medium text-[var(--ob-text-2)] hover:text-[var(--ob-text)] bg-white/[0.03] hover:bg-white/[0.06] ob-transition-fast"
          @click="mobileOpen = false"
        >
          Admin
        </NuxtLink>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { AgentConfig } from '~/types'

const config = defineModel<AgentConfig>('config', { required: true })

defineProps<{
  isStreaming: boolean
  isSelfCorrecting: boolean
  currentIteration: number
  maxIterations: number
}>()

defineEmits<{
  stop: []
}>()

const STORAGE_KEY = 'ouroboros_api_key'
const PROVIDER_KEY = 'ouroboros_provider'
const MODEL_KEY = 'ouroboros_model'
const showKeyInput = ref(false)
const keyInput = ref('')
const mobileOpen = ref(false)

const hasStoredKey = computed(() => !!config.value.api_key)

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    config.value.api_key = stored
  } else {
    showKeyInput.value = true
  }
  const storedProvider = localStorage.getItem(PROVIDER_KEY) as 'anthropic' | 'openai' | null
  if (storedProvider) config.value.provider = storedProvider
  const storedModel = localStorage.getItem(MODEL_KEY)
  if (storedModel) config.value.model = storedModel
})

watch(() => config.value.provider, (v) => localStorage.setItem(PROVIDER_KEY, v))
watch(() => config.value.model, (v) => localStorage.setItem(MODEL_KEY, v))

function saveKey() {
  const key = keyInput.value.trim()
  if (!key) return
  config.value.api_key = key
  localStorage.setItem(STORAGE_KEY, key)
  keyInput.value = ''
  showKeyInput.value = false
}
</script>
