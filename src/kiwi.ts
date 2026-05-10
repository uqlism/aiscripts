
let global_subscribers: ((() => boolean) | undefined)[] = []
const _component = <C extends { [k: string]: any }>(__component: (prop: C) => Component<C>) => (props: { [K in keyof C]: K extends `on${string}` ? C[K] : C[K] | (() => C[K]) }) => {
    let init_props: { [key: string]: any } = {}
    let id = ''
    Obj.kvs(props).map(([k, v]) => {
        if ((!k.starts_with("on")) && Core.type(v) === "fn") {
            global_subscribers.push(() => {
                let update_props: { [key: string]: any } = {}
                update_props[k] = v()
                const ui = Ui.get(id)
                if (ui !== undefined) {
                    ui.update(update_props)
                    return true
                }
                else {
                    return false
                }
            })
            init_props[k] = v()
            global_subscribers.pop()
        } else {
            init_props[k] = v
        }
    })
    const c = __component(init_props as any)
    id = c.id
    return c
}

const effect = (process: () => boolean) => {
    global_subscribers.push(process)
    process()
    global_subscribers.pop()
}

const noReactive = <T>(process: () => T): T => {
    global_subscribers.push(undefined)
    const res = process()
    global_subscribers.pop()
    return res
}

const state = <T>(init: T) => {
    let v = init
    let subs: ((value: T) => boolean)[] = []
    return {
        get() {
            if (global_subscribers.len > 0) {
                let top_sub = global_subscribers[global_subscribers.len - 1]
                if (top_sub !== undefined) subs.push(top_sub)
            }
            return v
        },
        set(value: T) {
            v = value
            subs = subs.filter(sub => sub(value))
        },
        subscribe(subscriber: (value: T) => boolean) {
            subs.push(subscriber)
        }
    }
}

export const kiwi = {
    container: _component(Ui.C.container),
    folder: _component(Ui.C.folder),
    text: _component(Ui.C.text),
    mfm: _component(Ui.C.mfm),
    button: _component(Ui.C.button),
    buttons: _component(Ui.C.buttons),
    switch: _component(Ui.C.switch),
    textInput: _component(Ui.C.textInput),
    textarea: _component(Ui.C.textarea),
    select: _component(Ui.C.select),
    postForm: _component(Ui.C.postForm),
    postFormButton: _component(Ui.C.postFormButton),

    state: state,
    effect: effect,
    noReactive,
}
