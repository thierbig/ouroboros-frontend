<template>
  <div class="h-full flex flex-col bg-gray-950">
    <div class="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900">
      <div class="flex items-center gap-2 text-sm text-gray-300 font-mono truncate">
        {{ path }}
      </div>
      <UButton
        variant="ghost"
        size="xs"
        @click="fetchFile"
        :loading="loading"
      >
        Reload
      </UButton>
    </div>

    <div class="flex-1 overflow-auto p-0">
      <div v-if="loading" class="p-4 text-gray-500 text-sm">Loading...</div>
      <div v-else-if="fileError" class="p-4 text-red-400 text-sm">{{ fileError }}</div>
      <pre v-else class="text-xs leading-relaxed p-0 m-0"><code><template v-for="(line, i) in lines" :key="i"><span class="inline-block w-12 text-right pr-3 text-gray-600 select-none border-r border-gray-800 mr-3">{{ i + 1 }}</span><span class="text-gray-300">{{ line }}</span>
</template></code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ path: string }>()

const config = useRuntimeConfig()
const content = ref('')
const loading = ref(false)
const fileError = ref<string | null>(null)

const lines = computed(() => content.value.split('\n'))

const BLOCKED_PATTERNS = ['.env', 'credentials', 'secret', '.pem', '.key', 'id_rsa']

function isSensitive(filePath: string): boolean {
  const name = filePath.replace(/\\/g, '/').split('/').pop()?.toLowerCase() || ''
  return BLOCKED_PATTERNS.some(p => name.includes(p))
}

async function fetchFile() {
  if (isSensitive(props.path)) {
    content.value = ''
    fileError.value = 'Sensitive file — hidden from viewer'
    loading.value = false
    return
  }
  loading.value = true
  fileError.value = null
  try {
    const data = await $fetch<{ content: string }>(`${config.public.apiUrl}/files/${props.path}`)
    content.value = data.content
  } catch (e: any) {
    fileError.value = e.message || 'Failed to load file'
  } finally {
    loading.value = false
  }
}

watch(() => props.path, fetchFile, { immediate: true })
</script>
