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
    name: string;
    child_index: number;
    children: NodeState[]
    elem: NodeElement | null;
    constructor() {
        this._states = new States()
        this._effects = new Effects()
        this.name = "unknown"
        this.child_index = -1
        this.children = []
        this.elem = null
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
    type:string
    props:any
}
type RComp = (props:any) => NodeElement
type Lam = ()=> any

class Result {
    private _tree: NodeElement;
    private _stack: NodeState[];
    constructor() {
        this._stack = []
        let top = new NodeState()
        this._stack.push(top)
    }
    start_node(fun:RComp): void {
        // @ts-ignore
        l("starting comp",fun.name)
        let parent = this.current()
        parent.child_index += 1
        let current = new NodeState()
        current.name = fun.name
        this._stack.push(current)
        parent.children.push(current)
        l("full path is",this._calc_path())
    }

    end_node(ret: NodeElement) {
        l("ending comp",ret)
        let cur = this.current()
        cur.elem = ret
        //fix parent
        this._stack.pop()
        let parent = this.current()
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

let RESULT:Result = null
function RT(old:Result|null,fun:RComp|string):Result {
    RESULT = new Result()
    RE(fun,{})
    // RESULT.dump()
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
    return ret
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
    const line:RComp = ({name="what?"}) => {
        return RE("text",{text:name})
    }
    const two_fun_levels:RComp = () => {
        return RE("group",{
            children:[
                RE(line,{name:"foo"}),
                RE(line,{name:"bar"}),
            ]
        })
    }
    deepStrictEqual(RT(null, two_fun_levels).tree(), {
        type:"group",
        props:{
            children:[
                {type: "text", props: {text: "foo"}},
                {type: "text", props: {text: "bar"}},
            ]
        },
    },two_fun_levels.name)
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


/*

manually find and execute the on_click by searching for the node by ID
then render again and see if its updated correctly. number in text should be updated

then again when two levels deep. number in text should be updated

 */
