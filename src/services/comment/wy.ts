import { aesEncrypt, dateFormat2 } from './utils'
import type { CommentPage, CommentItem } from './types'

const WY_BASE = '/api-wy-comment'
const WY_PRESET_KEY = new TextEncoder().encode('0CoJUm6Qyw8W8jud')
const WY_IV = new TextEncoder().encode('0102030405060708')
const WY_RSA_N = '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7'
const WY_RSA_E = '010001'

async function weapi(object: object): Promise<{ params: string; encSecKey: string }> {
  const text = JSON.stringify(object)
  const secretKey = new Uint8Array(16)
  crypto.getRandomValues(secretKey)

  const encrypted1 = await aesEncrypt(text, WY_PRESET_KEY, WY_IV)
  const b64 = btoa(String.fromCharCode(...encrypted1))
  const encrypted2 = await aesEncrypt(b64, secretKey, WY_IV)
  const params = btoa(String.fromCharCode(...encrypted2))

  const reversedKey = new Uint8Array([...secretKey].reverse())
  const hexKey = Array.from(reversedKey).map(b => b.toString(16).padStart(2, '0')).join('')
  const encSecKey = rsaEncrypt(hexKey, WY_RSA_N, WY_RSA_E)

  return { params, encSecKey }
}

function rsaEncrypt(hexStr: string, modulusHex: string, exponentHex: string): string {
  const n = BigInt('0x' + modulusHex)
  const e = BigInt('0x' + exponentHex)
  const keyLen = 128
  const msgLen = hexStr.length / 2
  const paddingLen = keyLen - msgLen - 3
  const paddedHex = '0001' + 'FF'.repeat(Math.max(paddingLen, 8)) + '00' + hexStr
  const msg = BigInt('0x' + paddedHex)
  const encrypted = msg ** e % n
  return encrypted.toString(16).padStart(keyLen * 2, '0')
}

const WY_EMOJI: [string, string][] = [
  ['大笑', '😃'], ['可爱', '😊'], ['憨笑', '☺️'], ['色', '😍'],
  ['亲亲', '😙'], ['惊恐', '😱'], ['流泪', '😭'], ['亲', '😚'],
  ['呆', '😳'], ['哀伤', '😔'], ['呲牙', '😁'], ['吐舌', '😝'],
  ['撇嘴', '😒'], ['怒', '😡'], ['奸笑', '😏'], ['汗', '😓'],
  ['痛苦', '😖'], ['惶恐', '😰'], ['生病', '😨'], ['口罩', '😷'],
  ['大哭', '😂'], ['晕', '😵'], ['发怒', '👿'], ['开心', '😄'],
  ['鬼脸', '😜'], ['皱眉', '😞'], ['流感', '😢'], ['爱心', '❤️'],
  ['心碎', '💔'], ['钟情', '💘'], ['星星', '⭐️'], ['生气', '💢'],
  ['便便', '💩'], ['强', '👍'], ['弱', '👎'], ['拜', '🙏'],
  ['牵手', '👫'], ['跳舞', '👯‍♀'], ['禁止', '🙅‍♀'], ['这边', '💁‍♀'],
  ['爱意', '💏'], ['示爱', '👩‍❤️‍👨'], ['嘴唇', '👄'],
  ['狗', '🐶'], ['猫', '🐱'], ['猪', '🐷'], ['兔子', '🐰'],
  ['小鸡', '🐤'], ['公鸡', '🐔'], ['幽灵', '👻'], ['圣诞', '🎅'],
  ['外星', '👽'], ['钻石', '💎'], ['礼物', '🎁'], ['男孩', '👦'],
  ['女孩', '👧'], ['蛋糕', '🎂'], ['18', '🔞'], ['圈', '⭕'], ['叉', '❌'],
]

function applyEmoji(text: string): string {
  let result = text
  for (const [tag, emoji] of WY_EMOJI) result = result.split(`[${tag}]`).join(emoji)
  return result
}

