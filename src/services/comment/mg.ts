import type { CommentPage, CommentItem } from './types'

const MG_BASE = '/api-mg-comment'
const MG_SEARCH_BASE = '/api-mg-search'

export async function mgSearch(keyword: string): Promise<{ copyrightId: string; name: string; singer: string } | null> {
  try {
    const resp = await fetch(`${MG_SEARCH_BASE}/MIGUM3.0/v1.0/content/search_all.do`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: keyword, pageNo: 1, pageSize: 1, searchSwitch: JSON.stringify({ song: 1 }) }),
    })
    const data = await resp.json()
    const song = data.songResultData?.result?.[0]
    if (!song) return null
    return { copyrightId: song.copyrightId || '', name: song.songName || '', singer: song.singerName?.[0] || '' }
  } catch { return null }
}

export async function mgGetComments(copyrightId: string, page: number, limit: number): Promise<CommentPage> {
  const url = `${MG_BASE}/MIGUM3.0/user/comment/stack/v1.0?pageSize=${limit}&queryType=1&resourceId=${copyrightId}&resourceType=2`
  const resp = await fetch(url)
  const data = await resp.json()
  const list = data.data?.comments ?? []
  return { total: parseInt(data.data?.commentNums || String(list.length)), list: mgFilterComment(list) }
}

export async function mgGetHotComments(copyrightId: string, page: number, limit: number): Promise<CommentPage> {
  const offset = (page - 1) * limit
  const url = `${MG_BASE}/MIGUM3.0/user/comment/stack/v1.0?pageSize=${limit}&queryType=2&resourceId=${copyrightId}&resourceType=2&hotCommentStart=${offset}`
  const resp = await fetch(url)
  const data = await resp.json()
  const list = data.data?.hotComments ?? data.data?.comments ?? []
  return { total: parseInt(data.data?.cfgHotCount || data.data?.commentNums || String(list.length)), list: mgFilterComment(list) }
}

function mgFilterComment(rawList: any[]): CommentItem[] {
  return rawList.map(item => {
    const userInfo = item.user ?? {}
    return {
      id: item.commentId || item.replyId || '',
      text: item.commentInfo || item.replyInfo || '',
      time: item.commentTime || item.replyTime || '',
      timeStr: item.commentTime || item.replyTime || '',
      userName: userInfo.nickName || '匿名用户',
      avatar: userInfo.middleIcon || '', userId: userInfo.userId || '',
      likedCount: item.opNumItem?.thumbNum ?? 0, images: [],
      reply: item.replyComments ? item.replyComments.map((c: any) => ({
        id: c.replyId, text: c.replyInfo || '', userName: c.user?.nickName || '匿名用户', avatar: c.user?.middleIcon || '', userId: c.user?.userId || '', likedCount: 0,
      })) : [],
    }
  })
}
