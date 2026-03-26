import { kiwi } from "../kiwi"

const hashtag = "#おくったリアクション一覧"

function main(limit: number | undefined = undefined) {
    let i = 0
    const n = kiwi.state(0)
    renderProgress(n)
    const res = Mk.api("users/reactions", { limit: 100, userId: USER_ID }) as { id: string, type: string }[]

    const lastRes = res.at(-1)
    let untilId = lastRes === undefined ? undefined : lastRes.id

    const reactions: { [k: string]: number } = {}

    for (const r of res) {
        i += 1
        reactions[r.type] = (reactions[r.type] === undefined ? 0 : reactions[r.type]) + 1
        if (i === limit) break
    }
    n.set(i)

    while (untilId !== undefined && (limit === undefined || i < limit)) {
        const res = Mk.api("users/reactions", { limit: 100, userId: USER_ID, untilId }) as { id: string, type: string }[]
        const lastRes = res.at(-1)
        untilId = lastRes === undefined ? undefined : lastRes.id
        for (const r of res) {
            i += 1
            reactions[r.type] = (reactions[r.type] === undefined ? 0 : reactions[r.type]) + 1
            if (i === limit) break
        }
        n.set(i)
    }

    const emojisList = Obj.kvs(reactions).sort((a, b) => b[1] - a[1])

    renderResult(emojisList, 20)
}

function getReactions(untilMs: number, sinceMs: number) {
    let reactions: string[] = []
    const res = Mk.api("users/reactions", { limit: 100, userId: USER_ID, untilDate: untilMs, sinceDate: sinceMs }) as { id: string, type: string, createdAt: number }[]

    reactions = reactions.concat(res.map(r => r.type))

    let untilId = res.at(-1) === undefined ? undefined : res.at(-1).id
    if (untilId !== undefined) {
        const res = Mk.api("users/reactions", { limit: 100, userId: USER_ID, untilId, sinceDate: sinceMs }) as { id: string, type: string, createdAt: number }[]
        untilId = res.at(-1) === undefined ? undefined : res.at(-1).id
        reactions = reactions.concat(res.map(r => r.type))
    }
    return reactions
}

function renderProgress(count: { get: () => number }) {
    Ui.render([
        Ui.C.container({
            align: 'center',
            children: [
                kiwi.mfm({ text: () => `リアクションを確認中……${Str.lf}${count.get()}リアクション見ました` })
            ]
        })
    ])
}

function renderResult(emojisList: [string, number][], topCount: number) {
    const totalReaction = emojisList.reduce((sum, [_, count]) => sum + count, 0)

    const resultText = emojisList.slice(0, topCount).map(([emoji, count]) => `${emoji.slice(0, emoji.len - 3)}: ${count}個`).join(Str.lf)
    Ui.render([
        Ui.C.container({
            align: 'center',
            children: [
                Ui.C.mfm({ text: `${resultText}${Str.lf}<small>合計${emojisList.len}種類${totalReaction}個 / 上位${topCount}種類</small>` }),
                Ui.C.postFormButton({
                    text: `結果をノート`,
                    rounded: true,
                    primary: true,
                    form: {
                        text: `おくったリアクションは${Str.lf}${resultText}${Str.lf}<small>合計${emojisList.len}種類${totalReaction}個 / 上位${topCount}種類</small>${Str.lf}${hashtag}${Str.lf}${THIS_URL}`
                    }
                })
            ]
        })
    ])
}

Ui.render([
    Ui.C.container({
        align: 'center',
        children: [
            Ui.C.mfm({ text: "対象とするノート数を選んでください。" }),
            Ui.C.buttons({
                buttons: [
                    {
                        text: `1000ノート`,
                        onClick: () => main(1000)
                    },
                    {
                        text: `全ノート`,
                        onClick: () => main()
                    }
                ]
            })
        ]
    })
])