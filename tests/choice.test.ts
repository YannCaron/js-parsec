import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import Context from "../src/runtime/Context.ts";
import charIn from "../src/charIn.ts";
import choice from "../src/choice.ts";
import optional from "../src/optional.ts";
import sequence from "../src/sequence.ts";
import { Result } from "../src/runtime/Result.ts";
import '../src/repeat.ts'

describe('basic choice/char', () => {

    const parser = choice(charIn('a'), charIn('b'))

    test('choice should parse "a"', () => {
        const ctx = new Context("b")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('choice should parse "b"', () => {
        const ctx = new Context("b")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('choice should not parse "c"', () => {
        const ctx = new Context("c")
        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
    })

})

describe('choice backup', () => {

    const parser = sequence(choice(charIn('c'), charIn('a')), choice(charIn('d'), charIn('b')))

    test('choice that parse should be positioned at end', () => {
        const ctx = new Context("ab")
        parser.parse(ctx)
        assert.strictEqual(ctx.pos, 2)
    })
    
    test('choice that parse should be positioned at end', () => {
        const ctx = new Context("ad")
        parser.parse(ctx)
        assert.strictEqual(ctx.pos, 2)
    })

    test('choice that does not parse should be positioned at begining', () => {
        const ctx = new Context("ac")
        parser.parse(ctx)
        assert.strictEqual(ctx.pos, 0)
    })

    test('choice that parse should be positioned at end', () => {
        const ctx = new Context("cd")
        parser.parse(ctx)
        assert.strictEqual(ctx.pos, 2)
    })

    test('choice that parse should be positioned at end', () => {
        const ctx = new Context("cb")
        parser.parse(ctx)
        assert.strictEqual(ctx.pos, 2)
    })

})

describe('combination choice/optional', () => {

    const parser = choice(charIn('a'), optional(charIn('b')), charIn('c'))

    test('choice should parse "a"', () => {
        const ctx = new Context("a")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })
    
    test('choice should parse "b"', () => {
        const ctx = new Context("b")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('choice should parse "c"', () => {
        const ctx = new Context("c")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })
    
    test('choice should not parse "d"', () => {
        const ctx = new Context("d")
        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
    })

})

describe('inline factory of choice', () => {

    test('"G => a | b" should parse "ab"', () => {
        const parser = charIn("a").or(charIn('b'))
        const ctx = new Context("ab")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('"G => (a | b) | c" should merge', () => {
        const parser = charIn("a").or(charIn('b').or(charIn('c')))
        assert.strictEqual(`${parser}`, "([a] | [b] | [c])")
    })

    test('"G => a | (b | c)" should merge', () => {
        const parser = charIn("a").or(charIn('b')).or(charIn('c'))
        assert.strictEqual(`${parser}`, "([a] | [b] | [c])")
    })

    test('"G => ((a | b) | c | d)" should merge', () => {
        const parser = charIn("a").or(charIn('b').or(charIn('c'))).or(charIn('d'))
        assert.strictEqual(`${parser}`, "([a] | [b] | [c] | [d])")
    })
    
    test('"G => ((a | b) | c | d)" should merge', () => {
        const parser = charIn("a").or(charIn('b')).optional().or(charIn('c'))
        assert.strictEqual(`${parser}`, "(([a] | [b])? | [c])")
    })
        
    test('"G => ((a | b) | c | d)" should merge', () => {
        const parser = charIn("a").or(charIn('b')).optional().or(charIn('c')).repeat()
        assert.strictEqual(`${parser}`, "(([a] | [b])? | [c])+")
    })

})

describe('empty choice toString', () => {

    test('choice().toString() should not throw on empty children', () => {
        const parser = choice()
        assert.doesNotThrow(() => parser.toString())
    })

})
