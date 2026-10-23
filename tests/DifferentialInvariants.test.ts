import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Context, Parsem, Result, TokenType, choice, optional, productNT, productT, repeat, sequence, wordIs } from '../index.ts'
import { PushAggregatorInstruction, PushValueInstruction } from '../src/runtime/manager/InstructionTapeManager.ts'

type Grammar =
    | { kind: 'literal'; text: string; produce: boolean }
    | { kind: 'sequence'; children: Grammar[] }
    | { kind: 'choice'; children: Grammar[] }
    | { kind: 'optional'; child: Grammar }
    | { kind: 'repeat'; child: Grammar }
    | { kind: 'reduce'; child: Grammar; arity: number; name: string }
type Operation = { kind: 'push'; symbol: string } | { kind: 'reduce'; arity: number; name: string }
type Recognition = { status: 'parsed' | 'not parsed' | 'continue'; position: number; tokens: Array<{ symbol: string; pos: number; type: TokenType }>; operations: Operation[] }

function reference(grammar: Grammar, source: string, start = 0): Recognition {
    const empty = (status: Recognition['status']): Recognition => ({ status, position: start, tokens: [], operations: [] })

    if (grammar.kind === 'literal') {
        if (!grammar.text.length) return empty('continue')
        if (!source.startsWith(grammar.text, start)) return empty('not parsed')
        return {
            status: 'parsed', position: start + grammar.text.length,
            tokens: grammar.produce ? [{ symbol: grammar.text, pos: start, type: TokenType.STRING }]
                : grammar.text.split('').map((symbol, index) => ({ symbol, pos: start + index, type: TokenType.DEFAULT })),
            operations: grammar.produce ? [{ kind: 'push', symbol: grammar.text }] : [],
        }
    }
    if (grammar.kind === 'choice') {
        for (const child of grammar.children) {
            const candidate = reference(child, source, start)
            if (candidate.status === 'parsed') return candidate
        }
        return empty('not parsed')
    }
    if (grammar.kind === 'optional') {
        const candidate = reference(grammar.child, source, start)
        return candidate.status === 'not parsed' ? empty('continue') : candidate
    }
    if (grammar.kind === 'reduce') {
        const candidate = reference(grammar.child, source, start)
        if (candidate.status === 'parsed') candidate.operations.push({ kind: 'reduce', arity: grammar.arity, name: grammar.name })
        return candidate
    }

    const result = empty('continue')
    if (grammar.kind === 'sequence') {
        for (const child of grammar.children) {
            const candidate = reference(child, source, result.position)
            if (candidate.status === 'not parsed') return empty('not parsed')
            if (candidate.status === 'parsed') result.status = 'parsed'
            result.position = candidate.position
            result.tokens.push(...candidate.tokens)
            result.operations.push(...candidate.operations)
        }
        return result
    }

    result.status = 'not parsed'
    while (true) {
        const candidate = reference(grammar.child, source, result.position)
        if (candidate.status !== 'parsed') {
            if (result.status === 'not parsed' && candidate.status === 'continue') result.status = 'continue'
            return result
        }
        assert.ok(candidate.position > result.position, 'The oracle only repeats consuming operands')
        result.status = 'parsed'
        result.position = candidate.position
        result.tokens.push(...candidate.tokens)
        result.operations.push(...candidate.operations)
    }
}

function referenceValues(operations: Operation[]) {
    const stack: unknown[] = []
    const calls: string[] = []
    for (const operation of operations) {
        if (operation.kind === 'push') {
            stack.push(operation.symbol.toUpperCase())
            calls.push('push:' + operation.symbol)
        } else {
            assert.ok(operation.arity <= stack.length)
            const values = stack.slice(stack.length - operation.arity)
            stack.length -= operation.arity
            stack.push({ name: operation.name, values })
            calls.push(operation.name)
        }
    }
    return { stack, calls }
}

