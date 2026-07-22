import { kiwi } from "../kiwi"

/**
 * https://voskey.icalo.net/channels/9gta1fxt07
 * に投稿されている楽曲リンクをランダムで表示する
 *
 * 乱数シードは日付とuserIdを組み合わせて生成する
 *
 * 投稿が4000件くらいあるので、全件取得ではなく
 *
 * 2023/8/11 ~ 現在 までのランダムな一週間を選択
 *
 * その範囲の投稿からすべてのniconicoとyoutubeの楽曲リンクを取得し、ランダムで1件表示する
 *
 * その範囲にurlがなかった場合、週の抽選からやり直す
 */

const CHANNEL_ID = "9gta1fxt07"
const START_DATE_MS = 1691712000000  // 2023/8/11 UTC

type Note = { id: string, text: string | undefined }
type Song = { url: string, noteText: string | undefined }

function extractUrls(text: string): string[] {
  const urls: string[] = []
  for (const line of text.split(Str.lf)) {
    for (const token of line.split(" ")) {
      const t = token.trim()
      if (
        t.starts_with("https://www.youtube.com/") ||
        t.starts_with("https://youtu.be/") ||
        t.starts_with("https://nico.ms/") ||
        t.starts_with("https://www.nicovideo.jp/")
      ) {
        urls.push(t)
      }
    }
  }
  return urls
}

function fetchWeekSongs(sinceMs: number, untilMs: number): Song[] {
  const songs: Song[] = []
  let untilId: string | undefined = undefined
  for (let page = 0; page < 5; page++) {
    const params: any = { channelId: CHANNEL_ID, limit: 100, sinceDate: sinceMs, untilDate: untilMs }
    if (untilId !== undefined) params.untilId = untilId
    const notes = Mk.api("channels/timeline", params) as Note[] | undefined
    if (notes === undefined || notes.len === 0) break
    untilId = notes[notes.len - 1].id
    for (const note of notes) {
      if (note.text !== undefined) {
        const urls = extractUrls(note.text)
        const noteText = urls.len === 1 ? note.text : undefined
        for (const url of urls) {
          songs.push({ url, noteText })
        }
      }
    }
    if (notes.len < 100) break
  }
  return songs
}

function getSong(seedOffset: number): Song | undefined {
  const todayDays = Math.floor(Date.now() / 86400000)
  const rng = Math.gen_rng(`${todayDays}_${USER_ID}_${seedOffset}`)
  const totalWeeks = Math.floor((Date.now() - START_DATE_MS) / 604800000)
  if (totalWeeks <= 0) return undefined
  for (let attempt = 0; attempt < 10; attempt++) {
    const weekIdx = rng(0, totalWeeks - 1)
    const sinceMs = START_DATE_MS + weekIdx * 604800000
    const songs = fetchWeekSongs(sinceMs, sinceMs + 604800000)
    if (songs.len > 0) return songs[rng(0, songs.len - 1)]
  }
  return undefined
}

const MAX_RETRY = 10

function fetchWithAutoRetry(startOffset: number): { song: Song, offset: number } | undefined {
  for (let i = 0; i < MAX_RETRY; i++) {
    Mk.toast(`楽曲を取得中... (${i + 1}/${MAX_RETRY})`)
    const song = getSong(startOffset + i)
    if (song !== undefined) return { song, offset: startOffset + i + 1 }
  }
  return undefined
}

const initial = fetchWithAutoRetry(0)

const song = kiwi.state<Song | undefined>(initial !== undefined ? initial.song : undefined)
const hasResult = kiwi.state(initial !== undefined)
const offset = kiwi.state(initial !== undefined ? initial.offset : MAX_RETRY)

function fetchNext() {
  const result = fetchWithAutoRetry(offset.get())
  if (result !== undefined) {
    song.set(result.song)
    hasResult.set(true)
    offset.set(result.offset)
  } else {
    hasResult.set(false)
    offset.set(offset.get() + MAX_RETRY)
  }
}

Ui.render([
  kiwi.mfm({ text: "$[x2 今日の一曲]" }),
  kiwi.container({ children: () => {
    if (!hasResult.get()) return [
      kiwi.text({ text: `楽曲が見つかりませんでした (${MAX_RETRY}回試行)` }),
      kiwi.button({ text: "もう一度試す", onClick: fetchNext }),
    ]
    const s = song.get()
    const url = s !== undefined ? s.url : ""
    const noteText = s !== undefined ? s.noteText : undefined
    const mainDisplay = noteText !== undefined
      ? kiwi.mfm({ text: noteText })
      : kiwi.mfm({ text: url })
    return [
      mainDisplay,
      kiwi.buttons({ buttons: [
        { text: "別の曲を引く", onClick: fetchNext },
      ]}),
      kiwi.postFormButton({
        text: "シェア",
        primary: true,
        form: () => ({
          text: `${Str.lf}${url}${Str.lf}#今日の一曲${Str.lf}${THIS_URL}`,
        }),
      }),
    ]
  }}),
])
