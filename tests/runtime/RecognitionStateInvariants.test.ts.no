import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { Context, Parsem, Result, Token, productT } from '../../index.ts'
import { PushValueInstruction } from '../../src/runtime/manager/InstructionTapeManager.ts'

class Recognizer extends Parsem<unknown> {
    private readonly _recognize: (ctx: Context<unknown>) => Result

    constructor(recognize: (ctx: Context<unknown>) => Result) {
        super()
        this._recognize = recognize
    }

    parse(ctx: Context<unknown>): Result { return this._recognize(ctx) }
    toString(): string { return 'test-recognizer' }
}

function snapshot(ctx: Context<unknown>) {
    return {
        position: ctx.sourceManager.pos,
        tokens: ctx.tokenManager.tokens,
        instructions: Array.from(ctx.instructionTapeManager.queue),
        values: ctx.productionManager.stack,
        captures: ctx.symbolManager._builders.map(builder => builder.toString()),
    }
}

describe('Recognition state invariants', () => {

    test('Continue without effects preserves every observable state component', () => {
        const ctx = new Context<unknown>('ab')
        ctx.productionManager.append('prefix')
        ctx.symbolManager.create()
        ctx.symbolManager.append('outer:')
        const before = snapshot(ctx)

        assert.strictEqual(ctx.backtrackingHandler.handle(() => Result.Continue), Result.Continue)
        assert.deepStrictEqual(snapshot(ctx), before)
    })

    const mutations: Array<[string, (ctx: Context<unknown>) => void]> = [
        ['source position', ctx => ctx.next()],
        ['tokens', ctx => ctx.tokenManager.append(new Token('ghost', 0))],
        ['instruction tape', ctx => ctx.instructionTapeManager.append(new PushValueInstruction('ghost'))],
        ['new capture', ctx => ctx.symbolManager.create()],
        ['removed capture', ctx => { ctx.symbolManager.consume() }],
        ['capture contents', ctx => ctx.symbolManager.append('ghost')],
        ['semantic stack', ctx => ctx.productionManager.append('ghost')],
    ]

    for (const [name, mutate] of mutations) {
        test(`Continue rejects a custom recognizer that changes ${name}`, () => {
            const ctx = new Context<unknown>('ab')
            ctx.symbolManager.create()
            ctx.symbolManager.append('outer:')
            ctx.productionManager.append('prefix')

            assert.throws(() => ctx.backtrackingHandler.handle(current => {
                mutate(current)
                return Result.Continue
            }), error => error instanceof Error && /continue/i.test(error.message))
        })
    }

    test('failed recognition restores nested captures, tokens and tape while retaining prior values', () => {
        const ctx = new Context<unknown>('ab')
        ctx.productionManager.append('prefix')
        ctx.symbolManager.create()
        ctx.symbolManager.append('outer:')
        const before = snapshot(ctx)

        assert.strictEqual(ctx.backtrackingHandler.handle(current => {
            current.next()
            current.tokenManager.append(new Token('discarded', 0))
            current.instructionTapeManager.append(new PushValueInstruction('discarded'))
            current.symbolManager.create()
            current.symbolManager.append('discarded')
            return Result.NotParsed
        }), Result.NotParsed)

        assert.deepStrictEqual(snapshot(ctx), before)
    })

    for (const nesting of [1, 3]) {
        test(`a recognition exception closes ${nesting} terminal captures and preserves the original exception`, () => {
            const failure = new Error('recognition failed')
            const ctx = new Context<unknown>('a')
            ctx.symbolManager.create()
            ctx.symbolManager.append('outer:')
            const before = snapshot(ctx)
            let calls = 0
            let parser: Parsem<unknown> = new Recognizer(current => { current.next(); throw failure })
            for (let index = 0; index < nesting; index++) parser = productT(parser, value => { calls++; return value })

            assert.throws(() => parser.parse(ctx), error => error === failure)

            assert.strictEqual(calls, 0)
            assert.deepStrictEqual(snapshot(ctx).captures, before.captures)
            assert.deepStrictEqual(ctx.tokenManager.tokens, before.tokens)
            assert.deepStrictEqual(Array.from(ctx.instructionTapeManager.queue), before.instructions)
            assert.deepStrictEqual(ctx.productionManager.stack, before.values)
        })
    }

    test('NotParsed closes its terminal capture without executing its producer', () => {
        const ctx = new Context<unknown>('a')
        const before = snapshot(ctx)
        let calls = 0
        const parser = productT(new Recognizer(current => current.backtrackingHandler.handle(inner => {
            inner.next()
            return Result.NotParsed
        })), value => { calls++; return value })

        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
        assert.strictEqual(calls, 0)
        assert.deepStrictEqual(snapshot(ctx), before)
    })
})

