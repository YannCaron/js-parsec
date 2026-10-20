import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import charIn from "../src/charIn.ts";
import optional from "../src/optional.ts";
import choice from "../src/choice.ts";
import Context from "../src/runtime/Context.ts";
import { Result } from "../src/runtime/Result.ts";
import Token from "../src/runtime/Token.ts";
import { TokenType } from "../src/runtime/TokenType.ts";

describe('basic optional', () => {

    const parser = optional(charIn("ab"))

    test('optional should parse "a"', () => {
        const ctx = new Context("a")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('optional should parse "b"', () => {
        const ctx = new Context("b")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('optional should not parse "c"', () => {
        const ctx = new Context("c")
        assert.strictEqual(parser.parse(ctx), Result.Continue)
    })

})

describe('nested optionals', () => {

    const parser = optional(optional(charIn("ab")))
    
    test('optional should parse "a"', () => {
        const ctx = new Context("a")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })
        
    test('optional should parse "b"', () => {
        const ctx = new Context("b")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })
            
    test('optional should continue on "c"', () => {
        const ctx = new Context("c")
        assert.strictEqual(parser.parse(ctx), Result.Continue)
    })

});

describe('nested optionals with choice', () => {

    const parser = choice(
        optional(optional(charIn("ab"))),
        charIn("c")
    )
    
    test('choice should parse "a"', () => {
        const ctx = new Context("a")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })
        
    test('choice should parse "b"', () => {
        const ctx = new Context("b")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })
            
    test('choice should parse "c" and produce punctuation token', () => {
        const ctx = new Context("c")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)

        assert.strictEqual(ctx.tokenManager.tokens.length, 1)
        assert.deepStrictEqual(ctx.tokenManager.tokens.pop(), new Token('c', 0, TokenType.PUNCTUATION))
    })

});


