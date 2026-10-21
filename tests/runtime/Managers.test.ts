import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
    Context,
    ProductionManager,
    Result,
    SourceManager,
    SymbolManager,
    Token,
    TokenManager,
    TokenType,
    choice,
    productT,
    sequence,
    wordIs
} from '../../index.ts'

describe('Context managers', () => {

    // TODO: @Codex, align it with the new managers topology
    test('exposes parsed state only through the four manager accessors', () => {
        const ctx = new Context<string>('abc')
        const parser = productT(wordIs<string>('ab'), value => value)

        assert.ok(ctx.sourceManager instanceof SourceManager)
        assert.ok(ctx.tokenManager instanceof TokenManager)
        assert.ok(ctx.symbolManager instanceof SymbolManager)
        assert.ok(ctx.productionManager instanceof ProductionManager)
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        parser.build(ctx)
        const accessors = Object.entries(Object.getOwnPropertyDescriptors(Context.prototype))
            .filter(([, descriptor]) => descriptor.get || descriptor.set)
            .map(([name]) => name).sort()

        assert.deepStrictEqual(accessors, ['symbolManager', 'productionManager', 'sourceManager', 'tokenManager'])
        assert.strictEqual(ctx.sourceManager.pos, 2)
        assert.strictEqual(ctx.sourceManager.current, 'c')
        assert.strictEqual(ctx.sourceManager.enhancedSource, 'ab[c]')
        assert.deepStrictEqual(ctx.tokenManager.tokens, [new Token('ab', 0)])
        assert.deepStrictEqual(ctx.productionManager.stack, ['ab'])
        assert.strictEqual(ctx.symbolManager.pos, 0)
        assert.throws(() => ctx.productionManager.result, /Source not completelly parsed/)

        ctx.next()
        ctx.next()

        assert.strictEqual(ctx.sourceManager.pos, 3)
        assert.strictEqual(ctx.sourceManager.current, null)
        assert.strictEqual(ctx.productionManager.result, 'ab')
        assert.deepStrictEqual(ctx.tokenManager.tokens, [
            new Token('ab', 0),
            new Token('c', 2, TokenType.DEFAULT)
        ])

        ctx.tokenManager.tokens.pop()
        ctx.productionManager.stack.pop()
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
        parser.build(ctx)
        assert.strictEqual(ctx.sourceManager.pos, 3)
        assert.strictEqual(ctx.sourceManager.current, null)
        assert.strictEqual(ctx.symbolManager.pos, 0)
        assert.deepStrictEqual(ctx.tokenManager.tokens, [new Token('xac', 0, TokenType.STRING)])
        assert.deepStrictEqual(ctx.productionManager.stack, ['xac'])
        assert.strictEqual(ctx.productionManager.uniqueResult, 'xac')
    })

    test('keeps manager state isolated when a producer parses another context', () => {
        const inner = new Context<string>('xy')
        const innerParser = productT(wordIs<string>('xy'), value => value)
        const outerParser = productT(wordIs<string>('ab'), value => {
            assert.strictEqual(innerParser.parse(inner), Result.Parsed)
            innerParser.build(inner)
            return value
        })
        const outer = new Context<string>('ab')

        assert.strictEqual(outerParser.parse(outer), Result.Parsed)
        outerParser.build(outer)
        assert.strictEqual(outer.productionManager.result, 'ab')
        assert.strictEqual(inner.productionManager.result, 'xy')
        assert.deepStrictEqual(outer.tokenManager.tokens, [new Token('ab', 0)])
        assert.deepStrictEqual(inner.tokenManager.tokens, [new Token('xy', 0)])
        assert.strictEqual(outer.symbolManager.pos, 0)
        assert.strictEqual(inner.symbolManager.pos, 0)
    })

})
