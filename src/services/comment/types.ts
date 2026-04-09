import type { CommentSource } from '@/types'

export type { CommentSource }

export interface CommentItem {
  id: string | number
  text: string
  time: string
  timeStr: string
  userName: string
  avatar: string
  userId: string | number
  likedCount: number
  images: string[]
  reply: ReplyComment[]
}

export interface ReplyComment {
  id: string | number
  text: string
  time: string
  timeStr: string
  userName: string
  avatar: string
  userId: string | number
  likedCount: number
  images: string[]
}

export interface CommentPage {
  total: number
  list: CommentItem[]
}

export interface SongSearchResult {
  kw: { songmid: string; name: string; singer: string; album: string } | null
  wy: { songId: string; name: string; singer: string } | null
  tx: { songMid: string; songId: string; name: string; singer: string } | null
  kg: { hash: string; name: string; singer: string } | null
  mg: { copyrightId: string; name: string; singer: string } | null
}

export interface PlatformCommentResult extends CommentPage {
  source: CommentSource
}
