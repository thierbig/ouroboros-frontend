// types/index.ts

export interface AgentConfig {
  provider: 'anthropic' | 'openai'
  model: string
  api_key: string
  working_dir?: string
}

export interface ToolCallEvent {
  type: 'tool_call'
  name: string
  args: Record<string, any>
}

export interface ToolResultEvent {
  type: 'tool_result'
  name: string
  result: string
}

export interface StreamEvent {
  type: 'stream'
  token: string
}

export interface ResponseEvent {
  type: 'response'
  content: string
}

export interface StatusEvent {
  type: 'status'
  message: string
}

export interface DoneEvent {
  type: 'done'
}

export interface SelfCorrectingEvent {
  type: 'self_correcting'
  error: string
}

export interface ErrorEvent {
  type: 'error'
  message: string
}

export interface SessionEvent {
  type: 'session'
  session_id: string
}

export interface ResumedEvent {
  type: 'resumed'
  message_count: number
}

export interface TerminalOutputEvent {
  type: 'terminal_output'
  line: string
}

export interface HeartbeatEvent {
  type: 'heartbeat'
}

export type AgentEvent =
  | ToolCallEvent
  | ToolResultEvent
  | StreamEvent
  | ResponseEvent
  | StatusEvent
  | DoneEvent
  | SelfCorrectingEvent
  | ErrorEvent
  | SessionEvent
  | ResumedEvent
  | TerminalOutputEvent
  | HeartbeatEvent

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCallWithResult[]
  isStreaming?: boolean
  timestamp?: string
}

export interface ToolCallWithResult {
  name: string
  args: Record<string, any>
  result?: string
  isRunning?: boolean
  terminalOutput?: string
}

export interface ModelOption {
  id: string
  name: string
}

export interface SessionSummary {
  _id: string
  created_at: string
  status: 'running' | 'completed' | 'error'
  provider: 'anthropic' | 'openai'
  model: string
  total_tokens: number
  total_cost: number
  working_dir?: string
}

export interface SessionDetail extends SessionSummary {
  messages: Array<{
    role: string
    content: string
    tool_calls?: any[]
    tool_call_id?: string
  }>
}

export interface Chunk {
  _id: string
  session_id: string
  chunk_index: number
  created_at: string
  provider: string
  model: string
  prompt: any[]
  prompt_tokens: number
  prompt_size_kb: number
  response: any
  response_tokens: number
  response_size_kb: number
  total_tokens: number
  cost: number
  latency_ms: number
  tool_calls: Array<{ name: string; args: any }>
  status: 'ok' | 'error'
  error: string | null
}

export interface AdminStats {
  total_tokens: number
  total_cost: number
  session_count: number
}
