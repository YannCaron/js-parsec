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

describe('development test', () => {

    test('non-terminal actions receive produced values in source order', () => {
        const digit =
            choice(
                sequence(
                    productT(wordIs<string>('1'), v => 'a'),
                    productT(wordIs<string>('2'), v => 'b')
                ),
                sequence(
                    productT(wordIs<string>('1'), v => 'c'),
                    productT(wordIs<string>('3'), v => 'd')
                )
            )

        const parser = digit
        const ctx = new Context<string>('13')

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.deepStrictEqual(ctx.stack, ['c', 'd'])
    })

})