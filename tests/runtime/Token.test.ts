import Token from './../../src/runtime/Token'

describe('basic Token tests', () => {

    test('test proterties', () => {

        const token = new Token('abc', 0)

        expect(token.symbol).toBe('abc')
        expect(token.pos).toBe(0)
        expect(token.type).toBe(Token.DEFAULT_TYPE)

    })

})