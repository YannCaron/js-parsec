import Ast from "./Ast.ts";
import VisitContext from "./VisitContext.ts";

export default abstract class Visitor {

    readonly autoTraverse: boolean

    constructor(autoTraverse: boolean = false) {
        this.autoTraverse = autoTraverse
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