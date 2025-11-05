/** 配列を同期的に順番に初期化するためのユーティリティ (グローバル変数の二重宣言などのランタイムのバグ回避のため) */
export function serialArr<T extends any[]>(fns: { [K in keyof T]: () => T[K] }): T {
    const res = []
    for (const f of fns) {
        res.push(f())
    }
    return res as any
}