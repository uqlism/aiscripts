
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

type ChildItem = string | Component<any>

const normalizeChild = (item: ChildItem): Component<any> =>
    Core.type(item) === "str" ? Ui.C.mfm({ text: item as string }) : item as Component<any>

export const div = (
    children: ChildItem[] | (() => ChildItem[]),
    props?: { [key: string]: any }
): Component<any> => {
    const base: { [key: string]: any } = props ?? {}
    if (Core.type(children) === "fn") {
        const fn = children as () => ChildItem[]
        return container({ ...base, children: () => fn().map(normalizeChild) })
    }
    const items = children as ChildItem[]
    const normalized: Component<any>[] = []
    for (let i = 0; i < items.len; i++) normalized.push(normalizeChild(items[i]))
    return container({ ...base, children: normalized })
}
