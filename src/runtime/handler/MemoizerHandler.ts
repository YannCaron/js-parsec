import { Parsem } from "../../Parsem.ts";
import Context from "../Context.ts";
import { Instruction } from "../manager/InstructionTapeManager.ts";
import { Result } from "../Result.ts";
import type { SymbolInstruction } from "../manager/SymbolEffectJournal.ts";

type ResultEntry<T> = {
    newPos: number,
    res: Result,
    symbolEffects: SymbolInstruction<T>[],
    instructionsDelta: Instruction<T>[],
}

export default class MemoizerHandler<T> {

    private readonly _ctx: Context<T>
    private readonly _memoizer: Map<number, Map<Parsem<T>, ResultEntry<T>>>

    constructor(ctx: Context<T>) {
        this._ctx = ctx
        this._memoizer = new Map<number, Map<Parsem<T>, ResultEntry<T>>>()
    }

    private search(pos: number, parsem: Parsem<T>): ResultEntry<T> | undefined {
        return this._memoizer.get(pos)?.get(parsem)
    }

    private memoize(pos: number, parsem: Parsem<T>, memo: ResultEntry<T>) {
        let parsems = this._memoizer.get(pos)
        if (parsems === undefined) {
            parsems = new Map<Parsem<T>, ResultEntry<T>>()
            this._memoizer.set(pos, parsems)
        }

        parsems.set(parsem, memo)
    }

    handle(parsem: Parsem<T>, lambda: (ctx: Context<T>) => Result): Result {

        const pos = this._ctx.sourceManager.pos
        const memo = this.search(pos, parsem)

        if (memo !== undefined) {
            const { newPos, res, symbolEffects, instructionsDelta } = memo

            if (newPos < pos)
                throw new Error(`Corrupted memo: final position ${newPos} precedes starting position ${pos}.`)

            this._ctx.symbolEffectJournal.replay(symbolEffects)
            this._ctx.instructionTapeManager.append(...instructionsDelta)
            this._ctx.sourceManager.pos = newPos
            return res
        }

        const tapePos = this._ctx.instructionTapeManager.length
        const symbolEffectsPos = this._ctx.symbolEffectJournal.startRecording()

        try {
            const res = lambda(this._ctx)

            const instructionsDelta = this._ctx.instructionTapeManager.subTapeFrom(tapePos)
            const symbolEffects = this._ctx.symbolEffectJournal.subJournalFrom(symbolEffectsPos)
            this.memoize(pos, parsem, { newPos: this._ctx.sourceManager.pos, res, symbolEffects, instructionsDelta })

            return res;
        } finally {
            this._ctx.symbolEffectJournal.stopRecording()
        }
    }

}
