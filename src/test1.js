/* features
 + turn function components into a tree struct for drawing
 + draw the tree struct to a canvas
 - add zoom controls to scale everything based on font size
 - support multiple useState in a single component
 - support deeper nesting of components
 dispatch click
   - find the deepest node under the cursor
   - send to child or up the tree for mouse clicks
   - needs a general fast pick function
 - button control. set x&y&text. w&h calculated from text. single default font.
*/

// ============== framework
function l(...args) {
    console.log("LOG",...args)
}

const CANVAS_NODE = Symbol("CanvasNode")

class RenderState {
    constructor(prev) {
        this.dirty = false
        this.prev = prev
        this.stack = []
    }
    push(state) {
        if(this.prev && this.prev.tree) {
            let pn = this.prev.tree
            state.merge_previous(pn)
        }
        this.stack.push(state)
    }
    current() {
        return this.stack[this.stack.length-1]
    }
    pop() {
        let state = this.stack.pop()
        state.pop()
        return state
    }
    dump() {
        l("\n=== RenderState",this.stack,'\n===')
    }
    isDirty() {
        return this.dirty
    }
}
let RENDER_STATE = null


class NodeState {
    constructor(name) {
        this.name = name
        this.state = {}
        this.state.count = -1
        this.state.states = []
    }
    pop() {
        // console.log("fixing state count")
        this.state.count = -1
    }
    merge_previous(pn) {
        // console.log("merging from previous",pn)
        if(pn.state.name !== this.name) {
            console.log("cant merge from different node")
            return
        }
        this.state.states = pn.state.state.states
    }
}

function Render(fun,props) {
    if(fun === CANVAS_NODE) return {type:"CANVAS_NODE",props:props}
    // l(`call '${fun.name}' `,props)
    RENDER_STATE.push(new NodeState(fun.name))
    let ret = fun(props)
    // RENDER_STATE.dump()
    if(!ret) throw new Error(`function ${fun.name} returns empty`)
    ret.state = RENDER_STATE.pop()
    return ret
}

function findProp(node, name) {
    // console.log('find prop',node,name)
    if(node.props && node.props.hasOwnProperty(name)) {
        return node
    }
    if(node.props.children) {
        return node.props.children.find(child => findProp(child,name))
    }
    return undefined
}

function RenderTree(prev,fun,props) {
    RENDER_STATE = new RenderState(prev)
    let tree = Render(fun,props)
    // l("return tree is",tree)
    return {
        send_click:(pt) => {
            l("sending a click at",pt)
            let click_node = findProp(tree,'click')
            if(click_node) click_node.props.click()
        },
        tree:tree,
        state:RENDER_STATE
    }
}

function useState(val) {
    let node = RENDER_STATE.current()
    node.state.count+=1
    let count = node.state.count
    let cval = node.state.states[count]
    if(!cval) {
        node.state.states[count] = val()
        cval = node.state.states[count]
    }
    let set_val = (new_val) => {
        node.state.states[count] = new_val
        RENDER_STATE.dirty = true
    }
    return [ node.state.states[count], set_val ]
}

function Text({title, click=null}) {
    return Render(CANVAS_NODE, {
        text:title,
        click,
        render:(ctx,canvas)=>{
            ctx.font = '16px sans-serif'
            ctx.fillStyle = 'black'
            ctx.fillText(title,20,30)
        }
    })
}
function Rect({x=0,y=0,w=10,h=10,fill='red'}) {
    return Render(CANVAS_NODE,{x,y,w,h,fill,
        render:(ctx,canvas)=>{
            ctx.fillStyle = fill
            ctx.fillStyle = fill
            ctx.fillRect(x,y,w,h)
        }})
}
function Group({x=0, y=0, children=[]}) {
    return Render(CANVAS_NODE,{x,y,children,
        render:(ctx,canvas)=>{
            ctx.save()
            ctx.translate(x,y)
            children.forEach(ch => draw_node(canvas,ctx,ch))
            ctx.restore()
        }})
}

// ========= canvas specific code =====
function draw_node(canvas,c,node) {
    if(node.props.render) return node.props.render(c,canvas)
}

function draw_canvas(canvas,results) {
    console.log('drawing canvas',results)
    let c = canvas.getContext('2d')
    c.fillStyle = '#f0f0f0'
    c.fillRect(0,0,canvas.width,canvas.height)
    draw_node(canvas,c,results.tree)
}

class Point {
    constructor(x, y) {
        this.x = x
        this.y = y
    }
    subtract(pt) {
        return new Point(this.x-pt.x,this.y-pt.y)
    }

}

function browserToCanvas(e) {
    let pt = new Point(e.clientX, e.clientY)
    let rect = e.target.getBoundingClientRect()
    return pt.subtract(new Point(rect.x,rect.y))
}

// ========= user code ================

function greetings({title, w=30, h=30}) {
    const [foo, setFoo] = useState(()=>"foo")
    const [count, setCount] = useState(()=>66)
    l("greetings with",foo,count)
    return Render(Group,{
        x:20,
        y:20,
        children:[
            Render(background, {w,h}),
            Render(Text,{
                title:`Greetings ${title} and foo=${foo} count=${count}`,
                click:()=>{
                    setCount(count+1)
                    setFoo((foo==="bar")?"foo":"bar")
                }
            }),
        ]
    })
}

function background({w=100,h=100}) {
    return Render(Rect,{
        x:5,
        y:5,
        w:w,
        h:h,
    })
}

async function start() {
    const $ = (sel) => document.querySelector(sel)
    const on = (el,type,cb) => el.addEventListener(type,cb)

    const canvas = $("canvas")
    let results = RenderTree(null,greetings, {title: "Earthling", w:300, h: 200})
    draw_canvas(canvas,results)
    on(canvas,'click',(e) => {
        results.send_click(browserToCanvas(e))
        if(results.state.isDirty()) {
            results = RenderTree(results,greetings,{title:"Earthling",w:300, h:200})
            draw_canvas(canvas,results)
        }
    })
}
start().then(()=>console.log("started"))

