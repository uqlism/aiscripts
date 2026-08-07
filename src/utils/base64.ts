const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

export function encodeBytes(bytes: number[]): string {
    const res: string[] = []
    for (let i = 0; i < bytes.len; i += 3) {
        const b0 = bytes[i]
        const b1 = bytes.at(i + 1)
        const b2 = bytes.at(i + 2)
        const hasB1 = b1 !== undefined
        const hasB2 = b2 !== undefined
        let b1v = 0
        if (b1 !== undefined) b1v = b1
        let b2v = 0
        if (b2 !== undefined) b2v = b2
        const n = b0 * 65536 + b1v * 256 + b2v

        res.push(CHARS.pick(Math.floor(n / 262144) % 64) ?? "")
        res.push(CHARS.pick(Math.floor(n / 4096) % 64) ?? "")
        let c2 = "="
        if (hasB1) c2 = CHARS.pick(Math.floor(n / 64) % 64) ?? ""
        res.push(c2)
        let c3 = "="
        if (hasB2) c3 = CHARS.pick(n % 64) ?? ""
        res.push(c3)
    }
    return res.join("")
}

export function decodeBytes(base64: string): number[] {
    const chars = base64.to_char_arr().filter((c) => c !== "=")
    const res: number[] = []
    for (let i = 0; i < chars.len; i += 4) {
        const i0 = CHARS.index_of(chars[i])
        const i1 = chars.at(i + 1) === undefined ? 0 : CHARS.index_of(chars[i + 1])
        const i2 = chars.at(i + 2) === undefined ? 0 : CHARS.index_of(chars[i + 2])
        const i3 = chars.at(i + 3) === undefined ? 0 : CHARS.index_of(chars[i + 3])
        const n = i0 * 262144 + i1 * 4096 + i2 * 64 + i3

        res.push(Math.floor(n / 65536) % 256)
        if (chars.at(i + 2) !== undefined) res.push(Math.floor(n / 256) % 256)
        if (chars.at(i + 3) !== undefined) res.push(n % 256)
    }
    return res
}

export function base64Encode(str: string): string {
    return encodeBytes(str.to_utf8_byte_arr())
}

export function base64Decode(base64: string): string {
    return Str.from_utf8_bytes(decodeBytes(base64))
}
