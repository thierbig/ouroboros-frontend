<template>
  <div v-if="isStreaming" class="flex items-center gap-2 text-xs text-[var(--ob-text-2)]">
    <span class="ob-dot ob-dot-live" style="width: 5px; height: 5px;" />
    <span style="font-family: var(--font-mono);">Step {{ iteration }}/{{ maxIterations }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isStreaming: boolean
  iteration: number
  maxIterations: number
}>()
</script>
