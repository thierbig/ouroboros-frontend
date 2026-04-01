<template>
  <div class="flex items-center gap-1.5">
    <USelect
      v-model="config.provider"
      :items="providers"
      size="sm"
      class="w-28"
      @update:model-value="onProviderChange"
    />
    <USelect
      v-model="config.model"
      :items="modelItems"
      size="sm"
      class="w-44"
    />
  </div>
</template>

<script setup lang="ts">
import type { AgentConfig, ModelOption } from '~/types'

const config = defineModel<AgentConfig>('config', { required: true })

const providers = ['anthropic', 'openai']

const modelsByProvider: Record<string, ModelOption[]> = {
  anthropic: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
    { id: 'claude-haiku-3-5-20241022', name: 'Claude Haiku 3.5' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  ],
}

const modelItems = computed(() => {
  const models = modelsByProvider[config.value.provider] || []
  return models.map(m => ({ label: m.name, value: m.id }))
})

function onProviderChange() {
  const available = modelsByProvider[config.value.provider]
  if (available?.length) {
    config.value.model = available[0].id
  }
}
</script>
