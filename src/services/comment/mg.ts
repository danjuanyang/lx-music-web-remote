import { md5 } from './utils'
import type { CommentPage, CommentItem } from './types'

const MG_COMMENT_BASE = '/api-mg-comment'
const MG_SEARCH_BASE = '/api-mg-search'

function createMgSignature(time: string, text: string) {
  const deviceId = '963B7AA0D21511ED807EE5846EC87D20'
  const signatureMd5 = '6cdc72a439cef99a3418d2a78aa28c73'
  const raw = `${text}${signatureMd5}yyapp2d16148780a1dcc7408e06336b98cfd50${deviceId}${time}`
  const sign = md5(new TextEncoder().encode(raw))
  return { sign, deviceId }
}

export async function mgSearch(keyword: string): Promise<{ songId: string; copyrightId: string; name: string; singer: string } | null> {
  try {
    const time = Date.now().toString()
    const signData = createMgSignature(time, keyword)
    const params = new URLSearchParams({
      isCorrect: '0', isCopyright: '1',
      searchSwitch: '{"song":1,"album":0,"singer":0,"tagSong":1,"mvSong":0,"bestShow":1,"songlist":0,"lyricSong":0}',
      pageSize: '1', text: keyword, pageNo: '1', sort: '0', sid: 'USS',
    })
    const resp = await fetch(`${MG_SEARCH_BASE}/music_search/v3/search/searchAll?${params.toString()}`, {
      headers: {
        uiVersion: 'A_music_3.6.1',
        deviceId: signData.deviceId,
        timestamp: time,
        sign: signData.sign,
        channel: '0146921',
      },
    })
    const data = await resp.json()
    if (!data || data.code !== '000000') return null
    const resultList = data.songResultData?.resultList
    if (!resultList?.length || !resultList[0]?.length) return null
    const song = resultList[0][0]
    return { songId: song.songId || '', copyrightId: song.copyrightId || '', name: song.name || '', singer: song.singerList?.map((s: any) => s.name)?.join(', ') || '' }
  } catch { return null }
}

export async function mgGetComments(songId: string, page: number, limit: number): Promise<CommentPage> {
  const url = `${MG_COMMENT_BASE}/v3/api/comment/listComments?targetId=${songId}&pageSize=${limit}&pageNo=${page}`
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4195.1 Safari/537.36',
      Referer: 'https://music.migu.cn',
    },
  })
  const data = await resp.json()
  if (data.returnCode !== '000000') throw new Error('获取评论失败')
  const list = data.data?.items ?? []
  return { total: data.data?.itemTotal ?? list.length, list: mgFilterComment(list) }
}

export async function mgGetHotComments(songId: string, page: number, limit: number): Promise<CommentPage> {
  const url = `${MG_COMMENT_BASE}/v3/api/comment/listTopComments?targetId=${songId}&pageSize=${limit}&pageNo=${page}`
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4195.1 Safari/537.36',
      Referer: 'https://music.migu.cn',
    },
  })
  const data = await resp.json()
  if (data.returnCode !== '000000') throw new Error('获取热门评论失败')
  const list = data.data?.items ?? []
  return { total: data.data?.itemTotal ?? list.length, list: mgFilterComment(list) }
}

function mgFilterComment(rawList: any[]): CommentItem[] {
  return rawList.map(item => {
    const avatar = item.author?.avatar
      ? (/^\/\//.test(item.author.avatar) ? `http:${item.author.avatar}` : item.author.avatar)
      : ''
    return {
      id: item.commentId || '',
      text: item.body || '',
      time: item.createTime || '',
      timeStr: item.createTime || '',
      userName: item.author?.name || '匿名用户',
      avatar,
      userId: item.author?.id || '',
      likedCount: item.praiseCount ?? 0,
      images: [],
      reply: (item.replyCommentList ?? []).map((c: any) => ({
        id: c.commentId || '',
        text: c.body || '',
        userName: c.author?.name || '匿名用户',
        avatar: c.author?.avatar ? (/^\/\//.test(c.author.avatar) ? `http:${c.author.avatar}` : c.author.avatar) : '',
        userId: c.author?.id || '',
        likedCount: c.praiseCount ?? 0,
      })),
    }
  })
}
