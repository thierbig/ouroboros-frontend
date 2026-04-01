<template>
  <div class="flex-1 overflow-y-auto bg-gray-950 p-4">
    <div v-if="!address" class="flex items-center justify-center h-full">
      <p class="text-sm text-gray-600">No contract deployed yet</p>
    </div>

    <div v-else class="space-y-4">
      <!-- Contract header -->
      <div class="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3">
        <div class="flex items-center gap-2">
          <span class="text-lg">📄</span>
          <h3 class="text-sm font-semibold text-white">Deployed Contract</h3>
          <UBadge color="warning" variant="subtle" size="xs">Base Sepolia</UBadge>
        </div>

        <!-- Contract name -->
        <div v-if="contractName">
          <p class="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Contract Name</p>
          <p class="text-sm text-gray-200 font-mono">{{ contractName }}</p>
        </div>

        <!-- Address -->
        <div>
          <p class="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Address</p>
          <div class="flex items-center gap-2">
            <p class="text-sm text-emerald-400 font-mono break-all">{{ address }}</p>
            <button
              class="text-xs text-gray-500 hover:text-gray-300 shrink-0 cursor-pointer"
              title="Copy address"
              @click="copyAddress"
            >
              {{ copied ? '✓' : '📋' }}
            </button>
          </div>
        </div>

        <!-- BaseScan link -->
        <a
          :href="baseScanUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm text-primary-400 hover:text-primary-300"
        >
          View on BaseScan
          <span class="text-xs">↗</span>
        </a>
      </div>

      <!-- Network info -->
      <div class="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-2">
        <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Network Details</h4>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p class="text-gray-500">Network</p>
            <p class="text-gray-200">Base Sepolia</p>
          </div>
          <div>
            <p class="text-gray-500">Chain ID</p>
            <p class="text-gray-200">84532</p>
          </div>
          <div>
            <p class="text-gray-500">RPC</p>
            <p class="text-gray-200 truncate">https://sepolia.base.org</p>
          </div>
          <div>
            <p class="text-gray-500">Explorer</p>
            <p class="text-gray-200 truncate">sepolia.basescan.org</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  address: string | null
  contractName?: string
}>()

const copied = ref(false)

const baseScanUrl = computed(() => {
  if (!props.address) return ''
  return `https://sepolia.basescan.org/address/${props.address}`
})

async function copyAddress() {
  if (!props.address) return
  try {
    await navigator.clipboard.writeText(props.address)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // Clipboard API not available
  }
}
</script>
