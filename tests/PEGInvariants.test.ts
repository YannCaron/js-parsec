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

describe('PEG invariants', () => {

    test('ordered choice commits to the first consuming alternative', () => {
        const parser = choice(
            productT(wordIs<string>('x'), () => 'first'),
            productT(wordIs<string>('x'), () => 'second')
        )
        const ctx = new Context<string>('x')

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        parser.build(ctx)

        assert.strictEqual(ctx.sourceManager.pos, 1)
        assert.deepStrictEqual(ctx.productionManager.stack, ['first'])
    })

    test('a partially matched alternative restores position, tokens and produced values', () => {
        const a = productT(wordIs<string>('a'), value => value).type(TokenType.STRING)
        const parser = choice(
            productNT(sequence(a, wordIs<string>('b')), value => `${value}b`, 1),
            productNT(sequence(a, wordIs<string>('c')), value => `${value}c`, 1)
        )
        const ctx = new Context<string>('ac')

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        parser.build(ctx)

        assert.strictEqual(ctx.sourceManager.pos, 2)
        assert.deepStrictEqual(ctx.productionManager.stack, ['ac'])
        assert.deepStrictEqual(ctx.tokenManager.tokens, [
            new Token('a', 0, TokenType.STRING),
            new Token('c', 1, TokenType.PUNCTUATION)
        ])
    })

    test('backtracking restores values consumed by a semantic action', () => {
        const number = productT(wordIs<unknown>('1'), () => 1).type(TokenType.NUMBER)
        const letter = productT(wordIs<unknown>('a'), value => value).type(TokenType.STRING)
        const consumingAction = productNT(letter, (left, right) => `${left}${right}`, 2)
        const preservingAction = productNT(
            sequence(letter, wordIs<unknown>('c')),
            (left, right) => [left, right],
            2
        )
        const parser = sequence(
            number,
            choice(
                sequence(consumingAction, wordIs<unknown>('b')),
                preservingAction
            )
        )
        const ctx = new Context<unknown>('1ac')

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        parser.build(ctx)

        assert.strictEqual(ctx.sourceManager.pos, 3)
        assert.deepStrictEqual(ctx.productionManager.stack, [[1, 'a']])
        assert.deepStrictEqual(ctx.tokenManager.tokens, [
            new Token('1', 0, TokenType.NUMBER),
            new Token('a', 1, TokenType.STRING),
            new Token('c', 2, TokenType.PUNCTUATION)
        ])
    })

    test('terminal capture contains only the successful alternative', () => {
        const parser = productT(
            choice(
                sequence(wordIs<string>('a'), wordIs<string>('b')),
                sequence(wordIs<string>('a'), wordIs<string>('c'))
            ),
            value => value
        ).type(TokenType.STRING)
        const ctx = new Context<string>('ac')

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        parser.build(ctx)

        assert.deepStrictEqual(ctx.productionManager.stack, ['ac'])
        assert.deepStrictEqual(ctx.tokenManager.tokens, [new Token('ac', 0, TokenType.STRING)])
    })

    test('an absent optional expression is zero-width and leaves no state behind', () => {
        const parser = optional(sequence(
            productT(wordIs<string>('a'), value => value).type(TokenType.STRING),
            wordIs<string>('b')
        ))
        const ctx = new Context<string>('ac')

        assert.strictEqual(parser.parse(ctx), Result.Continue)
        parser.build(ctx)

        assert.strictEqual(ctx.sourceManager.pos, 0)
        assert.deepStrictEqual(ctx.productionManager.stack, [])
        assert.deepStrictEqual(ctx.tokenManager.tokens, [])
    })

    test('greedy repetition rolls back its final failed iteration', () => {
        const pair = sequence(
            productT(wordIs<string>('a'), value => value).type(TokenType.STRING),
            wordIs<string>('b')
        )
        const parser = repeat(pair)
        const ctx = new Context<string>('abac')

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        parser.build(ctx)

        assert.strictEqual(ctx.sourceManager.pos, 2)
        assert.strictEqual(ctx.sourceManager.current, 'a')
        assert.deepStrictEqual(ctx.productionManager.stack, ['a'])
        assert.deepStrictEqual(ctx.tokenManager.tokens, [
            new Token('a', 0, TokenType.STRING),
            new Token('b', 1, TokenType.PUNCTUATION)
        ])
    })

    test('repetition rejects a successful expression that consumes no source', () => {
        class EmptySuccess extends Parsem<never> {
            parse(): Result { return Result.Parsed }
            toString(): string { return 'empty-success' }
        }
        const parser = repeat(new EmptySuccess())

        const ctx = new Context<never>('x')

        assert.throws(() => parser.parse(ctx), /Infinite loop/)
        parser.build(ctx)

        assert.strictEqual(ctx.sourceManager.pos, 0)
        assert.deepStrictEqual(ctx.productionManager.stack, [])
        assert.deepStrictEqual(ctx.tokenManager.tokens, [])
    })

    test('right recursion consumes deterministically and terminates', () => {
        const recursive = expression()
        recursive.ref = choice(
            sequence(wordIs('a'), recursive),
            wordIs('b')
        )
        const ctx = new Context('aaab')

        assert.strictEqual(recursive.parse(ctx), Result.Parsed)
        recursive.build(ctx)

        assert.strictEqual(ctx.sourceManager.pos, 4)
        assert.doesNotThrow(() => ctx.productionManager.result)
    })

    test('non-terminal actions receive produced values in source order', () => {
        const digit = productT(
            wordIs<number>('1'),
            value => Number(value)
        ).or(
            productT(wordIs<number>('2'), value => Number(value)),
            productT(wordIs<number>('3'), value => Number(value))
        )
        const parser = productNT(
            sequence(digit, digit, digit),
            (...tail) => [...tail]
        )
        const ctx = new Context<number | number[]>('123')

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        parser.build(ctx)

        assert.deepStrictEqual(ctx.productionManager.stack, [[1, 2, 3]])
    })

    for (const [name, value] of [
        ['zero', 0],
        ['false', false],
        ['empty string', ''],
        ['null', null]
    ] as const) {
        test(`terminal actions preserve ${name}`, () => {
            const parser = productT(wordIs<unknown>('x'), () => value)
            const ctx = new Context<unknown>('x')

            assert.strictEqual(parser.parse(ctx), Result.Parsed)
            parser.build(ctx)

            assert.deepStrictEqual(ctx.productionManager.stack, [value])
        })
    }

    test('a successful prefix is not a successful complete parse', () => {
        const parser = wordIs('a')
        const ctx = new Context('ab')

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        parser.build(ctx)
        
        assert.strictEqual(ctx.sourceManager.pos, 1)
        assert.throws(() => ctx.productionManager.result, /Source not completelly parsed/)
    })
})
