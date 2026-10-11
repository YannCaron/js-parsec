import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import charIn from "../src/charIn.ts";
import optional from "../src/optional.ts";
import repeat from "../src/repeat.ts";
import Context from "../src/runtime/Context.ts";
import { Result } from "../src/runtime/Result.ts";
import sequence from "../src/sequence.ts";

describe('basic repeat', () => {

    const parser = repeat(charIn("a"))

    test('repeat should parse "a"', () => {
        const ctx = new Context("a")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('repeat should parse "aa"', () => {
        const ctx = new Context("aa")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('repeat should parse "aaa"', () => {
        const ctx = new Context("aaa")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('repeat should not parse "b"', () => {
        const ctx = new Context("b")
        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
    })

    test('repeat should not parse ""', () => {
        const ctx = new Context("")
        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
    })

})

describe('combination repeat/optional', () => {

    const parser = repeat(optional(charIn("a")))

    test('repeat should parse "a" with no infinite loop', () => {
        const ctx = new Context("a")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('repeat should parse "ab" with no infinite loop', () => {
        const ctx = new Context("ab")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('repeat should parse "" with no infinite loop', () => {
        const ctx = new Context("")
        assert.strictEqual(parser.parse(ctx), Result.Continue)
    })

    test('repeat should parse "b" with no infinite loop', () => {
        const ctx = new Context("b")
        assert.strictEqual(parser.parse(ctx), Result.Continue)
    })

})

describe('combination repeat/sequence', () => {

    const parser = sequence(charIn("a"), repeat(charIn("b")), charIn("a"))

    test('repeat should Not parse "a"', () => {
        const ctx = new Context("a")
        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
    })

    test('repeat should Not parse "ab"', () => {
        const ctx = new Context("ab")
        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
    })

    test('repeat should not parse "aa"', () => {
        const ctx = new Context("aa")
        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
    })

    test('repeat should parse "aba"', () => {
        const ctx = new Context("aba")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('repeat should parse "abbbbba"', () => {
        const ctx = new Context("abbbbba")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

})

describe('combination repeat/sequence/optioanl', () => {

    const parser = sequence(charIn("a"), repeat(optional(charIn("b"))), charIn("a"))

    test('repeat should Not parse "a"', () => {
        const ctx = new Context("a")
        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
    })

    test('repeat should Not parse "ab"', () => {
        const ctx = new Context("ab")
        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
    })

    test('repeat should parse "aa"', () => {
        const ctx = new Context("aa")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('repeat should parse "abbbbba"', () => {
        const ctx = new Context("abbbbba")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

})