import {
    Context,
    Result,
    charInInterval,
    choice,
    productNT,
    productT,
    repeat,
    sequence,
    wordIs
} from './index.ts'

const parser =
    sequence(
        choice(
            sequence(
                productT(wordIs('1'), () => 'a'),
                productT(wordIs('2'), () => 'b')
            ),
            sequence(
                productT(wordIs('1'), () => 'c'),
                productT(wordIs('3'), () => 'd')
            )
        ),
        productT(wordIs('4'), () => 'e')
    )

const ctx = new Context('134')

console.log(parser.parse(ctx))