/* FUTURE(purge): proposed API memoizerHandler.purgeBefore(requestedPosition).
The effective cutoff must include the cursor and every active backtracking checkpoint.
describe('Backtracking-aware memo eviction contracts', () => {

    function populated(ctx: Context<unknown>) {
        const key = new Recognizer(() => Result.Continue)
        for (let position = 0; position <= 4; position++) {
            ctx.memoizerHandler.memoize(position, key, { res: Result.Continue, newPos: position, tokensDelta: [], instructionsDelta: [] })
        }
        return key
    }

    test('purging retains the current position and all future positions', () => {
        const ctx = new Context<unknown>('abcd')
        const key = populated(ctx)
        ctx.sourceManager.pos = 2
        ctx.memoizerHandler.purgeBefore(4)

        for (const position of [0, 1]) assert.strictEqual(ctx.memoizerHandler.search(position, key), undefined)
        for (const position of [2, 3, 4]) assert.ok(ctx.memoizerHandler.search(position, key))
    })

    test('an outer checkpoint protects entries after an inner checkpoint has finished', () => {
        const ctx = new Context<unknown>('abcd')
        const key = populated(ctx)

        ctx.backtrackingHandler.handle(outer => {
            outer.next()
            outer.backtrackingHandler.handle(inner => { inner.next(); return Result.Parsed })
            outer.memoizerHandler.purgeBefore(2)
            for (const position of [0, 1, 2, 3, 4]) assert.ok(outer.memoizerHandler.search(position, key))
            return Result.Parsed
        })
        ctx.memoizerHandler.purgeBefore(2)
        for (const position of [0, 1]) assert.strictEqual(ctx.memoizerHandler.search(position, key), undefined)
        for (const position of [2, 3, 4]) assert.ok(ctx.memoizerHandler.search(position, key))
    })

    test('releasing one of two checkpoints at the same offset keeps the other checkpoint active', () => {
        const ctx = new Context<unknown>('abcd')
        const key = populated(ctx)

        ctx.backtrackingHandler.handle(outer => {
            outer.backtrackingHandler.handle(() => Result.Continue)
            outer.next()
            outer.memoizerHandler.purgeBefore(1)
            assert.ok(outer.memoizerHandler.search(0, key))
            return Result.Parsed
        })
        ctx.memoizerHandler.purgeBefore(1)
        assert.strictEqual(ctx.memoizerHandler.search(0, key), undefined)
        assert.ok(ctx.memoizerHandler.search(1, key))
    })

    test('exceptions release inner checkpoints without releasing the surrounding checkpoint', () => {
        const ctx = new Context<unknown>('abcd')
        const key = populated(ctx)
        const failure = new Error('nested failure')

        ctx.backtrackingHandler.handle(outer => {
            outer.next()
            assert.throws(() => outer.backtrackingHandler.handle(inner => { inner.next(); throw failure }), error => error === failure)
            outer.memoizerHandler.purgeBefore(2)
            assert.ok(outer.memoizerHandler.search(0, key))
            outer.sourceManager.pos = 2
            return Result.Parsed
        })
        ctx.memoizerHandler.purgeBefore(2)
        assert.strictEqual(ctx.memoizerHandler.search(1, key), undefined)
        assert.ok(ctx.memoizerHandler.search(2, key))
    })

    test('active checkpoints in another context do not pin the current memo table', () => {
        const first = new Context<unknown>('abcd')
        const second = new Context<unknown>('abcd')
        const firstKey = populated(first)
        const secondKey = populated(second)

        first.backtrackingHandler.handle(() => {
            second.sourceManager.pos = 3
            second.memoizerHandler.purgeBefore(3)
            assert.strictEqual(second.memoizerHandler.search(0, secondKey), undefined)
            assert.ok(second.memoizerHandler.search(3, secondKey))
            assert.ok(first.memoizerHandler.search(0, firstKey))
            return Result.Continue
        })
    })
})
*/
