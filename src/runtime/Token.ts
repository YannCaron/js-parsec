import {TokenType} from "./TokenType"

export default class Token {

    static DEFAULT_TYPE = TokenType.NULL

    private _symbol: string
    private _pos: number
    private _type: TokenType

    get symbol(): string  {
        return this._symbol
    }

    get pos(): number {
        return this._pos
    }

    get type(): TokenType {
        return this._type
    }

    constructor(symbol: string, pos: number, type: TokenType = Token.DEFAULT_TYPE) {
        this._symbol = symbol
        this._pos = pos
        this._type = type
    }

}