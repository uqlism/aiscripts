import { kiwi } from "../kiwi"

// ===== カウンター =====
function CounterView() {
  const count = kiwi.state(0)
  const doubled = kiwi.computed(() => count.get() * 2)

  return [
    kiwi.mfm("$[x2 カウンター]"),
    kiwi.mfm(() => `現在: **${count.get()}** / 2倍: **${doubled.get()}**`),
    kiwi.buttons({ buttons: [
      { text: "-1", onClick: () => count.update(n => n - 1) },
      { text: "リセット", onClick: () => count.set(0) },
      { text: "+1", primary: true, onClick: () => count.update(n => n + 1) },
    ]}),
  ]
}

// ===== クリッカブル MFM =====
function ClickMfmView() {
  const selected = kiwi.state<string | undefined>(undefined)
  const items = ["🍎 りんご", "🍊 みかん", "🍇 ぶどう", "🍓 いちご", "🥝 キウイ"]

  return [
    kiwi.mfm("$[x2 好きなフルーツは？]"),
    kiwi.mfm(() => {
      const sel = selected.get()
      const nodes: ReturnType<typeof kiwi.click>[] = []
      for (const item of items) {
        nodes.push(kiwi.click(sel === item ? `$[bg.color=88ff88 ${item}]` : item, () => selected.set(item)))
      }
      return nodes
    }),
    kiwi.mfm(() => {
      const sel = selected.get()
      return sel !== undefined ? `選択中: **${sel}**` : "<small>フルーツを選んでください</small>"
    }),
  ]
}

// ===== Todo リスト (persist) =====
function TodoView() {
  const todos = kiwi.persist<string[]>("kiwi_demo_todos", [])
  const input = kiwi.state("")

  const addTodo = () => {
    const text = input.get().trim()
    if (text === "") return
    todos.update(list => [...list, text])
    input.set("")
  }

  return [
    kiwi.mfm("$[x2 Todoリスト]"),
    kiwi.text({ text: "リロードしても保存されます" }),
    kiwi.mfm(() => {
      const list = todos.get()
      if (list.len === 0) return "<small>タスクを追加してください</small>"
      const nodes: ReturnType<typeof kiwi.click>[] = []
      let idx = 0
      for (const todo of list) {
        const i = idx++
        nodes.push(kiwi.click(`✅ ${todo}`, () => {
          todos.update(list => list.filter((_, j) => j !== i))
        }))
      }
      return nodes
    }),
    kiwi.textInput({
      label: "新しいタスク",
      default: () => input.get(),
      onInput: input.set,
    }),
    kiwi.button({ text: "追加", primary: true, disabled: () => input.get().trim() === "", onClick: addTodo }),
  ]
}

// ===== パス/クエリパラメータ =====
function ParamsView(pathParams: { [k: string]: string }, queryParams: { [k: string]: string }) {
  return [
    kiwi.mfm("$[x2 パラメータ確認]"),
    kiwi.mfm(`パスパラメータ: **id** = \`${pathParams.id}\``),
    kiwi.mfm(`クエリパラメータ: **tab** = \`${queryParams.tab ?? "(なし)"}\``),
    kiwi.div([
      kiwi.button({ text: "?tab=profile", onClick: () => router.navigate(`params/${pathParams.id}`, { tab: "profile" }) }),
      kiwi.button({ text: "?tab=settings", onClick: () => router.navigate(`params/${pathParams.id}`, { tab: "settings" }) }),
      kiwi.button({ text: "クエリなし", onClick: () => router.navigate(`params/${pathParams.id}`) }),
    ]),
    kiwi.mfm(() => `現在の URL: \`${router.currentUrl()}\``),
  ]
}

// ===== ルーター =====
const router = kiwi.app()
  .on("", () => [
    kiwi.div([
      "$[x2 🥝 Kiwi フレームワーク デモ]",
      "AiScript 用リアクティブ UI フレームワーク",
    ], { align: "center" }),
    kiwi.div([
      kiwi.button({ text: "カウンター", primary: true, onClick: () => router.navigate("counter") }),
      kiwi.button({ text: "クリッカブル MFM", onClick: () => router.navigate("clickmfm") }),
      kiwi.button({ text: "Todo リスト", onClick: () => router.navigate("todo") }),
      kiwi.button({ text: "パラメータ (id=42)", onClick: () => router.navigate("params/42", { tab: "profile" }) }),
    ]),
  ])
  .on("counter", () => [
    ...CounterView(),
    kiwi.button({ text: "← メニューに戻る", onClick: () => router.navigate("") }),
  ])
  .on("clickmfm", () => [
    ...ClickMfmView(),
    kiwi.button({ text: "← メニューに戻る", onClick: () => router.navigate("") }),
  ])
  .on("todo", () => [
    ...TodoView(),
    kiwi.button({ text: "← メニューに戻る", onClick: () => router.navigate("") }),
  ])
  .on("params/:id", (path, query) => [
    ...ParamsView(path, query),
    kiwi.button({ text: "← メニューに戻る", onClick: () => router.navigate("") }),
  ])
  .notFound((path) => [
    kiwi.mfm(`ページが見つかりません: ${path}`),
    kiwi.button({ text: "← メニューに戻る", onClick: () => router.navigate("") }),
  ])

Ui.render([router.mount()])
