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
    // Special

    ["icalo", "イカロ神"],
    ["vomin", "ぼ民"],

    // A.I.Voice

    ["yuduki", "結月ゆかり"],
    ["yukari", "結月ゆかり"],
    ["kizuna", "紲星あかり"],
    ["akari", "紲星あかり"],
    ["akane", "琴葉茜"],
    ["aoi", "琴葉葵"],
    ["iori", "伊織弓弦"],
    ["yuduru", "伊織弓弦"],

    ["unoka", "羽ノ華"],
    ["tange", "タンゲコトエ"],
    ["kotoe", "タンゲコトエ"],
    ["kakyou", "カキョウヨサリ"],
    ["yosari", "カキョウヨサリ"],
    ["tobari", "夜語トバリ"],
    ["kotone", "紡乃世詞音"],
    ["tunose", "紡乃世詞音"],
    ["riu", "雪音りう"],
    ["yukine", "雪音りう"],
    ["kazami", "風見壮一"],
    ["souiti", "風見壮一"],
    ["soyogi", "梵そよぎ"],

    ["meika", "鳴花ヒメ 鳴花ミコト"],
    ["hime", "鳴花ヒメ"],
    ["mikoto", "鳴花ミコト"],
    ["flower", "v-flower c-flower"],
    ["sinfa", "心華"],

    // CEVIO

    ["sasara", "さとうささら"],
    ["satou", "さとうささら"],
    ["suzuki", "すずきつづみ"],
    ["tudumi", "すずきつづみ"],
    ["amato", "タカハシアマト"],

    ["natuki", "夏色花梨"],
    ["karin", "夏色花梨 谷崎カリン"],
    ["koharu", "小春六花"],
    ["rikka", "小春六花"],
    ["tifuyu", "花隈千冬"],

    ["minato", "双葉湊音"],
    ["futaba", "双葉湊音"],

    ["asumi", "彩澄りりせ 彩澄しゅお"],
    ["ririse", "彩澄りりせ"],
    ["syuo", "彩澄しゅお"],

    ["fee", "CCD-0500 FEE"],
    ["uni", "CCD-0001 UNI"],

    ["moka", "宮舞モカ"],
    ["maki", "弦巻マキ"],

    // VoiceVox

    ["tohoku", "東北イタコ 東北ずんこ 東北きりたん"],
    ["itako", "東北イタコ"],
    ["zunko", "東北ずんこ"],
    ["metan", "四国めたん"],
    ["sikoku", "四国めたん"],
    ["usagi", "中国うさぎ"],
    ["sora", "九州そら 桜乃そら"],
    ["kyusyu", "九州ソラ"],

    ["haruno", "桜乃そら"],

    ["himari", "冥鳴ひまり"],
    ["tumugi", "春日部つむぎ"],
    ["meimei", "冥鳴ひまり"],

    ["sayo", "小夜"],
    ["ouka", "櫻歌ミコ"],
    ["miko", "櫻歌ミコ"],

    ["ryusei", "青山龍星"],
    ["aoyama", "青山龍星"],

    ["motiko", "もち子さん"],
    ["hau", "雨晴はう"],

    // Lusty*Kiss_Production

    ["kurowa", "黒朱乃宮・セプテントリオーネス・ラ・クロワ"],
    ["ririn", "黒朱乃宮・ティンティナーブルム・リリン"],
    ["dhia", "ディアマンテ・プリンシパリティーズ"],
    ["aruma", "アルマジェダーニャ・プルガトリア"],
    ["anzii", "アンドロマリウス・プルガトリア"],

    // CoeiroInk

    ["reko", "レコ"],
    ["nako", "ナコ"],
    ["kanata", "カナタ"],

    ["matuka", "松樺りすく"],
    ["risuku", "松樺りすく"],

    // Song Softwares

    ["hatune", "初音ミク"],
    ["miku", "初音ミク"],
    ["ren", "鏡音レン"],
    ["rin", "鏡音リン"],
    ["meiko", "MEIKO"],
    ["kaito", "KAITO"],

    ["gumi", "GUMI"],
    ["gakupo", "神威がくぽ"],

    ["one", "OИE"],
    ["ia", "IA"],

    ["kaai", "歌愛ユキ"],
    ["yuki", "歌愛ユキ"],

    ["kafu", "可不"],
    ["sekai", "星界"],
    ["rime", "裏命"],

    ["ui", "雨衣"],
    ["galaco", "ギャラ子"],
    ["una", "音街ウナ"],

    // Others

    ["adati", "足立レイ"],
    ["rei", "足立レイ"],

    ["minase", "水瀬コウ"],
    ["kou", "水瀬コウ"],

    ["teto", "重音テト"],
    ["kasane", "重音テト"],

    ["namine", "波音リツ"],
    ["ritu", "波音リツ"],
    ["ariaru", "アリアル"],
    ["seika", "京町せいか"],
    ["tt", "ナースロボ_タイプT"],
    ["tuina", "役ついな"],
    ["urone", "虚音イフ"],
    ["ifu", "虚音イフ"],

    ["ai", "月読アイ"],
    ["miki", "開発コード-MIKI"],
    ["rosa", "ROSA"],
]

