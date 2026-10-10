import charIn from "../src/charIn";
import optional from "../src/optional";
import choice from "../src/choice";
import Context from "../src/runtime/Context";
import { Result } from "../src/runtime/Result";
import Token from "../src/runtime/Token";
import { TokenType } from "../src/runtime/TokenType";

describe('basic optional', () => {

    const parser = optional(charIn("ab"))

    test('optional should parse "a"', () => {
        const ctx = new Context("a")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('optional should parse "b"', () => {
        const ctx = new Context("b")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('optional should not parse "c"', () => {
        const ctx = new Context("c")
        expect(parser.parse(ctx)).toBe(Result.Continue);
    })

})

describe('nested optionals', () => {

    const parser = optional(optional(charIn("ab")))
    
    test('', () => {
        const ctx = new Context("a")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })
        
    test('', () => {
        const ctx = new Context("b")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })
            
    test('', () => {
        const ctx = new Context("c")
        expect(parser.parse(ctx)).toBe(Result.Continue);
    })

});

describe('nested optionals with choice', () => {

    const parser = choice(
        optional(optional(charIn("ab"))),
        charIn("c")
    )
    
    test('', () => {
        const ctx = new Context("a")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })
        
    test('', () => {
        const ctx = new Context("b")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })
            
    test('', () => {
        const ctx = new Context("c")
        expect(parser.parse(ctx)).toBe(Result.Parsed);

        expect(ctx.tokens.length).toBe(1);
        expect(ctx.tokens.pop() == new Token('c', 0, TokenType.PUNCTUATION));
    })

});


