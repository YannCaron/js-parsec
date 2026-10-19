import Context from "./Context.ts"
import { Result } from "./Result.ts"
import { TokenType } from "./TokenType.ts"
import { Parsem } from "../Parsem.ts"
import Token from "./Token.ts"

export default class Utils {

    static handleBackup<T>(ctx: Context<T>, lambda: (ctx: Context<T>) => Result): Result {
        const backup = {
            pos: ctx.sourceManager.pos,
            buildersPos: ctx.builderManager.pos,
            builderPos: ctx.builderManager.builderPos,
            tokensPos: ctx.tokenManager.pos,
            stack: ctx.productionManager.stack
        }

        // run encapsulated lambda
        const res = lambda(ctx)

        if (res === Result.Continue && ctx.pos != backup.pos)
            throw new Error(`Error at ${ctx.pos} "continue" status cannot modify execution stack!`)

        if (res === Result.NotParsed) {
            ctx.sourceManager.pos = backup.pos
            ctx.builderManager.pos = backup.buildersPos
            ctx.builderManager.builderPos = backup.builderPos
            ctx.tokenManager.pos = backup.tokensPos
            ctx.productionManager.restore(backup.stack)
        }

        return res
    }

    static handlePackrat<T>(parsem: Parsem<T>, ctx: Context<T>, lambda: (ctx: Context<T>) => Result): Result {

        return lambda(ctx)

    }

    
    static handleSeedGrowing<T>(_parsem: Parsem<T>, ctx: Context<T>, lambda: (ctx: Context<T>) => Result): Result {

        const res = lambda(ctx)

        return res;

    }

    static handleTProduction<T>(ctx: Context<T>, lambda: (ctx: Context<T>) => Result, producer?: (v: string) => T, type?: TokenType): Result {
        const pos = ctx.pos
        ctx.builderManager.create()

        // run encapsulated lambda
        const res = lambda(ctx)

        const builder = ctx.builderManager.consume()

        if (res !== Result.Parsed)
            return res

        if (!builder) return res

        const symbol = builder.toString()
        const token = new Token(symbol, pos, type);

        ctx.tokenManager.append(token)

        const product = (producer !== undefined) ? producer(symbol) : undefined
        if (product !== undefined) {
            ctx.productionManager.append(product)
        }

        return Result.Parsed
    }

    static calculateStackDepth<T>(ctx: Context<T>, startPos: number, lambda: (...v: Array<T>) => T): number {
        return ctx.productionManager.calculateStackDepth(startPos, lambda)
    }

    static handleNTProduction<T>(ctx: Context<T>, lambda: (ctx: Context<T>) => Result, producer?: (...v: Array<T>) => T, nbArgs?: number): Result {

        const startPos = ctx.productionManager.pos

        // run encapsulated lambda
        const res = lambda(ctx)

        if (res !== Result.Parsed || !producer)
            return res

        ctx.productionManager.produce(startPos, producer, nbArgs)

        return Result.Parsed
    }
}