const guessableWords = [
    "kamui", // 神威がくぽ
    "aichan", // 月読アイ
    "aisuu", // AiSuu
    "akasi",
    "aru", // 猫使アル
    "asahi",
    "ashie",
    "avanna",
    "awase",
    "ayane",
    "bii", // 猫使ビィ
    "tisei", // 知声
    "kotumu",
    "dayone",
    "denri",
    "frimo",
    "gira",
    "goki", // 後鬼
    "haru", // 羽累
    "hxvoc", // HXVOC [SV]
    "ion",
    "kei",
    "kemuri",
    "koko", // 狐子
    "komako",
    "kon",
    "ruuru", // ルウル
    "likea", // 来果
    "raika", // 来果
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
    "nana", // マクネナナ
    "nekoi",
    "nigari",
    "noise", // FEE NOiSE
    "omito",
    "poron", // ポロンちゃん [VOICEPEAK]
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
    "yixi",
    "yuna",
    "yojika",
    "yosi",
    "yutaro",
    "makune", // マクネナナ
    "kuzuda",
    "yone",
    "rou",
    "nia",
    "vyone",
    "vytwo",
    "typet", // ナースロボ_タイプT
    "kukuri", // 八蜂鞠ククリ
    "koron", // 涙目コロン
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
    "ennno", // 役ついな
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
    "siie", // 骸音シーエ
    "luo", // 洛天依
    "tianyi", // 洛天依
    "yosida", // 吉田君
    "namae", // 名前シレズ
    "sirezu", // 名前シレズ
    "ioi", // 五百井アエ 五百井アウ
    "ae", // 五百井アエ
    "au", // 五百井アウ
    "akita", // 亞北ネル
    "neru", // 亞北ネル
    "yowane", // 弱音ハク
    "haku", // 弱音ハク
    "sakune", // 咲音メイコ
    "anon", // 杏音
    "kanon", // 鳥音
    "tonemu", // 兎眠りおん
    "rion", // 兎眠りおん
    "piko", // 歌手音ピコ
    "siki", // 式狼縁 式大元
    "rouen", // 式狼縁 
    "taigen", // 式狼縁 式大元1
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
const playTimes: number = record === undefined ? 1 : record[today] === undefined ? 1 : record[today] + 1

function play() {
    const rnd = Math.gen_rng(`${today}/${playTimes}`)
    const [_answer, answerCharacterName] = answerWords[rnd(0, answerWords.len - 1)]
    const answer = _answer.pad_end(wordLen)
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
        const savedata = {}
        savedata[today] = playTimes
        Mk.save(THIS_ID, savedata);

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
        if (!answerWords.map(x => x[0]).incl(guessStr) && !guessableWords.incl(guessStr)) {
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
            `Vordle ${_guessIdx + 1}/${maxGuessCount} (${today}-${playTimes})`,
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

    const showHowToPlay = kiwi.state(false)
    const howToPlay = [
        "wordleを元にした合成音声キャラをあてるゲームです",
        "答えのキャラクターを予想して6文字以下のローマ字で入力ましょう",
        `答えに含まれる文字は $[bg.color=${colorMap[Color.hit].bg}  黄色 ]に`,
        `文字の位置も一致していたら$[bg.color=${colorMap[Color.same].bg}  緑 ]に`,
        `答えに含まれない文字は$[bg.color=${colorMap[Color.miss].bg}  灰色 ]になります`,
        "6回以内にあてることができればクリアです",
        "答えのキャラクターは必ず6文字以下です",
    ].join(Str.lf)
    Ui.render(
        serialArr([
            () => kiwi.container({
                hidden: () => !showHowToPlay.get(),
                children: serialArr([
                    () => kiwi.mfm({ text: howToPlay }),
                    () => kiwi.button({ text: "ゲームに戻る", onClick: () => showHowToPlay.set(false) }),
                ])
            }),
            () => kiwi.container({
                hidden: () => showHowToPlay.get(),
                children: serialArr([
                    () => Ui.C.text({ text: `Vordle ${today}-${playTimes}`, }),
                    () => kiwi.mfm({ text: () => render(guesses.get(), win.get()) }),
                    () => kiwi.container({
                        hidden: finished.get,
                        children: serialArr([
                            () => kiwi.mfm({ text: displayChars }),
                            () => kiwi.textInput({ default: inputBox.get, onInput: trySetGuessWord }),
                            () => kiwi.mfm({
                                text: () => {
                                    const _errMsg = errMsg.get()
                                    if (_errMsg === "") return ""
                                    else return `<small>${_errMsg}</small>`
                                }
                            }),
                            () => kiwi.buttons({
                                buttons: () => [
                                    { disabled: errMsg.get() !== "", text: "入力", onClick: guess },
                                    { text: big.get() ? "縮小表示" : "拡大表示", onClick: () => big.set(!big.get()) },
                                    { text: "遊び方", onClick: () => showHowToPlay.set(true) },
                                ]
                            }
                            )
                        ])
                    }),
                    () => kiwi.container({
                        hidden: () => !finished.get(),
                        align: "center",
                        children: serialArr([
                            () => kiwi.text({ text: `正解: ${answer} | ${answerCharacterName}` }),
                            () => kiwi.postFormButton({ primary: true, rounded: true, text: "結果を投稿", form: () => ({ text: postText() }) })
                        ])
                    })
                ])
            })
        ]))
}

play()
