// features
// turn function components into a tree struct for drawing
// draw the tree struct to a canvas
// useState and useEffect trigger updates
// minimal state for areas of interest for mouse events
// +/- to zoom the entire UI
// all position and size values in rems based on base font size

// ============== framework
function l(...args) {
    console.log("LOG",...args)
}

const TEXT = Symbol("Text")
const RECT = Symbol("Rect")
const GROUP = Symbol("Group")

class RenderState {
    constructor(prev) {
        this.dirty = false
        this.prev = prev
        this.stack = []
    }
    push(state) {
        if(this.prev && this.prev.tree) {
            let pn = this.prev.tree
            // console.log("pushed with",state)
            // console.log("prev is",pn)
            state.state = pn.state
        }
        if(!state.state) state.state = {}
        this.stack.push(state)
    }
    current() {
        return this.stack[this.stack.length-1]
    }
    pop() {
        return this.stack.pop()
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
    }
}

function Render(fun,props) {
    if(fun === TEXT) {
        return {
            type:"TEXT",
            props:props
        }
    }
    if(fun === RECT) {
        return {
            type:"RECT",
            props:props,
        }
    }
    if(fun === GROUP) {
        return {
            type:"GROUP",
            props:props,
        }
    }
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
        send_click:(x,y) => {
            l("sending a click at",x,y)
            let click_node = findProp(tree,'click')
            if(click_node) click_node.props.click()
        },
        tree:tree,
        state:RENDER_STATE
    }
}

function useState(val) {
    let node = RENDER_STATE.current()
    if(!node.state.state_val) node.state.state_val = val()
    let set_val = (new_val) => {
        node.state_val = new_val
        RENDER_STATE.dirty = true
    }
    return [ node.state.state_val, set_val ]
}

function Text({title, click=null}) {
    return Render(TEXT, {text:title, click})
}

function Rect({x=0,y=0,w=10,h=10,fill='red'}) {
    return Render(RECT,{x,y,w,h,fill})
}
function Group({x=0, y=0, children=[]}) {
    return Render(GROUP,{x,y,children})
}



// ========= user code ================

// function greetings({title}) {
// 	return Render(Text,{title:`Greetings ${title}`})
// }


//const FOO = new EventSource()

/*function greetings({title}) {
  const [foo, setFoo] useState(()=>"foo")
  useEffect(()=> {
     const stuff = () => setFoo("bar")
     FOO.on("change",stuff)
     return () => FOO.off(stuff)
  })
	return render(text,{title:`Greetings ${title}`})
}
*/


function greetings({title}) {
    const [foo, setFoo] = useState(()=>"foo")
    return Render(Group,{
        x:20,
        y:20,
        children:[
            Render(background),
            Render(Text,{
                title:`Greetings ${title} and foo=${foo}`,
                click:()=>setFoo((foo==="bar")?"foo":"bar")
            }),
        ]
    })
}

function background() {
    return Render(Rect,{
        x:5,
        y:5,
        w:100,
        h:100,
    })
}

function draw_node(canvas,c,node) {
    if(node.type === 'TEXT') {
        c.font = '16px sans-serif'
        c.fillStyle = 'black'
        c.fillText(node.props.text,20,30)
    }
    if(node.type === 'RECT') {
        c.fillStyle = node.props.fill
        c.fillRect(node.props.x,node.props.y,node.props.w,node.props.h)
    }
    if(node.type === "GROUP") {
        c.save()
        c.translate(node.props.x,node.props.y)
        node.props.children.forEach(ch => draw_node(canvas,c,ch))
        c.restore()
    }
}

function draw_canvas(canvas,results) {
    console.log('drawing canvas',results)
    let c = canvas.getContext('2d')
    c.fillStyle = '#f0f0f0'
    c.fillRect(0,0,canvas.width,canvas.height)
    draw_node(canvas,c,results.tree)
}

{
    const $ = (sel) => document.querySelector(sel)
    const on = (el,type,cb) => el.addEventListener(type,cb)

    const canvas = $("canvas")
    let results = RenderTree(null,greetings, {title: "Earthling"})
    draw_canvas(canvas,results)
    on(canvas,'click',() => {
        results.send_click(5,5)
        if(results.state.isDirty()) {
            results = RenderTree(results,greetings,{title:"Earthling"})
            draw_canvas(canvas,results)
        }
    })
}

