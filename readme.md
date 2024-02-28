# js-parsec 

**Js-Parsec** is another **LL(1) soon a LL(*)** parser written in TypeScript.

Why another Parser in Js/Ts ? Because **Js-Parsec** embrase great emphasis to define as **simple** and **clean** grammar definition as possible.

Rather than *classical* parsers that definition is frequently based on **BNF** familly languages, **Js-Parsec** is based on a **Combinator Framework** approach.


> :bulb: Because, by definition, what is BNF, if it is not a **Domain Specific Language** ? And rather that going through the chain ```Lexer + Parser = AST```, imagine you directly write the **AST** itself with factories.
That is the essence of Js-Parsec to be an **Embeded DSL**.

## Installation

Install it from NPM: `npm install --save @cyann/js-parsec`

> :golf: Practice it with: [grammar-lab](http://grammar.kids-lab.io). Inspire you from the living examples, build your own BNF grammar, **copy / past** from **Js-Parsec** tab to your project and enjoy it :relaxed:!
>
> the **grammar-lab** front-end:
> [![grammar-lab](/res/img/grammar-lab.png?raw=true "grammar-lab")](http://grammar.kids-lab.io)
> grammar-lab allow you to:
> - [X] - write your own BNF grammar
> - [X] - represent it in **rail-road diagram** style
> - [X] - build your **Js-Parsec** script
> - [X] - build it into pure vanilla-js LL(1) parser
> - [X] - Try it with the syntax color your choosen
> - [X] - Execute your new language
> - [X] - Draw the AST your code has given
>
> ... and much more :wink: ...

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
        repeat(optional(choice(MM, MR))))

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
        repeat(optional(choice(AA, AM))))

// now use it!
const ctx = new Context('(2+3)*4')
A.parse(ctx)
console.log('result:', ctx.result); // result: 20
```
That's it, no need to define and maintain some definition files outside of the project and in different languages, everything is embeded, typed and compiled :relaxed:.

## What's next

### Limitations

**js-parsec** is based on a **Left to right, left most derivation**, it means that left recursion lead to infinite recursion.

Avoid the left recursions **e.g.**:
```js
const A = expression()
const M = expression()

// I = [0-9]+
const I = repeat(charInInterval('0', '9'))

// M = M '*' M | I
M.ref = sequence(M, wordIs('*'), M).or(I)

// A = A '+' A | M
A.ref = sequence(A, wordIs('+'), A).or(M)
// will lead to infinite recursion
```

To avoid that, you must modify the grammar to remove the left recursion by replacing it by a right recursion.
> Use the replacement formula founded [here](https://www.tutorialspoint.com/what-is-left-recursion-and-how-it-is-eliminated):
> $$A \rightarrow A\alpha | \beta \implies \begin{matrix*}[l] A \rightarrow \beta A' \\ A' \rightarrow \alpha A' | \epsilon
\end{matrix*}
$$

```js
const A = expression()
const M = expression()

// I = [0-9]+
const I = repeat(charInInterval('0', '9'))

// M = I ('*' M)?
M.ref = sequence(
    I, 
    optional(sequence(wordIs('*'), M)))

// A = M ('+' A)?
A.ref = sequence(
    M, 
    optional(sequence(wordIs('+'), A)))
// will works!
```
