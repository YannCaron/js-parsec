import Context from "../Context.ts"
import { Result } from "../Result.ts"

export default class BacktrackingHandler<T> {

    private readonly _ctx:Context<T>

    constructor(ctx: Context<T>) {
        this._ctx = ctx
    }

    handle(lambda: (ctx: Context<T>) => Result): Result {
        const backup = {
            pos: this._ctx.sourceManager.pos,
            symbolPos: this._ctx.symbolManager.pos,
            builderPos: this._ctx.symbolManager.builderPos,
            tokensPos: this._ctx.tokenManager.pos,
            tapeLength: this._ctx.instructionTapeManager.length
        }

        // run encapsulated lambda
        const res = lambda(this._ctx)

        if (res === Result.Continue && this._ctx.sourceManager.pos != backup.pos)
            throw new Error(`Error at ${this._ctx.sourceManager.pos} "continue" status cannot modify execution stack!`)

        if (res === Result.NotParsed) {
            this._ctx.sourceManager.pos = backup.pos
            this._ctx.symbolManager.pos = backup.symbolPos
            this._ctx.symbolManager.builderPos = backup.builderPos
            this._ctx.tokenManager.pos = backup.tokensPos
            this._ctx.instructionTapeManager.removeFrom(backup.tapeLength)
        }

        return res
    }

}