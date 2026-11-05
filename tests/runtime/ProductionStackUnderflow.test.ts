import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
    Context, Result, choice, optional, productNT, productT, repeat, sequence, wordIs
} from '../../index.ts'
import { PushAggregatorProductionEffect } from '../../src/runtime/manager/ProductionEffectJournal.ts'

describe('production stack underflow diagnostics and atomicity', () => {
    test('an empty stack reports underflow, not overflow', () => {
        const ctx = new Context<unknown>('')

        assert.throws(
            () => ctx.productionManager.consume(),
            /Production stack underflow: required=1, available=0/
        )
    })

    test('a reducer validates all arguments before popping anything', () => {
        const ctx = new Context<unknown>('')
        ctx.productionManager.append('previous')
        let calls = 0
        const reducer = new PushAggregatorProductionEffect<unknown>(2, (a, b) => {
            calls++
            return [a, b]
        })

        assert.throws(
            () => reducer.apply(ctx),
            /Production stack underflow: required=2, available=1/
        )
        assert.equal(calls, 0)
        assert.deepEqual(ctx.productionManager.stack, ['previous'])
    })

    test('direct ProductionManager.produce does not silently truncate missing arguments', () => {
        const ctx = new Context<unknown>('')
        ctx.productionManager.append('previous')
        let calls = 0

        assert.throws(
            () => ctx.productionManager.produce(0, (a, b) => {
                calls++
                return [a, b]
            }, 2),
            /Production stack underflow: required=2, available=1/
        )
        assert.equal(calls, 0)
        assert.deepEqual(ctx.productionManager.stack, ['previous'])
    })

    test('a DSL keyword with no producer cannot satisfy a two-argument semantic action', () => {
        // A bare token recognizes text but does not emit a semantic value.
        // This is the case when a keyword decorator is applied to only one
        // branch of a choice instead of the entire alternative group.
        const keyword = wordIs<unknown>('music')
        const value = productT(wordIs<unknown>('x'))
        const parser = productNT(sequence(keyword, value), (fn, param) => [fn, param])
        const ctx = new Context<unknown>('musicx')

        assert.equal(parser.parse(ctx), Result.Parsed)
        assert.throws(
            () => parser.build(ctx),
            /Production stack underflow: required=2, available=1/
        )
        assert.deepEqual(ctx.productionManager.stack, ['x'])
    })

    test('the same DSL action succeeds when the keyword emits a value', () => {
        const keyword = productT(wordIs<unknown>('music'))
        const value = productT(wordIs<unknown>('x'))
        const parser = productNT(sequence(keyword, value), (fn, param) => [fn, param])
        const ctx = new Context<unknown>('musicx')

        assert.equal(parser.parse(ctx), Result.Parsed)
        parser.build(ctx)
        assert.deepEqual(ctx.productionManager.stack, [['music', 'x']])
    })

    for (const [source, expected] of [
        ['a', ['a']],
        ['a,b', ['a', 'b']],
        ['aba', ['a', 'b', 'a']],
        ['a,b,a', ['a', 'b', 'a']],
    ] as const) {
        test(`a left fold with optional produced separators preserves all params: ${source}`, () => {
            const item = choice(productT(wordIs<string>('a')), productT(wordIs<string>('b')))
            const comma = productT(wordIs<string>(','))
            // Rest arity includes the group-local values and one preceding
            // accumulator (the leading fixed argument). Separator is optional.
            const step = productNT(
                sequence(optional(comma), item),
                (acc: unknown, ...tail: unknown[]) => (acc as string[]).concat(tail.at(-1) as string)
            )
            const params = sequence(
                productNT(item, (first: string) => [first]),
                optional(repeat(step))
            )
            const ctx = new Context<unknown>(source)

            assert.equal(params.parse(ctx), Result.Parsed)
            params.build(ctx)
            assert.deepEqual(ctx.productionManager.stack, [expected])
        })
    }
})
