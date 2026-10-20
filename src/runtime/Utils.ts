import Context from "./Context.ts"
import { Result } from "./Result.ts"
import { TokenType } from "./TokenType.ts"
import { Parsem } from "../Parsem.ts"
import Token from "./Token.ts"
import { PushAggregatorInstruction, PushValueInstruction } from "./InstructionTapeManager.ts"

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

        if (res === Result.Continue && ctx.sourceManager.pos != backup.pos)
            throw new Error(`Error at ${ctx.sourceManager.pos} "continue" status cannot modify execution stack!`)

        if (res === Result.NotParsed) {
            ctx.sourceManager.pos = backup.pos
            ctx.builderManager.pos = backup.buildersPos
            ctx.builderManager.builderPos = backup.builderPos
            ctx.tokenManager.pos = backup.tokensPos
            ctx.productionManager.restore(backup.stack)
        }

        return res
    }

    static handlePackrat<T>(_parsem: Parsem<T>, ctx: Context<T>, lambda: (ctx: Context<T>) => Result): Result {

        const res = lambda(ctx)

        return res;
    }


    static handleSeedGrowing<T>(_parsem: Parsem<T>, ctx: Context<T>, lambda: (ctx: Context<T>) => Result): Result {

        const res = lambda(ctx)

        return res;

    }

    static handleTProduction<T>(ctx: Context<T>, lambda: (ctx: Context<T>) => Result, producer?: (v: string) => T, type?: TokenType): Result {
        const pos = ctx.sourceManager.pos
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

        const product = (producer !== undefined) ? producer(symbol) : symbol as T
        ctx.instructionTapeManager.append(new PushValueInstruction<T>(product))
        // TODO: remove
        ctx.productionManager.append(product)


        return Result.Parsed
    }

    static handleNTProduction<T>(ctx: Context<T>, lambda: (ctx: Context<T>) => Result, producer?: (...v: Array<T>) => T, nbArgs?: number): Result {

        const tapeLength = ctx.instructionTapeManager.length

        // TODO: remove
        const startPos = ctx.productionManager.pos

        // run encapsulated lambda
        const res = lambda(ctx)

        if (res !== Result.Parsed || !producer)
            return res

        const arity = nbArgs !== undefined ? nbArgs : ctx.instructionTapeManager.calculateStackDepth(startPos, producer)
        ctx.instructionTapeManager.append(new PushAggregatorInstruction<T>(arity, producer))

        // TODO: remove
        ctx.productionManager.produce(startPos, producer, nbArgs)

        return Result.Parsed
    }
}
