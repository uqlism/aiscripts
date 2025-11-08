import { kiwi } from "./kiwi"
import { range } from "./utils/range"


const State = {
    close: 0,
    flag: 1,
    open: 2,
}
type State = typeof State[keyof typeof State]

type Tile = { state: State, bomb: boolean, adjBoms: number }
type Map = { w: number, h: number, tiles: Tile[] }

function createMap(size: number, bombCount: number): Map {
    const map = range(size ** 2).map<Tile>(_ => ({ state: State.close, bomb: false, adjBoms: 0 }))
    const emptyTiles = range(size ** 2)

    function incrAdjBomb(x, y) {
        if (x >= size) return
        if (y >= size) return
        if (x < 0) return
        if (y < 0) return
        map[y * size + x].adjBoms += 1
    }

    for (let i = 0; i < bombCount; i++) {
        const idx = Math.rnd(0, emptyTiles.len - 1)
        map[emptyTiles[idx]].bomb = true
        emptyTiles.remove(idx)

        const y = Math.floor(idx / size)
        const x = idx % size
        incrAdjBomb(x - 1, y - 1)
        incrAdjBomb(x, y - 1)
        incrAdjBomb(x + 1, y - 1)
        incrAdjBomb(x - 1, y)
        incrAdjBomb(x + 1, y)
        incrAdjBomb(x - 1, y + 1)
        incrAdjBomb(x, y + 1)
        incrAdjBomb(x + 1, y + 1)
    }
    return { w: size, h: size, tiles: map }
}

function render(map: Map, onOpen: (x: number, y: number) => void) {
    const events: { [key: string]: () => void } = {}
    const mfm = range(map.h).map(y =>
        range(map.w).map(x => {
            const tile = map.tiles[y * map.w + x]
            const ev = `tile${x}_${y}`
            events[ev] = () => onOpen(x, y)
            let text = "0️⃣"
            switch (tile.state) {
                case State.close:
                    text = "🟩"
                    break
                case State.flag:
                    text = "🟥"
                    break
                case State.open:
                    if (tile.bomb) text = "🟥"
                    else if (tile.adjBoms !== 0) text = `${"1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣8️⃣".to_arr()[tile.adjBoms - 1]}`
                    break
            }
            return `$[clickable.ev=${ev} ${text}]`
        }).join("")
    ).join(Str.lf)

    return kiwi.mfm({
        text: `$[font.monospace ${mfm}]`,
        onClickEv(id) {
            events[id]()
        },
    })
}


function play() {
    const map = kiwi.state(createMap(9, 12))

    function gameOver() {
        Mk.toast("GAMEOVER")
    }

    function open(x, y) {
        Mk.toast(`${x} ${y}`)
        const _map = map.get()
        const tile = _map.tiles[y * _map.w + x]
        tile.state = State.open
        map.set(_map)
        if (tile.bomb) {
            gameOver()
        }
    }

    Ui.render([
        kiwi.container({
            children: () => [render(map.get(), open)]
        })
    ])
}

play()