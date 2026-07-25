import { kiwi } from "../kiwi"
import { range } from "../utils/range"

const hashtag = "#おくったリアクション一覧"
const WEEK_MS = 604800000  // 7 * 24 * 3600 * 1000
const WORKER_COUNT = 24
const TOP_COUNT = 20

function aggregate(counts: { [k: string]: number }, types: string[]): [string, number][] {
  return types.map(t => [t, counts[t]] as [string, number]).sort((a, b) => b[1] - a[1])
}

// ラウンドロビン分配 + ワーカーごと独立集計でレースコンディションを回避
// - head の共有なし → 週の割り当て競合なし
// - counts/types はワーカーローカル → 書き込み競合なし
// - マージは map 完了後に逐次実行 → Obj.kvs 不要、競合なし
// - workerId === 0 の表示ワーカーは done 配列で終了を検知
function fetchAllReactions(sinceMs: number, setProgress: (n: number) => void): { merged: { [k: string]: number }, mergedTypes: string[], total: number } {
  const totalWeeks = Math.ceil((Date.now() - sinceMs) / WEEK_MS)
  let progressTotal = 0
  const done = range(WORKER_COUNT).map(_ => false)

  const workerResults = range(WORKER_COUNT + 1).map(workerId => {
    if (workerId === 0) {
      while (done.filter(d => !d).len > 0) {
        Core.sleep(100)
        setProgress(progressTotal)
      }
      return { counts: {} as { [k: string]: number }, types: [] as string[] }
    }

    const counts: { [k: string]: number } = {}
    const types: string[] = []
    let weekIdx = workerId - 1  // ラウンドロビン: 1,25,49,… / 2,26,50,… / …

    while (weekIdx < totalWeeks) {
      const wSince = sinceMs + weekIdx * WEEK_MS
      let untilId: string | undefined = undefined
      for (let page = 0; page < 20; page++) {
        const params: any = { limit: 100, userId: USER_ID, sinceDate: wSince, untilDate: wSince + WEEK_MS }
        if (untilId !== undefined) params.untilId = untilId
        let res: { id: string, type: string }[] | undefined = undefined
        for (let retry = 0; retry < 5; retry++) {
          res = Mk.api("users/reactions", params) as { id: string, type: string }[] | undefined
          if (res !== undefined) break
          Core.sleep(1000)
        }
        if (res === undefined || res.len === 0) break
        for (const r of res) {
          if (counts[r.type] === undefined) {
            counts[r.type] = 1
            types.push(r.type)
          } else {
            counts[r.type] = counts[r.type] + 1
          }
          progressTotal += 1
        }
        untilId = res[res.len - 1].id
        if (res.len < 100) break
      }
      weekIdx += WORKER_COUNT
    }
    done[workerId - 1] = true
    return { counts, types }
  })

  // map 完了後に逐次マージ（競合なし、Obj.kvs 不要）
  const merged: { [k: string]: number } = {}
  const mergedTypes: string[] = []
  for (let i = 1; i <= WORKER_COUNT; i++) {
    const wr = workerResults[i]
    for (const type of wr.types) {
      if (merged[type] === undefined) {
        merged[type] = wr.counts[type]
        mergedTypes.push(type)
      } else {
        merged[type] = merged[type] + wr.counts[type]
      }
    }
  }

  return { merged, mergedTypes, total: progressTotal }
}

// --- State ---
const phase = kiwi.state<"menu" | "running" | "done">("menu")
const emojisList = kiwi.state<[string, number][]>([])
const fetchedCount = kiwi.state(0)
const totalCount = kiwi.state(0)

const userInfo = Mk.api("users/show", { userId: USER_ID }) as { createdAt: string } | undefined
const accountStartMs = userInfo !== undefined ? Date.parse(userInfo.createdAt) : Date.now() - 52 * WEEK_MS

function startFetch(sinceMs: number) {
  phase.set("running")
  emojisList.set([])
  fetchedCount.set(0)

  const { merged, mergedTypes, total } = fetchAllReactions(sinceMs, fetchedCount.set)

  emojisList.set(aggregate(merged, mergedTypes))
  totalCount.set(total)
  phase.set("done")
}

// --- UI ---
const resultMfm = kiwi.mfm({
  text: () => {
    const list = emojisList.get()
    const p = phase.get()
    if (p === "running") return `集計中… ${fetchedCount.get()} 件取得済み`
    if (list.len === 0) return ""
    const t = totalCount.get()
    const resultText = list.slice(0, TOP_COUNT)
      .map(([emoji, count]) => `${emoji.slice(0, emoji.len - 3)}: ${count}個`)
      .join(Str.lf)
    const summary = `合計${list.len}種類${t}個 / 上位${TOP_COUNT}種類`
    return `${resultText}${Str.lf}<small>${summary}</small>`
  }
})

Ui.render([
  kiwi.container({ align: "center", children: () => {
    const p = phase.get()
    if (p === "menu") return [
      kiwi.mfm({ text: "対象とするリアクション期間を選んでください。" }),
      kiwi.buttons({ buttons: [
        { text: `直近3ヶ月`, onClick: () => startFetch(Date.now() - 12 * WEEK_MS) },
        { text: `全期間`, onClick: () => startFetch(accountStartMs) },
      ]}),
    ]
    const postButton = kiwi.postFormButton({
      text: "結果をノート",
      rounded: true,
      primary: true,
      form: () => {
        const list = emojisList.get()
        const t = totalCount.get()
        const resultText = list.slice(0, TOP_COUNT)
          .map(([emoji, count]) => `${emoji.slice(0, emoji.len - 3)}: ${count}個`)
          .join(Str.lf)
        const summary = `合計${list.len}種類${t}個 / 上位${TOP_COUNT}種類`
        return { text: `おくったリアクションは${Str.lf}${resultText}${Str.lf}<small>${summary}</small>${Str.lf}${hashtag}${Str.lf}${THIS_URL}` }
      },
    })
    return [
      resultMfm,
      kiwi.show(() => phase.get() === "done", [postButton]),
    ]
  }}),
])
