// 播放器状态接口
export interface PlayerState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  playMode: 'order' | 'random' | 'repeat'
}

// 歌曲信息接口
export interface SongInfo {
  id: string
  name: string
  singer: string
  album: string
  pic: string
  duration: number
}

// 歌词行接口
export interface LyricLine {
  time: number
  text: string
}

// API响应接口
export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
}

// WebSocket消息接口
export interface WSMessage {
  type: 'player-state' | 'song-change' | 'lyric-update' | 'progress-update'
  data: any
}