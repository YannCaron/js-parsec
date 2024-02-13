import Context from "../src/runtime/Context"
import charInInterval from "../src/charInInterval"
import Result from "../src/runtime/Result"

describe('basic charInInterval', () => {

    const parser = charInInterval('0', '9')

    test('charInInterval should parse "0"', () => {
        const ctx = new Context("0")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('charInInterval should parse "9"', () => {
        const ctx = new Context("9")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('charInInterval should parse "5"', () => {
        const ctx = new Context("5")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('charInInterval should not parse "c"', () => {
        const ctx = new Context("c")
        expect(parser.parse(ctx)).toBe(Result.NotParsed);
    })

})

describe('charInInterval exception', () => {

    test('should generate an error', () => {
        expect(() => {
            charInInterval('', '')
        }).toThrow(Error);
    })

    test('should generate an error', () => {
        expect(() => {
            charInInterval('ab', 'c')
        }).toThrow(Error);
    })
    
    test('should generate an error', () => {
        expect(() => {
            charInInterval('a', '')
        }).toThrow(Error);
    })

    test('should generate an error', () => {
        expect(() => {
            charInInterval('a', 'bc')
        }).toThrow(Error);
    })

})

describe('charInInterval toString', () => {

    const parser = charInInterval('0', '9')

    test('should parse "my string"', () => {
        expect(parser.toString()).toBe('[0-9]');
    })

})
