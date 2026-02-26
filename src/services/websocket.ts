import { ref, onMounted, onUnmounted } from 'vue'
import type { WSMessage } from '@/types'

class SSEService {
  private eventSource: EventSource | null = null
  private reconnectTimer: number | null = null
  private url: string = ''
  private listeners: Map<string, Function[]> = new Map()

  constructor() {
    // 订阅所有需要的字段，包括 picUrl（默认不包含）
    const fields = [
      'status', 'name', 'singer', 'albumName',
      'duration', 'progress', 'playbackRate', 'picUrl'
    ]
    this.url = '/api/subscribe-player-status?filter=' + fields.join(',')
  }

  setURL(url: string) {
    this.url = url
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.eventSource = new EventSource(this.url)

        this.eventSource.onopen = () => {
          console.log('SSE连接成功')
          this.clearReconnectTimer()
          resolve()
        }

        this.eventSource.onmessage = (event) => {
          console.log('SSE默认消息:', event)
        }

        this.eventSource.onerror = (error) => {
          console.error('SSE连接错误:', error)
          this.scheduleReconnect()
          reject(error)
        }

        // 播放状态
        this.eventSource.addEventListener('status', (event) => {
          try {
            const status = JSON.parse(event.data)
            this.handleMessage('player-state', {
              isPlaying: status === 'playing',
            })
          } catch (error) {
            console.error('解析状态数据失败:', error)
          }
        })

        // 歌曲名 → 表示切歌了
        this.eventSource.addEventListener('name', (event) => {
          const name = JSON.parse(event.data)
          this.handleMessage('song-change', { name })
        })

        this.eventSource.addEventListener('singer', (event) => {
          const singer = JSON.parse(event.data)
          this.handleMessage('song-field', { singer })
        })

        this.eventSource.addEventListener('albumName', (event) => {
          const albumName = JSON.parse(event.data)
          this.handleMessage('song-field', { albumName })
        })

        // 封面图
        this.eventSource.addEventListener('picUrl', (event) => {
          try {
            const picUrl = JSON.parse(event.data)
            this.handleMessage('song-field', { pic: picUrl })
          } catch (error) {
            console.error('解析封面数据失败:', error)
          }
        })

        // 进度
        this.eventSource.addEventListener('progress', (event) => {
          const progress = JSON.parse(event.data)
          this.handleMessage('progress-update', { currentTime: progress, duration: null })
        })

        // 时长
        this.eventSource.addEventListener('duration', (event) => {
          const duration = JSON.parse(event.data)
          this.handleMessage('progress-update', { currentTime: null, duration })
        })

      } catch (error) {
        reject(error)
      }
    })
  }

  disconnect() {
    this.clearReconnectTimer()
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
  }

  on(type: string, callback: Function) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, [])
    }
    this.listeners.get(type)!.push(callback)
  }

  off(type: string, callback: Function) {
    const listeners = this.listeners.get(type)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  private handleMessage(type: string, data: any) {
    const listeners = this.listeners.get(type)
    if (listeners) {
      listeners.forEach(callback => callback(data))
    }
  }

  private scheduleReconnect() {
    this.clearReconnectTimer()
    this.reconnectTimer = window.setTimeout(() => {
      console.log('尝试重新连接SSE...')
      this.connect().catch(console.error)
    }, 3000)
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  get isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN
  }
}

export const sseService = new SSEService()

export function useWebSocket() {
  const isConnected = ref(false)

  const connect = async () => {
    try {
      await sseService.connect()
      isConnected.value = true
    } catch (error) {
      console.error('SSE连接失败:', error)
      isConnected.value = false
    }
  }

  const disconnect = () => {
    sseService.disconnect()
    isConnected.value = false
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    isConnected,
    connect,
    disconnect,
    on: sseService.on.bind(sseService),
    off: sseService.off.bind(sseService)
  }
}
