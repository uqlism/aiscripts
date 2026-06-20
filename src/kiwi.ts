
// ─── Core ─────────────────────────────────────────────────────────────────────

type EffectNode = {
    fn: () => boolean
    cleanups: (() => void)[]
    active: boolean
}

let current_tracker: EffectNode | null = null
let batch_depth = 0
let pending: EffectNode[] = []

const runEffect = (node: EffectNode): void => {
    if (!node.active) return
    // 古い依存を解除してから再実行し、依存を再登録する（動的依存追跡）
    for (let i = 0; i < node.cleanups.len; i++) node.cleanups[i]()
    node.cleanups = []
    const prev = current_tracker
    current_tracker = node
    const alive = node.fn()
    current_tracker = prev
    if (!alive) {
        node.active = false
        for (let i = 0; i < node.cleanups.len; i++) node.cleanups[i]()
        node.cleanups = []
    }
}

const scheduleEffect = (node: EffectNode): void => {
    if (batch_depth > 0) {
        if (pending.filter(p => p == node).len == 0) pending.push(node)
    } else {
        runEffect(node)
    }
}

// ─── Primitives ───────────────────────────────────────────────────────────────

const state = <T>(init: T) => {
    let v = init
    let effects: EffectNode[] = []
    return {
        get(): T {
            if (current_tracker !== null) {
                const tracker = current_tracker
                if (effects.filter(e => e == tracker).len == 0) {
                    effects.push(tracker)
                    tracker.cleanups.push(() => {
                        effects = effects.filter(e => e != tracker)
                    })
                }
            }
            return v
        },
        set(value: T): void {
            v = value
            const snapshot = effects.filter(e => e.active)
            for (let i = 0; i < snapshot.len; i++) scheduleEffect(snapshot[i])
        }
    }
}

const computed = <T>(fn: () => T) => {
    let cached: T
    let dirty = true
    let dep_effects: EffectNode[] = []

    // fn の依存 state が変化したときにキャッシュを無効化し、依存 effect を再スケジュールする
    const inv_node: EffectNode = {
        fn: () => {
            dirty = true
            const snapshot = dep_effects.filter(e => e.active)
            for (let i = 0; i < snapshot.len; i++) scheduleEffect(snapshot[i])
            return true
        },
        cleanups: [],
        active: true
    }

    return {
        get(): T {
            if (dirty) {
                // inv_node をトラッカーとして fn を実行し依存 state を登録
                const prev = current_tracker
                current_tracker = inv_node
                cached = fn()
                current_tracker = prev
                dirty = false
            }
            // この computed を読んでいる effect を dep_effects に登録
            if (current_tracker !== null) {
                const tracker = current_tracker
                if (dep_effects.filter(e => e == tracker).len == 0) {
                    dep_effects.push(tracker)
                    tracker.cleanups.push(() => {
                        dep_effects = dep_effects.filter(e => e != tracker)
                    })
                }
            }
            return cached
        }
    }
}

// fn が false を返すと effect は自己解除される
const effect = (fn: () => boolean): (() => void) => {
    const node: EffectNode = { fn, cleanups: [], active: true }
    runEffect(node)
    return () => {
        node.active = false
        for (let i = 0; i < node.cleanups.len; i++) node.cleanups[i]()
        node.cleanups = []
    }
}

const batch = (fn: () => void): void => {
    batch_depth++
    fn()
    batch_depth--
    if (batch_depth == 0) {
        const to_run = pending.filter(n => n.active)
        pending = []
        for (let i = 0; i < to_run.len; i++) runEffect(to_run[i])
    }
}

const noReactive = <T>(fn: () => T): T => {
    const prev = current_tracker
    current_tracker = null
    const result = fn()
    current_tracker = prev
    return result
}

// ─── Component ────────────────────────────────────────────────────────────────

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

// ─── Public API ───────────────────────────────────────────────────────────────

export const kiwi = {
    container: _component(Ui.C.container),
    folder: _component(Ui.C.folder),
    text: _component(Ui.C.text),
    mfm: _component(Ui.C.mfm),
    button: _component(Ui.C.button),
    buttons: _component(Ui.C.buttons),
    toggle: _component(Ui.C.switch),
    textInput: _component(Ui.C.textInput),
    textarea: _component(Ui.C.textarea),
    select: _component(Ui.C.select),
    postForm: _component(Ui.C.postForm),
    postFormButton: _component(Ui.C.postFormButton),

    show(condition: () => boolean, children: Component<any>[]): Component<any> {
        return kiwi.container({ hidden: () => !condition(), children })
    },

    switch<T extends string>(accessor: () => T, cases: { [K in T]: Component<any>[] }): Component<any> {
        const entries: Array<[string, Component<any>[]]> = Obj.kvs(cases) as any
        const containers: Component<any>[] = []
        const keys: string[] = []
        for (let i = 0; i < entries.len; i++) {
            const k = entries[i][0]
            const v = entries[i][1]
            containers.push(Ui.C.container({ hidden: noReactive(() => accessor() !== k), children: v }))
            keys.push(k)
        }
        effect(() => {
            const current = accessor()
            let alive = false
            for (let i = 0; i < containers.len; i++) {
                const ui = Ui.get(containers[i].id)
                if (ui !== undefined) {
                    ui.update({ hidden: current !== keys[i] })
                    alive = true
                }
            }
            return alive
        })
        return Ui.C.container({ children: containers })
    },

    state,
    computed,
    effect,
    batch,
    noReactive,
}
