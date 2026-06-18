import { kiwi } from "../kiwi"
import { range } from "../utils/range"
import { isStr } from "../utils/types"

const TAG = "性癖ビンゴ"
const DATA_TAG = "adeanga0y9"
const POST_TAG = "adeanga0y9post"
const LEGACY_USERNAMES: string[] = ["torune","tomoinu","jakusyo","m4nju","jiomosphere","mufcomet","hanrei_7","gamma_u1","asamiyuukachan","evol_oscar","front_rain530","kokage","oyakimon","torafugu416","metal_medal","freud","riceko","jiro656","shicoku","koizumi_ryumai","sakutara","ss","5","tetelatela","shippo_man","hamanasu","himantotopuhu","jugon_swt","n_honok","syamoman","neineinenene","ginnotsuki","yakumo_hisyo","gluon","shtrsn","hozuki1001","mitsukieira624","unkraut","voidra","aozoramikan","ulmado_akane","ykrn_whitemofu","suzukimintu","carmenia_saotomemon","tieazukayo486","samemaru","u0","sanasinn","aoi_isino","colen0108","yucke","uqlism"]
const TOTAL = 25

function pad2(n: number): string {
  return n < 10 ? `0${n.to_str()}` : n.to_str()
}

function userTag(username: string): string {
  return `${DATA_TAG}_${username.lower()}`
}

// --- Note Format ---
function formatNote(items: string[]) {
  const lines: string[] = range(TOTAL).map(i => `[${pad2(i + 1)}] ${items[i]}`)
  return kiwi.postFormButton({
    text: "性癖ビンゴを公開",
    primary: true,
    form: () => ({
      cw: `${USER_USERNAME}の性癖ビンゴ #${TAG}${Str.lf}性癖相性をチェック→ ${THIS_URL}?user=${USER_USERNAME}`,
      text: `${lines.join(Str.lf)}${Str.lf}#${userTag(USER_USERNAME)} #${POST_TAG}`,
    }),
  })
}

function parseNote(text: string): string[] | undefined {
  const items: string[] = []
  for (const line of text.split(Str.lf)) {
    const trimmed = line.trim()
    if (!trimmed.starts_with("[")) continue
    const end = trimmed.index_of("] ")
    if (end < 0) continue
    items.push(trimmed.slice(end + 2, trimmed.len))
  }
  return items.len === TOTAL ? items : undefined
}

// --- API ---
type NoteInfo = { id: string, text: string | undefined, tags: string[] }

function fetchBingoNoteByTag(tag: string): string[] | undefined {
  const notes = Mk.api("notes/search-by-tag", { tag, limit: 1 }) as NoteInfo[] | undefined
  if (notes === undefined || notes.len === 0) return undefined
  const text = notes[0].text
  if (text === undefined) return undefined
  return parseNote(text)
}

function fetchRandomUsername(): string | undefined {
  const prefix = `${DATA_TAG}_`
  const usernames: string[] = []
  let untilId: string | undefined = undefined
  for (let page = 0; page < 10; page++) {
    const params: any = { tag: POST_TAG, limit: 100 }
    if (untilId !== undefined) params.untilId = untilId
    const notes = Mk.api("notes/search-by-tag", params) as NoteInfo[] | undefined
    if (notes === undefined || notes.len === 0) break
    untilId = notes[notes.len - 1].id
    for (const note of notes) {
      for (const t of note.tags) {
        if (t.starts_with(prefix)) {
          const u = t.slice(prefix.len, t.len)
          if (!usernames.incl(u)) usernames.push(u)
          break
        }
      }
    }
    if (notes.len < 100) break
  }
  for (const u of LEGACY_USERNAMES) {
    if (!usernames.incl(u)) usernames.push(u)
  }
  if (usernames.len === 0) return undefined
  return usernames[Math.rnd(0, usernames.len - 1)]
}

function getQueryParam(key: string): string | undefined {
  const url = Mk.url()
  const qIdx = url.index_of("?")
  if (qIdx < 0) return undefined
  const query = url.slice(qIdx + 1, url.len)
  for (const pair of query.split("&")) {
    const eqIdx = pair.index_of("=")
    if (eqIdx < 0) continue
    if (pair.slice(0, eqIdx) === key) return pair.slice(eqIdx + 1, pair.len)
  }
  return undefined
}

// --- Global States ---
const phase = kiwi.state<"menu" | "edit" | "match">("menu")

// Match
const initialUser = getQueryParam("user")

const matchPhase = kiwi.state<"input" | "play">("input")
const inputUser = kiwi.state(initialUser ?? "")
const selectedUserLabel = kiwi.state("")
const matchItems = kiwi.state<string[]>(range(TOTAL).map(_ => ""))
const matchHits = kiwi.state<boolean[]>(range(TOTAL).map(_ => false))

