import { Parsem } from "../Parsem.ts";
import Context from "./Context.ts";
import { Instruction } from "./InstructionTapeManager.ts";
import { Result } from "./Result.ts";

type ResultEntry<T> = {
    newPos: number,
    res: Result,
    tapDelta: Array<Instruction<T>>
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

    handle(parsem: Parsem<T>, ctx: Context<T>, lambda: (ctx: Context<T>) => Result): Result {

        // avoid memoize in case of symbol building
        if (ctx.symbolManager.pos > 0)
            return lambda(ctx)
        
        const pos = ctx.sourceManager.pos
        const memo = this.search(pos, parsem)

        if (memo !== undefined) {
            const { newPos, res, tapDelta } = memo

            ctx.sourceManager.pos = newPos
            ctx.instructionTapeManager.append(...tapDelta)
            return res
        }

        const tapePos = ctx.instructionTapeManager.length

        const res = lambda(ctx)

        const tapDelta = ctx.instructionTapeManager.subTapeFrom(tapePos)
        this.memoize(pos, parsem, { newPos: ctx.sourceManager.pos, res, tapDelta })

        return res;
    }

}
