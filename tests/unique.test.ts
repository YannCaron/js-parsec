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
        const parser =
            sequence(
                choice(
                    sequence(
                        productT(wordIs('1'), () => 'a'),
                        productT(wordIs('2'), () => 'b')
                    ),
                    sequence(
                        productT(wordIs('1'), () => 'c'),
                        productT(wordIs('3'), () => 'd')
                    )
                ),
                productT(wordIs('4'), () => 'e')
            )

        const ctx = new Context('134')

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.deepStrictEqual(ctx.stack, ['c', 'd', 'e'])
    })

})