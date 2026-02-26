import type { PlayerState, SongInfo, LyricLine, ApiResponse } from '@/types'

class ApiService {
  private baseURL: string

  constructor() {
    // 使用Vite代理，避免CORS问题
    this.baseURL = '/api'
  }

  // 设置API基础URL
  setBaseURL(url: string) {
    this.baseURL = url
  }

  // 通用请求方法
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // LX Music API返回的可能是纯文本或JSON
      const contentType = response.headers.get('content-type')
      let data: T

      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        // 对于非JSON响应，根据状态码判断成功
        const text = await response.text()
        if (response.status === 200) {
          data = (text === 'OK' ? { success: true } : text) as T
        } else {
          throw new Error(text || '请求失败')
        }
      }

      return { success: true, data }
    } catch (error) {
      console.error('API request failed:', error)
      return {
        success: false,
        data: null as T,
        message: error instanceof Error ? error.message : '请求失败'
      }
    }
  }

  // 获取当前播放状态（增强版，支持更多信息）
  async getCurrentState(): Promise<ApiResponse<{ player: PlayerState; song: SongInfo }>> {
    try {
      const statusResponse = await this.request('/status?filter=status,name,singer,albumName,duration,progress,playbackRate,picUrl')
      if (statusResponse.success) {
        const status = statusResponse.data
        console.log('LX Music状态数据:', status)

        // 尝试获取专辑封面信息
        let coverUrl = ''
        if (status.picUrl) {
          coverUrl = status.picUrl
        } else if (status.pic) {
          coverUrl = status.pic
        }

        return {
          success: true,
          data: {
            player: {
              isPlaying: status.status === 'playing',
              currentTime: status.progress || 0,
              duration: status.duration || 0,
              volume: status.volume || 50,
              playMode: status.playMode || 'order'
            },
            song: {
              id: status.id || status.name || '',
              name: status.name || '未知歌曲',
              singer: status.singer || '未知歌手',
              album: status.albumName || '未知专辑',
              pic: coverUrl,
              duration: status.duration || 0
            }
          }
        }
      }
      return statusResponse
    } catch (error) {
      return {
        success: false,
        data: null as any,
        message: error instanceof Error ? error.message : '获取状态失败'
      }
    }
  }

  // 获取播放列表
  async getPlaylist(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.request('/list')
      return response
    } catch (error) {
      return {
        success: false,
        data: [],
        message: error instanceof Error ? error.message : '获取播放列表失败'
      }
    }
  }

  // 获取播放器信息
  async getPlayerInfo(): Promise<ApiResponse<any>> {
    try {
      const response = await this.request('/info')
      return response
    } catch (error) {
      return {
        success: false,
        data: null,
        message: error instanceof Error ? error.message : '获取播放器信息失败'
      }
    }
  }

  // 设置播放列表
  async setPlaylist(list: any[]): Promise<ApiResponse<void>> {
    try {
      const response = await this.request('/list', {
        method: 'POST',
        body: JSON.stringify({ list })
      })
      return response
    } catch (error) {
      return {
        success: false,
        data: undefined,
        message: error instanceof Error ? error.message : '设置播放列表失败'
      }
    }
  }

  // 播放指定歌曲
  async playMusic(musicInfo: any): Promise<ApiResponse<void>> {
    try {
      const response = await this.request('/play-music', {
        method: 'POST',
        body: JSON.stringify(musicInfo)
      })
      return response
    } catch (error) {
      return {
        success: false,
        data: undefined,
        message: error instanceof Error ? error.message : '播放歌曲失败'
      }
    }
  }

  // 播放/暂停
  async togglePlayPause(): Promise<ApiResponse<void>> {
    try {
      // 先获取当前状态
      const currentState = await this.request('/status')
      if (currentState.success) {
        const isPlaying = currentState.data.status === 'playing'

        console.log('当前播放状态:', currentState.data.status, '是否播放中:', isPlaying)

        if (isPlaying) {
          const result = await this.request('/pause', { method: 'POST' })
          console.log('暂停请求结果:', result)
          return result
        } else {
          const result = await this.request('/play', { method: 'POST' })
          console.log('播放请求结果:', result)
          return result
        }
      }
      return {
        success: false,
        data: undefined,
        message: '无法获取当前播放状态'
      }
    } catch (error) {
      console.error('播放/暂停操作失败:', error)
      return {
        success: false,
        data: undefined,
        message: error instanceof Error ? error.message : '切换播放状态失败'
      }
    }
  }

  // 下一曲
  async nextSong(): Promise<ApiResponse<void>> {
    const result = await this.request('/skip-next', { method: 'POST' })
    // 给LX Music一点时间切换歌曲，然后触发状态更新
    if (result.success) {
      setTimeout(() => {
        // 触发自定义事件，通知组件刷新状态和歌词
        window.dispatchEvent(new CustomEvent('songChanged'))
      }, 500)
    }
    return result
  }

  // 上一曲
  async previousSong(): Promise<ApiResponse<void>> {
    const result = await this.request('/skip-prev', { method: 'POST' })
    // 给LX Music一点时间切换歌曲，然后触发状态更新
    if (result.success) {
      setTimeout(() => {
        // 触发自定义事件，通知组件刷新状态和歌词
        window.dispatchEvent(new CustomEvent('songChanged'))
      }, 500)
    }
    return result
  }

  // 设置音量 (LX Music API不支持，返回成功但不执行)
  async setVolume(volume: number): Promise<ApiResponse<void>> {
    console.log(`音量设置功能暂不支持: ${volume}%`)
    return {
      success: true,
      data: undefined,
      message: '音量设置功能暂不支持'
    }
  }

  // 跳转到指定时间
  async seekTo(time: number): Promise<ApiResponse<void>> {
    return this.request(`/seek?offset=${time}`)
  }

  // 获取歌词
  async getCurrentLyrics(): Promise<ApiResponse<LyricLine[]>> {
    try {
      const response = await this.request('/lyric')
      if (response.success) {
        const lyricText = response.data
        const lyrics: LyricLine[] = []

        if (lyricText && typeof lyricText === 'string') {
          const lines = lyricText.split('\n')
          const lineRe = /^((?:\[\d{1,2}:\d{2}(?:\.\d{1,3})?\])+)(.*)/
          const timeTagRe = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g

          for (const rawLine of lines) {
            const trimmed = rawLine.trim()
            if (!trimmed) continue

            const lineMatch = trimmed.match(lineRe)
            if (!lineMatch) continue

            const timeTagStr = lineMatch[1]
            const text = lineMatch[2].trim()
            if (!text) continue

            let tagMatch: RegExpExecArray | null
            timeTagRe.lastIndex = 0
            while ((tagMatch = timeTagRe.exec(timeTagStr)) !== null) {
              const minutes = parseInt(tagMatch[1])
              const seconds = parseInt(tagMatch[2])
              const subStr = tagMatch[3] || '0'

              let subSeconds: number
              if (subStr.length === 3) {
                subSeconds = parseInt(subStr) / 1000
              } else if (subStr.length === 2) {
                subSeconds = parseInt(subStr) / 100
              } else {
                subSeconds = parseInt(subStr) / 10
              }

              const time = minutes * 60 + seconds + subSeconds
              lyrics.push({ time, text })
            }
          }

          lyrics.sort((a, b) => a.time - b.time)
        }

        return {
          success: true,
          data: lyrics
        }
      }
      return response
    } catch (error) {
      return {
        success: false,
        data: [],
        message: error instanceof Error ? error.message : '获取歌词失败'
      }
    }
  }
}

export const apiService = new ApiService()