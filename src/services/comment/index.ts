import { kwSearch, kwGetComments, kwGetHotComments } from './kw'
import { wySearch, wyGetComments, wyGetHotComments } from './wy'
import { txSearch, txGetComments, txGetHotComments } from './tx'
import { kgSearch, kgGetComments, kgGetHotComments } from './kg'
import { mgSearch, mgGetComments, mgGetHotComments } from './mg'
import type { CommentSource, SongSearchResult, PlatformCommentResult } from './types'

export * from './types'

class CommentService {
  /** Search all platforms for the given song. Returns platform IDs if found. */
  async searchAllPlatforms(name: string, singer: string): Promise<SongSearchResult | null> {
    if (!name) return null
    const keyword = `${name} ${singer}`.trim()

    const [kw, wy, tx, kg, mg] = await Promise.allSettled([
      kwSearch(keyword),
      wySearch(keyword),
      txSearch(keyword),
      kgSearch(keyword),
      mgSearch(keyword),
    ])

    return {
      kw: kw.status === 'fulfilled' ? kw.value : null,
      wy: wy.status === 'fulfilled' ? wy.value : null,
      tx: tx.status === 'fulfilled' ? tx.value : null,
      kg: kg.status === 'fulfilled' ? kg.value : null,
      mg: mg.status === 'fulfilled' ? mg.value : null,
    }
  }

  getPlatformSongId(source: CommentSource, searchResult: SongSearchResult | null): string | null {
    if (!searchResult) return null
    switch (source) {
      case 'kw': return searchResult.kw?.songmid ?? null
      case 'wy': return searchResult.wy?.songId ?? null
      case 'tx': return searchResult.tx?.songMid ?? null
      case 'kg': return searchResult.kg?.hash ?? null
      case 'mg': return searchResult.mg?.copyrightId ?? null
      default: return null
    }
  }

  parseLxId(lxId: string): { source: CommentSource; id: string } | null {
    if (!lxId || !lxId.includes('_')) return null
    const [source, ...idParts] = lxId.split('_')
    const id = idParts.join('_')
    const validSources: CommentSource[] = ['kw', 'wy', 'tx', 'kg', 'mg']
    if (validSources.includes(source as CommentSource)) {
      return { source: source as CommentSource, id }
    }
    return null
  }

  async getComments(source: CommentSource, songId: string, page: number = 1, limit: number = 20): Promise<PlatformCommentResult> {
    let result
    switch (source) {
      case 'kw': result = await kwGetComments(songId, page, limit); break
      case 'wy': result = await wyGetComments(songId, page, limit); break
      case 'tx': result = await txGetComments(songId, page, limit); break
      case 'kg': result = await kgGetComments(songId, page, limit); break
      case 'mg': result = await mgGetComments(songId, page, limit); break
      default: throw new Error(`Unknown source: ${source}`)
    }
    return { ...result, source }
  }

  async getHotComments(source: CommentSource, songId: string, page: number = 1, limit: number = 20): Promise<PlatformCommentResult> {
    let result
    switch (source) {
      case 'kw': result = await kwGetHotComments(songId, page, limit); break
      case 'wy': result = await wyGetHotComments(songId, page, limit); break
      case 'tx': result = await txGetHotComments(songId, page, limit); break
      case 'kg': result = await kgGetHotComments(songId, page, limit); break
      case 'mg': result = await mgGetHotComments(songId, page, limit); break
      default: throw new Error(`Unknown source: ${source}`)
    }
    return { ...result, source }
  }
}

export const commentService = new CommentService()
