
type EffectNode = {
    cb: () => boolean
    cleanups: (() => void)[]
    active: boolean
}

let current_tracker: EffectNode | undefined = undefined
let batch_depth = 0
let pending: EffectNode[] = []

const runEffect = (node: EffectNode): void => {
    if (!node.active) return
    for (let i = 0; i < node.cleanups.len; i++) node.cleanups[i]()
    node.cleanups = []
    const prev = current_tracker
    current_tracker = node
    const alive = node.cb()
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

export const state = <T>(init: T) => {
    let v = init
    let effects: EffectNode[] = []
    return {
        get(): T {
            if (current_tracker !== undefined) {
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
        },
        update(updater: (prev: T) => T): void {
            v = updater(v)
            const snapshot = effects.filter(e => e.active)
            for (let i = 0; i < snapshot.len; i++) scheduleEffect(snapshot[i])
        }
    }
}

export const computed = <T>(cb: () => T) => {
    let cached: T = undefined as any
    let dirty = true
    let dep_effects: EffectNode[] = []

    const inv_node: EffectNode = {
        cb: () => {
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
                const prev = current_tracker
                current_tracker = inv_node
                cached = cb()
                current_tracker = prev
                dirty = false
            }
            if (current_tracker !== undefined) {
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

export const effect = (cb: () => boolean): (() => void) => {
    const node: EffectNode = { cb, cleanups: [], active: true }
    runEffect(node)
    return () => {
        node.active = false
        for (let i = 0; i < node.cleanups.len; i++) node.cleanups[i]()
        node.cleanups = []
    }
}

export const batch = (cb: () => void): void => {
    batch_depth++
    cb()
    batch_depth--
    if (batch_depth == 0) {
        const to_run = pending.filter(n => n.active)
        pending = []
        for (let i = 0; i < to_run.len; i++) runEffect(to_run[i])
    }
}

export const noReactive = <T>(cb: () => T): T => {
    const prev = current_tracker
    current_tracker = undefined
    const result = cb()
    current_tracker = prev
    return result
}
