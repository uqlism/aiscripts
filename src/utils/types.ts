export function isStr(val: any): val is string {
    return Core.type(val) === "str"
}

export function isArr(val: any): val is Array<any> {
    return Core.type(val) === "arr"
}

export function isNum(val: any): val is number {
    return Core.type(val) === "num"
}

export function isBool(val: any): val is boolean {
    return Core.type(val) === "bool"
}

export function isObj(val: any): val is { [key: string]: any } {
    return Core.type(val) === "obj"
}