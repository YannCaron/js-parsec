import Context from "./Context.ts"
import { Result } from "./Result.ts"
import { TokenType } from "./TokenType.ts"
import { Parsem } from "../Parsem.ts"
import { PushAggregatorInstruction, PushValueInstruction } from "./manager/ProductionEffectJournal.ts"

export default class Utils {

    static handleSeedGrowing<T>(_parsem: Parsem<T>, ctx: Context<T>, lambda: (ctx: Context<T>) => Result): Result {

        const res = lambda(ctx)

        return res;

    }

    static handleTProduction<T>(ctx: Context<T>, lambda: (ctx: Context<T>) => Result, producer?: (v: string) => T, type?: TokenType): Result {
        const pos = ctx.sourceManager.pos
        const symbolEffectsPos = ctx.symbolEffectJournal.length
        ctx.symbolEffectJournal.beginCapture()

        let res = Result.NotParsed
        let symbol: string | undefined
        try {
            res = lambda(ctx)
        } finally {
            symbol = ctx.symbolEffectJournal.endCapture(pos, res, type)
            // An empty capture contributes no effects to a Continue result.
            if (res === Result.Continue && ctx.symbolEffectJournal.length === symbolEffectsPos + 2)
                ctx.symbolEffectJournal.removeFrom(symbolEffectsPos)
        }

        if (res !== Result.Parsed)
            return res

        if (symbol === undefined) return res

        ctx.productionEffectJournal.append(new PushValueInstruction<T>(symbol, producer))

        return Result.Parsed
    }

    static handleNTProduction<T>(ctx: Context<T>, lambda: (ctx: Context<T>) => Result, producer?: (...v: Array<T>) => T, nbArgs?: number): Result {

        const productionEffectsLength = ctx.productionEffectJournal.length

        // run encapsulated lambda
        const res = lambda(ctx)

        if (res !== Result.Parsed || !producer)
            return res

        const arity = nbArgs !== undefined ? nbArgs : ctx.productionEffectJournal.calculateStackDepth(productionEffectsLength, producer)
        ctx.productionEffectJournal.append(new PushAggregatorInstruction<T>(arity, producer))

        return Result.Parsed
    }
}
