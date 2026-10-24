import { Parsem } from "../../Parsem.ts";
import Context from "../Context.ts";
import { ProductionEffect } from "../manager/ProductionEffectJournal.ts";
import { Result } from "../Result.ts";
import type { SymbolInstruction } from "../manager/SymbolEffectJournal.ts";
import { PriorityQueue } from "@cyann/js-commons";

type ResultEntry<T> = {
    newPos: number,
    res: Result,
    symbolEffects: SymbolInstruction<T>[],
    instructionsDelta: ProductionEffect<T>[],
}

export default class MemoizerHandler<T> {

    static readonly ACTIVE = true

    private readonly _ctx: Context<T>
    private readonly _memoizer: Map<number, Map<Parsem<T>, ResultEntry<T>>>
    private readonly _orderedIndex: PriorityQueue<number>

    constructor(ctx: Context<T>) {
        this._ctx = ctx
        this._memoizer = new Map<number, Map<Parsem<T>, ResultEntry<T>>>()
        this._orderedIndex = new PriorityQueue<number>()
    }

    search(pos: number, parsem: Parsem<T>): ResultEntry<T> | undefined {
        return this._memoizer.get(pos)?.get(parsem)
    }

    memoize(pos: number, parsem: Parsem<T>, memo: ResultEntry<T>) {
        let parsems = this._memoizer.get(pos)
        if (parsems === undefined) {
            parsems = new Map<Parsem<T>, ResultEntry<T>>()
            this._memoizer.set(pos, parsems)
            this._orderedIndex.push(pos)
        }

        parsems.set(parsem, memo)
    }

    private purgeMemoizer(pos: number) {
        if (pos === -1)
            return

        while ((this._orderedIndex.peek() ?? Infinity) < pos) {
            const index = this._orderedIndex.pop()

            if (index !== undefined)
                this._memoizer.delete(index)
        }
    }

    handle(parsem: Parsem<T>, lambda: (ctx: Context<T>) => Result): Result {

        const pos = this._ctx.sourceManager.pos
        const memo = this.search(pos, parsem)

        if (memo !== undefined) {
            const { newPos, res, symbolEffects, instructionsDelta } = memo

            if (newPos < pos)
                throw new Error(`Corrupted memo: final position ${newPos} precedes starting position ${pos}.`)

            this._ctx.symbolEffectJournal.replay(symbolEffects)
            this._ctx.productionEffectJournal.append(...instructionsDelta)
            this._ctx.sourceManager.pos = newPos
            return res
        }

        const productionEffectsPos = this._ctx.productionEffectJournal.length
        const symbolEffectsPos = this._ctx.symbolEffectJournal.startRecording()

        try {
            const res = lambda(this._ctx)

            if (MemoizerHandler.ACTIVE) {
                const instructionsDelta = this._ctx.productionEffectJournal.subJournalFrom(productionEffectsPos)
                const symbolEffects = this._ctx.symbolEffectJournal.subJournalFrom(symbolEffectsPos)
                this.memoize(pos, parsem, { newPos: this._ctx.sourceManager.pos, res, symbolEffects, instructionsDelta })
            }

            return res;
        } finally {
            this._ctx.symbolEffectJournal.stopRecording()

            if (this._ctx.backtrackingHandler.isReachingEarliestPosition)
                this.purgeMemoizer(this._ctx.backtrackingHandler.earliestBacktrackPosition)
        }
    }

}
