// composables/useAdmin.ts
import type { SessionSummary, SessionDetail, Chunk, AdminStats } from '~/types'

export function useAdmin() {
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string

  const sessions = ref<SessionSummary[]>([])
  const currentSession = ref<SessionDetail | null>(null)
  const chunks = ref<Chunk[]>([])
  const stats = computed<AdminStats>(() => ({
    session_count: sessions.value.length,
    total_tokens: sessions.value.reduce((sum, s) => sum + (s.total_tokens || 0), 0),
    total_cost: sessions.value.reduce((sum, s) => sum + (s.total_cost || 0), 0),
  }))
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchSessions() {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<SessionSummary[]>(`${apiUrl}/admin/sessions`)
      sessions.value = data
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch sessions'
    } finally {
      loading.value = false
    }
  }

  async function fetchSession(id: string) {
    loading.value = true
    error.value = null
    try {
      const [session, sessionChunks] = await Promise.all([
        $fetch<SessionDetail>(`${apiUrl}/admin/sessions/${id}`),
        $fetch<Chunk[]>(`${apiUrl}/admin/sessions/${id}/chunks`),
      ])
      currentSession.value = session
      chunks.value = sessionChunks
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch session'
    } finally {
      loading.value = false
    }
  }

  return {
    sessions,
    currentSession,
    chunks,
    stats,
    loading,
    error,
    fetchSessions,
    fetchSession,
  }
}
