import { kiwi } from "../kiwi";
import { serialArr } from "../serialArr";
import { range } from "../utils/range";


Ui.render([
    Ui.C.mfm({ text: "読み込み中 :nowloading_icon:" })
])

type Emoji = (typeof CUSTOM_EMOJIS)[number]

const emojis = CUSTOM_EMOJIS.filter(x => x.category.starts_with("chara"))

function play() {
    const splitCount = 6
    const ansEmoji = emojis[Math.rnd(0, emojis.len - 1)]

    const openes = kiwi.state(range(splitCount ** 2).map(_ => false))
    const state = kiwi.state("play")

    const searchResults = kiwi.state<[Emoji, number][]>([])

    function search(name: string) {
        if (name.len < 2) {
            searchResults.set([])
            return
        }
        function emojiMatch(emoji: (typeof CUSTOM_EMOJIS)[number]) {
            return emoji.aliases.some(x => x.incl(name)) || emoji.name.incl(name)
        }
        searchResults.set(emojis.filter(emojiMatch).map((x, i) => [x, i]))
    }

    function openRandomBoard() {
        const _displays = openes.get()
        const closed = _displays.map((x, i): [boolean, number] => [x, i]).filter(x => !x[0])
        _displays[closed[Math.rnd(0, closed.len - 1)][1]] = true
        openes.set(_displays)
    }

    function renderBoard() {
        const _displays = openes.get()
        return range(splitCount).map(y => range(splitCount).map(x => {
            const isOpen = _displays[y * splitCount + x]
            return isOpen ? `$[border.color=000 $[position.x=${splitCount - 1 - x * 2},y=${splitCount - 1 - y * 2} $[scale.x=${splitCount / 4},y=${splitCount / 4} $[scale.x=4,y=4 :${ansEmoji.name}:]]]]` : "$[border.color=000 :blank:]"
        }).join("")).join(Str.lf)
    }

    function renderAnswerBoard() {
        return range(splitCount).map(y => range(splitCount).map(x => {
            return `$[border.color=000 $[position.x=${splitCount - 1 - x * 2},y=${splitCount - 1 - y * 2} $[scale.x=${splitCount / 4},y=${splitCount / 4} $[scale.x=4,y=4 :${ansEmoji.name}:]]]]`
        }).join("")).join(Str.lf)
    }

    function answer(name: string) {
        if (name === ansEmoji.name) {
            state.set("success")
        } else {
            state.set("fail")
        }
    }

    function renderHeader() {
        const openSum = openes.get().reduce((x, y) => y ? x + 1 : x, 0)
        return `$[x2 この絵文字だ～れだ!] <small>開いたパネル ${openSum} /${splitCount ** 2}</small>`
    }

    function postText() {
        return `この絵文字だ～れだ?${Str.lf}${renderBoard()}${Str.lf}これがわかれば${igyoMoji()}${Str.lf}${THIS_URL}`
    }

    function giveUp() {
        state.set("fail")
    }

    function igyoMoji() {
        const openSum = openes.get().reduce((x, y) => y ? x + 1 : x, 0)
        if (openSum === 1) {
            return ":igyo_ultimate:"
        }
        if (openSum <= 3) {
            return ":igyo_ultra:"
        }
        if (openSum <= 10) {
            return ":igyo_super:"
        }
        return "igyo"
    }

    // 最初の一枚を開いておく
    openRandomBoard()

    Ui.render(serialArr([
        () => kiwi.mfm({ text: renderHeader }),
        () => kiwi.container({
            hidden: () => state.get() !== "play",
            children: serialArr([
                () => kiwi.mfm({ text: renderBoard }),
                () => kiwi.textInput({
                    label: "キャラクターを検索して回答(ひらがな)", default: "", onInput: search
                }),
                () => kiwi.container({
                    children() {
                        const _searchResults = searchResults.get()
                        return [
                            Ui.C.mfm({
                                text: _searchResults.len > 0 ? `$[x2 ${_searchResults.map(x => `$[clickable.ev=${x[0].name} :${x[0].name}:]`).join(" ")}]` : "",
                                onClickEv(id) {
                                    answer(id)
                                }
                            })
                        ]
                    }
                }),
                () => kiwi.buttons({
                    buttons: [
                        { text: "パネルを開く", onClick: openRandomBoard },
                        { text: "あきらめる", onClick: giveUp },
                    ]
                })
            ])
        }),
        () => kiwi.container({
            hidden: () => state.get() !== "success",
            children: serialArr([
                () => kiwi.mfm({ text: () => `正解!!!! ${igyoMoji()}` }),
                () => kiwi.text({ text: `${ansEmoji.aliases.join(" ")}` }),
                () => kiwi.mfm({ text: renderAnswerBoard }),
                () => kiwi.postFormButton({
                    text: "投稿する",
                    rounded: true,
                    primary: true,
                    form: () => ({
                        text: postText()
                    })
                }),
                () => Ui.C.button({ text: "もっかい遊ぶ", onClick: play })
            ])
        }),
        () => kiwi.container({
            hidden: () => state.get() !== "fail",
            children: serialArr([
                () => kiwi.text({ text: "残念！ 正解は～" }),
                () => kiwi.text({ text: `${ansEmoji.aliases.join(" ")}` }),
                () => kiwi.mfm({ text: renderAnswerBoard }),
                () => kiwi.postFormButton({
                    text: "投稿する",
                    rounded: true,
                    primary: true,
                    form: () => ({
                        text: postText()
                    })
                }),
                () => Ui.C.button({ text: "もっかい遊ぶ", onClick: play })
            ])
        })
    ]))
}

play()