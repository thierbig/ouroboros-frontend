<template>
  <div class="relative" ref="dropdownRef">
    <button
      class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--ob-border)] hover:border-[var(--ob-border-hi)] text-sm text-[var(--ob-text-2)] cursor-pointer min-w-44 ob-transition-fast"
      style="background: rgba(255,255,255,0.03);"
      @click="toggleDropdown"
    >
      <span class="truncate flex-1 text-left">{{ selectedLabel || 'Select project...' }}</span>
      <span class="text-[var(--ob-text-3)] text-xs ob-transition-fast" :class="open ? 'rotate-180' : ''">&#9662;</span>
    </button>

    <div
      v-if="open"
      class="absolute top-full left-0 mt-1.5 w-72 ob-glass rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto ob-animate-scale"
    >
      <div v-if="projects.length === 0" class="px-3 py-3 text-xs text-[var(--ob-text-3)]">
        No projects yet
      </div>
      <div
        v-for="p in projects"
        :key="p.id"
        class="flex items-center gap-2 px-3 py-2.5 hover:bg-white/[0.04] cursor-pointer group ob-transition-fast"
        :class="{ 'bg-white/[0.03]': p.path === modelValue }"
        @click="selectProject(p)"
      >
        <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="p.path === modelValue ? 'bg-emerald-400' : 'bg-[var(--ob-text-3)]'" />
        <span class="flex-1 text-sm text-[var(--ob-text)] truncate">{{ p.name }}</span>
        <button
          class="text-red-400/50 hover:text-red-400 ob-transition-fast text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-red-400/10 opacity-0 group-hover:opacity-100"
          title="Delete project"
          @click.stop="deleteProject(p)"
        >
          &times;
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl as string

const open = ref(false)
const dropdownRef = ref<HTMLElement>()

interface Project {
  id: string
  name: string
  path: string
}

const projects = ref<Project[]>([])

const selectedLabel = computed(() => {
  const p = projects.value.find(p => p.path === props.modelValue)
  return p?.name || ''
})

async function fetchProjects() {
  try {
    projects.value = await $fetch<Project[]>(`${apiUrl}/projects`)
  } catch {
    // Backend not reachable
  }
}

function toggleDropdown() {
  open.value = !open.value
  if (open.value) fetchProjects()
}

function selectProject(p: Project) {
  emit('update:modelValue', p.path)
  open.value = false
}

async function deleteProject(p: Project) {
  if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return
  try {
    await $fetch(`${apiUrl}/projects/${p.id}`, { method: 'DELETE' })
    if (p.path === props.modelValue) {
      emit('update:modelValue', '')
    }
    await fetchProjects()
  } catch (e: any) {
    alert(e.data?.detail || e.message || 'Failed to delete project')
  }
}

function onClickOutside(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => {
  fetchProjects()
  document.addEventListener('click', onClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
})

defineExpose({ fetchProjects })
</script>
