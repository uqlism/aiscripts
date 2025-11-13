const characters = [
    { name: ["ずんだ", "もん"], desc: ["ずんだ", "_の妖精"], emoji: "zundamon_yay" },
    { name: ["四国", "めたん"], desc: ["中二病妄想", "_が趣味"], emoji: "metan_yay" },
    { name: ["東北", "ずん子"], desc: ["ずんだ餅", "すべてを_に変えてしまう"], emoji: "zunko_yay" },
    { name: ["東北", "きりたん"], desc: ["太もも", "姉の_を愛する妹"], emoji: "kiritan_yay" },
    { name: ["東北", "イタコ"], desc: ["軽トラのバンパー", "_をべこべこにしてしまう"], emoji: "itako_yay" },

    { name: ["No.", "7"], desc: ["かいわれ大根", "_を育てるのが趣味"], emoji : "no7_yay" },
    { name: ["結月", "ゆかり"], desc: ["大人の女性の情感", "_あふれる声"], emoji: "yukari_yay" },
    { name: ["紲星", "あかり"], desc: ["明るい女の子", "_の可愛らしい中にも優しさあふれる声"], emoji: "akari_yay" },
    { name: ["双葉", "湊音"], desc: ["自然の多いところ", "_が出身地"], emoji: "minato_yay" },
    { name: ["琴葉", "茜"], desc: ["ちょっと天然", "関西弁で_の姉"], emoji: "akane_yay" },
    { name: ["琴葉", "葵"], desc: ["しっかり者", "標準語で_の妹"], emoji: "aoi_yay" },
    { name: ["虚音", "イフ"], desc: ["掃除機", "_が嫌いな妖怪"], emoji: "urone_if_yay" },
    { name: ["小春", "六花"], desc: ["大学生", "_の兄がいる"], emoji: "rikka_yay" },
    { name: ["夏色", "花梨"], desc: ["抹茶", "_は苦手"], emoji: "karin_yay" },
    { name: ["花隈", "千冬"], desc: ["読書", "_が好き"], emoji: "chifuyu_yay" },
    { name: ["弦巻", "マキ"], desc: ["密かに慕っている後輩", "_が多い"], emoji: "maki_yay" }
]

function play() {
    const left = characters[Math.rnd(0, characters.len - 1)]
    const right = characters[Math.rnd(0, characters.len - 1)]

    const text = `$[x2 :${left.emoji}: ${left.name[0]}${right.name[1]} :${right.emoji}:]${Str.lf}${right.desc[1].replace("_", left.desc[0])}`

    Ui.render([
        Ui.C.container({
            align: "center",
            children: [
                Ui.C.mfm({ text }),
                Ui.C.postFormButton({ rounded: true, primary: true, text: "投稿する", form: { text: `${text}${Str.lf}${THIS_URL}` } }),
                Ui.C.button({ rounded: true, text: "引き直す", onClick: play }),
            ]
        })
    ])
}

play()