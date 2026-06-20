
import { state } from './core'
import { container } from './component'

type Params = { [key: string]: string }
type Handler = (pathParams: Params, queryParams: Params) => Component<any>[]
type NotFoundHandler = (path: string, queryParams: Params) => Component<any>[]

export type Router = {
    on(pattern: string, handler: Handler): Router
    notFound(handler: NotFoundHandler): Router
    mount(): Component<any>
    navigate(path: string, query?: Params): void
    currentUrl(): string
}

const parseHash = (): { path: string, query: Params } => {
    const url = Mk.url()
    const hashIdx = url.index_of("#")
    if (hashIdx < 0) return { path: "", query: {} }
    const hashStr = url.slice(hashIdx + 1, url.len)
    const qIdx = hashStr.index_of("?")
    const rawPath = qIdx < 0 ? hashStr : hashStr.slice(0, qIdx)
    const queryStr = qIdx < 0 ? "" : hashStr.slice(qIdx + 1, hashStr.len)
    // セグメント単位でデコードすることで %2F が / として解釈されてパスが壊れるのを防ぐ
    const rawParts = rawPath.split("/")
    let path = ""
    for (let i = 0; i < rawParts.len; i++) {
        if (i > 0) path = `${path}/`
        path = `${path}${Uri.decode_component(rawParts[i])}`
    }
    const query: Params = {}
    if (queryStr !== "") {
        const pairs = queryStr.split("&")
        for (let i = 0; i < pairs.len; i++) {
            const eqIdx = pairs[i].index_of("=")
            if (eqIdx < 0) continue
            query[Uri.decode_component(pairs[i].slice(0, eqIdx))] = Uri.decode_component(pairs[i].slice(eqIdx + 1, pairs[i].len))
        }
    }
    return { path, query }
}

const matchRoute = (pattern: string, path: string): Params | undefined => {
    const patternParts = pattern.split("/")
    const pathParts = path.split("/")
    if (patternParts.len !== pathParts.len) return undefined
    const params: Params = {}
    for (let i = 0; i < patternParts.len; i++) {
        if (patternParts[i].starts_with(":")) {
            params[patternParts[i].slice(1, patternParts[i].len)] = pathParts[i]
        } else if (patternParts[i] !== pathParts[i]) {
            return undefined
        }
    }
    return params
}

const buildUrl = (path: string, query: Params): string => {
    const url = Mk.url()
    const hashIdx = url.index_of("#")
    const base = hashIdx < 0 ? url : url.slice(0, hashIdx)
    const keys = Obj.keys(query)
    if (keys.len === 0) return `${base}#${path}`
    const pairs: string[] = []
    for (const k of keys) pairs.push(`${Uri.encode_component(k as string)}=${Uri.encode_component(query[k as string])}`)
    return `${base}#${path}?${pairs.join("&")}`
}

export const createRouter = (): Router => {
    const routes: [string, Handler][] = []
    const url_state = state("")
    // let で関数を初期化すると transpiler が named function に変換して immutable になるため
    // オブジェクトの property に格納して代入を property 更新に変換する
    const router_state: {
        notFoundHandler: NotFoundHandler,
        currentView: { get(): Component<any>[], set(value: Component<any>[]): void } | undefined,
    } = {
        notFoundHandler: (path) => [Ui.C.text({ text: `Unknown page: ${path}` })],
        currentView: undefined,
    }

    const resolve = (path: string, query: Params): Component<any>[] => {
        for (let i = 0; i < routes.len; i++) {
            const pathParams = matchRoute(routes[i][0], path)
            if (pathParams !== undefined) return routes[i][1](pathParams, query)
        }
        return router_state.notFoundHandler(path, query)
    }

    const router: Router = {
        on(pattern: string, handler: Handler): Router {
            routes.push([pattern, handler])
            return router
        },
        notFound(handler: NotFoundHandler): Router {
            router_state.notFoundHandler = handler
            return router
        },
        // ルート登録後に一度だけ呼ぶ。初期ページは URL ハッシュから解決される
        mount(): Component<any> {
            const { path, query } = parseHash()
            url_state.set(buildUrl(path, query))
            router_state.currentView = state(resolve(path, query))
            const view = router_state.currentView as { get(): Component<any>[], set(value: Component<any>[]): void }
            return container({ children: () => view.get() })
        },
        navigate(path: string, query?: Params) {
            const q = query ?? {}
            url_state.set(buildUrl(path, q))
            if (router_state.currentView !== undefined) router_state.currentView.set(resolve(path, q))
        },
        currentUrl(): string { return url_state.get() },
    }
    return router
}
