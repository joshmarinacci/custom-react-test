import {deepStrictEqual} from "assert"

function clean(node: object) {
    let obj = {}
    const skip = ['on_click']
    Object.keys(node).forEach(key => {
        if(skip.includes(key))return
        let val = node[key]
        if(typeof val === 'object') val = clean(val)
        obj[key] = val
    })
    return obj
}
function l(...args: any) {
    console.log(...args)
}

type UseStateResult = [any,any]
class States {
    private index: number;
    private states: any[];
    constructor() {
        this.index = -1
        this.states = []
    }
    next(l: Lam):UseStateResult {
        this.index++
        let state = this.states[this.index]
        if(!state) state = l()
        let set_state = () => {
        }
        return [state,set_state]
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
    constructor() {
        this._states = new States()
        this._effects = new Effects()
    }

    states():States {
        return this._states
    }
    effects():Effects {
        return this._effects
    }
}
interface TreeState {
}
interface NodeElement {
}
type RComp = (props:any) => NodeElement
type Lam = ()=> any

class Result {
    private _current:NodeState
    private _tree: NodeElement;
    constructor() {
        this._current = null
    }
    start_node(fun:RComp): void {
        // @ts-ignore
        l("starting comp",fun.name)
        this._current = new NodeState()
    }

    end_node(ret: NodeElement) {
        l("ending comp",ret)
        this._tree = ret
    }

    current():NodeState {
        return this._current
    }
    tree():NodeElement {
        return this._tree
    }
}

let RESULT:Result = null
function RT(old:Result|null,fun:RComp|string):Result {
    RESULT = new Result()
    RE(fun,{})
    return RESULT
}

function RE(fun:RComp|string,props={}) {
    if(typeof fun === 'string') {
        return { type:fun, props}
    }
    RESULT.start_node(fun as RComp)
    let ret = (fun as RComp)(props)
    if(!ret) throw new Error(`function ${fun} returns empty`)
    RESULT.end_node(ret)
}



function useState(l:Lam):UseStateResult {
    return RESULT.current().states().next(l)
}
function useEffect(l:Lam):void {
    return RESULT.current().effects().next(l)
}


{
    const simple: RComp = () => {
        return RE("text", {text: "hi"})
    }
    // console.log(RT(null, simple))
    deepStrictEqual(RT(null, simple).tree(), {type: "text", props: {text: "hi"}},'simple')
}

{
    const with_state: RComp = () => {
        const [name, set_name] = useState(() => "bob")
        return RE("text", {text: `hi ${name}`})
    }
    deepStrictEqual(RT(null, with_state).tree(), {type: "text", props: {text: "hi bob"}},'with state')
}

{
    const two_levels:RComp = () => {
        return RE("group",{
            children:[
                RE("text",{text:"foo"}),
                RE("text",{text:"bar"}),
            ]
        })
    }
    deepStrictEqual(RT(null, two_levels).tree(), {
        type:"group",
        props:{
            children:[
                {type: "text", props: {text: "foo"}},
                {type: "text", props: {text: "bar"}},
            ]
        },
    },two_levels.name)
}


{
    const with_click:RComp = () => {
        const [name, set_name] = useState(() => "bob")
        const [count, set_count] = useState(()=>1)
        l("rendering with click",name,count)
        return RE("text", {text: `hi ${name} ${count} times`,on_click:()=>{
            set_name("bill")
            set_count(count+1)
        }})
    }
    let state1 = RT(null, with_click)
    deepStrictEqual(clean(state1.tree()),{type:"text", props:{text:"hi bob 1 times"}},'with_click')
    // let state2 = RT(state1,with_click)
    // assert_deep_equals(state2.tree,{type:"text",props:{text:"hi bill 2 times"}})

}

