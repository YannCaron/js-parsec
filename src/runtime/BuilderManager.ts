import { Stack, StringBuilder } from '@cyann/js-commons'

export default class BuilderManager {

    readonly _builders: Stack<StringBuilder>

    get current(): StringBuilder {
        return this._builders.last
    }

    get pos(): number {
        return this._builders.length
    }

    set pos(value: number) {
        this._builders.splice(value)
    }

    get builderPos(): number {
        return this.current?.length
    }

    set builderPos(value: number) {
        this.current?.splice(value)
    }

    constructor() {
        this._builders = new Stack<StringBuilder>()
    }

    create(): void {
        this._builders.push(new StringBuilder())
    }

    append(symbol: string): void {
        this.current?.append(symbol)
    }

    consume(): StringBuilder | undefined {
        return this._builders.pop()
    }

}
