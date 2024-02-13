import { Stack } from "@cyann/js-commons";
import VisitContext from "./VisiteContext";

export default class StackVisitContext<T> extends VisitContext<T> {

    private readonly _stack: Stack<T>

    get stack(): Array<T> {
        return [...this._stack]
    }

    get result(): Array<T> | T {
        if (this._stack.length == 1)
            return this._stack.last

        return this.stack
    }

    constructor() {
        super()
        this._stack = new Stack<T>()
    }

    push(value: T) {
        this._stack.push(value)
    }

    pop() : T {
        return this._stack.pop()
    }

}