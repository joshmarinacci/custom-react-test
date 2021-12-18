import {NodeElement, RComp, renderElement, renderTree, useState} from "./viz_react.js"

class Point {
    readonly x: any;
    readonly y: any;
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


function draw_canvas(canvas: any, root:NodeElement) {
    let c = canvas.getContext('2d')
    c.fillStyle = '#f0f0f0'
    c.fillRect(0,0,canvas.width,canvas.height)
    if(root.props.render) return root.props.render(c)
}

const RECT:RComp = ({x,y,w,h,fill}) => {
    return renderElement("bounds",{x,y,w,h,fill,render:(c)=>{
            c.fillStyle = fill
            c.fillRect(x,y,w,h)
        }})
}

const TEXT:RComp = ({x,y,text}) => {
    return renderElement("generic",{x,y,render:(c)=>{
            c.font = '16px sans-serif'
            c.fillStyle = 'black'
            c.fillText(text,20,30)
        }})
}
const GROUP:RComp = ({x=0,y=0,...rest},children:any):NodeElement => {
    return renderElement("generic",{
        x,y,...rest,
        render:c => {
            c.save()
            c.translate(x,y)
            children.forEach(ch => {
                if(ch.props.render) return ch.props.render(c)
            })
            c.restore()
        }
    },children)
}


function find_node_at_point(pt: Point, root: NodeElement):NodeElement|null {
    for(let ch of root.children) {
        let res = find_node_at_point(pt,ch)
        if(res) return res
    }
    if(root.type==='bounds') {
        if(pt.x < root.props.x) return null
        if(pt.y < root.props.y) return null
        if(pt.x > root.props.x + root.props.w) return null
        if(pt.y > root.props.y + root.props.h) return null
        return root
    }
    return null
}

function find_node_or_parent_with_prop(root: NodeElement, name: string) {
    if(!root) return null
    if(root.props.hasOwnProperty(name)) return root
    if(root.parent) return find_node_or_parent_with_prop(root.parent,name)
    return null
}

async function start() {
    const $ = (sel) => document.querySelector(sel)
    const on = (el,type,cb) => el.addEventListener(type,cb)

    const Button:RComp = ({id,text="empty"}) => {
        const [active, setActive] = useState(()=>false)
        const [hover, setHover] = useState(()=>false)
        let fill = "blue"
        if(hover) fill = "yellow"
        if(active) fill = "aqua"
        return renderElement(GROUP, {
            x:0,
            id,
            on_click: () => {
                setActive(!active)
            },
            on_mousemove:(pt) => {
                setHover(true)
            }
        },[
            renderElement(RECT,{x:0,y:0,w:40,h:40,fill:fill}),
            renderElement(TEXT,{x:10,y:10,text:text}),
        ])
    }
    const with_button:RComp = () => {
        return renderElement(GROUP,{},[
            renderElement(Button,{id:"foo",text:"foo"}),
        ])
    }

    let results = null
    const canvas = $("canvas")
    function redraw() {
        results = renderTree(results, with_button)
        requestAnimationFrame(()=>{
            draw_canvas(canvas,results.tree())
        })
    }
    on(canvas,'click',(e) => {
        let pt = browserToCanvas(e)
        let target = find_node_at_point(pt,results.tree())
        target = find_node_or_parent_with_prop(target,"on_click")
        if(target && target.props.on_click) {
            target.props.on_click()
            redraw()
        }
    })
    on(canvas,'mousemove',(e)=>{
        let pt = browserToCanvas(e)
        let target = find_node_at_point(pt,results.tree())
        target = find_node_or_parent_with_prop(target, "on_mousemove")
        if(target) {
            target.props.on_mousemove(e)
            redraw()
        }
    })
    redraw()
}
start().then(()=>console.log("started"))


/*

make events work inside a translated group
make button that can size itself based on the text and a global font size
make three buttons w/ backgrounds and borders and text
make button increase and decrease global font scale

when you click a button make it print to the console
when you click a button make it animate away. needs animation object and an anim engine hooks to the canvas renderer

 */