function compile(grammar: Grammar, shared: boolean, calls: string[], parsers = new Map<Grammar, Parsem<unknown>>()): Parsem<unknown> {
    const cached = parsers.get(grammar)
    if (shared && cached) return cached
    const child = (node: Grammar) => compile(node, shared, calls, parsers)
    let parser: Parsem<unknown>

    switch (grammar.kind) {
        case 'literal':
            parser = grammar.produce ? productT<unknown>(wordIs(grammar.text), symbol => {
                calls.push('push:' + symbol)
                return symbol.toUpperCase()
            }).type(TokenType.STRING) : wordIs(grammar.text)
            break
        case 'sequence': parser = sequence(...grammar.children.map(child)); break
        case 'choice': parser = choice(...grammar.children.map(child)); break
        case 'optional': parser = optional(child(grammar.child)); break
        case 'repeat': parser = repeat(child(grammar.child)); break
        case 'reduce':
            parser = productNT(child(grammar.child), (...values) => {
                calls.push(grammar.name)
                return { name: grammar.name, values }
            }, grammar.arity)
    }
    if (shared) parsers.set(grammar, parser)
    return parser
}

function strings(alphabet: string[], maxLength: number): string[] {
    const result = ['']
    let level = ['']
    for (let length = 1; length <= maxLength; length++) {
        level = level.flatMap(prefix => alphabet.map(letter => prefix + letter))
        result.push(...level)
    }
    return result
}

const literal = (text: string, produce = false): Grammar => ({ kind: 'literal', text, produce })
const seq = (...children: Grammar[]): Grammar => ({ kind: 'sequence', children })
const alt = (...children: Grammar[]): Grammar => ({ kind: 'choice', children })
const reduce = (child: Grammar, arity: number, name: string): Grammar => ({ kind: 'reduce', child, arity, name })
const a = alt(literal('a', true))
const b = literal('b', true)
const grammars: Array<[string, Grammar]> = [
    ['shared alternatives at a nonzero offset', alt(seq(literal('x'), a, literal('b')), seq(literal('x'), a, literal('c')))],
    ['Optional and Repeat sharing an operand', alt(seq({ kind: 'optional', child: a }, literal('x')), seq({ kind: 'repeat', child: a }, literal('a')))],
    ['Continue followed by a consuming choice', alt(literal('', true), a)],
    ['greedy repetition with a partially matched final iteration', { kind: 'repeat', child: seq(a, literal('b')) }],
    ['fixed arity reduction', reduce(seq(a, b), 2, 'pair')],
    ['reduction preserving preceding values', seq(literal('x', true), reduce(seq(a, b), 2, 'pair'))],
    ['zero arity reduction', reduce(a, 0, 'constant')],
    ['empty sequence', seq()],
    ['empty choice', alt()],
    ['UTF-16 source and token offsets', seq(literal('😀'), literal('a', true))],
]
const inputs = [...strings(['a', 'b', 'c', 'x'], 4), '😀', '😀a', '😀ab', 'a😀']

for (const [name, grammar] of grammars) {
    test(`independent recognition and value oracle: ${name}`, () => {
        for (const shared of [false, true]) {
            const calls: string[] = []
            const parser = compile(grammar, shared, calls)
            for (const source of inputs) {
                calls.length = 0
                const expected = reference(grammar, source)
                const ctx = new Context<unknown>(source)
                const label = `${name}, shared=${shared}, source=${JSON.stringify(source)}`

                // The oracle rolls back failures; raw sequences and initial repeat attempts do not.
                const result = ctx.backtrackingHandler.handle(current => parser.parse(current))
                assert.strictEqual(result, expected.status, label)
                assert.strictEqual(ctx.sourceManager.pos, expected.position, label)
                assert.deepStrictEqual(ctx.tokenManager.tokens.map(token => ({ symbol: token.symbol, pos: token.pos, type: token.type })), expected.tokens, label)
                assert.strictEqual(ctx.symbolManager.pos, 0, label)
                assert.deepStrictEqual(ctx.productionManager.stack, [], label)
                assert.deepStrictEqual(calls, [], label)

                const actualTape = Array.from(ctx.instructionTapeManager.queue, instruction => {
                    if (instruction instanceof PushValueInstruction) return { kind: 'push', symbol: instruction.symbol }
                    assert.ok(instruction instanceof PushAggregatorInstruction)
                    return { kind: 'reduce', arity: instruction.arity }
                })
                const expectedTape = expected.operations.map(operation => operation.kind === 'push' ? operation : { kind: 'reduce', arity: operation.arity })
                assert.deepStrictEqual(actualTape, expectedTape, label)

                if (expected.status === Result.Parsed) parser.build(ctx)
                const values = referenceValues(expected.operations)
                assert.deepStrictEqual(ctx.productionManager.stack, values.stack, label)
                assert.deepStrictEqual(calls, values.calls, label)
            }
        }
    })
}
