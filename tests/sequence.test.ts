import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import charIn from "../src/charIn.ts";
import optional from "../src/optional.ts";
import Context from "../src/runtime/Context.ts";
import { Result } from "../src/runtime/Result.ts";
import sequence from "../src/sequence.ts";
import '../src/repeat.ts'

describe('basic sequence/char', () => {

    const parser = sequence(charIn('a'), charIn('b'))

    test('sequence should parse "ab"', () => {
        const ctx = new Context("ab")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('sequence should not parse "a"', () => {
        const ctx = new Context("a")
        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
    })


    test('sequence should not parse "ac"', () => {
        const ctx = new Context("ac")
        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
    })

    test('sequence should not parse "ba"', () => {
        const ctx = new Context("ba")
        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
    })

})

describe('combination sequence/char', () => {

    const parser = sequence(charIn('ab'), charIn('ab'))

    test('sequence should parse "aa"', () => {
        const ctx = new Context("aa")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('sequence should parse "bb"', () => {
        const ctx = new Context("bb")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })


    test('sequence should parse "ab"', () => {
        const ctx = new Context("ab")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('sequence should parse "ba"', () => {
        const ctx = new Context("ba")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })


    test('sequence should not parse "b"', () => {
        const ctx = new Context("b")
        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
    })

    test('sequence should not parse "bc"', () => {
        const ctx = new Context("bc")
        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
    })

})

describe('sequence backup', () => {

    const parser = sequence(charIn('a'), charIn('b'))

    test('sequence that parse should be positioned at end', () => {
        const ctx = new Context("ab")
        parser.parse(ctx)
        assert.strictEqual(ctx.pos, 2)
    })

    test('sequence that does not parse should be positioned at begining', () => {
        const ctx = new Context("ac")
        parser.parse(ctx)
        assert.strictEqual(ctx.pos, 0)
    })

})

describe('combination sequence/optional', () => {

    test('sequence should parse "abc"', () => {
        const parser = sequence(charIn('a'), optional(charIn('b')), charIn('c'))
        const ctx = new Context("abc")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('sequence should parse "ac"', () => {
        const parser = sequence(charIn('a'), optional(charIn('b')), charIn('c'))
        const ctx = new Context("ac")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('sequence should not parse "aoc"', () => {
        const parser = sequence(charIn('a'), optional(charIn('b')), charIn('c'))
        const ctx = new Context("aoc")
        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
    })

    test('sequence should parse "c"', () => {
        const parser = sequence(optional(charIn('a')), optional(charIn('b')), charIn('c'))
        const ctx = new Context("c")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('sequence should parse "aoc"', () => {
        const parser = sequence(optional(charIn('a')), optional(charIn('b')), charIn('c'))
        const ctx = new Context("aoc")
        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
    })

    test('sequence should parse full optional', () => {
        const parser = sequence(optional(charIn('a')), optional(charIn('b')), optional(charIn('c')))
        const ctx = new Context("efg")
        assert.strictEqual(parser.parse(ctx), Result.Continue)
    })

})

describe('inline factory of sequence', () => {

    test('"G => a b" should parse "ab"', () => {
        const parser = charIn("a").then(charIn('b'))
        const ctx = new Context("ab")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('"G => (a b) c" should merge', () => {
        const parser = charIn("a").then(charIn('b').then(charIn('c')))
        assert.strictEqual(`${parser}`, "([a] [b] [c])")
    })

    test('"G => a (b c)" should merge', () => {
        const parser = charIn("a").then(charIn('b')).then(charIn('c'))
        assert.strictEqual(`${parser}`, "([a] [b] [c])")
    })

    test('"G => ((a b) c d)" should merge', () => {
        const parser = charIn("a").then(charIn('b').then(charIn('c'))).then(charIn('d'))
        assert.strictEqual(`${parser}`, "([a] [b] [c] [d])")
    })
    
    test('"G => ((a b) c d)" should merge', () => {
        const parser = charIn("a").then(charIn('b')).optional().then(charIn('c'))
        assert.strictEqual(`${parser}`, "(([a] [b])? [c])")
    })
        
    test('"G => ((a b) c d)" should merge', () => {
        const parser = charIn("a").then(charIn('b')).optional().then(charIn('c')).repeat()
        assert.strictEqual(`${parser}`, "(([a] [b])? [c])+")
    })

})