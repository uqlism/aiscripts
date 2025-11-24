import { createWindow } from "../emu";
import { kiwi } from "../kiwi";

const window = createWindow(30, 4)

const upper = kiwi.state(false)


function initStage(size: number, distance: number) {
    function generateNextRow(): [boolean, boolean] {
        // 安全レーン以外に障害物を置く
        const row: [boolean, boolean] = [false, false];
        row[Math.rnd() < 0.5 ? 0 : 1] = true;
        return row;
    }

    for (let i = 0; i < size; i++) {
        const [left, right] = generateNextRow()
        if (left) {
            window.addObject({
                pos: [i * distance, 0],
                text: ":igyo:",
                width: 2
            })
        }
        if (right) {
            window.addObject({
                pos: [i * distance, 2],
                text: ":igyou:",
                width: 2
            })
        }
    }
}

let pos = kiwi.state<[number, number]>([0, 0])

const obstacles = 50
const distance = 15

initStage(obstacles, distance)
const itako = window.addObject({ text: ":track_itako1:", pos: [0, 0], width: 2.75 })

Ui.render([
    // kiwi.mfm({
    //     text: () => `${courceMfm()}\n$[position.y=${upper.get() ? -2 : -1} KUSA]`,
    //     font: "monospace"
    // }),
    kiwi.mfm({
        text() {
            const xy = pos.get()
            const [x, y] = xy
            window.setView(x, y)
            const r = window.render()
            return r
        }
    }),
    kiwi.text({ text: () => (pos.get()[0]).to_str() }),
    kiwi.button({
        text: "change", onClick() {
            upper.set(!upper.get())
        },
    }),
    Ui.C.buttons({
        buttons: [
            {
                text: "X+1",
                onClick: () => {
                    const [x, y] = pos.get()
                    pos.set([x + 1, y])
                }
            }, {
                text: "Y+1",
                onClick: () => {
                    const [x, y] = pos.get()
                    pos.set([x, y + 1])
                }
            }, {
                text: "X-1",
                onClick: () => {
                    const [x, y] = pos.get()
                    pos.set([x - 1, y])
                }
            }, {
                text: "Y-1",
                onClick: () => {
                    const [x, y] = pos.get()
                    pos.set([x, y - 1])
                }
            }
        ]
    })
])

let speed = 0.5
Async.interval(33, () => {
    const xy = pos.get()
    const [x, y] = xy
    if (x < obstacles * distance) {
        speed += 0.002
        pos.set([x + speed, y])
        window.updateObject(itako, { pos: [x + speed, kiwi.noReactive(upper.get) ? 0 : 2] })
    }
})