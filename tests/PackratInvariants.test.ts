import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
    Context,
    Parsem,
    ParsemDecorator,
    Result,
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
import { PushAggregatorInstruction, PushValueInstruction } from '../src/runtime/manager/ProductionEffectJournal.ts'

class CountedParsem<T> extends ParsemDecorator<T> {

    readonly evaluations: Array<[Context<T>, number]> = []
    readonly budgetFailure = new Error('Test recognition evaluation budget exceeded')

    constructor(decorated: Parsem<T>, private readonly budget = Infinity) {
        super(decorated)
    }

    parse(ctx: Context<T>): Result {
        if (this.evaluations.length >= this.budget) throw this.budgetFailure

        this.evaluations.push([ctx, ctx.sourceManager.pos])

        return this.decorated.parse(ctx)
    }

    count(ctx: Context<T>, pos: number): number {
        return this.evaluations.filter(([context, position]) => context === ctx && position === pos).length
    }

    toString(): string {
        return this.decorated.toString()
    }
}

type ProductionEntry = { kind: 'value', symbol: string } | { kind: 'aggregate', arity: number }

function productionEntries<T>(ctx: Context<T>): ProductionEntry[] {
    return Array.from(ctx.productionEffectJournal.queue, (instruction): ProductionEntry => {
        if (instruction instanceof PushValueInstruction) {
            return { kind: 'value', symbol: instruction.symbol }
        }

        assert.ok(instruction instanceof PushAggregatorInstruction, 'Unexpected instruction on the production tape')
        return { kind: 'aggregate', arity: instruction.arity }
    })
}

function assertProductionEffects<T>(ctx: Context<T>, expected: ProductionEntry[]): void {
    assert.deepStrictEqual(productionEntries(ctx), expected)
}

function parseUnderTest<T>(parser: Parsem<T>, ctx: Context<T>): Result {
    const res = parser.parse(ctx)
    assert.deepStrictEqual(ctx.productionManager.stack, [], 'Recognition must defer semantic production until build')
    if (res === Result.Parsed) parser.build(ctx)
    return res
}

describe('Packrat recognition memoization invariants', () => {

    test('a successful rule is evaluated once at an offset and replayed after rollback', () => {
        const body = new CountedParsem(wordIs<string>('a'))
        const rule = expression(body)
        const parser = choice(
            sequence(choice(rule), wordIs<string>('b')),
            sequence(choice(rule), wordIs<string>('c'))
        )
        const ctx = new Context<string>('ac')

        assert.strictEqual(parseUnderTest(parser, ctx), Result.Parsed)
        assert.strictEqual(ctx.sourceManager.pos, 2)
        assert.deepStrictEqual(ctx.productionManager.stack, [])
        assertProductionEffects(ctx, [])
        assert.strictEqual(body.count(ctx, 0), 1, 'Successful recognition must survive alternative rollback')
    })

    test('a partially failed rule is evaluated once and leaves no replayed state', () => {
        const body = new CountedParsem(wordIs<string>('ab'))
        const rule = expression(body)
        const parser = choice(rule, rule, wordIs<string>('ac'))
        const ctx = new Context<string>('ac')

        assert.strictEqual(parseUnderTest(parser, ctx), Result.Parsed)
        assert.strictEqual(ctx.sourceManager.pos, 2)
        assert.deepStrictEqual(ctx.productionManager.stack, [])
        assertProductionEffects(ctx, [])
        assert.strictEqual(body.count(ctx, 0), 1, 'NotParsed must be memoized, including partial failures')
    })

    test('Continue is memoized without becoming a consuming success or a failure', () => {
        const body = new CountedParsem(optional(wordIs<string>('z')))
        const rule = expression(body)
        const nullable = optional(rule)
        const parser = choice(
            sequence(nullable, wordIs<string>('x')),
            sequence(nullable, wordIs<string>('b'))
        )
        const ctx = new Context<string>('b')

        assert.strictEqual(parseUnderTest(parser, ctx), Result.Parsed)
        assert.strictEqual(ctx.sourceManager.pos, 1)
        assert.deepStrictEqual(ctx.productionManager.stack, [])
        assertProductionEffects(ctx, [])
        assert.strictEqual(body.count(ctx, 0), 1, 'Continue is a completed memo entry, not an absent entry')
    })

    for (const [name, terminal, expected] of [
        ['Continue', '', Result.Continue],
        ['NotParsed', 'a', Result.NotParsed]
    ] as const) {
        test(`${name} at EOF is evaluated once without advancing or recording instructions`, () => {
            const body = new CountedParsem(wordIs<string>(terminal))
            const rule = expression(body)
            const nullable = optional(rule)
            const parser = name === 'Continue' ? sequence(nullable, nullable) : choice(rule, rule)
            const ctx = new Context<string>('')

            assert.strictEqual(parseUnderTest(parser, ctx), expected)
            assert.strictEqual(ctx.sourceManager.pos, 0)
            assert.strictEqual(ctx.sourceManager.current, null)
            assert.deepStrictEqual(ctx.productionManager.stack, [])
            assertProductionEffects(ctx, [])
            assert.strictEqual(body.count(ctx, 0), 1, 'EOF must be a valid memo position')
        })
    }

    for (const length of [4, 8, 12]) {
        test(`recursive failure performs at most one rule evaluation per offset for ${length} leading characters`, () => {
            const rule = expression<string>()
            const recursiveCall = choice(rule)
            const body = new CountedParsem(choice(
                sequence(wordIs<string>('a'), recursiveCall, wordIs<string>('b')),
                sequence(wordIs<string>('a'), recursiveCall, wordIs<string>('c')),
                wordIs<string>('d')
            ))
            rule.ref = body

            const ctx = new Context<string>('a'.repeat(length) + 'e')

            assert.strictEqual(parseUnderTest(rule, ctx), Result.NotParsed)
            assert.strictEqual(ctx.sourceManager.pos, 0)
            assert.deepStrictEqual(ctx.productionManager.stack, [])
            assertProductionEffects(ctx, [])
            assert.ok(body.evaluations.length <= length + 1,
                `Expected at most ${length + 1} evaluations; observed ${body.evaluations.length}`)

            for (let pos = 0; pos <= length; pos++) {
                assert.strictEqual(body.count(ctx, pos), 1, `Repeated evaluation at offset ${pos}`)
            }
        })
    }
})

