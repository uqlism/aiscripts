import { kiwi } from "./kiwi"
import { serialArr } from "./serialArr"
import { array } from "./utils/array"

const Color = {
    empty: 0,
    guess: 1,
    miss: 2,
    hit: 3,
    same: 4,
}
const colorMap = [
    { fg: "fff", bg: "111" },
    { fg: "fff", bg: "111" },
    { fg: "fff", bg: "444" },
    { fg: "fff", bg: "ba4" },
    { fg: "fff", bg: "595" },
]
type Color = (typeof Color)[keyof typeof Color]
type Guess = { letter: string, color: Color }[]

const wordLen = 6
const maxGuessCount = 6

const answerWords = [
    "adati", // 足立レイ
    "ai",
    "akane",
    "akari",
    "allial",
    "amato",
    "aoi",
    "aoyama",
    "asumi",
    "fee", // FEEちゃん
    "flower",
    "futaba", // 双葉湊音
    "galaco",
    "gumi", // GUMI
    "hatune", // 初音ミク
    "hau", // 雨晴はう
    "himari",
    "hime", // 鳴花ヒメ
    "ia",
    "icalo",
    "iori",
    "itako",
    "kafu",
    "kaito",
    "natuki", // 夏色花梨
    "karin", // 夏色花梨 谷崎カリン
    "koharu",
    "kotone",
    "kou",
    "len",
    "maki",
    "meiko",
    "meimei",
    "metan",
    "miko", // 櫻歌ミコ
    "mikoto", // 鳴花ミコト
    "miku",
    "minase",
    "minato", // 双葉湊音
    "moca", // 宮舞モカ
    "motiko", // もち子さん
    "one", // OИE
    "rei", // 足立レイ
    "rikka",
    "rime",
    "rin",
    "ririse",
    "matuka", // 松樺りすく
    "risuku", // 松樺りすく
    "ritu", // 波音リツ
    "riu",
    "ryusei",
    "sasara",
    "satou",
    "sayo",
    "seika",
    "sekai",
    "shuo",
    "sikoku",
    "suzuki",
    "teto",
    "tobari",
    "tohoku",
    "tt", // ナースロボ_タイプT
    "tudumi",
    "tuina",
    "tumugi",
    "tunose",
    "una",
    "uni",
    "unoka",
    "urone",
    "usagi",
    "yuduki",
    "yuduru",
    "yukari",
    "yuki",
    "yukine",
    "zunko",
    "meika", // 鳴花ヒメ 鳴花ミコト
    "tifuyu",
    "kizuna",
    "kasane", // 重音テト
    "sora", // 桜乃そら | 九州そら
    "haruno", // 桜乃そら
    "kazami", // 風見壮一
    "souiti", // 風見壮一
    "tange", // タンゲコトエ
    "kotoe", // タンゲコトエ
    "kakyou", // カキョウヨサリ
    "yosari", // カキョウヨサリ
    "soyogi", // 梵そよぎ
    "miki", // 初音ミク
    "ui", // 雨衣
    "rosa", // ROSA
]
const guessableWords = [
    "aichan",
    "aisuu", // AiSuu
    "akashi",
    "akasi",
    "ar", // 猫使アル
    "arma",
    "asahi",
    "ashie",
    "avanna",
    "awase",
    "ayane",
    "b", // 猫使ビィ
    "chisa", // 知声
    "cotumu",
    "croix", // クロワ
    "dayone",
    "denri",
    "frimo",
    "gira",
    "goki", // 後鬼
    "haru", // 羽累
    "hxvoc", // HXVOC [SV]
    "if", // 虚音イフ
    "ion",
    "kanata", // カナタ [COEIROINK]
    "kei",
    "kemuri",
    "koko", // 狐子
    "komako",
    "kon",
    "leur", // ルウル
    "likea", // 来果
    "raika", // 来果
    "lilin", // リリンちゃん
    "mana",
    "maron", // 栗田まろん
    "masiro",
    "risk", // 松樺りすく
    "mega",
    "mei",
    "miroku",
    "moa",
    "mon",
    "muon",
    "mutsu",
    "nako",
    "nana", // マクネナナ
    "nekoi",
    "nigari",
    "noise", // FEE NOiSE
    "omito",
    "ouka", // 櫻歌ミコ
    "poron", // ポロンちゃん [VOICEPEAK]
    "reco",
    "rino",
    "rito",
    "sakuya",
    "seven",
    "seyana",
    "shion",
    "shota",
    "sosoru",
    "spicy",
    "sugar",
    "tento",
    "tubomi", // 蕾
    "sizuku", // 雫
    "moe", // 萌
    "tuki",
    "tyuubu", // 中部つるぎ
    "turugi", // 中部つるぎ
    "ooedo", // 大江戸ちゃんこ
    "tyanko", // 大江戸ちゃんこ
    "sinobi", // 関西しのび
    "awamo", // 沖縄あわも
    "meron", // 北海道めろん
    "uduki", // 黒聡鵜月
    "uta",
    "vomin",
    "yixi",
    "yuna",
    "yojika",
    "yosi",
    "yutaro",
    "namine", // 波音リツ
    "makune", // マクネナナ
    "carune",
    "kuzuda",
    "yone",
    "rou",
    "nia",
    "dia",
    "vyone",
    "vytwo",
    "typet", // ナースロボ_タイプT
    "kukuri", // 八蜂鞠ククリ
    "koron", // 涙目コロン
    "kyusyu", // 九州ソラ
    "sahra", // サーラちゃん様
    "ria", // RIA
    "wakaho", // 若穂みのり
    "minori", // 若穂みのり
    "kurita", // 栗田マロン
    "maron",  // 栗田マロン
    "hasuki", // 蓮鬼ねむ
    "nemu", // 蓮鬼ねむ
    "kyo", //zora
    "yuu", //zora
    "wil", //zora
    "unity", // Unity-chan
    "xinhua", // 心華
    "enno", // 役ついな
    "kurono", // VirVox
    "genbu", // VirVox
    "kotaro", // VirVox
    "sourin", // VirVox
    "akasi", // VirVox
    "kohaku", // VirVox
    "forte", // エレノア・フォルテ
    "saki", // 咲ちゃん
    "hinode", // 日ノ出 賢
    "ken", // 日ノ出 賢
    "kazuki", // 潮崎 かずき
    "yuuki", // 結城 香
    "kaori", // 結城 香
    "kirune", // 機流音
    "kzn", // #KZN
    "mykiv", // MYK-IV
    "pepper", // Pepper君
    "daisy", // daisy bell
    "nayuta", // 那由歌
    "tanaka", // 田中傘
    "san", // 田中傘
    "hano", // 箱庭ハノ
    "koto", // 箱庭コト
    "rimuru", // 分散型自律ゴーレム りむる
    "kanato", // 奏兎める
    "meru", // 奏兎める
    "popy", // 夢ノ結唱 POPY
    "rose", // 夢ノ結唱 ROSE
    "pastel", // 夢ノ結唱 PASTEL
    "halo", // 夢ノ結唱 HALO
    "aver", // 夢ノ結唱 AVER
    "syouta", // 月読ショウタ
    "tamaki", // 玉姫
    "ruka", // 巡音ルカ
    "luka", // 巡音ルカ
    "itune", // 乙音イツ 乙音いつか
    "itu", // 乙音イツ
    "ituka", // 乙音いつか
    "aoki", // 蒼姫ラピス
    "lapis", // 蒼姫ラピス
    "rapisu", // 蒼姫ラピス
    "iroha", // 猫村いろは
    "kokone", // kokone
    "asa", // asa
    "ami", // 小春音あみ
    "yokune", // 欲音ルコ
    "ruko", // 欲音ルコ
    "defoko", // デフォ子
    "momone", // 桃音モモ
    "momo", // 桃音モモ
    "sekka", // 雪歌ユフ
    "yufu", // 雪歌ユフ
    "mayu", // MAYU
    "lily", // LILY
    "cul", // CUL
    "karune", // 骸音シーエ
    "ca", // 骸音シーエ
    "luo", // 洛天依
    "tianyi", // 洛天依
    "yosida", // 吉田君
]

