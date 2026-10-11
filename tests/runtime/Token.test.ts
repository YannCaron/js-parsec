import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import Token from '../../src/runtime/Token.ts'

describe('basic Token tests', () => {

    test('test proterties', () => {

        const token = new Token('abc', 0)

        assert.strictEqual(token.symbol, 'abc')
        assert.strictEqual(token.pos, 0)
        assert.strictEqual(token.type, Token.DEFAULT_TYPE)

    })

})