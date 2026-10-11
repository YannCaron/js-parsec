import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import Context from "../src/runtime/Context.ts"
import charInInterval from "../src/charInInterval.ts"
import { Result } from "../src/runtime/Result.ts"

describe('basic charInInterval', () => {

    const parser = charInInterval('0', '9')

    test('charInInterval should parse "0"', () => {
        const ctx = new Context("0")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('charInInterval should parse "9"', () => {
        const ctx = new Context("9")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('charInInterval should parse "5"', () => {
        const ctx = new Context("5")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('charInInterval should not parse "c"', () => {
        const ctx = new Context("c")
        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
    })

})

describe('charInInterval exception', () => {

    test('should generate an error', () => {
        assert.throws(() => {
            charInInterval('', '')
        }, Error)
    })

    test('should generate an error', () => {
        assert.throws(() => {
            charInInterval('ab', 'c')
        }, Error)
    })
    
    test('should generate an error', () => {
        assert.throws(() => {
            charInInterval('a', '')
        }, Error)
    })

    test('should generate an error', () => {
        assert.throws(() => {
            charInInterval('a', 'bc')
        }, Error)
    })

})

describe('charInInterval toString', () => {

    const parser = charInInterval('0', '9')

    test('should parse "my string"', () => {
        assert.strictEqual(parser.toString(), '[0-9]')
    })

})