describe('Packrat state and semantic compatibility invariants', () => {

    test('a cached production matches an equivalent grammar without rule sharing', () => {
        const grammar = (shared: boolean) => {
            const first = productT(wordIs<string>('a'), value => value).type(TokenType.STRING)
            const second = shared ? first : productT(wordIs<string>('a'), value => value).type(TokenType.STRING)

            return choice(
                sequence(choice(first), wordIs<string>('b')),
                sequence(choice(second), wordIs<string>('c'))
            )
        }
        const reference = new Context<string>('ac')
        const actual = new Context<string>('ac')

        assert.strictEqual(parseUnderTest(grammar(false), reference), Result.Parsed)
        assert.deepStrictEqual(reference.productionManager.stack, ['a'])
        assertProductionEffects(reference, [{ kind: 'value', symbol: 'a' }])

        assert.strictEqual(parseUnderTest(grammar(true), actual), Result.Parsed)
        assert.strictEqual(actual.sourceManager.pos, reference.sourceManager.pos)
        assert.deepStrictEqual(actual.productionManager.stack, reference.productionManager.stack)
        assert.deepStrictEqual(productionEntries(actual), productionEntries(reference))
    })

    test('a cache hit restores instructions and defers callbacks until the selected tape is applied', () => {
        const calls: string[] = []
        const producer = (symbol: string) => {
            calls.push(symbol)
            return symbol.toUpperCase()
        }
        const body = new CountedParsem(productT(wordIs<string>('a'), producer))
        const rule = expression(body)
        const parser = choice(
            sequence(choice(rule), wordIs<string>('b')),
            sequence(choice(rule), wordIs<string>('c'))
        )
        const ctx = new Context<string>('ac')

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.strictEqual(ctx.sourceManager.pos, 2)
        assert.strictEqual(body.count(ctx, 0), 1)
        assert.deepStrictEqual(calls, [])
        assert.deepStrictEqual(ctx.productionManager.stack, [])
        assertProductionEffects(ctx, [{ kind: 'value', symbol: 'a' }])

        const [instruction] = ctx.productionEffectJournal.queue
        assert.ok(instruction instanceof PushValueInstruction)
        assert.strictEqual(instruction.producer, producer)
        assert.strictEqual(ctx.memoizerHandler.search(0, rule)?.instructionsDelta[0], instruction)

        parser.build(ctx)
        assert.deepStrictEqual(calls, ['a'])
        assert.strictEqual(ctx.productionManager.result, 'A')
    })

    test('Optional and Repeat sharing a child match an equivalent grammar with distinct children', () => {
        const grammar = (shared: boolean) => {
            const optionalChild = wordIs<string>('a')
            const repeatedChild = shared ? optionalChild : wordIs<string>('a')

            return choice(
                sequence(optional(optionalChild), wordIs<string>('x')),
                sequence(repeat(repeatedChild), wordIs<string>('a'))
            )
        }
        const reference = new Context<string>('aa')
        const actual = new Context<string>('aa')

        assert.strictEqual(parseUnderTest(grammar(false), reference), Result.NotParsed)
        assert.strictEqual(reference.sourceManager.pos, 0)
        assert.deepStrictEqual(reference.productionManager.stack, [])
        assertProductionEffects(reference, [])

        assert.strictEqual(parseUnderTest(grammar(true), actual), Result.NotParsed)
        assert.strictEqual(actual.sourceManager.pos, reference.sourceManager.pos)
        assert.deepStrictEqual(actual.productionManager.stack, reference.productionManager.stack)
        assert.deepStrictEqual(productionEntries(actual), productionEntries(reference))
    })

    test('distinct Optional instances retain independent memo cells for the same operand', () => {
        const operand = wordIs<string>('a')
        const first = optional(operand)
        const second = optional(operand)
        const ctx = new Context<string>('')

        assert.strictEqual(sequence(first, second).parse(ctx), Result.Continue)
        const firstMemo = ctx.memoizerHandler.search(0, first)
        const secondMemo = ctx.memoizerHandler.search(0, second)
        assert.ok(firstMemo)
        assert.ok(secondMemo)
        assert.strictEqual(firstMemo.res, Result.Continue)
        assert.strictEqual(secondMemo.res, Result.Continue)
        assert.notStrictEqual(firstMemo, secondMemo)
        assert.strictEqual(ctx.sourceManager.pos, 0)
        assert.deepStrictEqual(ctx.productionManager.stack, [])
        assertProductionEffects(ctx, [])
    })

    test('ordered choice still tries the following alternative after Continue', () => {
        const nullable = expression(wordIs<string>(''))
        const parser = choice(nullable, wordIs<string>('b'))
        const ctx = new Context<string>('b')

        assert.strictEqual(parseUnderTest(parser, ctx), Result.Parsed)
        assert.strictEqual(ctx.sourceManager.pos, 1)
        assert.deepStrictEqual(ctx.productionManager.stack, [])
        assertProductionEffects(ctx, [])
    })

    test('reused Continue productions record no instructions and execute no callbacks', () => {
        const calls: string[] = []
        const terminal = productT(wordIs<string>(''), value => {
            calls.push('terminal')

            return value
        })
        const rule = expression(productNT<string>(terminal, () => {
            calls.push('non-terminal')

            return 'unexpected'
        }))
        const ctx = new Context<string>('b')

        assert.strictEqual(parseUnderTest(sequence(optional(rule), optional(rule), wordIs<string>('b')), ctx), Result.Parsed)
        assert.strictEqual(ctx.sourceManager.pos, 1)
        assert.deepStrictEqual(calls, [])
        assert.deepStrictEqual(ctx.productionManager.stack, [])
        assertProductionEffects(ctx, [])
    })

    test('different rule identities with the same text do not share semantic results', () => {
        const first = expression(productT(wordIs<string>('a'), () => 'first').type(TokenType.STRING))
        const second = expression(productT(wordIs<string>('a'), () => 'second').type(TokenType.STRING))
        const parser = choice(
            sequence(choice(first), wordIs<string>('b')),
            sequence(choice(second), wordIs<string>('c'))
        )
        const ctx = new Context<string>('ac')

        assert.strictEqual(first.toString(), second.toString())
        assert.strictEqual(parseUnderTest(parser, ctx), Result.Parsed)
        assert.strictEqual(ctx.productionManager.result, 'second')
        assert.strictEqual(ctx.sourceManager.pos, 2)
        assertProductionEffects(ctx, [{ kind: 'value', symbol: 'a' }])
    })

    test('different Choice instances at the same offset keep their own alternatives', () => {
        const first = choice(wordIs<string>('a'), wordIs<string>('b'))
        const second = choice(wordIs<string>('a'), wordIs<string>('c'))
        const parser = choice(sequence(first, wordIs<string>('x')), second)
        const ctx = new Context<string>('c')

        assert.strictEqual(first.constructor, second.constructor)
        assert.notStrictEqual(first, second)
        assert.strictEqual(parseUnderTest(parser, ctx), Result.Parsed)
        assert.deepStrictEqual(ctx.productionManager.result, [])
        assert.strictEqual(ctx.sourceManager.pos, 1)
        assertProductionEffects(ctx, [])
    })

    test('the same rule at different offsets records each production in order', () => {
        const rule = choice(expression(productT(
            choice(wordIs<string>('a'), wordIs<string>('b')),
            value => value
        ).type(TokenType.STRING)))
        const ctx = new Context<string>('ab')

        assert.strictEqual(parseUnderTest(sequence(rule, rule), ctx), Result.Parsed)
        assert.strictEqual(ctx.sourceManager.pos, 2)
        assert.deepStrictEqual(ctx.productionManager.result, ['a', 'b'])
        assertProductionEffects(ctx, [
            { kind: 'value', symbol: 'a' },
            { kind: 'value', symbol: 'b' }
        ])
    })

    test('successes and failures do not leak between sources or fresh contexts', () => {
        const body = new CountedParsem(productT(wordIs<string>('a'), value => value))
        const rule = choice(expression(body))
        const first = new Context<string>('a')
        const failed = new Context<string>('b')
        const last = new Context<string>('a')

        assert.strictEqual(parseUnderTest(rule, first), Result.Parsed)
        assert.strictEqual(parseUnderTest(rule, failed), Result.NotParsed)
        assert.strictEqual(parseUnderTest(rule, last), Result.Parsed)
        assert.strictEqual(first.sourceManager.pos, 1)
        assert.strictEqual(failed.sourceManager.pos, 0)
        assert.strictEqual(last.sourceManager.pos, 1)
        assertProductionEffects(failed, [])
        assertProductionEffects(first, [{ kind: 'value', symbol: 'a' }])
        assert.deepStrictEqual(productionEntries(first), productionEntries(last))
        assert.deepStrictEqual(first.productionManager.stack, ['a'])
        assert.deepStrictEqual(failed.productionManager.stack, [])
        assert.deepStrictEqual(last.productionManager.stack, ['a'])
        assert.strictEqual(body.count(first, 0), 1)
        assert.strictEqual(body.count(failed, 0), 1)
        assert.strictEqual(body.count(last, 0), 1)
    })

    test('a changed expression reference is respected in a new context', () => {
        const rule = expression(productT(wordIs<string>('a'), value => value))
        const parser = choice(rule)
        const first = new Context<string>('a')

        assert.strictEqual(parseUnderTest(parser, first), Result.Parsed)
        assertProductionEffects(first, [{ kind: 'value', symbol: 'a' }])
        rule.ref = productT(wordIs<string>('b'), value => value)

        const second = new Context<string>('b')
        const oldSource = new Context<string>('a')

        assert.strictEqual(parseUnderTest(parser, second), Result.Parsed)
        assert.strictEqual(parseUnderTest(parser, oldSource), Result.NotParsed)
        assertProductionEffects(second, [{ kind: 'value', symbol: 'b' }])
        assert.strictEqual(second.productionManager.result, 'b')
        assert.strictEqual(oldSource.sourceManager.pos, 0)
        assertProductionEffects(oldSource, [])
    })

    test('a shared reduction uses the current preceding stack, not the first alternative snapshot', () => {
        const letter = productT(wordIs<unknown>('a'), value => value).type(TokenType.STRING)
        const rule = choice(expression(productNT(letter, (left, right) => `${left}${right}`, 2)))
        const parser = choice(
            sequence(productT(wordIs<unknown>('1'), () => 1).type(TokenType.NUMBER), rule, wordIs<unknown>('b')),
            sequence(productT(wordIs<unknown>('1'), () => 2).type(TokenType.NUMBER), rule, wordIs<unknown>('c'))
        )
        const ctx = new Context<unknown>('1ac')

        assert.strictEqual(parseUnderTest(parser, ctx), Result.Parsed)
        assert.strictEqual(ctx.sourceManager.pos, 3)
        assert.strictEqual(ctx.productionManager.result, '2a')
        assertProductionEffects(ctx, [
            { kind: 'value', symbol: '1' },
            { kind: 'value', symbol: 'a' },
            { kind: 'aggregate', arity: 2 }
        ])
    })

    for (const capturedFirst of [false, true]) {
        test(`a shared recognition respects the active terminal builder when capture is ${capturedFirst ? 'abandoned' : 'selected'}`, () => {
            const body = new CountedParsem(wordIs<string>('a'))
            const rule = choice(expression(body))
            const captured = productT(rule, value => value).type(TokenType.STRING)
            const parser = choice(
                sequence(capturedFirst ? captured : rule, wordIs<string>('b')),
                sequence(capturedFirst ? rule : captured, wordIs<string>('c'))
            )
            const ctx = new Context<string>('ac')

            assert.strictEqual(parser.parse(ctx), Result.Parsed)
            assert.strictEqual(ctx.sourceManager.pos, 2)
            assert.strictEqual(body.count(ctx, 0), 1, 'Capture changes must reuse the same recognition')
            assert.deepStrictEqual(ctx.tokenManager.tokens.map(token => ({ symbol: token.symbol, pos: token.pos, type: token.type })), [
                { symbol: 'a', pos: 0, type: capturedFirst ? TokenType.DEFAULT : TokenType.STRING },
                { symbol: 'c', pos: 1, type: TokenType.DEFAULT }
            ])
            assertProductionEffects(ctx, capturedFirst ? [] : [{ kind: 'value', symbol: 'a' }])
            parser.build(ctx)
            assert.deepStrictEqual(ctx.productionManager.stack, capturedFirst ? [] : ['a'])
        })
    }

    test('an enclosing capture receives only the selected characters after rollback', () => {
        const body = new CountedParsem(wordIs<string>('a'))
        const rule = choice(expression(body))
        const parser = productT(choice(
            sequence(rule, wordIs<string>('b')),
            sequence(rule, wordIs<string>('c'))
        ), value => value).type(TokenType.STRING)
        const ctx = new Context<string>('ac')

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.strictEqual(body.count(ctx, 0), 1, 'Recognition inside a capture must survive rollback')
        assertProductionEffects(ctx, [{ kind: 'value', symbol: 'ac' }])
        parser.build(ctx)
        assert.strictEqual(ctx.productionManager.result, 'ac')
    })

    for (const text of ['a', '\u{1F600}']) {
        test(`a parent memo retains a cached child's reads exactly once for ${JSON.stringify(text)}`, () => {
            const childBody = new CountedParsem(wordIs<string>(text))
            const child = choice(childBody)
            const parentBody = new CountedParsem(sequence(child, wordIs<string>('b')))
            const parent = choice(parentBody)
            let calls = 0
            const captured = productT(parent, value => { calls++; return value }).type(TokenType.STRING)
            const parser = choice(
                sequence(child, wordIs<string>('x')),
                sequence(parent, wordIs<string>('x')),
                sequence(captured, wordIs<string>('c'))
            )
            const ctx = new Context<string>(text + 'bc')

            assert.strictEqual(parser.parse(ctx), Result.Parsed)
            assert.strictEqual(childBody.count(ctx, 0), 1)
            assert.strictEqual(parentBody.count(ctx, 0), 1)
            assert.strictEqual(calls, 0)
            assert.strictEqual(ctx.symbolEffectJournal.length, 0)
            assert.strictEqual(ctx.symbolManager.pos, 0)
            assert.deepStrictEqual(ctx.tokenManager.tokens.map(token => ({ symbol: token.symbol, pos: token.pos, type: token.type })), [
                { symbol: text + 'b', pos: 0, type: TokenType.STRING },
                { symbol: 'c', pos: text.length + 1, type: TokenType.DEFAULT }
            ])
            assertProductionEffects(ctx, [{ kind: 'value', symbol: text + 'b' }])

            parser.build(ctx)

            assert.strictEqual(calls, 1)
            assert.strictEqual(ctx.productionManager.result, text + 'b')
        })
    }

    test('a cached fragment rebuilds nested captures without duplicating tokens or productions', () => {
        const calls: string[] = []
        const innerBody = new CountedParsem(wordIs<string>('b'))
        const inner = productT(innerBody, value => { calls.push('inner'); return value.toUpperCase() }).type(TokenType.STRING)
        const body = new CountedParsem(sequence(wordIs<string>('a'), inner, wordIs<string>('c')))
        const shared = choice(body)
        const outer = productT(shared, value => { calls.push('outer'); return value.toUpperCase() }).type(TokenType.STRING)
        const parser = choice(sequence(shared, wordIs<string>('x')), outer)
        const ctx = new Context<string>('abc')

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.strictEqual(body.count(ctx, 0), 1)
        assert.strictEqual(innerBody.count(ctx, 1), 1)
        assert.deepStrictEqual(calls, [])
        assert.strictEqual(ctx.symbolManager.pos, 0)
        assert.strictEqual(ctx.symbolEffectJournal.length, 0)
        assert.deepStrictEqual(ctx.tokenManager.tokens.map(token => ({ symbol: token.symbol, pos: token.pos, type: token.type })), [
            { symbol: 'b', pos: 1, type: TokenType.STRING },
            { symbol: 'ac', pos: 0, type: TokenType.STRING }
        ])
        assertProductionEffects(ctx, [{ kind: 'value', symbol: 'b' }, { kind: 'value', symbol: 'ac' }])

        parser.build(ctx)

        assert.deepStrictEqual(calls, ['inner', 'outer'])
        assert.deepStrictEqual(ctx.productionManager.result, ['B', 'AC'])
    })

    test('a parent memo excludes the capture effects of an abandoned alternative', () => {
        let abandonedCalls = 0
        const abandoned = productT(wordIs<string>('a'), value => { abandonedCalls++; return value }).type(TokenType.STRING)
        const body = new CountedParsem(choice(
            sequence(abandoned, wordIs<string>('x')),
            wordIs<string>('ab')
        ))
        const shared = choice(body)
        let selectedCalls = 0
        const selected = productT(shared, value => { selectedCalls++; return value }).type(TokenType.STRING)
        const parser = choice(sequence(shared, wordIs<string>('x')), selected)
        const ctx = new Context<string>('ab')

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.strictEqual(body.count(ctx, 0), 1)
        assert.strictEqual(abandonedCalls, 0)
        assert.strictEqual(selectedCalls, 0)
        assert.strictEqual(ctx.symbolManager.pos, 0)
        assert.strictEqual(ctx.symbolEffectJournal.length, 0)
        assert.deepStrictEqual(ctx.tokenManager.tokens.map(token => ({ symbol: token.symbol, pos: token.pos, type: token.type })), [
            { symbol: 'ab', pos: 0, type: TokenType.STRING }
        ])
        assertProductionEffects(ctx, [{ kind: 'value', symbol: 'ab' }])

        parser.build(ctx)

        assert.strictEqual(abandonedCalls, 0)
        assert.strictEqual(selectedCalls, 1)
        assert.strictEqual(ctx.productionManager.result, 'ab')
    })

    for (const [name, value] of [
        ['zero', 0],
        ['false', false],
        ['empty string', ''],
        ['null', null]
    ] as const) {
        test(`a shared terminal production preserves ${name} after rollback`, () => {
            const rule = choice(expression(productT(wordIs<unknown>('a'), () => value)))
            const parser = choice(
                sequence(rule, wordIs<unknown>('b')),
                sequence(rule, wordIs<unknown>('c'))
            )
            const ctx = new Context<unknown>('ac')

            assert.strictEqual(parseUnderTest(parser, ctx), Result.Parsed)
            assert.strictEqual(ctx.sourceManager.pos, 2)
            assert.deepStrictEqual(ctx.productionManager.stack, [value])
            assert.strictEqual(ctx.productionManager.result, value)
            assertProductionEffects(ctx, [{ kind: 'value', symbol: 'a' }])
        })
    }

    test('rest arguments consume only values produced inside the reused reduction', () => {
        const pair = choice(expression(productNT(sequence(
            productT(wordIs<unknown>('a'), value => value),
            productT(wordIs<unknown>('b'), value => value)
        ), (...values) => values)))
        const parser = sequence(
            productT(wordIs<unknown>('1'), () => 1),
            choice(sequence(pair, wordIs<unknown>('x')), sequence(pair, wordIs<unknown>('c')))
        )
        const ctx = new Context<unknown>('1abc')

        assert.strictEqual(parseUnderTest(parser, ctx), Result.Parsed)
        assert.strictEqual(ctx.sourceManager.pos, 4)
        assert.deepStrictEqual(ctx.productionManager.result, [1, ['a', 'b']])
        assertProductionEffects(ctx, [
            { kind: 'value', symbol: '1' },
            { kind: 'value', symbol: 'a' },
            { kind: 'value', symbol: 'b' },
            { kind: 'aggregate', arity: 2 }
        ])
    })

    test('a zero-argument reduction leaves preceding values on the stack', () => {
        const rule = choice(expression(productNT<unknown>(wordIs<unknown>('a'), () => 'constant')))
        const parser = sequence(
            productT(wordIs<unknown>('1'), () => 1),
            choice(sequence(rule, wordIs<unknown>('b')), sequence(rule, wordIs<unknown>('c')))
        )
        const ctx = new Context<unknown>('1ac')

        assert.strictEqual(parseUnderTest(parser, ctx), Result.Parsed)
        assert.deepStrictEqual(ctx.productionManager.result, [1, 'constant'])
        assertProductionEffects(ctx, [
            { kind: 'value', symbol: '1' },
            { kind: 'aggregate', arity: 0 }
        ])
    })

    test('rest arguments count produced values rather than instructions in a reused nested reduction', () => {
        const pair = productNT(sequence(
            productT(wordIs<unknown>('a'), value => value),
            productT(wordIs<unknown>('b'), value => value)
        ), (left, right) => `${left}${right}`)
        const rule = choice(expression(productNT(sequence(
            pair,
            productT(wordIs<unknown>('c'), value => value)
        ), (...values) => values)))
        const parser = sequence(
            productT(wordIs<unknown>('1'), () => 1),
            choice(sequence(rule, wordIs<unknown>('x')), sequence(rule, wordIs<unknown>('d')))
        )
        const ctx = new Context<unknown>('1abcd')

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.strictEqual(ctx.sourceManager.pos, 5)
        assert.deepStrictEqual(ctx.productionManager.stack, [])
        assertProductionEffects(ctx, [
            { kind: 'value', symbol: '1' },
            { kind: 'value', symbol: 'a' },
            { kind: 'value', symbol: 'b' },
            { kind: 'aggregate', arity: 2 },
            { kind: 'value', symbol: 'c' },
            { kind: 'aggregate', arity: 2 }
        ])
        parser.build(ctx)
        assert.deepStrictEqual(ctx.productionManager.result, [1, ['ab', 'c']])
    })

    test('produced objects belong to separate occurrences and parse contexts', () => {
        const rule = choice(expression(productT(wordIs<{ value: string }>('a'), value => ({ value }))))
        const parser = sequence(rule, rule)
        const first = new Context<{ value: string }>('aa')
        const second = new Context<{ value: string }>('aa')

        assert.strictEqual(parseUnderTest(parser, first), Result.Parsed)
        assertProductionEffects(first, [
            { kind: 'value', symbol: 'a' },
            { kind: 'value', symbol: 'a' }
        ])
        const [left, right] = first.productionManager.stack
        assert.notStrictEqual(left, right)
        left.value = 'changed'
        assert.strictEqual(right.value, 'a')

        assert.strictEqual(parseUnderTest(parser, second), Result.Parsed)
        assert.deepStrictEqual(second.productionManager.stack, [{ value: 'a' }, { value: 'a' }])
        assert.notStrictEqual(first.productionManager.stack[0], second.productionManager.stack[0])
        assert.deepStrictEqual(productionEntries(first), productionEntries(second))
    })

    test('produced closures preserve identity and remain callable after rollback', () => {
        const callback = () => 42
        const rule = choice(expression(productT(wordIs<() => number>('a'), () => callback)))
        const parser = choice(
            sequence(rule, wordIs<() => number>('b')),
            sequence(rule, wordIs<() => number>('c'))
        )
        const ctx = new Context<() => number>('ac')

        assert.strictEqual(parseUnderTest(parser, ctx), Result.Parsed)
        assert.strictEqual(ctx.productionManager.uniqueResult, callback)
        assert.strictEqual(ctx.productionManager.uniqueResult(), 42)
        assertProductionEffects(ctx, [{ kind: 'value', symbol: 'a' }])
    })

    test('an exception remains fatal and does not poison a fresh parse context', () => {
        const failure = new Error('semantic production failed')
        let shouldThrow = true
        const rule = choice(expression(productT(wordIs<string>('a'), value => {
            if (shouldThrow) throw failure

            return value
        }).type(TokenType.STRING)))

        assert.throws(() => parseUnderTest(rule, new Context<string>('a')), (error: unknown) => error === failure)
        shouldThrow = false
        const ctx = new Context<string>('a')

        assert.strictEqual(parseUnderTest(rule, ctx), Result.Parsed)
        assert.strictEqual(ctx.productionManager.result, 'a')
        assertProductionEffects(ctx, [{ kind: 'value', symbol: 'a' }])
    })

    test('memoization must not turn a successful prefix into a complete parse', () => {
        const rule = choice(expression(wordIs<string>('a')))
        const parser = choice(
            sequence(rule, wordIs<string>('b')),
            sequence(rule, wordIs<string>('c'))
        )
        const ctx = new Context<string>('ac!')

        assert.strictEqual(parseUnderTest(parser, ctx), Result.Parsed)
        assert.strictEqual(ctx.sourceManager.pos, 2)
        assert.strictEqual(ctx.sourceManager.current, '!')
        assertProductionEffects(ctx, [])
        assert.throws(() => ctx.productionManager.result, /Source not completelly parsed/)
    })
})

