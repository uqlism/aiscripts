import { isArr, isStr } from "./types"

type M = {
    text: string
    ev: { [k in string]: () => void }
    x(scale: number): M
    small(): M
    center(): M
    scale(scaleX: number | undefined, scaleY: number | undefined): M
    pos(posX: number | undefined, posY: number | undefined): M
    onClick(event: () => void): M
    mfm(): Component<Ui.Mfm>
}

function _m(text: string, ev: { [k in string]: () => void }): M {
    return {
        text,
        ev,
        x(scale: number) {
            return _m(`$[x${scale} ${text}]`, ev)
        },
        small() {
            return _m(`<small>${text}</small>`, ev)
        },
        center() {
            return _m(`<center>${text}</center>`, ev)
        },
        scale(scaleX: number | undefined, scaleY: number | undefined) {
            return _m(`$[scale.x=${scaleX},y=${scaleY} ${text}]`, ev)
        },
        pos(posX: number | undefined, posY: number | undefined) {
            return _m(`$[position.x=${posX},y=${posY} ${text}]`, ev)
        },
        onClick: function (event: () => void): M {
            const eventCount = Obj.keys(ev).len
            ev[`ev${eventCount}`] = event
            return _m(text, ev)
        },
        mfm(): Component<Ui.Mfm> {
            return Ui.C.mfm({
                text,
                onClickEv(id) {
                    ev[id]()
                }
            })
        }
    }
}

export function m(value: string | M | (string | M)[]): M {
    if (isArr(value)) {
        const text = []
        const events = {}
        for (const v of value) {
            const mv = m(v)
            text.push(mv.text)
            for (const kv of Obj.kvs(mv.ev)) {
                events[kv[0]] = kv[1]
            }
        }
        return _m(text.join(""), events)
    } else if (isStr(value)) {
        return _m(value, {})
    } else {
        return value
    }
}
