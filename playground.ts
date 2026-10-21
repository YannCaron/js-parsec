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


const E = expression()

// n = [0-9]+
const n = expression()
n.ref = repeat(charIn('0123456789')).productT(v => Number(v))

// a = '+'
const a = expression(charIn('+').productT(() => (l: number, r: number) => l + r))

// m = '-'
const m = expression()
m.ref = charIn('-').productT(() => (l: number, r: number) => l - r)

// x = '*'
const x = expression()
x.ref = charIn('*').productT(() => (l: number, r: number) => l * r)

// d = '/'
const d = expression()
d.ref = charIn('/').productT(() => (l: number, r: number) => l / r)

// M = n (x | d  n)*
const M = expression(sequence(E, optional(repeat(sequence(choice(x, d), E).productNT<any>((l, op, r) => op(l, r))))))

// A = M (a | m  M)*
const A = expression()
A.ref = sequence(M, optional(repeat(sequence(choice(a, m), M).productNT<any>((l, op, r) => op(l, r)))))

// E = '(' A ')' | n
E.ref = choice(sequence(charIn('('), A, charIn(')')), n)

const { parsing, result } = A.evaluate("1+2*3-4")

console.log(parsing)
console.log('stack: ', result);

