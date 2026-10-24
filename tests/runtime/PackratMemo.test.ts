import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { Context, ParsemDecorator, ProductT, Result, Token, TokenType, choice, expression, sequence, wordIs } from '../../index.ts'
import { PushValueProductionEffect } from '../../src/runtime/manager/ProductionEffectJournal.ts'
import { ReadSymbolInstruction, type SymbolInstruction } from '../../src/runtime/manager/SymbolEffectJournal.ts'

type MemoEntry = NonNullable<ReturnType<Context<string>['memoizerHandler']['search']>>

function memoEntry(res: Result, newPos: number, symbolEffects: SymbolInstruction<string>[] = []): MemoEntry {
    return { res, newPos, symbolEffects, instructionsDelta: [] }
}

describe('Packrat memo table invariants', () => {

    test('a missing memo entry is distinct from all completed statuses', () => {
        const ctx = new Context<string>('a')
        const parsem = expression<string>()
        parsem.ref = wordIs<string>('a')

        assert.strictEqual(ctx.memoizerHandler.search(0, parsem), undefined)
        assert.strictEqual(ctx.memoizerHandler.search(1, parsem), undefined)
    })

    for (const result of [Result.Parsed, Result.NotParsed, Result.Continue]) {
        test(`the memo table retains ${result} without changing the parsing state`, () => {
            const ctx = new Context<string>('a')
            const parsem = expression<string>()
            parsem.ref = wordIs<string>('a')
            const entry = memoEntry(result, result === Result.Parsed ? 1 : 0)

            ctx.memoizerHandler.memoize(0, parsem, entry)

            assert.deepStrictEqual(ctx.memoizerHandler.search(0, parsem), entry)
            assert.strictEqual(ctx.sourceManager.pos, 0)
            assert.deepStrictEqual(ctx.tokenManager.tokens, [])
            assert.deepStrictEqual(ctx.productionManager.stack, [])
            assert.strictEqual(ctx.symbolManager.pos, 0)
        })
    }

    test('memo entries at different positions and under different keys stay independent', () => {
        const ctx = new Context<string>('ab')
        const parsem = expression<string>()
        parsem.ref = wordIs<string>('a')
        const otherParsem = expression<string>()
        otherParsem.ref = wordIs<string>('a')
        const first = memoEntry(Result.Parsed, 1)
        const second = memoEntry(Result.NotParsed, 1)
        const other = memoEntry(Result.Continue, 0)

        assert.strictEqual(parsem.constructor, otherParsem.constructor)
        assert.strictEqual(parsem.toString(), otherParsem.toString())
        assert.notStrictEqual(parsem, otherParsem)

        ctx.memoizerHandler.memoize(0, parsem, first)
        ctx.memoizerHandler.memoize(1, parsem, second)
        ctx.memoizerHandler.memoize(0, otherParsem, other)

        assert.deepStrictEqual(ctx.memoizerHandler.search(0, parsem), first)
        assert.deepStrictEqual(ctx.memoizerHandler.search(1, parsem), second)
        assert.deepStrictEqual(ctx.memoizerHandler.search(0, otherParsem), other)
        assert.strictEqual(ctx.memoizerHandler.search(1, otherParsem), undefined)
    })

    test('replacing one memo entry preserves neighboring positions and keys', () => {
        const ctx = new Context<string>('ab')
        const parsem = expression<string>()
        parsem.ref = wordIs<string>('a')
        const otherParsem = expression<string>()
        otherParsem.ref = wordIs<string>('a')
        const neighbor = memoEntry(Result.Continue, 1)
        const other = memoEntry(Result.NotParsed, 0)
        const replacement = memoEntry(Result.NotParsed, 0)
        ctx.memoizerHandler.memoize(0, parsem, memoEntry(Result.Parsed, 1))
        ctx.memoizerHandler.memoize(1, parsem, neighbor)
        ctx.memoizerHandler.memoize(0, otherParsem, other)

        ctx.memoizerHandler.memoize(0, parsem, replacement)

        assert.deepStrictEqual(ctx.memoizerHandler.search(0, parsem), replacement)
        assert.deepStrictEqual(ctx.memoizerHandler.search(1, parsem), neighbor)
        assert.deepStrictEqual(ctx.memoizerHandler.search(0, otherParsem), other)
    })

    test('memo entries do not leak into another context, even with the same source', () => {
        const first = new Context<string>('a')
        const sameSource = new Context<string>('a')
        const otherSource = new Context<string>('b')
        const parsem = expression<string>()
        parsem.ref = wordIs<string>('a')
        const success = memoEntry(Result.Parsed, 1)
        first.memoizerHandler.memoize(0, parsem, success)

        assert.strictEqual(sameSource.memoizerHandler.search(0, parsem), undefined)
        assert.strictEqual(otherSource.memoizerHandler.search(0, parsem), undefined)
        otherSource.memoizerHandler.memoize(0, parsem, memoEntry(Result.NotParsed, 0))
        assert.deepStrictEqual(first.memoizerHandler.search(0, parsem), success)
        assert.strictEqual(sameSource.memoizerHandler.search(0, parsem), undefined)
    })

    test('EOF is a valid memo position, including position zero in empty input', () => {
        for (const source of ['', 'a']) {
            const ctx = new Context<string>(source)
            const parsem = expression<string>()
            parsem.ref = wordIs<string>('a')
            ctx.sourceManager.pos = source.length
            const entry = memoEntry(Result.Continue, source.length)

            ctx.memoizerHandler.memoize(ctx.sourceManager.pos, parsem, entry)

            assert.deepStrictEqual(ctx.memoizerHandler.search(ctx.sourceManager.pos, parsem), entry)
            assert.strictEqual(ctx.sourceManager.current, null)
            assert.strictEqual(ctx.sourceManager.pos, source.length)
            assert.deepStrictEqual(ctx.tokenManager.tokens, [])
            assert.deepStrictEqual(ctx.productionManager.stack, [])
        }
    })

    test('alternative rollback restores parsing state while retaining recognition entries', () => {
        const ctx = new Context<string>('a')
        const parsem = expression<string>()
        parsem.ref = wordIs<string>('a')
        const entry = memoEntry(Result.Parsed, 1)

        const result = ctx.backtrackingHandler.handle(current => {
            current.next()
            current.productionEffectJournal.append(new PushValueProductionEffect('discarded'))
            current.memoizerHandler.memoize(0, parsem, entry)

            return Result.NotParsed
        })

        assert.strictEqual(result, Result.NotParsed)
        assert.strictEqual(ctx.sourceManager.pos, 0)
        assert.deepStrictEqual(ctx.tokenManager.tokens, [])
        assert.deepStrictEqual(ctx.productionManager.stack, [])
        assert.strictEqual(ctx.productionEffectJournal.length, 0)
        assert.deepStrictEqual(ctx.memoizerHandler.search(0, parsem), entry)
    })

    test('memo access leaves an active capture and preceding semantic values intact', () => {
        const ctx = new Context<string>('ab')
        const parsem = expression<string>()
        parsem.ref = wordIs<string>('a')
        ctx.productionManager.append('prefix')
        const entry = memoEntry(Result.Parsed, 1)

        const result = ProductT.handleProduction(ctx, current => {
            current.next()
            current.memoizerHandler.memoize(0, parsem, entry)

            assert.deepStrictEqual(current.memoizerHandler.search(0, parsem), entry)
            assert.strictEqual(current.sourceManager.pos, 1)
            assert.strictEqual(current.symbolManager.pos, 1)
            assert.strictEqual(current.symbolManager.builderPos, 1)
            assert.deepStrictEqual(current.productionManager.stack, ['prefix'])
            assert.deepStrictEqual(current.tokenManager.tokens, [])
            current.next()

            return Result.Parsed
        }, value => value, TokenType.STRING)

        assert.strictEqual(result, Result.Parsed)
        assert.strictEqual(ctx.sourceManager.pos, 2)
        assert.deepStrictEqual(ctx.productionManager.stack, ['prefix'])
        assert.strictEqual(ctx.productionEffectJournal.length, 1)
        ctx.productionEffectJournal.apply(ctx)
        assert.deepStrictEqual(ctx.productionManager.result, ['prefix', 'ab'])
        assert.deepStrictEqual(ctx.tokenManager.tokens, [new Token('ab', 0, TokenType.STRING)])
        assert.strictEqual(ctx.symbolManager.pos, 0)
    })
})

