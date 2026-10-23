import Context from "../Context.ts"
import { Result } from "../Result.ts"

export default class BacktrackingHandler<T> {

    private readonly _ctx: Context<T>
    private _depth: number
    private _earliestBacktrackPosition : number

    get isReachingEarliestPosition():boolean {
        return this._depth === 0
    }

    get earliestBacktrackPosition(): number {
        return this._earliestBacktrackPosition
    }

    constructor(ctx: Context<T>) {
        this._ctx = ctx
        this._depth = 0
        this._earliestBacktrackPosition = -1
    }

    handle(lambda: (ctx: Context<T>) => Result): Result {
        try {
            if (this._depth === 0)
                this._earliestBacktrackPosition = this._ctx.sourceManager.pos

            this._depth++

            return this.manageBackup(lambda)

        } finally {
            this._depth--
        }
    }

    private manageBackup(lambda: (ctx: Context<T>) => Result): Result {
            const backup = {
                pos: this._ctx.sourceManager.pos,
                symbolPos: this._ctx.symbolManager.pos,
                builder: this._ctx.symbolManager.current,
                builderPos: this._ctx.symbolManager.builderPos,
                tokensPos: this._ctx.tokenManager.pos,
                productionPos: this._ctx.productionManager.pos,
                productionEffectsLength: this._ctx.productionEffectJournal.length,
                symbolEffectsLength: this._ctx.symbolEffectJournal.length
            }

            // run encapsulated lambda
            const res = lambda(this._ctx)

            if (res === Result.Continue && (
                this._ctx.sourceManager.pos !== backup.pos ||
                this._ctx.symbolManager.pos !== backup.symbolPos ||
                this._ctx.symbolManager.current !== backup.builder ||
                this._ctx.symbolManager.builderPos !== backup.builderPos ||
                this._ctx.tokenManager.pos !== backup.tokensPos ||
                this._ctx.productionManager.pos !== backup.productionPos ||
                this._ctx.productionEffectJournal.length !== backup.productionEffectsLength ||
                this._ctx.symbolEffectJournal.length !== backup.symbolEffectsLength
            ))
                throw new Error(`Error at ${this._ctx.sourceManager.pos} "continue" status cannot modify execution stack!`)

            if (res === Result.NotParsed) {
                this._ctx.sourceManager.pos = backup.pos
                this._ctx.symbolManager.pos = backup.symbolPos
                this._ctx.symbolManager.builderPos = backup.builderPos
                this._ctx.tokenManager.pos = backup.tokensPos
                this._ctx.productionEffectJournal.removeFrom(backup.productionEffectsLength)
                this._ctx.symbolEffectJournal.removeFrom(backup.symbolEffectsLength)
            }

            return res

    }

}