const compare = (input: string[], answer: string[]): Guess => {
    const result = input.map((l) => ({ letter: l, color: Color.miss }))
    const restLetters = []
    const restIndices = []
    for (let i = 0; i < wordLen; i++) {
        if (input[i] === answer[i]) {
            result[i].color = Color.same
        } else {
            restLetters.push(answer[i])
            restIndices.push(i)
        }
    }
    for (const i of restIndices) {
        const idx = restLetters.index_of(input[i])
        if (idx !== -1) {
            result[i].color = Color.hit
            restLetters.remove(idx)
        }
    }
    return result
}

const today = `${Date.year()}/${Date.month()}/${Date.day()}`
const record = Mk.load(THIS_ID) as { [key: string]: number }
const _playTimes: number = record === undefined ? 0 : record[today] === undefined ? 0 : record[today]
const playTimes = kiwi.state(_playTimes)
kiwi.effect(() => {
    const savedata = {}
    savedata[today] = playTimes.get()
    Mk.save(THIS_ID, savedata);
    return true
})

function play() {
    const rnd = Math.gen_rng(`${today}/${playTimes.get()}`)
    const answer = answerWords[rnd(0, answerWords.len - 1)].pad_end(wordLen)
    const ansLetters = answer.to_arr()

    const guessIdx = kiwi.state(0)
    const win = kiwi.state(false)
    const finished = kiwi.state(false)
    const errMsg = kiwi.state("")
    const guesses = kiwi.state<Guess[]>(array(maxGuessCount, () => array(wordLen, () => ({ color: Color.empty, letter: " " }))))
    const inputBox = kiwi.state("")

    const big = kiwi.state(true)

    function render(boards: Guess[], win: boolean) {
        const board = boards.map((x, i) => x.map(({ letter, color }) => {
            if (win && i === guessIdx.get()) {
                return `$[sparkle $[border.width=2,color=222 $[bg.color=${colorMap[color].bg} $[fg.color=${colorMap[color].fg}  ${letter.upper()} ]]]]`
            }
            else {
                return `$[border.width=2,color=222 $[bg.color=${colorMap[color].bg} $[fg.color=${colorMap[color].fg}  ${letter.upper()} ]]]`
            }
        }
        ).join("")).join(Str.lf)
        if (big.get()) {
            return `<center>$[x2 $[font.monospace ${board}]]</center>`
        } else {
            return `<center>$[font.monospace ${board}]</center>`
        }
    }

    function onFinished() {
        finished.set(true)
        playTimes.set(playTimes.get() + 1)
    }

    function trySetGuessWord(word: string) {
        const words = word.lower().to_unicode_codepoint_arr()
        const _guesses = guesses.get()
        let board = _guesses[guessIdx.get()]
        if (words.len > wordLen) {
            errMsg.set(`${wordLen}文字まで入力できます`)
            board = board.map(() => ({ letter: " ", color: Color.empty }))
        } else if (words.every(x => !(0x61 <= x && x <= 0x7a))) {
            errMsg.set(`半角小文字アルファベットのみ使用できます`)
            board = board.map(() => ({ letter: " ", color: Color.empty }))
        } else {
            errMsg.set("")
            const letters = word.lower().to_arr()
            for (let i = letters.len; i < wordLen; i++) {
                letters.push(" ")
            }
            board = letters.map(l => ({ letter: l, color: Color.empty }))
        }
        _guesses[guessIdx.get()] = board
        guesses.set(_guesses)
    }

    function guess() {
        const _guesses = guesses.get()
        const _guessIdx = guessIdx.get()
        const guessWord = _guesses[_guessIdx]

        const guessStr = guessWord.map(x => x.letter).join("").trim()
        if (!answerWords.incl(guessStr) && !guessableWords.incl(guessStr)) {
            errMsg.set(`未登録の単語です`)
            return
        }

        const res = compare(guessWord.map(x => x.letter), ansLetters)
        _guesses[_guessIdx] = res
        inputBox.set("")

        guesses.set(_guesses)

        if (res.every(x => x.color === Color.same)) {
            // WIN
            win.set(true)
            onFinished()
        } else if (_guessIdx === maxGuessCount - 1) {
            // LOSE
            onFinished()
        } else {
            // NEXT
            guessIdx.set(_guessIdx + 1)
        }
    }

    function postText() {
        const _guessIdx = guessIdx.get()
        const _guesses = guesses.get()
        const emojiMap = ["⬛", "⬛", "⬛", "🟨", "🟩"]
        return [
            `Vordle ${_guessIdx + 1}/${maxGuessCount} (${today}-${playTimes.get()})`,
            _guesses.slice(0, _guessIdx + 1).map(x => x.map(l => emojiMap[l.color]).join()).join(Str.lf),
            "#vordle",
            THIS_URL,
        ].join(Str.lf)
    }

    function displayChars() {
        const _guesses = guesses.get()
        const letters = "abcdefghijklmnopqrstuvwxyz".to_arr().map(x => ({ char: x, color: Color.guess }))
        for (const { letter, color } of _guesses.flat_map(x => x)) {
            const find = letters.find(x => x.char === letter)
            if (find !== undefined) {
                find.color = Math.max(find.color, color)
            }
        }
        return letters.map(({ color, char }) => `$[bg.color=${colorMap[color].bg} $[fg.color=${colorMap[color].fg}  ${char.upper()} ]]`).join(" ")
    }

    Ui.render(serialArr([
        () => Ui.C.text({ text: `Vordle ${today}-${playTimes.get()}`, }),
        () => kiwi.mfm({ text: () => render(guesses.get(), win.get()) }),
        () => kiwi.container({
            hidden: finished.get,
            children: serialArr([
                () => kiwi.mfm({ text: displayChars }),
                () => kiwi.textInput({ default: inputBox.get, onInput: trySetGuessWord }),
                () => kiwi.text({ text: errMsg.get }),
                () => kiwi.buttons({
                    buttons: () => [
                        { disabled: errMsg.get() !== "", text: "入力", onClick: guess },
                        { text: big.get() ? "縮小表示" : "拡大表示", onClick: () => big.set(!big.get()) },
                        { text: "正解を見る", onClick: () => onFinished() }
                    ]
                }
                )
            ])
        }),
        () => kiwi.container({
            hidden: () => !finished.get(),
            align: "center",
            children: [
                kiwi.container({
                    hidden: win.get,
                    children: [kiwi.text({ text: `正解: ${answer}` })]
                }),
                kiwi.postFormButton({ primary: true, rounded: true, text: "結果を投稿", form: () => ({ text: postText() }) })
            ]
        })
    ]))
}

play()
