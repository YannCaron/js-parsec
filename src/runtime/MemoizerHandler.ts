import { Parsem } from "../Parsem.ts";
import Context from "./Context.ts";
import { Instruction } from "./InstructionTapeManager.ts";
import { Result } from "./Result.ts";
import type Token from "./Token.ts";

type ResultEntry<T> = {
    newPos: number,
    res: Result,
    tokensDelta: Token[]
    instructionsDelta: Instruction<T>[],
}

export default class MemoizerHandler<T> {

    private readonly _ctx: Context<T>
    private readonly _memoizer: Map<number, Map<Parsem<T>, ResultEntry<T>>>

    constructor(ctx: Context<T>) {
        this._ctx = ctx
        this._memoizer = new Map<number, Map<Parsem<T>, ResultEntry<T>>>()
    }

    search(pos: number, parsem: Parsem<T>): ResultEntry<T> | undefined {
        return this._memoizer.get(pos)?.get(parsem)
    }

    memoize(pos: number, parsem: Parsem<T>, memo: ResultEntry<T>) {
        let parsems = this._memoizer.get(pos)
        if (parsems === undefined) {
            parsems = new Map<Parsem<T>, ResultEntry<T>>()
            this._memoizer.set(pos, parsems)
        }

        parsems.set(parsem, memo)
    }

    handle(parsem: Parsem<T>, lambda: (ctx: Context<T>) => Result): Result {

        // avoid memoize in case of symbol building
        if (this._ctx.symbolManager.pos > 0)
            return lambda(this._ctx)
        
        const pos = this._ctx.sourceManager.pos
        const memo = this.search(pos, parsem)

        if (memo !== undefined) {
            const { newPos, res, tokensDelta, instructionsDelta: instructionsDelta } = memo

            this._ctx.sourceManager.pos = newPos
            this._ctx.tokenManager.append(...tokensDelta)
            this._ctx.instructionTapeManager.append(...instructionsDelta)
            return res
        }

        const tapePos = this._ctx.instructionTapeManager.length
        const tokenPos = this._ctx.tokenManager.pos

        const res = lambda(this._ctx)

        const instructionsDelta = this._ctx.instructionTapeManager.subTapeFrom(tapePos)
        const tokensDelta = this._ctx.tokenManager.subTokensFrom(tokenPos)
        this.memoize(pos, parsem, { newPos: this._ctx.sourceManager.pos, res, tokensDelta, instructionsDelta })

        return res;
    }

}
