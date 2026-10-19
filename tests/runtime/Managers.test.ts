import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
    BuilderManager,
    Context,
    ProductionManager,
    Result,
    SourceManager,
    Token,
    TokenManager,
    TokenType,
    choice,
    productT,
    sequence,
    wordIs
} from '../../index.ts'

describe('Context managers', () => {

    test('exposes parsed state through managers and the existing Context API', () => {
        const ctx = new Context<string>('abc')
        const parser = productT(wordIs<string>('ab'), value => value)

        assert.ok(ctx.sourceManager instanceof SourceManager)
        assert.ok(ctx.tokenManager instanceof TokenManager)
        assert.ok(ctx.builderManager instanceof BuilderManager)
        assert.ok(ctx.productionManager instanceof ProductionManager)
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.strictEqual(ctx.sourceManager.pos, ctx.pos)
        assert.strictEqual(ctx.sourceManager.current, 'c')
        assert.strictEqual(ctx.enhancedSource, 'ab[c]')
        assert.deepStrictEqual(ctx.tokenManager.tokens, [new Token('ab', 0)])
        assert.deepStrictEqual(ctx.productionManager.stack, ['ab'])
        assert.strictEqual(ctx.builderManager.pos, 0)
        assert.throws(() => ctx.result, /Source not completelly parsed/)

        ctx.next()
        ctx.next()

        assert.strictEqual(ctx.pos, 3)
        assert.strictEqual(ctx.current, null)
        assert.strictEqual(ctx.result, 'ab')
        assert.deepStrictEqual(ctx.tokens, [
            new Token('ab', 0),
            new Token('c', 2, TokenType.DEFAULT)
        ])

        ctx.tokens.pop()
        ctx.stack.pop()
        assert.strictEqual(ctx.tokenManager.pos, 2)
        assert.strictEqual(ctx.productionManager.pos, 1)
    })

    test('rolls back a failed nested capture without losing the enclosing capture', () => {
        const parser = productT(sequence(
            wordIs<string>('x'),
            choice(
                sequence(productT(wordIs<string>('a'), value => value), wordIs<string>('b')),
                wordIs<string>('ac')
            )
        ), value => value).type(TokenType.STRING)
        const ctx = new Context<string>('xac')

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.strictEqual(ctx.sourceManager.pos, 3)
        assert.strictEqual(ctx.sourceManager.current, null)
        assert.strictEqual(ctx.builderManager.pos, 0)
        assert.deepStrictEqual(ctx.tokenManager.tokens, [new Token('xac', 0, TokenType.STRING)])
        assert.deepStrictEqual(ctx.productionManager.stack, ['xac'])
        assert.strictEqual(ctx.uniqueResult, 'xac')
    })

    test('keeps manager state isolated when a producer parses another context', () => {
        const inner = new Context<string>('xy')
        const innerParser = productT(wordIs<string>('xy'), value => value)
        const outerParser = productT(wordIs<string>('ab'), value => {
            assert.strictEqual(innerParser.parse(inner), Result.Parsed)
            return value
        })
        const outer = new Context<string>('ab')

        assert.strictEqual(outerParser.parse(outer), Result.Parsed)
        assert.strictEqual(outer.result, 'ab')
        assert.strictEqual(inner.result, 'xy')
        assert.deepStrictEqual(outer.tokenManager.tokens, [new Token('ab', 0)])
        assert.deepStrictEqual(inner.tokenManager.tokens, [new Token('xy', 0)])
        assert.strictEqual(outer.builderManager.pos, 0)
        assert.strictEqual(inner.builderManager.pos, 0)
    })

})
