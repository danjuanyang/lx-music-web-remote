import { dateFormat2 } from './utils'
import type { CommentPage, CommentItem } from './types'

const KW_COMMENT_BASE = '/api-comment/kw'
const KW_SEARCH_BASE = '/api-search'

export async function kwSearch(keyword: string): Promise<{ songmid: string; name: string; singer: string; album: string } | null> {
  const params = new URLSearchParams({
    client: 'kt', all: keyword, pn: '0', rn: '1', uid: '794762570',
    ver: 'kwplayer_ar_9.2.2.1', vipver: '1', show_copyright_off: '1',
    newver: '1', ft: 'music', cluster: '0', strategy: '2012',
    encoding: 'utf8', rformat: 'json', vermerge: '1',
    mobi: '1', issubtitle: '1',
  })
  const url = `${KW_SEARCH_BASE}/r.s?${params.toString()}`
  const resp = await fetch(url)
  if (!resp.ok) return null
  const data = await resp.json()
  if (!data.absolutelist || !data.absolutelist.length) return null
  const item = data.absolutelist[0]
  return {
    songmid: item.MUSICRID?.replace('MUSIC_', '') || '',
    name: item.NAME || '',
    singer: item.ARTIST || '',
    album: item.ALBUM || '',
  }
}

export async function kwGetComments(songmid: string, page: number, limit: number): Promise<CommentPage> {
  const offset = (page - 1) * limit
  const params = new URLSearchParams({
    f: 'web', type: 'get_comment', aapiver: '1', prod: 'kwplayer_ar_10.5.2.0',
    digest: '15', sid: songmid, start: String(offset), msgflag: '1',
    count: String(limit), newver: '3', uid: '0',
  })
  const resp = await fetch(`${KW_COMMENT_BASE}/com.s?${params.toString()}`)
  if (!resp.ok) throw new Error(`Failed: ${resp.status}`)
  const data = await resp.json()
  if (data.code !== '200') throw new Error(`Kuwo API error: ${data.code}`)
  const list = kwFilterComment(data.comments ?? [])
  return { total: data.comments_counts ?? list.length, list }
}

export async function kwGetHotComments(songmid: string, page: number, limit: number): Promise<CommentPage> {
  const offset = (page - 1) * limit
  const params = new URLSearchParams({
    f: 'web', type: 'get_rec_comment', aapiver: '1', prod: 'kwplayer_ar_10.5.2.0',
    digest: '15', sid: songmid, start: String(offset), msgflag: '1',
    count: String(limit), newver: '3', uid: '0',
  })
  const resp = await fetch(`${KW_COMMENT_BASE}/com.s?${params.toString()}`)
  if (!resp.ok) throw new Error(`Failed: ${resp.status}`)
  const data = await resp.json()
  if (data.code !== '200') throw new Error(`Kuwo API error: ${data.code}`)
  const list = kwFilterComment(data.hot_comments ?? [])
  return { total: data.hot_comments_counts ?? list.length, list }
}

function kwFilterComment(
  rawList: Array<{
    id: string | number; msg: string; time: string;
    u_name: string; u_pic: string; u_id: string | number;
    like_num: number; mpic?: string;
    child_comments?: Array<{ id: string | number; msg: string; time: string;
      u_name: string; u_pic: string; u_id: string | number;
      like_num: number; mpic?: string;
    }>
  }>,
): CommentItem[] {
  if (!rawList) return []
  return rawList.map(item => ({
    id: item.id,
    text: item.msg,
    time: item.time,
    timeStr: dateFormat2(Number(item.time) * 1000),
    userName: item.u_name,
    avatar: item.u_pic,
    userId: item.u_id,
    likedCount: item.like_num,
    images: item.mpic ? [decodeURIComponent(item.mpic)] : [],
    reply: item.child_comments
      ? item.child_comments.map(c => ({
          id: c.id, text: c.msg, time: c.time,
          timeStr: dateFormat2(Number(c.time) * 1000),
          userName: c.u_name, avatar: c.u_pic,
          userId: c.u_id, likedCount: c.like_num,
          images: c.mpic ? [decodeURIComponent(c.mpic)] : [],
        }))
      : [],
  }))
}
