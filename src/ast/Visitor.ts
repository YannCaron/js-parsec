import Ast from "./Ast.ts";
import VisitContext from "./VisitContext.ts";

export type VisitorConstructor = (Function & {
    autoTraverse?: boolean
    AUTO_TRAVERS?: boolean
    AUTO_TRAVERSE?: boolean
    [key: string]: any
})

export default abstract class Visitor {

    public static readonly AUTO_TRAVERS_PROPERTY_NAME: string = 'AUTO_TRAVERS' as const
    public static readonly AUTO_TRAVERS?: boolean = false

    readonly autoTraverse: boolean

    constructor(autoTraverse: boolean = false) {
        this.autoTraverse = autoTraverse
    }

    static isAutoTraverse(visitor: Visitor | VisitorConstructor): boolean {
        if (typeof visitor === 'function') {
            const v = visitor as any
            return Boolean(v.autoTraverse ?? v.AUTO_TRAVERS ?? v.AUTO_TRAVERSE)
        }
        return Boolean(visitor?.autoTraverse)
    }

    visitDefault<T, C extends VisitContext<T>>(ast: Ast, _: C, expectedMethod?: string): void {
        const methodName = expectedMethod ?? 'visit' + ast.type
        throw new Error(
            `Visitor '${this.constructor.name}' does not implement '${methodName}'!`
        )
    }

    dispatch<T, C extends VisitContext<T>>(ast: Ast, ctx: C, methodName: string): void {
        const handler = (this as Record<string, any>)[methodName]
        if (typeof handler === 'function') {
            handler.call(this, ast, ctx)
        } else {
            this.visitDefault(ast, ctx, methodName)
        }
    }

}