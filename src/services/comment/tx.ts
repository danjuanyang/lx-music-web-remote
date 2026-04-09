import { dateFormat2 } from './utils'
import type { CommentPage, CommentItem } from './types'

const TX_BASE = '/api-tx-comment'
const TX_NEWCOMMENT_BASE = '/api-tx-newcomment'

const TX_EMOJI: Record<string, string> = {
  e400846: '😘', e400874: '😴', e400825: '😃', e400847: '😙',
  e400835: '😍', e400873: '😳', e400836: '😎', e400867: '😭',
  e400832: '😊', e400837: '😏', e400875: '😫', e400831: '😉',
  e400855: '😡', e400823: '😄', e400862: '😨', e400844: '😖',
  e400841: '😓', e400830: '😈', e400828: '😆', e400833: '😋',
  e400822: '😀', e400843: '😕', e400829: '😇', e400824: '😂',
  e400834: '😌', e400877: '😷', e400132: '🍉', e400181: '啤酒',
  e401067: '咖啡', e400186: '蛋糕', e400343: '猪', e400116: '玫瑰',
  e400126: '叶子', e400613: '吻', e401236: '爱心', e400622: '心碎',
  e400637: '炸弹', e400643: '便便', e400773: '菜刀', e400102: '月亮',
  e401328: '太阳', e400420: '鼓掌', e400914: '欢呼', e400408: '强',
  e400414: '弱', e401121: '不', e400396: '挥手', e400384: '勾引',
  e401115: '拳头', e400402: 'OK', e400905: '非礼勿视', e400906: '非礼勿听',
  e400907: '非礼勿言', e400562: '幽灵', e400932: '祈祷', e400644: '肌肉',
  e400611: '注射器', e400185: '礼物', e400655: '钱', e400325: '小鸡',
  e400612: '药', e400198: '礼花', e401685: '闪电', e400631: '爱心',
  e400768: '火', e400432: '皇冠',
}

function replaceTxEmoji(msg: string): string {
  const rxp = /^\[em\](e\d+)\[\/em\]$/
  const result = msg.match(/\[em\]e\d+\[\/em\]/g)
  if (!result) return msg
  const unique = [...new Set(result)]
  for (const item of unique) {
    const code = item.replace(rxp, '$1')
    const regex = new RegExp(item.replace('[em]', '\\[em\\]').replace('[/em]', '\\[\\/em\\]'), 'g')
    msg = msg.replace(regex, TX_EMOJI[code] || '')
  }
  return msg
}

const txSongIdCache = new Map<string, string>()

async function txGetSongId(songmid: string): Promise<string | null> {
  if (txSongIdCache.has(songmid)) return txSongIdCache.get(songmid)!
  const body = { comm: { ct: '19', cv: '1859', uin: '0' }, req: { module: 'music.pf_song_detail_svr', method: 'get_song_detail_yqq', param: { song_type: 0, song_mid: songmid } } }
  try {
    const resp = await fetch(`${TX_BASE}/cgi-bin/musicu.fcg`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!resp.ok) return null
    const data = await resp.json()
    const songId = String(data.req?.data?.track_info?.id || '')
    if (songId) txSongIdCache.set(songmid, songId)
    return songId || null
  } catch { return null }
}

export async function txSearch(keyword: string): Promise<{ songMid: string; songId: string; name: string; singer: string } | null> {
  const body = { comm: { ct: '11', cv: '1003006', v: '1003006', os_ver: '12', phonetype: '0', devicelevel: '31', tmeAppID: 'qqmusiclight', nettype: 'NETWORK_WIFI' }, req: { module: 'music.search.SearchCgiService', method: 'DoSearchForQQMusicLite', param: { search_type: 0, query: keyword, page_num: 1, num_per_page: 1, nqc_flag: 0, grp: 1 } } }
  try {
    const resp = await fetch(`${TX_BASE}/cgi-bin/musicu.fcg`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!resp.ok) return null
    const data = await resp.json()
    const item = data.req?.data?.body?.item_song?.[0]
    if (!item) return null
    return { songMid: item.mid || '', songId: String(item.id || ''), name: item.name || '', singer: item.singer?.map((s: any) => s.name)?.join(', ') || '' }
  } catch { return null }
}

