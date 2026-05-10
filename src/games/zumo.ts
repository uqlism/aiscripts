import { kiwi } from "../kiwi"
import { re } from "../utils/regex"
import { isArr, isStr } from "../utils/types"

type Token = number
const NoToken = -1
type NoToken = typeof NoToken

/** 文字列をトークン列にするためのトークナイザー */
function createTokenizer() {
    type TokenChain = Token | NoToken
    type TokenInfo = {
        expr: string | [Token, Token]
        next: { [K: string]: TokenChain | undefined }
    }

    const tokenInfos: TokenInfo[] = []

    function newToken(expr: string | [Token, Token]): Token {
        const i: Token = tokenInfos.len
        tokenInfos.push({ expr, next: {} })
        return i
    }

    const start = newToken("")
    const end = newToken("")
    const injoinableTokens = [start, end]

    const letterMap: { [k: string]: Token } = {}

    function encodeLetter(letter: string) {
        const i = letterMap[letter]
        if (i === undefined) {
            const t = newToken(letter)
            letterMap[letter] = t
            return t
        }
        return i
    }

    let lastToken = start
    function ingestNextToken(next: Token) {
        const nextStr = next.to_str()
        const lastTokenInfo = tokenInfos[lastToken]
        const chain: TokenChain | undefined = lastTokenInfo.next[nextStr]

        if (chain === undefined) {
            // 初回
            lastTokenInfo.next[nextStr] = NoToken
            lastToken = next
        }
        else if (injoinableTokens.incl(lastToken)) {
            // 結合不可トークンの次
            lastToken = next
        }
        else if (chain === NoToken) {
            // 二回目
            const joinedToken = newToken([lastToken, next])
            lastTokenInfo.next[nextStr] = joinedToken
            lastToken = joinedToken
        } else {
            // 三回目以降
            lastToken = chain
        }
    }

    function ingestLetters(letters: string[]) {
        lastToken = start
        for (const letter of letters) {
            ingestNextToken(encodeLetter(letter))
        }
        ingestNextToken(end)
    }

    function encodeToken(last: Token, next: Token): [Token, boolean] {
        const nextStr = next.to_str()
        const chain: TokenChain | undefined = tokenInfos[last].next[nextStr]
        if (chain === undefined) {
            tokenInfos[last].next[nextStr] = NoToken
            return [next, false]
        } else if (chain === NoToken) {
            return [next, false]
        } else {
            return [chain, true]
        }
    }

    function encodeLetters(letters: string[]): Token[] {
        const tokens: Token[] = []
        let lastToken = start
        function processToken(next: Token) {
            const [token, replace] = encodeToken(lastToken, next)
            lastToken = token
            if (replace) { tokens.pop() }
            tokens.push(token)
        }
        processToken(start)
        for (let i = 0; i < letters.len; i++) {
            processToken(encodeLetter(letters[i]))
        }
        processToken(end)
        return tokens
    }

    function decodeToString(tokens: Token[]) {
        function decodeToken(token: Token): string {
            const e = tokenInfos[token].expr
            if (isStr(e)) {
                return e as string
            } else {
                return `${decodeToken(e[0])}${decodeToken(e[1])}`
            }
        }
        return tokens.map(decodeToken).join()
    }
    return { ingestLetters, decodeToString, encodeLetters, startToken: start, endToken: end }
}

