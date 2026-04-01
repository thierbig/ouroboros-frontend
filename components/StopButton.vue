<template>
  <UButton
    v-if="isStreaming"
    color="error"
    variant="soft"
    size="sm"
    @click="$emit('stop')"
  >
    Stop
  </UButton>
</template>

<script setup lang="ts">
defineProps<{ isStreaming: boolean }>()
defineEmits<{ stop: [] }>()
</script>