export async function txGetComments(songmid: string, page: number, limit: number): Promise<CommentPage> {
  const songId = await txGetSongId(songmid)
  if (!songId) throw new Error('获取歌曲ID失败')
  const params = new URLSearchParams({ uin: '0', format: 'json', cid: '205360772', reqtype: '2', biztype: '1', topid: songId, cmd: '8', needmusiccrit: '1', pagenum: String(page - 1), pagesize: String(limit) })
  const resp = await fetch(`${TX_NEWCOMMENT_BASE}/base/fcgi-bin/fcg_global_comment_h5.fcg`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  if (!resp.ok) throw new Error(`Failed: ${resp.status}`)
  const data = await resp.json()
  return { total: data.comment?.commenttotal ?? 0, list: txFilterNewComment(data.comment?.commentlist ?? []) }
}

export async function txGetHotComments(songmid: string, page: number, limit: number): Promise<CommentPage> {
  const songId = await txGetSongId(songmid)
  if (!songId) throw new Error('获取歌曲ID失败')
  const body = { comm: { cv: 4747474, ct: 24, format: 'json', platform: 'yqq.json', uin: 0 }, req: { module: 'music.globalComment.CommentRead', method: 'GetHotCommentList', param: { BizType: 1, BizId: String(songId), PageSize: limit, PageNum: page - 1, HotType: 1 } } }
  const resp = await fetch(`${TX_BASE}/cgi-bin/musicu.fcg`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await resp.json()
  const comment = data.req?.data?.CommentList
  return { total: comment?.Total ?? 0, list: txFilterHotComment(comment?.Comments ?? []) }
}

function txFilterNewComment(rawList: any[]): CommentItem[] {
  return rawList.map(item => {
    const time = item.time ? parseInt(item.time + '000') : null
    return {
      id: `${item.rootcommentid}_${item.commentid}`,
      text: item.rootcommentcontent ? replaceTxEmoji(item.rootcommentcontent.replace(/\\n/g, '\n')) : '',
      time: String(time || ''), timeStr: time ? dateFormat2(time) : '',
      userName: item.rootcommentnick ? item.rootcommentnick.substring(1) : '',
      avatar: item.avatarurl || '', userId: item.encrypt_rootcommentuin || '',
      likedCount: item.praisenum || 0, images: [],
      reply: item.middlecommentcontent ? item.middlecommentcontent.map((c: any) => ({
        id: `sub_${item.rootcommentid}_${c.subcommentid}`,
        text: replaceTxEmoji(c.subcommentcontent.replace(/\\n/g, '\n')),
        userName: c.replynick ? c.replynick.substring(1) : '',
        avatar: c.avatarurl || '', userId: c.encrypt_replyuin || '',
        likedCount: c.praisenum || 0,
      })) : [],
    }
  })
}

function txFilterHotComment(rawList: any[]): CommentItem[] {
  return rawList.map(item => {
    const time = item.PubTime ? parseInt(item.PubTime + '000') : null
    return {
      id: `${item.SeqNo}_${item.CmId}`,
      text: item.Content ? replaceTxEmoji(item.Content.replace(/\\n/g, '\n')) : '',
      time: String(time || ''), timeStr: time ? dateFormat2(time) : '',
      userName: item.Nick ?? '', avatar: item.Avatar || '',
      userId: item.EncryptUin || '', likedCount: item.PraiseNum ?? 0,
      images: item.Pic ? [item.Pic] : [],
      reply: item.SubComments ? item.SubComments.map((c: any) => ({
        id: `sub_${c.SeqNo}_${c.CmId}`,
        text: c.Content ? replaceTxEmoji(c.Content.replace(/\\n/g, '\n')) : '',
        userName: c.Nick ?? '', avatar: c.Avatar || '',
        userId: c.EncryptUin || '', likedCount: c.PraiseNum ?? 0,
      })) : [],
    }
  })
}