/** トークン列生成のためのマルコフモデル */
function createMarkovModel() {
    const model: { [key: string]: any } = { __num__: 0 }

    const ingest = (tokens: number[]) => {
        let node = model
        for (const token of tokens) {
            const t = token.to_str()
            if (node[t] === undefined) {
                node[t] = {}
            }
            node = node[t]
        }
        node.__num__ = node.__num__ === undefined ? 1 : node.__num__ + 1
    }

    const infer = (tokens: number[]): number | undefined => {
        let node = model
        for (const token of tokens) {
            const t = token.to_str()
            if (node[t] === undefined) {
                node[t] = {}
            }
            node = node[t]
        }
        let totalWeight = 0
        const list: [Token, number][] = []
        for (const [k, v] of Obj.kvs(node).filter(x => x[0] !== "__num__")) {
            const num = (v as any).__num__ === undefined ? 0 : (v as any).__num__
            let n = k.to_num()
            if (n === undefined) {
                return undefined
            }
            list.push([n, num])
            totalWeight += num
        }
        if (totalWeight === 0) {
            return undefined
        }
        const i = Math.rnd(0, totalWeight - 1)
        let j = 0
        for (const item of list) {
            j += item[1]
            if (i < j) {
                return item[0]
            }
        }
    }
    return {
        ingest,
        infer
    }
}

/** ノートの文字列から不要部分を削除し、文字|絵文字 単位で分割 */
function createLetterSplitter() {
    const { char: c, charNot: n, many: m, seq, any } = re
    // 文字列から装飾とURLを削除するための正規表現
    const ignoreRegex = re.or([
        // 文字装飾
        seq([c("$", ""), c("[", ""), m(c(".-+=,", "AZaz09")), c(" ", ""),]),
        c("]", ""),
        // URL
        seq([re.charsSeq("https://"), m(n(` \t${Str.lf}`, ""))]),
        // タグ
        seq([c("#", ""), m(n(` \t${Str.lf}`, ""))]),
        // *
        c("*", ""),
        // メンション
        seq([c("@", ""), m(c("_", "az09")),]),
        // 装飾  等
        seq([c("<", ""), m(c("/", "az")), c(">", ""),]),
    ])

    const tokenizeRegex = re.or([
        // 絵文字
        seq([c(":", ""), m(c("_", "09az"),), c(":", ""),]),
        // 任意の文字
        any,
    ])

    return (x: string) => {
        const codepoints = x.to_unicode_codepoint_arr()
        let output: string[] = [];
        let pos = 0;
        while (pos < codepoints.len) {
            const r = ignoreRegex(codepoints, pos);
            if (r.ok) {
                pos = r.next;
                continue
            }
            const t = tokenizeRegex(codepoints, pos);
            if (t.ok) {
                output.push(Str.from_unicode_codepoints(t.value));
                pos = t.next;
                continue
            }
            pos += 1;
        }
        return output
    }
}

type Note = {
    id: string
    text: string
    user: {
        id: string
        isBot: boolean
    }
}

const noteIterators = {
    api: (url: string, params: any, modifier: (note: Note) => Note | undefined = x => x) => {
        let untilId: string | undefined = undefined
        return (batchCount: number): Note[] => {
            if (untilId === undefined) {
                params.limit = batchCount
                const res = Mk.api(url, params) as Note[]
                if (res.len === 0) {
                    return res
                }
                untilId = res[res.len - 1].id
                return res.map(note => modifier(note)).filter(x => x !== undefined) as Note[]
            }
            else {
                params.untilId = untilId
                params.limit = batchCount
                const res = Mk.api(url, params) as Note[]
                if (res.len === 0) {
                    return res
                }
                untilId = res[res.len - 1].id
                return res.map(note => modifier(note)).filter(x => x !== undefined) as Note[]
            }
        }
    },
    user: (userId: string) => {
        return {
            withMfm: `[${USER_NAME}](${SERVER_URL}/users/${USER_ID})`,
            next: noteIterators.api("users/notes", { userId, includeReplies: false, includeMyRenotes: false })
        }
    },
    ltl: () => {
        return {
            withMfm: `[LTL](${SERVER_URL})`,
            next: noteIterators.api("notes/local-timeline", { withFiles: false, withRenotes: false, withReplies: false }, x => x.user.isBot ? undefined : x)
        }
    },
    clip: (clipId: string) => {
        const clipName = Mk.api("clips/show", { clipId }).name
        return {
            withMfm: `[${clipName}](${SERVER_URL}/clips/${clipId})`,
            next: noteIterators.api("clips/notes", { clipId, limit: 50 })
        }
    },
    tag: (tag: string) => {
        return {
            withMfm: `[${tag}](${SERVER_URL}/tags/${Uri.encode_full(tag)})`,
            next: noteIterators.api("notes/search-by-tag", { tag, withFiles: false, withRenotes: false, withReplies: false })
        }
    }
}

