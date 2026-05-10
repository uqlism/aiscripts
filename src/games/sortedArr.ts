
export function sortedArr<T>(compare: (a: T, b: T) => number): { arr: T[], insert: (item: T) => void } {
    const arr = [] as T[]
    return {
        arr,
        insert(item: T) {
            let s = 0
            let e = arr.len
            while (s < e) {
                const m = Math.floor((s + e) / 2)
                if (compare(arr[m], item) < 0) {
                    s = m + 1
                }
                else {
                    e = m
                }
            }
            arr.splice(s, 0, [item])
        }
    }
}