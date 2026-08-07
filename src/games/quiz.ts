/**
 * クイズ作成画面
 * url#make
 *
 * クイズ回答画面
 * url#<quizId>
 * url#random
 *
 * がある
 * misskeyの文字数制限が3000文字なので、余裕をもって 問題数は 1-5 とする
 *
 * 作成したクイズは暗号化して投稿　暗号化文はCWにいれる 説明には回答用のURLをいれる
 *
 * 暗号化はそんなにちゃんとしてなくていいので、b64を一ひねりくらいでもいい
 *
 * 重要なのは文字数なので、protobufとかMessagePackみたいな圧縮を考えたっていいし、deflateとか試したっていい。
 */

import { kiwi, type Mfm, type Router } from "../kiwi"
import { encodeBytes, decodeBytes } from "../utils/base64"
import { type Schema, array, obj, literal, variant, variantCase, str, int, encode as schemaEncode, decode as schemaDecode } from "../utils/suqima"

type QuestionData = {
    question: string,
    explain: string,
} & ({
    type: "text",
    answers: string[],
} | {
    type: "select",
    options: string[],
    answer: number
})

type QuizData = {
    title: string,
    questions: QuestionData[]
}

const MAX_QUESTIONS = 5
const TAG = "voquiz"

// ===== QuizData のスキーマ (suqima のエンコーダーコンビネーターで組み立てる) =====
// 数値タイプはエンコーダー (to_num/to_str の小数丸め問題) が安定しないので、いったん text / select のみに絞っている
type TextQuestion = { question: string, explain: string, type: "text", answers: string[] }
type SelectQuestion = { question: string, explain: string, type: "select", options: string[], answer: number }

const isTextQuestion = (q: QuestionData): q is TextQuestion => q.type === "text"
const isSelectQuestion = (q: QuestionData): q is SelectQuestion => q.type === "select"

const textQuestionSchema: Schema<TextQuestion> = obj<TextQuestion>({
    question: str,
    explain: str,
    type: literal("text"),
    answers: array(str),
})

const selectQuestionSchema: Schema<SelectQuestion> = obj<SelectQuestion>({
    question: str,
    explain: str,
    type: literal("select"),
    options: array(str),
    answer: int,
})

const questionSchema: Schema<QuestionData> = variant([
    variantCase(0, isTextQuestion, textQuestionSchema),
    variantCase(1, isSelectQuestion, selectQuestionSchema),
])

const quizSchema: Schema<QuizData> = obj<QuizData>({
    title: str,
    questions: array(questionSchema),
})

// base64にするだけだと素の文字列がそのまま読めてしまうことがあるので、バイトを一段ずらして分かりにくくする
// ずらし幅を index に応じて変えることで、同じバイトが並んでも同じ値にならないようにしている
const OBFUSCATE_OFFSET = 109

function shiftAt(i: number): number {
    return (i * OBFUSCATE_OFFSET) % 256
}

function obfuscate(bytes: number[]): number[] {
    return bytes.map((b, i) => (b + shiftAt(i)) % 256)
}

function deobfuscate(bytes: number[]): number[] {
    // AiScript の % は負数を渡すと負のまま返ってくるので、% 256 する前に +256 して非負にしている
    return bytes.map((b, i) => (b - shiftAt(i) + 256) % 256)
}

function encodeQuiz(quiz: QuizData): string {
    return encodeBytes(obfuscate(schemaEncode(quizSchema, quiz)))
}

function decodeQuiz(data: string): QuizData | undefined {
    const quiz = schemaDecode(quizSchema, deobfuscate(decodeBytes(data)))
    if (quiz.questions.len < 1 || quiz.questions.len > MAX_QUESTIONS) return undefined
    return quiz
}

// ===== Misskey API =====
// note id は投稿してみないと分からないので使わず、投稿時に自分で振った短い quizId をそのまま識別子として使う。
// URL には quizId をそのまま出すが、他のノートのタグと衝突しないよう検索用タグには vq プレフィックスを付ける。
const QUIZ_ID_PREFIX = "vq"

