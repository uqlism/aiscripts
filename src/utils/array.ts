export function array<T>(count: number, init: (idx: number) => T): T[] {
    const res = []
    for (let i = 0; i < count; i++) {
        res.push(init(i))
    }
    return res
}