const phase = kiwi.state("init")
const progress = kiwi.state("")

const tokenizer = createTokenizer()

const markovModelDapth = 2
const markovModel = createMarkovModel()

const results = [""]
const resultIndex = kiwi.state(0)

function ingest(noteIter: { next: (batchCount: number) => Note[] }) {
    phase.set("learning")

    // 最新learnSteps*learnCount件のLTLを学習
    const letterSplitter = createLetterSplitter()

    const fetchBatchCount = 50
    const fatchTimes = 6

    let totalLines: string[][] = []

    let last_lines: string[][] = []
    const learnLastLines = () => {
        for (const line of last_lines) {
            tokenizer.ingestLetters(line)
        }
    }

    const getNextLines = (): string[][] => {
        const res = noteIter.next(fetchBatchCount)
        const lines = res
            .filter(x => x.text !== undefined)
            .flat_map(x => x.text.split(Str.lf).map(y => y.trim())).map(letterSplitter).filter(x => x.len > 0)
        return lines
    }

    for (let i = 0; i < fatchTimes; i++) {
        progress.set(`最新 ${(i + 1) * fetchBatchCount}/${fatchTimes * fetchBatchCount} 件のノートを取得中 :nowloading_icon:`)

        // 配列の初期化は多分並列で走るっぽいので、データ取得と加工を並列で走らせる
        const [_, lines] = [
            learnLastLines(),
            getNextLines()
        ]
        last_lines = lines
        totalLines = totalLines.concat(lines)
    }

    // 最後に取得した分の学習
    learnLastLines()

    // マルコフ連鎖モデル学習
    const tokens = totalLines.map(tokenizer.encodeLetters)
    let words = 0
    const tmp: [Token[], (tokens: Token[]) => void][] = []
    for (const _tokens of tokens) {
        tmp.push([_tokens, markovModel.ingest])
    }
    tmp.map(([_tokens, ingest]) => {
        progress.set(`文章を学習中: ${words}/${tokens.len}`)
        words += 1

        // 初手のために短い連鎖を用意しておく
        for (let i = 1; i < markovModelDapth; i++) {
            ingest(_tokens.slice(0, i))
        }
        for (let i = 0; i < _tokens.len - markovModelDapth + 1; i++) {
            ingest(_tokens.slice(i, i + markovModelDapth))
        }
    })
    phase.set("learned")
}

function generate() {
    const icons = [
        ":rei_skin:",
        ":rei_byslime:",
        ":rei_byyusei:",
        ":rei_face_byszk01:",
        ":rei_face_byamagiri:",
        ":rei_sd_dot_bytanuzaka:",
        ":peace_adachi:",
        ":melting_rei:",
    ]
    const icon = icons[Math.rnd(0, icons.len - 1)]
    const tokens = [tokenizer.startToken]
    for (let i = 0; i < 25; i++) {
        const next = markovModel.infer(tokens.slice(Math.max(tokens.len - markovModelDapth + 1, 0), tokens.len))
        if (next === undefined) {
            break
        }
        tokens.push(next)
        if (next === tokenizer.endToken) {
            break
        }
    }
    const text = tokenizer.decodeToString(tokens)

    results.push(`$[flip ${icon}]< ${text}`)
    resultIndex.set(results.len - 1)
}

