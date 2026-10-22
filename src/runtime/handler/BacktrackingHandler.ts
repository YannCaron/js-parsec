import Context from "../Context.ts"
import { Result } from "../Result.ts"

export default class BacktrackingHandler {

    static handle<T>(ctx: Context<T>, lambda: (ctx: Context<T>) => Result): Result {
        const backup = {
            pos: ctx.sourceManager.pos,
            symbolPos: ctx.symbolManager.pos,
            builderPos: ctx.symbolManager.builderPos,
            tokensPos: ctx.tokenManager.pos,
            tapeLength: ctx.instructionTapeManager.length
        }

        // run encapsulated lambda
        const res = lambda(ctx)

        if (res === Result.Continue && ctx.sourceManager.pos != backup.pos)
            throw new Error(`Error at ${ctx.sourceManager.pos} "continue" status cannot modify execution stack!`)

        if (res === Result.NotParsed) {
            ctx.sourceManager.pos = backup.pos
            ctx.symbolManager.pos = backup.symbolPos
            ctx.symbolManager.builderPos = backup.builderPos
            ctx.tokenManager.pos = backup.tokensPos
            ctx.instructionTapeManager.removeFrom(backup.tapeLength)
        }

        return res
    }

}