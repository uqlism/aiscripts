export type Writer = {
    write: (bit: boolean) => void
}

export type Reader = {
    read(): boolean
}

export type Schema<T> = {
    encode: (value: T, writer: Writer) => void
    decode: (reader: Reader) => T
}

function writeBits(w: Writer, value: number, count: number): void {
    let n = value
    for (let i = 0; i < count; i++) {
        w.write(n % 2 === 1)
        n = Math.floor(n / 2)
    }
}

function readBits(r: Reader, count: number): number {
    let v = 0
    let mult = 1
    for (let i = 0; i < count; i++) {
        if (r.read()) v = v + mult
        mult = mult * 2
    }
    return v
}

export const bool: Schema<boolean> = {
    encode(v, w) {
        w.write(v)
    },
    decode(r) {
        return r.read()
    }
}

export const byte: Schema<number> = {
    encode(v, w) {
        writeBits(w, v, 8)
    },
    decode(r) {
        return readBits(r, 8)
    }
}

// 4bit ずつ続きフラグ付きで書き込む可変長の非負整数
export const int: Schema<number> = {
    encode(v, w) {
        let n = v
        while (true) {
            const chunk = n % 16
            n = Math.floor(n / 16)
            writeBits(w, chunk, 4)
            w.write(n > 0)
            if (n === 0) break
        }
    },
    decode(r) {
        let value = 0
        let mult = 1
        while (true) {
            value = value + readBits(r, 4) * mult
            mult = mult * 16
            if (!r.read()) break
        }
        return value
    }
}

// 要素数を 0/1/2/それ以上 の2bitタグ + (それ以上のときだけ int) で書き込む
function encodeLen(len: number, w: Writer): void {
    if (len === 0) { bool.encode(false, w); bool.encode(false, w); return }
    if (len === 1) { bool.encode(false, w); bool.encode(true, w); return }
    if (len === 2) { bool.encode(true, w); bool.encode(false, w); return }
    bool.encode(true, w)
    bool.encode(true, w)
    int.encode(len, w)
}
function decodeLen(r: Reader): number {
    if (!r.read()) return r.read() ? 1 : 0
    return r.read() ? int.decode(r) : 2
}

export const array = <T>(schema: Schema<T>): Schema<T[]> => ({
    encode(v, w) {
        encodeLen(v.len, w)
        for (let i = 0; i < v.len; i++) schema.encode(v[i], w)
    },
    decode(r) {
        const len = decodeLen(r)
        const arr: T[] = []
        for (let i = 0; i < len; i++) arr.push(schema.decode(r))
        return arr
    }
})

export const bytes: Schema<number[]> = array(byte)

// 複数のスキーマを順番に読み書きするだけの内部プリミティブ。
// (...args のような可変長引数はこのトランスパイラで動かないので、rest ではなく普通の配列引数にしている)
const seq = (schemas: Schema<any>[]): Schema<any[]> => ({
    encode(value, writer) {
        for (let i = 0; i < schemas.len; i++) schemas[i].encode(value[i], writer)
    },
    decode(reader) {
        const result: any[] = []
        for (let i = 0; i < schemas.len; i++) result.push(schemas[i].decode(reader))
        return result
    }
})

// T (スキーマ側の型) を先に確定させてから U (変換後の型) を推論させるため、あえてカリー化している。
// 1回の呼び出しで T と U を同時に推論させると、タプルなどのリテラルが正しく推論されないことがある。
export const map = <T>(schema: Schema<T>) => <U>(encoder: (v: U) => T, decoder: (v: T) => U): Schema<U> => ({
    encode(value: U, writer: Writer) {
        schema.encode(encoder(value), writer)
    },
    decode(reader: Reader) {
        return decoder(schema.decode(reader))
    }
})

export const str: Schema<string> = map(bytes)(v => v.to_utf8_byte_arr(), v => Str.from_utf8_bytes(v))

// 値を読み書きせず、常に固定値を返すだけのスキーマ。variant の判別用フィールドなどに使う。
export const literal = <T>(value: T): Schema<T> => ({
    encode(v, w) { },
    decode(r) { return value }
})

// キーごとの Schema をまとめたオブジェクトから、そのままオブジェクトを組み立てるスキーマを作る。
// キー順は Obj.keys() の返す順に依存させず、毎回ソートして固定することで encode/decode の順序を一致させている。
export const obj = <T>(shape: { [K in keyof T]: Schema<T[K]> }): Schema<T> => {
    const keys = (Obj.keys(shape) as string[]).sort(Str.lt)
    const schemas = keys.map(k => Obj.get(shape as any, k) as Schema<any>)
    return map(seq(schemas))(
        (value: T) => keys.map(k => Obj.get(value as any, k)),
        (values: any[]) => {
            const result: any = {}
            // Obj.set は型定義上オブジェクトを返すことになっているが、実際は in-place で書き換えて null を返す
            for (let i = 0; i < keys.len; i++) Obj.set(result, keys[i], values[i])
            return result as T
        }
    )
}

// tag・判定関数・その分岐専用のスキーマを1つにまとめておくことで、
// 「配列の並び順」と「tag を求める関数」を別々に整合させる必要がなくなる。
// test が型ガード (v is S) なので、schema は共用体全体ではなく絞り込み後の型だけ扱えばよい。
export type VariantCase<T, S extends T> = {
    tag: number
    test: (v: T) => v is S
    schema: Schema<S>
}

export const variantCase = <T, S extends T>(tag: number, test: (v: T) => v is S, schema: Schema<S>): VariantCase<T, S> => ({ tag, test, schema })

export const variant = <T>(cases: VariantCase<T, any>[]): Schema<T> => ({
    encode(value, writer) {
        for (let i = 0; i < cases.len; i++) {
            if (cases[i].test(value)) {
                int.encode(cases[i].tag, writer)
                cases[i].schema.encode(value, writer)
                return
            }
        }
    },
    decode(reader) {
        const tag = int.decode(reader)
        for (let i = 0; i < cases.len; i++) {
            if (cases[i].tag === tag) return cases[i].schema.decode(reader)
        }
        return cases[0].schema.decode(reader)
    }
})

function bitsToBytes(bits: boolean[]): number[] {
    const result: number[] = []
    for (let i = 0; i < bits.len; i = i + 8) {
        let v = 0
        let mult = 1
        for (let j = 0; j < 8; j++) {
            if (i + j < bits.len && bits[i + j]) v = v + mult
            mult = mult * 2
        }
        result.push(v)
    }
    return result
}

function bytesToBits(byteArr: number[]): boolean[] {
    const bits: boolean[] = []
    for (const b of byteArr) {
        let n = b
        for (let i = 0; i < 8; i++) {
            bits.push(n % 2 === 1)
            n = Math.floor(n / 2)
        }
    }
    return bits
}

export function encode<T>(schema: Schema<T>, value: T): number[] {
    const bits: boolean[] = []
    schema.encode(value, { write: (b: boolean) => { bits.push(b) } })
    return bitsToBytes(bits)
}

export function decode<T>(schema: Schema<T>, data: number[]): T {
    const bits = bytesToBits(data)
    let pos = 0
    const reader: Reader = {
        read() {
            const b = pos < bits.len ? bits[pos] : false
            pos = pos + 1
            return b
        }
    }
    return schema.decode(reader)
}
