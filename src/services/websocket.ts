import { ref, onMounted, onUnmounted } from 'vue'
import type { WSMessage } from '@/types'

class SSEService {
  private eventSource: EventSource | null = null
  private reconnectTimer: number | null = null
  private url: string = ''
  private listeners: Map<string, Function[]> = new Map()

  constructor() {
    this.url = '/api/subscribe-player-status'
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
            this.handleStatusChange(status)
          } catch (error) {
            console.error('解析状态数据失败:', error)
          }
        })

        // 歌曲信息字段
        this.eventSource.addEventListener('name', (event) => {
          this.handleSongChange({ name: JSON.parse(event.data) })
        })

        this.eventSource.addEventListener('singer', (event) => {
          this.handleSongChange({ singer: JSON.parse(event.data) })
        })

        this.eventSource.addEventListener('albumName', (event) => {
          this.handleSongChange({ albumName: JSON.parse(event.data) })
        })

        // 封面图
        this.eventSource.addEventListener('picUrl', (event) => {
          try {
            const picUrl = JSON.parse(event.data)
            this.handleMessage('pic-update', picUrl)
          } catch (error) {
            console.error('解析封面数据失败:', error)
          }
        })

        // 进度与时长
        this.eventSource.addEventListener('progress', (event) => {
          const progress = JSON.parse(event.data)
          this.handleMessage('progress-update', { currentTime: progress, duration: null })
        })

        this.eventSource.addEventListener('duration', (event) => {
          const duration = JSON.parse(event.data)
          this.handleMessage('progress-update', { currentTime: null, duration })
        })

        // 歌词 (SSE 推送完整 LRC 文本)
        this.eventSource.addEventListener('lyric', (event) => {
          const lyricText = JSON.parse(event.data)
          this.parseLyricsAndNotify(lyricText)
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

  private handleStatusChange(status: any) {
    this.handleMessage('player-state', {
      isPlaying: status === 'playing',
    })
  }

  private handleSongChange(songData: any) {
    this.handleMessage('song-change', songData)
  }

  /**
   * 解析 LRC 歌词并通知。
   * 支持多种常见 LRC 时间戳格式:
   *   [02:30.50]   -> 2位分:2位秒.2位百分秒
   *   [02:30.500]  -> 2位分:2位秒.3位毫秒
   *   [02:30]      -> 2位分:2位秒 (无毫秒)
   *   [2:30.50]    -> 1位分:2位秒.2位百分秒
   *   [02:30.5]    -> 2位分:2位秒.1位十分秒
   * 同一行多时间戳: [00:05.28][01:10.50]歌词
   */
  private parseLyricsAndNotify(lyricText: string) {
    const lyrics: Array<{ time: number; text: string }> = []

    if (lyricText) {
      const lines = lyricText.split('\n')
      // 匹配一个或多个时间标签 + 文本
      const timeTagRe = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g
      const lineRe = /^((?:\[\d{1,2}:\d{2}(?:\.\d{1,3})?\])+)(.*)/

      for (const rawLine of lines) {
        const trimmed = rawLine.trim()
        if (!trimmed) continue

        const lineMatch = trimmed.match(lineRe)
        if (!lineMatch) continue

        const timeTagStr = lineMatch[1]
        const text = lineMatch[2].trim()

        // 跳过纯元数据行（如 [ti:xxx]、[ar:xxx]）
        if (!text) continue

        // 提取所有时间标签
        let tagMatch: RegExpExecArray | null
        timeTagRe.lastIndex = 0
        while ((tagMatch = timeTagRe.exec(timeTagStr)) !== null) {
          const minutes = parseInt(tagMatch[1])
          const seconds = parseInt(tagMatch[2])
          const subStr = tagMatch[3] || '0'

          let subSeconds: number
          if (subStr.length === 3) {
            // 毫秒: 500 -> 0.5s
            subSeconds = parseInt(subStr) / 1000
          } else if (subStr.length === 2) {
            // 百分秒: 50 -> 0.5s
            subSeconds = parseInt(subStr) / 100
          } else {
            // 十分秒: 5 -> 0.5s
            subSeconds = parseInt(subStr) / 10
          }

          const time = minutes * 60 + seconds + subSeconds
          lyrics.push({ time, text })
        }
      }

      // 按时间排序（多时间标签可能打乱顺序）
      lyrics.sort((a, b) => a.time - b.time)
    }

    this.handleMessage('lyric-update', lyrics)
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
