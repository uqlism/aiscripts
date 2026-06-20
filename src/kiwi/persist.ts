
import { state } from './core'

export const persist = <T>(id: string, defaultValue: T) => {
    const loaded = Mk.load(id)
    const s = state<T>(loaded ?? defaultValue)
    return {
        get(): T { return s.get() },
        set(value: T): void {
            s.set(value)
            Mk.save(id, value)
        },
        update(updater: (prev: T) => T): void {
            const next = updater(s.get())
            s.set(next)
            Mk.save(id, next)
        }
    }
}
