export function isStr(val: any): val is string {
    return Core.type(val) === "str"
}

export function isArr(val: any): val is Array<any> {
    return Core.type(val) === "arr"
}