const BASE36_CHARS = "0123456789abcdefghijklmnopqrstuvwxyz"
const QUIZ_ID_LEN = 5

function generateQuizId(): string {
    let id = ""
    for (let i = 0; i < QUIZ_ID_LEN; i++) {
        id = `${id}${BASE36_CHARS.pick(Math.rnd(0, 35)) ?? "0"}`
    }
    return id
}

function quizTag(quizId: string): string {
    return `${QUIZ_ID_PREFIX}${quizId}`
}

function quizIdExists(quizId: string): boolean {
    const notes = Mk.api("notes/search-by-tag", { tag: quizTag(quizId), limit: 1 }) as unknown[] | undefined
    return notes !== undefined && notes.len > 0
}

// 既存のクイズと id が衝突していないか確認し、被っていたら振り直す
function generateUniqueQuizId(): string {
    for (let i = 0; i < 5; i++) {
        const id = generateQuizId()
        if (!quizIdExists(id)) return id
    }
    return generateQuizId()
}

function fetchQuizById(quizId: string): QuizData | undefined {
    const notes = Mk.api("notes/search-by-tag", { tag: quizTag(quizId), limit: 1 }) as { text: string | undefined }[] | undefined
    if (notes === undefined || notes.len === 0 || notes[0].text === undefined) return undefined
    // text は "<エンコード済みデータ>\n#voquiz #vqXXXXX" の形なので、1行目だけを取り出す
    const payload = notes[0].text.split(Str.lf)[0]
    return decodeQuiz(payload)
}

function fetchRandomQuizId(): string | undefined {
    const notes = Mk.api("notes/search-by-tag", { tag: TAG, limit: 50 }) as { tags: string[] }[] | undefined
    if (notes === undefined) return undefined
    const ids: string[] = []
    for (const note of notes) {
        const tag = note.tags.find(t => t.starts_with(QUIZ_ID_PREFIX))
        if (tag === undefined) continue
        const id = tag.slice(QUIZ_ID_PREFIX.len, tag.len)
        if (!ids.incl(id)) ids.push(id)
    }
    if (ids.len === 0) return undefined
    return ids[Math.rnd(0, ids.len - 1)]
}

