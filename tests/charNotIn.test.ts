import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import charIn from "../src/charIn.ts"
import charNotIn from "../src/charNotIn.ts"
import repeat from "../src/repeat.ts"
import Context from "../src/runtime/Context.ts"
import { Result } from "../src/runtime/Result.ts"
import sequence from "../src/sequence.ts"

describe('basic charNotIn', () => {

    const parser = charNotIn("ab")

    test('charNotIn should not parse "a"', () => {
        const ctx = new Context("a")
        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
    })

    test('charNotIn should charNotIn parse "b"', () => {
        const ctx = new Context("b")
        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
    })

    test('charNotIn should parse "c"', () => {
        const ctx = new Context("c")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

})

describe('sequence charNotIn', () => {

    const parser = sequence(charIn('c'), charNotIn("ab"), charIn('c'))

    test('charNotIn should charNotIn parse "cac"', () => {
        const ctx = new Context("cac")
        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
    })

    test('charNotIn should charNotIn parse "cbc"', () => {
        const ctx = new Context("cbc")
        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
    })

    test('charNotIn should parse "ccc"', () => {
        const ctx = new Context("ccc")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

})

describe('literal', () => {

    const parser = sequence(charIn('"'), repeat(charNotIn('"')), charIn('"'))

    test('should parse "my string"', () => {
        const ctx = new Context(`"my string"`)
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

})

describe('toString', () => {

    const parser = sequence(charIn('"'), repeat(charNotIn('"')), charIn('"'))

    test('should parse "my string"', () => {
        assert.strictEqual(parser.toString(), `(["] [^"]+ ["])`)
    })

})