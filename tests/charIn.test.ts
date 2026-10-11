import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import charIn from "../src/charIn.ts"
import Context from "../src/runtime/Context.ts"
import { Result } from "../src/runtime/Result.ts"

describe('basic charIn', () => {

    const parser = charIn("ab")

    test('charin should parse "a"', () => {
        const ctx = new Context("a")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('charin should parse "b"', () => {
        const ctx = new Context("b")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('charin should not parse "c"', () => {
        const ctx = new Context("c")
        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
    })

})