// ===== クイズ回答画面 =====
function QuizPlayView(router: Router, quiz: QuizData, quizId: string) {
    const idx = kiwi.state(0)
    const answered = kiwi.state(false)
    const correctFlags = kiwi.state<boolean[]>([])
    const textAnswer = kiwi.state("")
    // idx を配列長より先に進めると「存在しない問題」を指してしまうので、
    // 完了状態は idx をオーバーさせず別の state で管理する。
    const finished = kiwi.state(false)

    // idx が範囲外でも呼ばれる可能性があるため undefined を許容する。
    // kiwi.show は子要素を隠すだけで評価自体は止めないので、show の条件式や中の reactive な関数も
    // 「非表示のとき何が渡ってきても大丈夫」に書く必要がある。
    const currentQuestion = (): QuestionData | undefined => quiz.questions[idx.get()]

    function finishAnswer(correct: boolean) {
        correctFlags.update(arr => [...arr, correct])
        answered.set(true)
    }
    function submitText() {
        const q = currentQuestion()
        if (q === undefined || q.type !== "text") return
        const v = textAnswer.get().trim().lower()
        finishAnswer(q.answers.some(a => a.trim().lower() === v))
    }
    function chooseOption(i: number) {
        const q = currentQuestion()
        if (q === undefined || q.type !== "select") return
        finishAnswer(i === q.answer)
    }
    function next() {
        if (idx.get() + 1 >= quiz.questions.len) {
            finished.set(true)
            return
        }
        textAnswer.set("")
        answered.set(false)
        idx.update(n => n + 1)
    }
    function retry() {
        idx.set(0)
        correctFlags.set([])
        answered.set(false)
        textAnswer.set("")
        finished.set(false)
    }

    return [
        kiwi.mfm(`$[x2 ${quiz.title}]`),
        kiwi.show(() => !finished.get(), [
            kiwi.mfm(() => `問題 ${idx.get() + 1} / ${quiz.questions.len}`),
            kiwi.mfm(() => `**${currentQuestion()?.question ?? ""}**`),
            kiwi.show(() => !answered.get() && currentQuestion()?.type === "text", [
                kiwi.textInput({ label: "回答", default: () => textAnswer.get(), onInput: textAnswer.set }),
                kiwi.button({ text: "回答する", primary: true, disabled: () => textAnswer.get().trim() === "", onClick: submitText }),
            ]),
            kiwi.show(() => !answered.get() && currentQuestion()?.type === "select", [
                kiwi.mfm(() => {
                    const q = currentQuestion()
                    if (q === undefined || q.type !== "select") return ""
                    const nodes: Mfm[] = []
                    for (let i = 0; i < q.options.len; i++) {
                        const oi = i
                        nodes.push(kiwi.click(`⬜ ${q.options[oi]}`, () => chooseOption(oi)))
                        nodes.push("\n")
                    }
                    return nodes
                }),
            ]),
            kiwi.show(() => answered.get(), [
                kiwi.mfm(() => {
                    const flags = correctFlags.get()
                    if (flags.len === 0) return ""
                    return flags[flags.len - 1] ? "✅ 正解！" : "❌ 不正解"
                }),
                kiwi.show(() => (currentQuestion()?.explain ?? "") !== "", [
                    kiwi.mfm(() => `解説: ${currentQuestion()?.explain ?? ""}`),
                ]),
                kiwi.button({ text: () => idx.get() + 1 < quiz.questions.len ? "次の問題へ" : "結果を見る", primary: true, onClick: next }),
            ]),
        ]),
        kiwi.show(() => finished.get(), [
            kiwi.mfm(() => {
                const flags = correctFlags.get()
                return `$[x2 結果: ${flags.filter(v => v).len} / ${quiz.questions.len}]`
            }),
            kiwi.postFormButton({
                text: "結果をシェア",
                primary: true,
                form: () => {
                    const flags = correctFlags.get()
                    return {
                        text: `${quiz.title} で ${flags.filter(v => v).len}/${quiz.questions.len}問正解！${Str.lf}${THIS_URL}#${quizId} #${TAG}`,
                    }
                },
            }),
            kiwi.buttons({ buttons: [
                { text: "もう一度挑戦", onClick: retry },
                { text: "トップへ", onClick: () => router.navigate("") },
            ]}),
        ]),
    ]
}

// ===== クイズ作成画面 =====
type QuestionEditor = {
    question: string,
    explain: string,
    type: "text" | "select",
    textAnswers: string,
    options: string,
    selectAnswer: number,
}

function emptyEditor(): QuestionEditor {
    return { question: "", explain: "", type: "text", textAnswers: "", options: "", selectAnswer: 0 }
}

function toQuestionData(e: QuestionEditor): QuestionData | undefined {
    const question = e.question.trim()
    const explain = e.explain.trim()
    if (question === "") return undefined
    if (e.type === "text") {
        const answers = e.textAnswers.split(Str.lf).map(s => s.trim()).filter(s => s !== "")
        if (answers.len === 0) return undefined
        return { question, explain, type: "text", answers }
    }
    const options = e.options.split(Str.lf).map(s => s.trim()).filter(s => s !== "")
    if (options.len < 2 || e.selectAnswer < 0 || e.selectAnswer >= options.len) return undefined
    return { question, explain, type: "select", options, answer: e.selectAnswer }
}

