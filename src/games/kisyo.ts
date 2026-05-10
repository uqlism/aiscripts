import { kiwi } from "../kiwi"
import { array } from "../utils/array"
import { isArr } from "../utils/types"
import { sortedArr } from "./sortedArr"

const log = kiwi.state([] as string[])

type Note = {
    id: string
    text: string,
    createdAt: string,
    user: {
        id: string
        username: string
        isBot: boolean
    }
}
type Char = { expr: string, is_shortcode: boolean }

/** ノートの文字列から不要部分を削除し、文字|絵文字 単位で分割 */
function createLetterSplitter() {
    return (x: string) => {
        const codepoints = x.to_unicode_codepoint_arr()

        let chars: Char[] = []

        let in_emoji = false
        let emoji = [] as number[]
        for (const cp of codepoints) {
            if (in_emoji) {
                if (0x30 <= cp && cp <= 0x39 || 0x61 <= cp && cp <= 0x7A || cp === 0x5F) {
                    emoji.push(cp)
                } else if (cp === 0x3A) {
                    chars.push({ expr: Str.from_unicode_codepoints(emoji), is_shortcode: true })
                    in_emoji = false
                } else {
                    in_emoji = false
                    for (const c of emoji) {
                        chars.push({ expr: Str.from_unicode_codepoints([c]), is_shortcode: false })
                    }
                }
            } else {
                if (cp === 0x3A) {
                    in_emoji = true
                    emoji = []
                } else {
                    chars.push({ expr: Str.from_unicode_codepoints([cp]), is_shortcode: false })
                }
            }
        }
        return chars
    }
}


const letterSplitter = createLetterSplitter()

function noteUi(note: Note) {
    const t = Date.parse(note.createdAt)
    const timeStr = `${Date.year(t)}/${Date.month(t)}/${Date.day(t)} ${Date.hour(t)}:${Date.minute(t)}:${Date.second(t)}`
    return Ui.C.container({
        borderColor: "#888",
        padding: 8,
        rounded: true,
        children: [
            Ui.C.mfm({ text: `@${note.user.username} <small>[${timeStr}](https://voskey.icalo.net/notes/${note.id})</small>` }),
            Ui.C.mfm({ text: note.text })
        ]
    })
}

function createNoteGetter(untilDate: number) {
    let u = untilDate
    const res = {
        batchSpan(span: number, onNote: (x: Note) => void) {
            u -= span
            const notes = Mk.api("notes/local-timeline", { withFiles: false, withRenotes: false, withReplies: false, allowPartial: true, limit: 100, sinceDate: u, untilDate: u + span })
            if (isArr(notes) && notes.len > 0) {
                notes.map(x => onNote(x))
            }
        },
        parallelBatchSpan(pCount: number, span: number, onNote: (x: Note) => void) {
            array(pCount, () => undefined).map(() => res.batchSpan(span, onNote))
        }
    }
    return res
}

function isKisyoNote(note: Note): boolean {
    let text = note.text
    if (text === undefined) return false

    const colonCount = text.len - text.replace(":", "").len
    if (colonCount < 16) return false

    log.set(log.get().concat([`Processing note`]))

    const chars = letterSplitter(text)
    const len = chars.len
    const emojiCount = chars.filter(x => x.is_shortcode).len
    const emojiRate = emojiCount / len

    const emojis: { [key: string]: boolean } = {}
    chars.filter(x => x.is_shortcode).map(x => { emojis[x.expr] = true })
    const uniqueEmojiCount = Obj.keys(emojis).len

    const maybeKisyoNote = len >= 8 && emojiRate >= 0.5 && uniqueEmojiCount >= 5
    log.set(log.get().concat([`Procesed note`]))

    return maybeKisyoNote
}

function main() {
    let kisyoNotes = kiwi.state(sortedArr<Note>((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)))
    let processed = kiwi.state(0)
    let processing = kiwi.state(true)

    const noteGetter = createNoteGetter(Date.now())
    const spanMs = 1000 * 60 * 10 // 10分

    let unprocessedNotes = [] as Note[]

    function getMore() {
        processing.set(true)
        for (let i = 0; i < 10; i++) {
            const nextUnprocessedNotes = [] as Note[]
            [() => {
                Core.sleep(1)
                log.set(log.get().concat(["Starting batch"]))
                noteGetter.parallelBatchSpan(25, spanMs, note => {
                    nextUnprocessedNotes.push(note)
                    processed.set(processed.get() + 1)
                })
                log.set(log.get().concat(["Finished batch"]))
            },
            () => {
                log.set(log.get().concat(["Starting processing"]))
                unprocessedNotes.map(note => {
                    if (isKisyoNote(note)) {
                        kisyoNotes.get().insert(note)
                        kisyoNotes.set(kisyoNotes.get()) // sortedArrは参照の更新だけではUIが更新されないため、明示的にsetする必要がある
                    }
                })
                log.set(log.get().concat(["Finished processing"]))
            }].map(x => x())
            log.set(log.get().concat(["------"]))
            unprocessedNotes = nextUnprocessedNotes
        }
        processing.set(false)
    }

    Ui.render([
        kiwi.container({
            children: () => kisyoNotes.get().arr.map(noteUi)
        }),
        kiwi.text({
            text: () => processing.get() ? `処理中... ${processed.get()}件` : ""
        }),
        kiwi.container({
            hidden: processing.get,
            children: [
                kiwi.button({
                    text: "さらに読み込む",
                    disabled: processing.get,
                    onClick: getMore
                })
            ]
        }),
    ])
    getMore()
}

main()