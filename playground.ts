import {
    Context,
    Result,
    charIn,
    charInInterval,
    choice,
    expression,
    optional,
    productNT,
    productT,
    repeat,
    sequence,
    wordIs
} from './index.ts'

type Production = number | unknown

// n = [0-9]+
const n = expression()
n.ref = repeat(charIn('0123456789')).productT<Production>(Number)

const E = expression()
E.ref = choice(sequence(E, wordIs('+'), E), n)

const context = new Context('1+2+3+4')
const res = E.parse(context)

console.log('result', res);
