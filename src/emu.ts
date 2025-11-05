type EmuObj = {
    text: string
    width: number
    pos: [number, number]
}

export function createWindow(width: number, lines: number) {
    let _width = width
    let _lines = lines
    const objects: EmuObj[] = []
    const view: [number, number] = [0, 0]

    const addObject = (obj: EmuObj) => {
        const id = objects.len
        objects.push(obj)
        return id
    }
    const deleteObject = (id: number) => {
        objects[id] = undefined
    }
    const updateObject = (id: number, obj: { [K in keyof EmuObj]?: EmuObj[K] }) => {
        const _obj = objects[id]
        if (_obj == undefined) return undefined
        Obj.kvs(obj).map(([k, v]) => {
            if (v != undefined) {
                _obj[k] = v
            }
        })
    }
    const setView = (x, y) => {
        view[0] = x
        view[1] = y
    }
    const getView = (): [number, number] => {
        return [view[0], view[1]]
    }

    const render = () => {
        const [vx, vy] = view
        const wx = vx + _width
        const wy = vy + _lines * 2

        const renderObj = objects.filter(obj => {
            const w = obj.width
            const [x, y] = obj.pos
            return (
                vx < x + w &&
                vy < y + 2 &&
                x < wx &&
                y < wy
            )
        })
        const resnderLines: string[] = []
        for (let i = 0; i < _lines; i++) {
            const lineObjests = renderObj.slice(Math.floor(renderObj.len * (i / _lines)), Math.floor(renderObj.len * ((i + 1) / _lines)))
            let renderLine = ''
            let width = 0
            for (const obj of lineObjests) {
                renderLine = `${renderLine}$[position.x=${obj.pos[0] - vx - width},y=${obj.pos[1] - vy - i * 2} ${obj.text}]`
                width += obj.width
            }
            if(renderLine === ''){
                renderLine = ":blank:"
            }
            resnderLines.push(renderLine)
        }
        return `${resnderLines.join(Str.lf)}`
    }

    return {
        addObject,
        updateObject,
        deleteObject,
        setView,
        getView,
        render,
    }
}