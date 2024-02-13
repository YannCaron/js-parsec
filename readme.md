# js-parsec 

**Js-Parsec** is another **LL(*) Packrat** parser written in TypeScript.

Why another LL Parser ? Because **Js-Parsec** embrase great emphasis to define as **simple** and **clean** grammar definition as possible.

Rather than *classical* parsers that definition is frequently based on **BNF** familly languages, **Js-Parsec** is based on a **Combinator Framework** approach.


> :bulb: Because, by definition, what is BNF, if it is not a **Domain Specific Language** ? And rather that going through the chain ```Lexer + Parser = AST```, imagine you directly write the **AST** itself with factories.
That is the essence of Js-Parsec to be an **Embeded DSL**.

## Installation

Install it from NPM: `npm install --save @cyann/js-parsec`

> :golf: Practice it with: [grammar-lab](http://grammar.kids-lab.io). Execute living examples, **copy / past** it to your project and enjoy :relaxed:.

## Arithmetic example

Here is a complete example of arithmetic calculator:
``` js
const { Context, expression, repeat, charInInterval, choice, sequence, wordIs, optional } = require('@cyann/js-parsec')

// circular reference made possible (use with caution!)
const A = expression()

// I = [0-9]+
const I =
    repeat(
        charInInterval('0', '9')).productT(v => parseInt(v))

// E = '(' A ')' | I
const E =
    choice(
        sequence(
            wordIs('('),
            A,
            wordIs(')')),
        I)

// MM = '*' E
const MM =
    sequence(
        wordIs('*'),
        E.productNT((l, r) => l * r))

// MR =  '/' E
const MR =
    sequence(
        wordIs('/'),
        E.productNT((l, r) => l / r))

// M = E (MM | MR)*
const M =
    sequence(
        E,
        repeat(
            optional(
                choice(
                    MM, MR))))

// AA = '+' M
const AA =
    sequence(
        wordIs('+'),
        M.productNT((l, r) => l + r))

// AM = '-' M
const AM =
    sequence(
        wordIs('-'),
        M.productNT((l, r) => l - r))

// A = M (AA | AM)*
A.ref =
    sequence(
        M,
        repeat(
            optional(
                choice(
                    AA, AM))))

// now use it!
const ctx = new Context('(2+3)*4')
A.parse(ctx)
console.log('result:', ctx.result); // result: 20
```
That's it, no need to define and maintain some definition files outside of the project and in different languages, everything is embeded, typed and compiled :relaxed:.