/* FUTURE(seed-growing): enable this block once cycle diagnostics and growing seeds exist.
describe('Packrat recursive cycle invariants', () => {

    for (const indirect of [false, true]) {
        test(`${indirect ? 'indirect' : 'direct'} recursion without progress has an engine diagnostic before the test budget is exhausted`, () => {
            const first = expression<string>()
            const second = expression<string>()
            const body = new CountedParsem(first, 32)
            first.ref = indirect ? second : body
            if (indirect) second.ref = body

            const ctx = new Context<string>('x')

            assert.throws(() => parseUnderTest(first, ctx), (error: unknown) =>
                error instanceof Error &&
                error !== body.budgetFailure &&
                !(error instanceof RangeError) &&
                /cycle|left.recurs|recurs.*progress/i.test(error.message)
            )
            assert.strictEqual(ctx.sourceManager.pos, 0)
            assert.deepStrictEqual(ctx.productionManager.stack, [])
            assertProductionEffects(ctx, [])
        })
    }
})

function growingGrammar(indirect = false) {
    const sum = expression<unknown>()
    const bridge = expression<unknown>()
    const numbers: number[] = []
    const additions: Array<[number, number]> = []
    const number = productT<unknown>(choice(wordIs('1'), wordIs('2'), wordIs('3')), value => {
        numbers.push(Number(value))
        return Number(value)
    }).type(TokenType.NUMBER)
    const addition = productNT(sequence(indirect ? bridge : sum, wordIs<unknown>('+'), number), (left, right) => {
        additions.push([Number(left), Number(right)])
        return Number(left) + Number(right)
    })
    const body = new CountedParsem(choice(addition, number), 256)
    sum.ref = body
    bridge.ref = sum
    return { parser: sum, body, numbers, additions }
}

describe('Productive seed-growing contracts', () => {

    for (const indirect of [false, true]) {
        test(`${indirect ? 'indirect' : 'direct'} left recursion grows to the longest seed and defers selected actions`, () => {
            const { parser, body, numbers, additions } = growingGrammar(indirect)
            const ctx = new Context<unknown>('1+2+3')

            assert.strictEqual(parser.parse(ctx), Result.Parsed)
            assert.strictEqual(ctx.sourceManager.pos, 5)
            assert.deepStrictEqual(numbers, [])
            assert.deepStrictEqual(additions, [])
            assert.deepStrictEqual(ctx.productionManager.stack, [])
            assertProductionEffects(ctx, [
                { kind: 'value', symbol: '1' }, { kind: 'value', symbol: '2' },
                { kind: 'aggregate', arity: 2 }, { kind: 'value', symbol: '3' },
                { kind: 'aggregate', arity: 2 }
            ])
            assert.deepStrictEqual(ctx.tokenManager.tokens.map(token => [token.symbol, token.pos]), [['1', 0], ['+', 1], ['2', 2], ['+', 3], ['3', 4]])

            parser.build(ctx)

            assert.strictEqual(ctx.productionManager.result, 6)
            assert.deepStrictEqual(numbers, [1, 2, 3])
            assert.deepStrictEqual(additions, [[1, 2], [3, 3]])
            assert.ok(body.evaluations.length < 256)
        })
    }

    test('an incomplete extension retains only the longest complete seed and its instructions', () => {
        const { parser, numbers, additions } = growingGrammar()
        const ctx = new Context<unknown>('1+2+')

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.strictEqual(ctx.sourceManager.pos, 3)
        assert.strictEqual(ctx.sourceManager.current, '+')
        assert.deepStrictEqual(numbers, [])
        assert.deepStrictEqual(additions, [])
        assertProductionEffects(ctx, [{ kind: 'value', symbol: '1' }, { kind: 'value', symbol: '2' }, { kind: 'aggregate', arity: 2 }])
        assert.deepStrictEqual(ctx.tokenManager.tokens.map(token => [token.symbol, token.pos]), [['1', 0], ['+', 1], ['2', 2]])
        parser.build(ctx)
        assert.deepStrictEqual(ctx.productionManager.stack, [3])
        assert.deepStrictEqual(numbers, [1, 2])
        assert.deepStrictEqual(additions, [[1, 2]])
        assert.throws(() => ctx.productionManager.result, /Source not completelly parsed/)
    })

    test('a nullable extension stops at the fixed point without keeping an equal-length candidate', () => {
        const rule = expression<unknown>()
        let extensions = 0
        const extension = productNT(sequence(rule, wordIs<unknown>('')), value => { extensions++; return value })
        const body = new CountedParsem(choice(extension, productT<unknown>(wordIs('1'), Number)), 256)
        rule.ref = body
        const ctx = new Context<unknown>('1')

        assert.strictEqual(rule.parse(ctx), Result.Parsed)
        assert.strictEqual(ctx.sourceManager.pos, 1)
        assert.strictEqual(extensions, 0)
        assertProductionEffects(ctx, [{ kind: 'value', symbol: '1' }])
        rule.build(ctx)
        assert.strictEqual(ctx.productionManager.result, 1)
        assert.strictEqual(extensions, 0)
        assert.ok(body.evaluations.length < 256)
    })
})
*/
