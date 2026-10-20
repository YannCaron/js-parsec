import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
    Context,
    Parsem,
    Result,
    Token,
    TokenType,
    choice,
    expression,
    optional,
    productNT,
    productT,
    repeat,
    sequence,
    wordIs
} from '../index.ts'

function parseUnderTest<T>(parser: Parsem<T>, ctx: Context<T>): Result {
    return parser.parse(ctx)
}

describe('development test', () => {

    test('unique test', () => {
        /*
        const pair = choice(expression(productNT(sequence(
            productT(wordIs<unknown>('a'), value => value),
            productT(wordIs<unknown>('b'), value => value)
        ), (...values) => values)))
        
        const parser = sequence(
            productT(wordIs<unknown>('1'), () => 1),
            choice(sequence(pair, wordIs<unknown>('x')), sequence(pair, wordIs<unknown>('c')))
        )

        const parser = choice(
            ), 
            wordIs('a').productT().then(wordIs('c').productT())).productNT((... v) => v)
            */

        const parser = wordIs('a').productT().then(wordIs('b').productT())

        const ctx = new Context<String>('ab')

        assert.strictEqual(parseUnderTest(parser, ctx), Result.Parsed)
        assert.strictEqual(ctx.pos, 2)

        console.log(ctx.result);
        assert.deepStrictEqual(ctx.result, ['a', 'b'])
    })

})