function MakeView(router: Router) {
    // 編集中の内容は自動保存し、リロードしても続きから編集できるようにする
    const title = kiwi.persist(`${THIS_ID}_quiz_title`, "")
    const questions = kiwi.persist<QuestionEditor[]>(`${THIS_ID}_quiz_questions`, [emptyEditor()])
    const focus = kiwi.state(0)

    // notes/create は投稿権限トークンが要るので使わず、kiwi.postFormButton (ユーザー自身の投稿フォーム) で投稿してもらう。
    // 投稿するノートの id は事前に分からないので、代わりに投稿前に自分で quizId を発行してタグに埋め込み、
    // それをそのまま識別子として使う (プレイ用URLも投稿前から確定できる)。
    const quizId = generateUniqueQuizId()

    function patchFocused(patch: (e: QuestionEditor) => QuestionEditor) {
        const idx = focus.get()
        const arr = questions.get()
        arr[idx] = patch(arr[idx])
        questions.set(arr)
    }
    function addQuestion() {
        if (questions.get().len >= MAX_QUESTIONS) return
        questions.update(arr => [...arr, emptyEditor()])
        focus.set(questions.get().len - 1)
    }
    function removeFocused() {
        if (questions.get().len <= 1) return
        const idx = focus.get()
        questions.update(arr => arr.filter((_, i) => i !== idx))
        focus.set(Math.max(0, idx - 1))
    }
    function buildQuiz(): QuizData | undefined {
        const t = title.get().trim()
        if (t === "") return undefined
        const qs: QuestionData[] = []
        for (const e of questions.get()) {
            const q = toQuestionData(e)
            if (q === undefined) return undefined
            qs.push(q)
        }
        if (qs.len < 1 || qs.len > MAX_QUESTIONS) return undefined
        return { title: t, questions: qs }
    }
    function isPublishable(): boolean {
        return buildQuiz() !== undefined
    }

    return [
        kiwi.mfm("$[x2 クイズを作る]"),
        kiwi.text({ text: "1〜5問のクイズを作成できます" }),
        kiwi.textInput({ label: "クイズのタイトル", default: () => title.get(), onInput: title.set }),
        kiwi.container({ children: () => {
            const qs = questions.get()
            const f = focus.get()
            return [kiwi.buttons({ buttons: qs.map((_, i) => ({ text: `問題${i + 1}`, primary: f === i, onClick: () => focus.set(i) })) })]
        }}),
        kiwi.textInput({ label: "問題文", default: () => questions.get()[focus.get()].question, onInput: v => patchFocused(e => ({ ...e, question: v })) }),
        kiwi.textarea({ label: "解説（任意・回答後に表示）", default: () => questions.get()[focus.get()].explain, onInput: v => patchFocused(e => ({ ...e, explain: v })) }),
        kiwi.select({
            items: [{ text: "記述式", value: "text" }, { text: "選択式", value: "select" }],
            default: () => questions.get()[focus.get()].type,
            onChange: (v: "text" | "select") => patchFocused(e => ({ ...e, type: v })),
        }),
        kiwi.show(() => questions.get()[focus.get()].type === "text", [
            kiwi.textarea({ label: "正解（1行に1つ、複数可）", default: () => questions.get()[focus.get()].textAnswers, onInput: v => patchFocused(e => ({ ...e, textAnswers: v })) }),
        ]),
        kiwi.show(() => questions.get()[focus.get()].type === "select", [
            kiwi.textarea({ label: "選択肢（1行に1つ、2つ以上）", default: () => questions.get()[focus.get()].options, onInput: v => patchFocused(e => ({ ...e, options: v })) }),
            kiwi.mfm(() => {
                const e = questions.get()[focus.get()]
                const opts = e.options.split(Str.lf).map(s => s.trim()).filter(s => s !== "")
                if (opts.len === 0) return "<small>選択肢を入力してください</small>"
                const nodes: Mfm[] = []
                for (let i = 0; i < opts.len; i++) {
                    const oi = i
                    nodes.push(kiwi.click(`${e.selectAnswer === oi ? "✅" : "⬜"} ${opts[oi]}`, () => patchFocused(pe => ({ ...pe, selectAnswer: oi }))))
                    nodes.push("\n")
                }
                return nodes
            }),
        ]),
        kiwi.buttons({ buttons: [
            { text: "＋問題を追加", disabled: false, onClick: addQuestion },
            { text: "この問題を削除", disabled: false, onClick: removeFocused },
        ]}),
        kiwi.show(() => isPublishable(), [
            kiwi.postFormButton({
                text: "投稿する",
                primary: true,
                form: () => {
                    const quiz = buildQuiz()
                    return {
                        cw: `${quiz?.title ?? ""}${Str.lf}${THIS_URL}#${quizId}`,
                        text: `${encodeQuiz(quiz ?? { title: "", questions: [] })}${Str.lf}#${TAG} #${quizTag(quizId)}`,
                        visibility: "public",
                    }
                },
            }),
            kiwi.mfm(() => `回答用URL:${Str.lf}${THIS_URL}#${quizId}`),
        ]),
        kiwi.show(() => !isPublishable(), [
            kiwi.button({ text: "投稿する", disabled: true, onClick: () => {} }),
        ]),
        kiwi.button({ text: "← メニューに戻る", onClick: () => router.navigate("") }),
    ]
}

