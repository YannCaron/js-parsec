import { Stack } from "@cyann/js-commons"
import { Parsem } from "../../Parsem.ts"
import Context from "../Context.ts"

export default class LeftRecursionHandler<T> {

    //private _ctx: Context<T>

    constructor(_ctx: Context<T>) {
        //this._ctx = ctx
    }

    _recurse = new Map<Parsem<T>, number>()
    _continuation = new Stack<Parsem<T>>()

}