function doRandomMatch() {
  Mk.toast("ランダム検索中...")
  const username = fetchRandomUsername()
  if (username === undefined) {
    Mk.toast("ビンゴ投稿が見つかりませんでした")
    return
  }
  const items = fetchBingoNoteByTag(userTag(username))
  if (items === undefined) {
    Mk.toast(`${username} のビンゴが取得できませんでした`)
    return
  }
  phase.set("match")
  selectedUserLabel.set(username)
  matchItems.set(items)
  matchHits.set(range(TOTAL).map(_ => false))
  matchPhase.set("play")
}

if (initialUser !== undefined) {
  phase.set("match")
  const items = fetchBingoNoteByTag(userTag(initialUser))
  if (items !== undefined) {
    selectedUserLabel.set(initialUser)
    matchItems.set(items)
    matchPhase.set("play")
  }
} else if (getQueryParam("mode") === "random") {
  doRandomMatch()
}

const doFetchBingo = () => {
  const input = inputUser.get()
  if (input === "") return
  const tag = userTag(input)
  const items = fetchBingoNoteByTag(tag)
  if (items === undefined) {
    Mk.toast(`${input} の性癖ビンゴが見つかりませんでした`)
    return
  }
  selectedUserLabel.set(input)
  matchItems.set(items)
  matchHits.set(range(TOTAL).map(_ => false))
  matchPhase.set("play")
}

const toggleHit = (i: number) => {
  const arr = matchHits.get().map((v, j) => j === i ? !v : v)
  matchHits.set(arr)
}

