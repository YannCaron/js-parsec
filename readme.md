# js-parsec 

**Js-Parsec** is another **PEG** parser written in TypeScript.

Why another Parser in Js/Ts ? Because **Js-Parsec** embrase great emphasis to define as **simple** and **clean** grammar definition as possible.

Rather than *classical* parsers that definition is frequently based on **BNF** familly languages, **Js-Parsec** is based on a **Combinator Framework** approach.

> :bulb: Because, by definition, what is BNF, if it is not a **Domain Specific Language** ? And rather that going through the chain ```Lexer + Parser = AST```, imagine you directly write the **AST** itself with factories.
That is the essence of Js-Parsec to be an **Embeded DSL**.

## Installation

Install it from NPM: `npm install --save @cyann/js-parsec`

In this workspace, `@cyann/js-commons` uses the adjacent `../js-commons`
checkout. Install its dependencies with `npm ci --prefix ../js-commons`, then
run `npm ci` here. `npm run build` and `npm test` rebuild Commons first.

### TypeScript playground

With Node.js 24, run `npm start` to execute `playground.ts` directly, or
`npm run dev` to restart it whenever that file or its imported sources change.
Both commands rebuild the local Commons dependency before starting.

The example parses an addition and prints `12+30 = 42`. Edit `playground.ts`
to experiment, or pass another input with `npm start -- "7+8"` (also supported
with `npm run dev -- "7+8"`).

> :golf: Practice it with: [grammar-lab](about:blank). Take inspiration from the living examples, try it with your source code, build your own BNF grammar and **download it** from **Js-Parsec** tab. And... enjoy :relaxed:!
>
> the **grammar-lab** front-end:
> [![grammar-lab](./res/img/grammar-lab.png?raw=true "grammar-lab")](about:blank)
> grammar-lab allow you to:
> - [X] - write your own BNF grammar
> - [X] - represent it in **rail-road diagram** style
> - [X] - build your **Js-Parsec** script and download it
> - [X] - build it into pure vanilla-js LL(1) parser
> - [X] - try it with the syntax color your choosen
> - [X] - execute your new language
> - [X] - draw the AST your code has given
>
> ... and much more :wink: ...

## Runtime context

`Context` exposes runtime state through five managers:

| Manager | State and operations |
| --- | --- |
| `sourceManager` | `pos`, `current`, `enhancedSource`, `next()`, `assertComplete()` |
| `tokenManager` | `tokens`, `pos`, `create()`, `append()`, `consume()` |
| `symbolManager` | `current`, `pos`, `builderPos`, `create()`, `append()`, `consume()` |
| `instructionTapeManager` | `queue`, `length`, `append()`, `apply()`, `removeFrom()` |
| `productionManager` | `stack`, `pos`, `result`, `uniqueResult`, `append()`, `consume()`, `restore()`, `produce()` |

Manager implementations live in `src/runtime/manager/`. Backtracking and
memoization live in `src/runtime/handler/` (`BacktrackingHandler` and
`MemoizerHandler`, exposed by `Context.memoizerHandler`). `Context`, `Token`,
`TokenType`, `Result` and `Utils` remain in `src/runtime/`. Public imports from
`@cyann/js-parsec` are unchanged; direct source imports use the new subdirectories.

Use `ctx.sourceManager.pos`, `ctx.tokenManager.tokens` and
`ctx.productionManager.result` instead of the removed `Context` properties.
`Context.next()` coordinates source advancement with token creation and captures.
Reading `productionManager.result` still rejects a partially parsed source;
reading `productionManager.stack` returns the current values without that check.
`uniqueResult` preserves its previous behavior, including returning a single
produced value directly. A standalone `ProductionManager` receives its
`SourceManager` in its constructor.

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
console.log('result:', ctx.productionManager.result); // result: 20
```
That's it, no need to define and maintain some definition files outside of the project and in different languages, everything is embeded, typed and compiled :relaxed:.

## Code flavors

### Abstract

Man can choose to configure the parser in two different flavors:
- By using factory functions:
e.g.: 
```js
// A '.' B
sequence(A, wordIs('.'), B)
```
- By using fluent way:
e.g.:
```js
// A '.' B
A.then(wordIs('.')).then(B)
```
> :warning: With fluent flavour, because all fluent method will encapsupate previous one as child expression, pay attention to order of operations.

### Correspondances

Every factory has is corresponding fluent function:

Factory | Fluent function
:- | :-
sequence(exp1, exp2) | exp1.then(exp2)
choice(exp1, exp2) | exp1.or(exp2)
optional(exp) | exp.optional()
repeat(exp) | exp.repeat()
productT(exp, lambda) | exp.productT(lambda)
productNT(exp, lambda) | exp.productNT(lambda)

## Limitations

### Left recursion

:warning: **js-parsec** is based on a **Left to right, left most derivation**, it means that left recursion lead to infinite recursion.

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
> :bulb: Use the following replacement:
>
> A → Aα | β ⇒  A  → βA'  
> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;A' → αA' | ε  


As well:
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