function iteratorSelectUi(onIteratorSelected: (noteIter: { next: (batchCount: number) => Note[], withMfm: string }) => void) {
    let mode = kiwi.state<string>("ltl")
    let clipId = kiwi.state("")
    let tag = kiwi.state("")

    let error = kiwi.state<string>("")
    kiwi.effect(() => {
        let m = mode.get()
        let i = clipId.get()
        let t = tag.get()
        if (m === "clip" && i === "") {
            error.set("クリップIDを入力してください")
        }
        else if (m === "tag" && t === "") {
            error.set("タグを入力してください")
        }
        else {
            error.set("")
        }
        return true
    })

    return Ui.C.container({
        children: [
            Ui.C.select({
                items: [
                    {
                        text: "LTLからｽﾞﾓる",
                        value: "ltl"
                    },
                    {
                        text: `${USER_NAME}からｽﾞﾓる`,
                        value: "self"
                    },
                    {
                        text: "クリップからｽﾞﾓる",
                        value: "clip"
                    },
                    {
                        text: "タグからｽﾞﾓる",
                        value: "tag"
                    }
                ],
                default: mode.get(),
                onChange: mode.set
            }),
            kiwi.container({
                hidden: () => mode.get() !== "clip",
                children: [
                    kiwi.textInput({
                        label: "クリップID",
                        caption: error.get,
                        default: clipId.get(),
                        onInput: clipId.set
                    })
                ]
            }),
            kiwi.container({
                hidden: () => mode.get() !== "tag",
                children: [
                    kiwi.textInput({
                        label: "タグ",
                        caption: error.get,
                        default: tag.get(),
                        onInput: tag.set
                    })
                ]
            }),
            kiwi.button({
                text: "ｽﾞﾓる",
                disabled: () => error.get() !== "",
                onClick() {
                    if (mode.get() === "ltl") {
                        onIteratorSelected(noteIterators.ltl())
                    } else if (mode.get() === "self") {
                        onIteratorSelected(noteIterators.user(USER_ID))
                    } else if (mode.get() === "clip") {
                        onIteratorSelected(noteIterators.clip(clipId.get()))
                    } else if (mode.get() === "tag") {
                        onIteratorSelected(noteIterators.tag(tag.get()))
                    }
                }
            })
        ]
    })
}

let withMfm = ""
Ui.render([
    kiwi.container({
        hidden: () => phase.get() !== "init",
        children: [iteratorSelectUi((x) => {
            withMfm = x.withMfm
            ingest(x)
        })]
    }),
    kiwi.container({
        hidden: () => phase.get() !== "learning",
        children: [kiwi.mfm({ text: progress.get })]
    }),
    kiwi.container({
        hidden: () => phase.get() !== "learned",
        children: [
            kiwi.mfm({ text: "$[flip.x :adachirei_yay:] 学習完了 !!" }),
            Ui.C.button({ text: "ｽﾞﾓる", onClick: () => { generate(); phase.set("generated") }, })
        ]
    }),
    kiwi.container({
        hidden: () => phase.get() !== "generated",
        children: [
            kiwi.mfm({ text: () => results[resultIndex.get()] }),
            kiwi.buttons({
                buttons: () => {
                    const i = resultIndex.get()
                    return [
                        { text: "←", disabled: i === 1, onClick: () => resultIndex.set(i - 1) },
                        { text: `${i}/${results.len - 1}`, disabled: true, onClick: () => { } },
                        { text: "→", disabled: i === results.len - 1, onClick: () => resultIndex.set(i + 1) },
                        { text: "もっかいｽﾞﾓる", onClick: generate }
                    ]
                }
            }),
            kiwi.postFormButton({
                text: "LTLに放出ｱｱｱｱｧｧｧｧ----wwww",
                primary: true,
                rounded: true,
                form: () => ({
                    text: `${results[resultIndex.get()]}${Str.lf}#ｷﾞｼﾞｽﾞﾓ <small>with ${withMfm}</small>${Str.lf}${THIS_URL}`
                }),
            })
        ]
    })
])