describe('Packrat handler integration invariants', () => {

    for (const positions of [[0, 1, 2, 3], [1, 2, 3]]) {
        test(`automatic purge retains reachable positions with initial entries ${positions}`, () => {
            const ctx = new Context<string>('abcd')
            const stored = wordIs<string>('a')
            const trigger = wordIs<string>('b')
            for (const position of positions)
                ctx.memoizerHandler.memoize(position, stored, memoEntry(Result.Continue, position))

            ctx.sourceManager.pos = 2
            assert.strictEqual(ctx.memoizerHandler.handle(trigger,
                current => current.backtrackingHandler.handle(() => Result.Continue)), Result.Continue)

            for (const position of positions)
                assert.strictEqual(ctx.memoizerHandler.search(position, stored) !== undefined, position >= 2)
            assert.ok(ctx.memoizerHandler.search(2, trigger))
        })
    }

    test('alternative rollback retains a shared rule at a nonzero offset', () => {
        class Counted extends ParsemDecorator<string> {
            calls = 0
            parse(ctx: Context<string>): Result {
                this.calls++
                return this.decorated.parse(ctx)
            }
            toString(): string { return this.decorated.toString() }
        }
        const shared = new Counted(wordIs<string>('b'))
        const parser = sequence(wordIs<string>('a'), choice(
            sequence(choice(shared), wordIs<string>('x')),
            sequence(choice(shared), wordIs<string>('c'))
        ))
        const ctx = new Context<string>('abc')

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.strictEqual(ctx.sourceManager.pos, 3)
        assert.strictEqual(shared.calls, 1)
        assert.deepStrictEqual(ctx.tokenManager.tokens.map(token => token.symbol), ['a', 'b', 'c'])
    })

    for (const expected of [Result.Parsed, Result.NotParsed, Result.Continue]) {
        test(`MemoizerHandler.handle caches ${expected} and restores its final position without evaluating twice`, () => {
            const ctx = new Context<string>('a')
            const parsem = expression<string>()
            parsem.ref = wordIs<string>('a')
            const finalPos = expected === Result.Parsed ? 1 : 0
            let calls = 0

            const evaluate = (current: Context<string>) => {
                calls++
                if (expected === Result.Parsed) current.next()

                return expected
            }

            const result = ctx.memoizerHandler.handle(parsem, evaluate)

            assert.strictEqual(result, expected)
            assert.strictEqual(calls, 1)
            assert.strictEqual(ctx.sourceManager.pos, finalPos)
            const tokens = expected === Result.Parsed ? [new Token('a', 0, TokenType.DEFAULT)] : []
            const memo = ctx.memoizerHandler.search(0, parsem)
            assert.ok(memo)
            const symbolEffects = expected === Result.Parsed ? [new ReadSymbolInstruction<string>(0, 1)] : []
            assert.deepStrictEqual({ ...memo, instructionsDelta: Array.from(memo.instructionsDelta) }, memoEntry(expected, finalPos, symbolEffects))
            assert.strictEqual(ctx.symbolEffectJournal.length, 0)

            ctx.sourceManager.pos = 0
            ctx.tokenManager.pos = 0
            assert.strictEqual(ctx.memoizerHandler.handle(parsem, evaluate), expected)
            assert.strictEqual(calls, 1)
            assert.strictEqual(ctx.sourceManager.pos, finalPos)
            assert.deepStrictEqual(ctx.tokenManager.tokens, tokens)
        })
    }

    test('cache misses distinguish parser instances and starting positions', () => {
        const ctx = new Context<string>('aa')
        const first = expression<string>()
        first.ref = wordIs<string>('a')
        const second = expression<string>()
        second.ref = wordIs<string>('a')
        let calls = 0
        const evaluate = (current: Context<string>) => {
            calls++
            return wordIs<string>('a').parse(current)
        }

        assert.strictEqual(first.constructor, second.constructor)
        assert.strictEqual(first.toString(), second.toString())

        // Keep position zero reachable while checking cached entries.
        ctx.backtrackingHandler.handle(() => {
            assert.strictEqual(ctx.memoizerHandler.handle(first, evaluate), Result.Parsed)
            assert.strictEqual(ctx.sourceManager.pos, 1)
            assert.strictEqual(ctx.memoizerHandler.handle(first, evaluate), Result.Parsed)
            assert.strictEqual(ctx.sourceManager.pos, 2)
            ctx.sourceManager.pos = 0
            assert.strictEqual(ctx.memoizerHandler.handle(second, evaluate), Result.Parsed)
            assert.strictEqual(ctx.sourceManager.pos, 1)
            assert.strictEqual(calls, 3)

            for (const [parsem, startPos] of [[first, 0], [first, 1], [second, 0]] as const) {
                ctx.sourceManager.pos = startPos
                assert.strictEqual(ctx.memoizerHandler.handle(parsem, evaluate), Result.Parsed)
                assert.strictEqual(ctx.sourceManager.pos, startPos + 1)
            }
            assert.strictEqual(calls, 3)
            return Result.Parsed
        })
    })

    test('the same parser is evaluated separately in every context', () => {
        const parsem = expression<string>()
        parsem.ref = wordIs<string>('a')
        const contexts = [new Context<string>('a'), new Context<string>('a'), new Context<string>('b')]
        const expected = [Result.Parsed, Result.Parsed, Result.NotParsed]
        let calls = 0
        const evaluate = (current: Context<string>) => {
            calls++
            return parsem.parse(current)
        }

        contexts.forEach((ctx, index) => {
            assert.strictEqual(ctx.memoizerHandler.handle(parsem, evaluate), expected[index])
            assert.strictEqual(ctx.sourceManager.pos, expected[index] === Result.Parsed ? 1 : 0)
        })
        assert.strictEqual(calls, contexts.length)

        contexts.forEach((ctx, index) => {
            ctx.sourceManager.pos = 0
            assert.strictEqual(ctx.memoizerHandler.handle(parsem, evaluate), expected[index])
            assert.strictEqual(ctx.sourceManager.pos, expected[index] === Result.Parsed ? 1 : 0)
        })
        assert.strictEqual(calls, contexts.length)
    })

    test('an evaluation that throws does not create a completed memo entry', () => {
        const ctx = new Context<string>('a')
        const parsem = expression<string>()
        parsem.ref = wordIs<string>('a')
        const failure = new Error('producer failed')
        let calls = 0

        assert.throws(() => ctx.memoizerHandler.handle(parsem, current => {
            calls++
            current.next()
            throw failure
        }), error => error === failure)
        assert.strictEqual(calls, 1)
        assert.strictEqual(ctx.memoizerHandler.search(0, parsem), undefined)
        assert.strictEqual(ctx.symbolEffectJournal.length, 0)

        ctx.sourceManager.pos = 0
        ctx.tokenManager.pos = 0
        assert.strictEqual(ctx.memoizerHandler.handle(parsem, current => {
            calls++
            return parsem.parse(current)
        }), Result.Parsed)
        assert.strictEqual(calls, 2)
        assert.strictEqual(ctx.sourceManager.pos, 1)
        const memo = ctx.memoizerHandler.search(0, parsem)
        assert.ok(memo)
        assert.deepStrictEqual({ ...memo, instructionsDelta: Array.from(memo.instructionsDelta) }, memoEntry(Result.Parsed, 1, [new ReadSymbolInstruction<string>(0, 1)]))
        assert.strictEqual(ctx.symbolEffectJournal.length, 0)
    })

    test('a memo entry ending before its starting position is rejected without rewinding', () => {
        const ctx = new Context<string>('ab')
        const parsem = expression<string>()
        parsem.ref = wordIs<string>('a')
        ctx.next()
        ctx.productionManager.append('prefix')
        ctx.memoizerHandler.memoize(1, parsem, {
            ...memoEntry(Result.Parsed, 0, [new ReadSymbolInstruction<string>(1, 2)]),
            instructionsDelta: [new PushValueProductionEffect('invalid')]
        })
        const tokens = ctx.tokenManager.tokens
        let calls = 0

        assert.throws(() => ctx.memoizerHandler.handle(parsem, () => {
            calls++
            return Result.Parsed
        }), /Corrupted memo/)
        assert.strictEqual(calls, 0)
        assert.strictEqual(ctx.sourceManager.pos, 1)
        assert.deepStrictEqual(ctx.tokenManager.tokens, tokens)
        assert.deepStrictEqual(ctx.productionManager.stack, ['prefix'])
        assert.strictEqual(ctx.productionEffectJournal.length, 0)
    })
})