// ===== メニュー / ルーティング =====
function MenuView(router: Router) {
    return [
        kiwi.div(["$[x2 クイズ]", "自分だけのクイズを作って投稿しよう"], { align: "center" }),
        kiwi.div([
            kiwi.button({ text: "クイズを作る", primary: true, onClick: () => router.navigate("make") }),
            kiwi.button({ text: "ランダムなクイズに挑戦", onClick: () => router.navigate("random") }),
        ]),
    ]
}

type QuizLoadResult = { quiz: QuizData, quizId: string }

// Mk.api の呼び出しは重い可能性があるので、Async.timeout で1tick遅らせて先に「読み込み中」を描画してから取得する
function LoadingQuizView(router: Router, load: () => QuizLoadResult | undefined, notFoundText: string) {
    const state = kiwi.state<"loading" | "error" | QuizLoadResult>("loading")
    Async.timeout(0, () => {
        state.set(load() ?? "error")
    })

    return [
        kiwi.show(() => state.get() === "loading", [
            kiwi.text({ text: "読み込み中..." }),
        ]),
        kiwi.show(() => state.get() === "error", [
            kiwi.mfm(notFoundText),
            kiwi.button({ text: "トップへ", onClick: () => router.navigate("") }),
        ]),
        kiwi.container({ children: () => {
            const s = state.get()
            if (s === "loading" || s === "error") return []
            return QuizPlayView(router, s.quiz, s.quizId)
        }}),
    ]
}

function PlayRouteView(router: Router, quizId: string) {
    return LoadingQuizView(router, () => {
        const quiz = fetchQuizById(quizId)
        return quiz === undefined ? undefined : { quiz, quizId }
    }, "クイズの読み込みに失敗しました")
}

function RandomRouteView(router: Router) {
    return LoadingQuizView(router, () => {
        const id = fetchRandomQuizId()
        if (id === undefined) return undefined
        const quiz = fetchQuizById(id)
        return quiz === undefined ? undefined : { quiz, quizId: id }
    }, "挑戦できるクイズが見つかりませんでした")
}

const router: Router = kiwi.app()
    .on("", () => MenuView(router))
    .on("make", () => MakeView(router))
    .on("random", () => RandomRouteView(router))
    .on(":quizId", (path) => PlayRouteView(router, path.quizId))
    .notFound(() => [
        kiwi.mfm("ページが見つかりません"),
        kiwi.button({ text: "トップへ", onClick: () => router.navigate("") }),
    ])

Ui.render([router.mount()])

