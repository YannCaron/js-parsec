import { Functions, StringBuilder } from "@cyann/js-commons"
import Context from "./Context.ts"
import { Result } from "./Result.ts"
import { TokenType } from "./TokenType.ts"
import { Parsem } from "../Parsem.ts"

export default class Utils {

    static handleBackup<T>(ctx: Context<T>, lambda: (ctx: Context<T>) => Result): Result {
        const backup = {
            pos: ctx._pos,
            buildersPos: ctx.buildersPos,
            builderPos: ctx.builderPos,
            tokensPos: ctx.tokensPos,
            stack: [...ctx._stack]
        }

        // run encapsulated lambda
        const res = lambda(ctx)

        if (res === Result.Continue && ctx.pos != backup.pos)
            throw new Error(`Error at ${ctx.pos} "continue" status cannot modify execution stack!`)

        if (res === Result.NotParsed) {
            ctx.pos = backup.pos
            ctx.buildersPos = backup.buildersPos
            ctx.builderPos = backup.builderPos
            ctx.tokensPos = backup.tokensPos
            ctx._stack.splice(0, ctx._stack.length, ...backup.stack)
        }

        return res
    }

    static handlePackrat<T>(parsem: Parsem<T>, ctx: Context<T>, lambda: (ctx: Context<T>) => Result): Result {

        const tokenPos = ctx.pos
        const memo = ctx.getMemo(parsem, tokenPos)

        if (memo !== undefined) {
            if (memo.pos < tokenPos) {
                throw new Error("Corrupted memo");
            }
            
            ctx.pos = memo.pos
            return memo.result
        }

        const res = lambda(ctx)

        ctx.setMemo(parsem, tokenPos, res, ctx.pos)

        return res;

    }

    
    static handleSeedGrowing<T>(parsem: Parsem<T>, ctx: Context<T>, lambda: (ctx: Context<T>) => Result): Result {

        const res = lambda(ctx)

        return res;

    }

    static handleTProduction<T>(ctx: Context<T>, lambda: (ctx: Context<T>) => Result, producer?: (v: string) => T, type?: TokenType): Result {
        const pos = ctx.pos
        ctx._builders.push(new StringBuilder())

        // run encapsulated lambda
        const res = lambda(ctx)

        const builder = ctx._builders.pop()

        if (res !== Result.Parsed)
            return res

        if (!builder) return res

        const symbol = builder.toString()
        ctx.createToken(symbol, pos, type)

        const product = (producer !== undefined) ? producer(symbol) : undefined
        if (product !== undefined)
            ctx._stack.push(product)

        return Result.Parsed
    }

    static calculateStackDepth<T>(ctx: Context<T>, startPos: number, lambda: (...v: Array<T>) => T): number {
        const delta = ctx.stackPos - startPos
        const producerArgs = Functions.extractArguments(lambda)
        if (producerArgs.length === 0) return 0 // <-- 0 argument attendu
        const hasRest = Functions.hasRestArgument(producerArgs)

        return hasRest ?
            delta + producerArgs.length - 1 : // e.g. (c, ...rest) => {}
            producerArgs.length // e.g. (l, r) => {}
    }

    static handleNTProduction<T>(ctx: Context<T>, lambda: (ctx: Context<T>) => Result, producer?: (...v: Array<T>) => T, nbArgs?: number): Result {

        const startPos = ctx.stackPos

        // run encapsulated lambda
        const res = lambda(ctx)

        if (res !== Result.Parsed || !producer)
            return res

        const args = new Array<T>()
        let count = nbArgs !== undefined ? nbArgs : Utils.calculateStackDepth(ctx, startPos, producer)

        while (count > 0 && !ctx._stack.isEmpty) {
            const value = ctx._stack.pop()
            if (value === undefined) break
            args.unshift(value)
            count--
        }

        ctx._stack.push(producer(...args))

        return Result.Parsed
    }
}