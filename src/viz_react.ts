
export interface NodeElement {
    type:string
    props:any
    parent:NodeElement|null
    children:NodeElement[]
}
export type RComp = (props:any) => NodeElement
export type Lam = ()=> any

type UseStateResult = [any,any]
class States {
    private index: number;
    private states: any[];
    constructor() {
        this.index = -1
        this.states = []
    }
    next(lam: Lam):UseStateResult {
        this.index++
        let n = this.index
        let state = this.states[n]
        if(!state) state = lam()
        let set_state = (v) => this.states[n] = v
        return [state,set_state]
    }

    clone() {
        let states = new States()
        states.states = this.states.slice()
        return states
    }
}
class Effects {
    private index: number;
    private effects: any[];
    constructor() {
        this.index = -1
        this.effects = []
    }

    next(l: Lam):void {
        this.index++
        let state = this.effects[this.index]
        l()
        return
    }
}

class NodeState {
    private readonly _states:States
    private readonly _effects: Effects;
    name: string;
    child_index: number;
    children: NodeState[]
    elem: NodeElement | null;
    _old: NodeState | null;
    constructor(old:NodeState|null) {
        this._old = old
        this._states = new States()
        this._effects = new Effects()
        this.name = "unknown"
        this.child_index = -1
        this.children = []
        this.elem = null
        if(old) {
            this._states = old._states.clone()
        }
    }

    states():States {
        return this._states
    }
    effects():Effects {
        return this._effects
    }
}

class Result {
    private _tree: NodeElement;
    private _stack: NodeState[];
    private _old: Result;

    constructor(old: Result) {
        this._old = old
        this._stack = []
        if(this._old) {
            this._stack.push(new NodeState(old._stack[0]))
        } else {
            this._stack.push(new NodeState(null))
        }
    }

    start_node(fun:RComp): void {
        // @ts-ignore
        // l("starting comp",fun.name)
        let parent = this.current()
        parent.child_index += 1
        let current:NodeState = null
        if(this._old) {
            current = new NodeState(parent._old.children[parent.child_index])
        } else {
            current = new NodeState(null)
        }
        current.name = fun.name
        this._stack.push(current)
        parent.children.push(current)
        // l("full path is",this._calc_path())
    }

    end_node(ret: NodeElement) {
        // l("ending comp",ret)
        let cur = this.current()
        cur.elem = ret
        cur.elem.children.forEach(ch => {
            ch.parent = cur.elem
        })
        //fix parent
        this._stack.pop()
        // let parent = this.current()
        // console.log("parent is",parent)
        // l("parent is",this._stack[this._stack.length-1])
    }

    current():NodeState {
        return this._stack[this._stack.length-1]
    }
    tree():NodeElement {
        return this._stack[0].children[0].elem
    }

    private _calc_path() {
        let path = ""
        for(let n of this._stack) {
            let ns:NodeState = n
            path += ":"+ns.name +"["+ns.child_index+"]"
        }
        return path
    }

    dump() {
        console.log('state. tree',this._tree)
        console.log("state. stack",this._stack)
        console.log("============")
    }
}

let GLOBAL_STATE:Result = null
export function renderTree(old:Result|null, fun:RComp|string):Result {
    GLOBAL_STATE = new Result(old)
    renderElement(fun,{})
    // RESULT.dump()
    return GLOBAL_STATE
}

export function renderElement(fun:RComp|string, props={}, children=[]):NodeElement {
    if(typeof fun === 'string') {
        return { type:fun, props, children:children, parent:null}
    }
    GLOBAL_STATE.start_node(fun as RComp)
    let ret = (fun as RComp)(props)
    if(!ret) throw new Error(`function ${fun} returns empty`)
    GLOBAL_STATE.end_node(ret)
    return ret
}


export function useState(l:Lam):UseStateResult {
    return GLOBAL_STATE.current().states().next(l)
}
export function useEffect(l:Lam):void {
    return GLOBAL_STATE.current().effects().next(l)
}

