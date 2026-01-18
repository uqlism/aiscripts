export type Parser = (input: number[], pos: number) => ParseResult;
export type ParseResult =
    | { ok: true; value: number[]; next: number }
    | { ok: false; pos: number };

const charCodepoint = (charUnicodeCodepoint: number): Parser => {
    return (input, pos) => {
        return input.len > pos && input[pos] === charUnicodeCodepoint ? { ok: true, value: [input[pos]], next: pos + 1 } : { ok: false, pos }
    }
}

const char = (chars: string, pairs: string): Parser => {
    const checkfuncs: ((c: number) => boolean)[] = []

    const _chars = chars.to_unicode_codepoint_arr()
    switch (_chars.len) {
        case 0:
            break
        case 1:
            checkfuncs.push((c: number) => { return c === _chars[0] })
            break
        default:
            checkfuncs.push((c: number) => { return _chars.incl(c) })
            break
    }

    for (const char of _chars) {
        checkfuncs.push((c: number) => { return c === char })
    }

    const pairChars = pairs.to_unicode_codepoint_arr()
    for (let i = 0; i < pairChars.len; i += 2) {
        const min = Math.min(pairChars[i], pairChars[i + 1])
        const max = Math.max(pairChars[i], pairChars[i + 1])
        checkfuncs.push((c: number) => { return min <= c && c <= max })
    }

    if (checkfuncs.len == 1) {
        const check = checkfuncs[0]
        return (input, pos) => {
            return input.len > pos && check(input[pos]) ? { ok: true, value: [input[pos]], next: pos + 1 } : { ok: false, pos }
        }
    }
    return (input, pos) => {
        if (input.len <= pos) return { ok: false, pos }
        const c = input[pos]
        for (const f of checkfuncs) {
            if (f(c)) {
                return { ok: true, value: [input[pos]], next: pos + 1 }
            }
        }
        return { ok: false, pos }
    }
}

const charNot = (chars: string, pairs: string): Parser => {
    const charYes = char(chars, pairs)
    return (input, pos) => {
        if (input.len <= pos) return { ok: false, pos }
        const ok = !charYes(input, pos).ok
        return ok ? { ok: true, value: [input[pos]], next: pos + 1 } : { ok: false, pos }
    }
}

const any: Parser = (input, pos) => {
    if (input.len <= pos) return { ok: false, pos }
    return { ok: true, value: [input[pos]], next: pos + 1 }
}

const charsSeq = (chars: string): Parser => {
    return seq(chars.to_unicode_codepoint_arr().map(charCodepoint))
}

const seq = (parsers: Parser[]): Parser => (input, pos) => {
    let _pos = pos
    let _value = []
    for (const parser of parsers) {
        const res = parser(input, _pos)
        if (res.ok) {
            _pos = res.next
            _value = _value.concat(res.value)
        } else {
            return res
        }
    }
    return { ok: true, value: _value, next: _pos }
};

const or = (parsers: Parser[]): Parser => (input, pos) => {
    for (const parser of parsers) {
        const res = parser(input, pos)
        if (res.ok) {
            return res
        }
    }
    return { ok: false, pos: pos }
};

const many = (p: Parser): Parser => (input, pos) => {
    let value: number[] = [];
    let next = pos;
    while (true) {
        const r = p(input, next);
        if (!r.ok) break;
        value = value.concat(r.value);
        next = r.next;
    }
    return { ok: true, value, next };
}

function replaceAll(input: string, pattern: Parser, replace: string) {
    const _replace = replace.to_unicode_codepoint_arr()
    const chars = input.to_unicode_codepoint_arr()
    let output: number[] = [];
    let pos = 0;
    while (pos < chars.len) {
        const r = pattern(chars, pos);
        if (r.ok) {
            output = output.concat(_replace)
            pos = r.next;
        } else {
            output.push(chars[pos]);
            pos += 1
        }
    }
    return Str.from_unicode_codepoints(output);
}

export const re = {
    charCodepoint,
    char,
    charNot,
    any,
    charsSeq,
    seq,
    or,
    many,
    replaceAll
}
