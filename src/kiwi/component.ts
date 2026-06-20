
import { effect, noReactive } from './core'

const _component = <C extends { [k: string]: any }>(__component: (prop: C) => Component<C>) => (props: { [K in keyof C]: K extends `on${string}` ? C[K] : C[K] | (() => C[K]) }) => {
    let init_props: { [key: string]: any } = {}
    const reactive_props: [string, () => any][] = []
    // .map は並列実行されるため for ループで順次処理する
    const entries = Obj.kvs(props)
    for (let i = 0; i < entries.len; i++) {
        const k = entries[i][0]
        const v = entries[i][1]
        if ((!k.starts_with("on")) && Core.type(v) === "fn") {
            reactive_props.push([k, v])
            init_props[k] = noReactive(v)
        } else {
            init_props[k] = v
        }
    }
    const c = __component(init_props as any)
    const id = c.id
    if (reactive_props.len > 0) {
        let init_done = false
        effect(() => {
            const ui = Ui.get(id)
            if (ui === undefined) return false
            let merged: { [key: string]: any } = {}
            for (let i = 0; i < reactive_props.len; i++) {
                merged[reactive_props[i][0]] = reactive_props[i][1]()
            }
            // 初回実行は依存登録のみ（コンポーネント作成時に正しい初期値を渡し済み）
            if (init_done) ui.update(merged)
            init_done = true
            return true
        })
    }
    return c
}

export const container     = _component(Ui.C.container)
export const folder        = _component(Ui.C.folder)
export const text          = _component(Ui.C.text)
export const mfm           = _component(Ui.C.mfm)
export const button        = _component(Ui.C.button)
export const buttons       = _component(Ui.C.buttons)
export const toggle        = _component(Ui.C.switch)
export const textInput     = _component(Ui.C.textInput)
export const textarea      = _component(Ui.C.textarea)
export const select        = _component(Ui.C.select)
export const postForm      = _component(Ui.C.postForm)
export const postFormButton = _component(Ui.C.postFormButton)

export const show = (condition: () => boolean, children: Component<any>[]): Component<any> =>
    container({ hidden: () => !condition(), children })

// switch は予約語のため内部では switchView として定義し、kiwi.ts で switch として公開する
export const switchView = <T extends string>(accessor: () => T, cases: { [K in T]: Component<any>[] }): Component<any> => {
    const entries: Array<[string, Component<any>[]]> = Obj.kvs(cases) as any
    const cs: Component<any>[] = []
    const keys: string[] = []
    for (let i = 0; i < entries.len; i++) {
        const k = entries[i][0]
        const v = entries[i][1]
        cs.push(Ui.C.container({ hidden: noReactive(() => accessor() !== k), children: v }))
        keys.push(k)
    }
    effect(() => {
        const current = accessor()
        let alive = false
        for (let i = 0; i < cs.len; i++) {
            const ui = Ui.get(cs[i].id)
            if (ui !== undefined) {
                ui.update({ hidden: current !== keys[i] })
                alive = true
            }
        }
        return alive
    })
    return Ui.C.container({ children: cs })
}
