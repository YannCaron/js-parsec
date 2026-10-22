import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Context, Result, Token, TokenType, choice, productT, sequence, wordIs } from '../../index.ts'

test('memoizer exposes its owning context', () => {
    const ctx = new Context<string>('a')

    assert.strictEqual(ctx.memoizerHandler.ctx, ctx)
})

test('memoized terminal productions replay tokens and deferred instructions after backtracking', () => {
    const shared = choice(productT(wordIs<string>('a')).type(TokenType.STRING))
    const parser = choice(
        sequence(shared, wordIs<string>('b')),
        sequence(shared, wordIs<string>('c'))
    )
    const ctx = new Context<string>('ac')

    assert.strictEqual(parser.parse(ctx), Result.Parsed)
    assert.deepStrictEqual(ctx.tokenManager.tokens, [new Token('a', 0, TokenType.STRING), new Token('c', 1, TokenType.DEFAULT)])
    assert.strictEqual(ctx.productionManager.pos, 0)
    assert.strictEqual(ctx.instructionTapeManager.length, 1)

    parser.build(ctx)
    assert.strictEqual(ctx.productionManager.result, 'a')
})

test('memoized recognition replays each character token without creating productions', () => {
    const shared = choice(wordIs<string>('ab'))
    const parser = choice(
        sequence(shared, wordIs<string>('x')),
        sequence(shared, wordIs<string>('c'))
    )
    const ctx = new Context<string>('abc')

    assert.strictEqual(parser.parse(ctx), Result.Parsed)
    assert.deepStrictEqual(ctx.tokenManager.tokens, [
        new Token('a', 0, TokenType.DEFAULT),
        new Token('b', 1, TokenType.DEFAULT),
        new Token('c', 2, TokenType.DEFAULT)
    ])
    assert.strictEqual(ctx.instructionTapeManager.length, 0)
})
