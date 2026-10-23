import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
    Context,
    Result,
    charIn,
    sequence,
    wordIs
} from '../index.ts'

describe('basic wordIs', () => {

    const parser = sequence(wordIs("hi"), charIn(' '), wordIs('world'))

    test('wordIs should parse "hi world"', () => {
        const ctx = new Context("hi world")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.strictEqual(ctx.sourceManager.pos, 8)
    })

    test('a failed word restores its own position without rolling back the preceding sequence', () => {
        const ctx = new Context("hi wurld")
        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
        assert.strictEqual(ctx.sourceManager.pos, 3)
        assert.deepStrictEqual(ctx.tokenManager.tokens.map(token => token.symbol), ['h', 'i', ' '])
        assert.deepStrictEqual(ctx.productionManager.stack, [])
    })
    
    test('wordIs to string', () => {
        assert.strictEqual(parser.toString(), `("hi" [ ] "world")`)
    })
    
    test('wordIs should not parse ""', () => {
        const p = wordIs("")
        const ctx = new Context("")

        assert.strictEqual(p.parse(ctx), Result.Continue)
    })

})