const wyCursorCache = new Map<string, { cursor: number; page: number; orderType: number; offset: number }>()

export async function wySearch(keyword: string): Promise<{ songId: string; name: string; singer: string } | null> {
  const weapiData = await weapi({ s: keyword, type: 1, limit: 1, offset: 0, total: true })
  const formData = new URLSearchParams()
  formData.append('params', weapiData.params)
  formData.append('encSecKey', weapiData.encSecKey)

  const resp = await fetch(`${WY_BASE}/weapi/cloudsearch/pc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  })
  if (!resp.ok) return null
  const data = await resp.json()
  if (data.code !== 200 || !data.result?.songs?.length) return null
  const song = data.result.songs[0]
  return { songId: String(song.id), name: song.name || '', singer: song.ar?.[0]?.name || '' }
}

export async function wyGetComments(songmid: string, page: number, limit: number): Promise<CommentPage> {
  const rid = `R_SO_4_${songmid}`
  let cache = wyCursorCache.get(songmid)
  if (!cache || page === 1) cache = { cursor: Date.now(), page: 1, orderType: 1, offset: 0 }
  
  if (page > cache.page) { cache.orderType = 1; cache.offset = (page - cache.page - 1) * limit }
  else if (page < cache.page) { cache.orderType = 0; cache.offset = (cache.page - page - 1) * limit }

  const weapiData = await weapi({ cursor: cache.cursor, offset: cache.offset, orderType: cache.orderType, pageNo: page, pageSize: limit, rid, threadId: rid })
  const formData = new URLSearchParams()
  formData.append('params', weapiData.params)
  formData.append('encSecKey', weapiData.encSecKey)

  const resp = await fetch(`${WY_BASE}/weapi/comment/resource/comments/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  })
  if (!resp.ok) throw new Error(`Failed: ${resp.status}`)
  const data = await resp.json()
  if (data.code !== 200) throw new Error(`NetEase API error: ${data.code}`)

  wyCursorCache.set(songmid, { cursor: data.data.cursor, page, orderType: cache.orderType, offset: cache.offset })
  return { total: data.data.totalCount ?? 0, list: wyFilterComment(data.data.comments ?? []) }
}

export async function wyGetHotComments(songmid: string, page: number, limit: number): Promise<CommentPage> {
  const rid = `R_SO_4_${songmid}`
  const weapiData = await weapi({ rid, limit, offset: limit * (page - 1), beforeTime: Date.now().toString() })
  const formData = new URLSearchParams()
  formData.append('params', weapiData.params)
  formData.append('encSecKey', weapiData.encSecKey)

  const resp = await fetch(`${WY_BASE}/weapi/v1/resource/hotcomments/${rid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  })
  if (!resp.ok) throw new Error(`Failed: ${resp.status}`)
  const data = await resp.json()
  if (data.code !== 200) throw new Error(`NetEase API error: ${data.code}`)
  return { total: data.total ?? 0, list: wyFilterComment(data.hotComments ?? []) }
}

function wyFilterComment(rawList: any[]): CommentItem[] {
  return rawList.map(item => {
    const data: CommentItem = {
      id: item.commentId,
      text: item.content ? applyEmoji(item.content) : '',
      time: String(item.time),
      timeStr: item.time ? dateFormat2(item.time) : '',
      userName: item.user?.nickname || '匿名用户',
      avatar: item.user?.avatarUrl || '',
      userId: item.user?.userId || '',
      likedCount: item.likedCount || 0,
      images: [],
      reply: [],
    }
    const replyData = item.beReplied?.[0]
    if (replyData) {
      return {
        id: item.commentId,
        text: replyData.content ? applyEmoji(replyData.content) : '',
        time: String(item.time), timeStr: '',
        userName: replyData.user?.nickname || '匿名用户',
        avatar: replyData.user?.avatarUrl || '',
        userId: replyData.user?.userId || '',
        likedCount: 0, images: [],
        reply: [data],
      }
    }
    return data
  })
}