function countBingoLines(hits: boolean[]): number {
  const lines = [
    [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
    [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
    [0, 6, 12, 18, 24], [4, 8, 12, 16, 20],
  ]
  return lines.filter(line => line.filter(i => hits[i]).len === 5).len
}

// --- Match Components ---
const matchGrid = kiwi.mfm({
  text: () => {
    const hits = matchHits.get()
    const score = hits.filter(v => v).len
    const gridText = range(5).map(row =>
      range(5).map(col => {
        const i = row * 5 + col
        return hits[i] ? "🟩" : "⬛"
      }).join("")
    ).join(Str.lf)
    const lines = countBingoLines(hits)
    const label = selectedUserLabel.get()
    return `@${label}${Str.lf}$[x2 ${gridText}]${Str.lf}相性スコア: ${score} / ${TOTAL}  ビンゴ: ${lines}列`
  },
})

const matchToggleList = kiwi.mfm({
  text: () => {
    const hits = matchHits.get()
    const items = matchItems.get()
    return range(TOTAL).map(i => {
      const item = items.len > i ? items[i] : "？"
      return `$[clickable.ev=t_${i} ${hits[i] ? "🟩" : "⬛"} ${pad2(i + 1)}: ${item}]`
    }).join(Str.lf)
  },
  onClickEv: (evId: string) => {
    if (!evId.starts_with("t_")) return
    const n = evId.slice(2, evId.len).to_num()
    if (n !== undefined && n >= 0 && n < TOTAL) toggleHit(n)
  },
})

function editUI() {
  type SaveData = { items: (string | undefined)[] } | undefined

  const savedItems: string[] = (() => {
    const raw = Mk.load(THIS_ID) as SaveData | undefined
    if (raw !== undefined && raw.items !== undefined && raw.items.len === TOTAL) {
      return raw.items.map(v => isStr(v) ? v : "")
    }
    return range(TOTAL).map(_ => "")
  })()

  const editItems = kiwi.state<string[]>(savedItems)
  const editPhase = kiwi.state<"edit" | "confirm">("edit")

  kiwi.effect(() => {
    const items = editItems.get()
    Mk.save(THIS_ID, { items })
    return true
  })

  const focus = kiwi.state<number>(0)

  const grid = kiwi.mfm({
    text: () => {
      const items = editItems.get()
      const focusIdx = focus.get()
      const grid = range(5).map(row =>
        range(5).map(col => {
          const i = row * 5 + col
          const item = items.len > i ? items[i] : ""
          return `$[clickable.ev=cell_${i} ${i === focusIdx ? "🟨" : item === "" ? "⬛" : "🟩"}]`
        }).join("")
      ).join(Str.lf)
      return `$[x2 ${grid}]`
    },
    onClickEv: (evId: string) => {
      if (!evId.starts_with("cell_")) return
      const n = evId.split("_")[1].to_num()
      if (n === undefined || n < 0 || n >= TOTAL) return
      focus.set(n)
    },
  })

  return [
    kiwi.mfm({ text: "$[x2 自分の性癖ビンゴ]" }),
    kiwi.text({ text: "25マスに性癖を入力してください (マスをクリックで選択)" }),
    kiwi.text({ text: "キャラ名でも身体パーツでもアイテムでも概念でもセリフでもなんでもどうぞ" }),
    kiwi.container({
      align: "center",
      children: [
        grid,
        kiwi.mfm({
          text: () => {
            const filled = editItems.get().filter(v => v !== "").len
            return `<small>${filled} / ${TOTAL}</small>`
          },
        }),
      ]
    }),
    kiwi.textInput({
      default: () => editItems.get()[focus.get() ?? 0] ?? "",
      onInput: (v: string) => {
        const arr = editItems.get()
        arr[focus.get() ?? 0] = v
        editItems.set(arr)
      },
    }),
    kiwi.show(
      () => editItems.get().filter(v => v !== "").len === TOTAL,
      [kiwi.container({ children: () => [formatNote(editItems.get())] })]
    ),
    kiwi.show(
      () => editItems.get().filter(v => v !== "").len < TOTAL,
      [kiwi.button({ text: "ノートに投稿する（全マス入力後に解放）", disabled: true, onClick: () => { } })]
    ),
    kiwi.switch(() => editPhase.get(), {
      edit: [
        kiwi.buttons({ buttons: [
          { text: "リセット", onClick: () => editPhase.set("confirm") },
          { text: "メニューに戻る", onClick: () => phase.set("menu") },
        ]}),
      ],
      confirm: [
        kiwi.text({ text: "本当にリセットしますか？" }),
        kiwi.buttons({ buttons: [
          { text: "リセット", primary: true, onClick: () => { editItems.set(range(TOTAL).map(_ => "")); focus.set(0); editPhase.set("edit") } },
          { text: "キャンセル", onClick: () => editPhase.set("edit") },
        ]}),
      ],
    }),
  ]
}

// --- Render ---
Ui.render([
  kiwi.switch(() => phase.get(), {
    menu: [
      kiwi.mfm({ text: `$[x2 性癖ビンゴ]` }),
      kiwi.text({ text: "自分の性癖25マスを埋めてノートに公開！他のユーザーとの相性もチェックしよう" }),
      kiwi.button({ text: "自分の性癖ビンゴを作る", onClick: () => phase.set("edit") }),
      kiwi.button({ text: "他の人との相性チェック", onClick: () => phase.set("match") }),
      kiwi.button({ text: "ランダムマッチ", onClick: doRandomMatch }),
    ],
    edit: editUI(),
    match: [
      kiwi.mfm({ text: "$[x2 性癖相性チェック]" }),
      kiwi.switch(() => matchPhase.get(), {
        input: [
          kiwi.textInput({
            label: "ユーザー名 (@なし)",
            default: "",
            onInput: inputUser.set,
          }),
          kiwi.button({
            text: "取得",
            disabled: () => inputUser.get() === "",
            onClick: doFetchBingo,
          }),
        ],
        play: [
          kiwi.container({
            align: "center",
            children: [

              matchGrid,
            ]
          }),
          matchToggleList,
          kiwi.postFormButton({
            text: "スコアをシェア",
            primary: true,
            form: () => {
              const hits = matchHits.get()
              const score = hits.filter(v => v).len
              const label = selectedUserLabel.get()
              const gridText = range(5).map(row =>
                range(5).map(col => {
                  const i = row * 5 + col
                  return hits[i] ? "🟩" : "⬛"
                }).join("")
              ).join(Str.lf)
              const lines = countBingoLines(hits)
              const items = matchItems.get()
              const hitList = range(TOTAL).filter(i => hits[i]).map(i => items[i]).join(Str.lf)
              const url = `${THIS_URL}?user=${label}`
              const cwFull = `@${label} の性癖ビンゴ: ${score}/${TOTAL}マス ビンゴ${lines}列${Str.lf}#${TAG}${Str.lf}${url}`
              const cwShort = `@${label} の性癖ビンゴ: ${score}/${TOTAL}マス ビンゴ${lines}列${Str.lf}#${TAG}`
              const tooLong = cwFull.len > 100
              return {
                cw: tooLong ? cwShort : cwFull,
                text: tooLong ? `${url}${Str.lf}${gridText}${Str.lf}${hitList}` : `${gridText}${Str.lf}${hitList}`,
              }
            },
          }),
          kiwi.buttons({ buttons: [
            { text: "別のユーザーを指定", onClick: () => matchPhase.set("input") },
            { text: "ランダムマッチ", onClick: doRandomMatch },
            { text: "メニューに戻る", onClick: () => phase.set("menu") },
          ]}),
        ],
      }),
    ],
  }),
])
