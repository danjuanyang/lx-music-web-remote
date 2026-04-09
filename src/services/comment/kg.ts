import { md5 } from './utils'
import type { CommentPage, CommentItem } from './types'

const KG_BASE = '/api-kg-comment'
const KG_SEARCH_BASE = '/api-kg-search'
const KG_MID = '16249512204336365674023395779019'
const KG_CODE = 'fc4be23b4e972707f36b8a828a93ba8a'
const KG_APPID = '1005'
const KG_CLIENTVER = '11409'

function kgSignature(params: string, body: string = ''): string {
  const keyparam = 'OIlwieks28dk2k092lksi2UIkp'
  const paramList = params.split('&').sort()
  return md5(new TextEncoder().encode(keyparam + paramList.join('') + body + keyparam))
}

function kgBuildParams(hash: string, page: number, limit: number): string {
  const paramsObj: Record<string, string> = {
    dfid: '0', mid: KG_MID, clienttime: String(Math.floor(Date.now() / 1000)),
    uuid: '0', extdata: hash, appid: KG_APPID, code: KG_CODE, schash: hash,
    clientver: KG_CLIENTVER, p: String(page), clienttoken: '', pagesize: String(limit), ver: '10', kugouid: '0',
  }
  const sorted = Object.keys(paramsObj).sort().map(k => `${k}=${encodeURIComponent(paramsObj[k])}`).join('&')
  return `${sorted}&signature=${kgSignature(sorted, '')}`
}

export async function kgSearch(keyword: string): Promise<{ hash: string; name: string; singer: string } | null> {
  const params = new URLSearchParams({ keyword, page: '1', pagesize: '1', platform: 'WebFilter', filter: '2' })
  try {
    const resp = await fetch(`${KG_SEARCH_BASE}/song_search_v2?${params.toString()}`)
    const data = await resp.json()
    const song = data.data?.lists?.[0]
    if (!song) return null
    return { hash: song.FileHash || song.hash || '', name: song.SongName || '', singer: song.SingerName || '' }
  } catch { return null }
}

export async function kgGetComments(hash: string, page: number, limit: number): Promise<CommentPage> {
  const resp = await fetch(`${KG_BASE}/r/v1/rank/newest?${kgBuildParams(hash, page, limit)}`)
  const data = await resp.json()
  return { total: data.count ?? 0, list: kgFilterComment(data.list ?? []) }
}

export async function kgGetHotComments(hash: string, page: number, limit: number): Promise<CommentPage> {
  const resp = await fetch(`${KG_BASE}/r/v1/rank/topliked?${kgBuildParams(hash, page, limit)}`)
  const data = await resp.json()
  return { total: data.count ?? 0, list: kgFilterComment(data.list ?? []) }
}

function kgFilterComment(rawList: any[]): CommentItem[] {
  return rawList.map(item => ({
    id: item.id,
    text: item.content || '',
    time: item.addtime, timeStr: item.addtime,
    userName: item.user_name, avatar: item.user_pic, userId: item.user_id,
    likedCount: item.like?.likenum ?? 0,
    images: (Array.isArray(item.images) ? item.images : []).map((img: any) => img.url),
    reply: item.pcontent ? [{ id: `p_${item.id}`, text: item.pcontent, userName: item.puser || '', avatar: '', userId: item.puser_id || '', likedCount: 0, images: [], time: '', timeStr: '' }] : [],
  }))
}
