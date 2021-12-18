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


const RENDERERS = {
    "group":(ctx,node,canvas)=>{
        ctx.save()
        // ctx.translate(node.props.x,node.props.y)
        node.children.forEach(ch => draw_node(canvas,ctx,ch))
        ctx.restore()
    }
}

function draw_node(canvas:HTMLCanvasElement,c:CanvasRenderingContext2D,node:NodeElement) {
    if(RENDERERS[node.type]) RENDERERS[node.type](c,node,canvas)
    if(node.props.render) return node.props.render(c)
}
function draw_canvas(canvas: any, root:NodeElement) {
    // console.log('drawing canvas',root)
    let c = canvas.getContext('2d')
    c.fillStyle = '#f0f0f0'
    c.fillRect(0,0,canvas.width,canvas.height)
    draw_node(canvas,c,root)
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


function find_node_at_point(pt: Point, root: NodeElement):NodeElement|null {
    if(root.type==='bounds') {
        if(pt.x < root.props.x) return null
        if(pt.y < root.props.y) return null
        if(pt.x > root.props.x + root.props.w) return null
        if(pt.y > root.props.y + root.props.h) return null
        return root
    }
    for(let ch of root.children) {
        let res = find_node_at_point(pt,ch)
        if(res) return res
    }
    return null
}

async function start() {
    const $ = (sel) => document.querySelector(sel)
    const on = (el,type,cb) => el.addEventListener(type,cb)

    const Button:RComp = ({id,text="empty"}) => {
        const [active, setActive] = useState(()=>false)
        return renderElement("group", {
            id,
            on_click: () => {
                setActive(!active)
            },
        },[
            renderElement(RECT,{x:0,y:0,w:40,h:40,fill:(active)?"aqua":"blue"}),
            renderElement(TEXT,{x:10,y:10,text:text}),
        ])
    }
    const with_button:RComp = () => {
        return renderElement("group",{},[
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
        console.log("clicked at",pt)
        let target = find_node_at_point(pt,results.tree())
        console.log("target is",target)
        if(target) {
            if(target.props.on_click) {
                target.props.on_click()
            } else {
                console.log("target doesn't have click. check parent")
                if(target.parent.props.on_click) {
                    target.parent.props.on_click()
                    redraw()
                }
            }
        }
        // results = renderTree(results,with_button)
        // draw_canvas(canvas,results.tree())
    })
    redraw()
}
start().then(()=>console.log("started"))

