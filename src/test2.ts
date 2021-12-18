import {deepStrictEqual} from "assert"
import * as util from "util";
import {NodeElement, RComp, RE, RT, useState} from "./viz_react.js";

function clean(node: object) {
    let obj = {}
    const skip = ['on_click']
    Object.keys(node).forEach(key => {
        if(skip.includes(key))return
        let val = node[key]
        // console.log("val is",key,Array.isArray(val), val)
        if(Array.isArray(val)) {
            val = val.map(v => clean(v))
        } else if(typeof val === 'object') {
            val = clean(val)
        }
        obj[key] = val
    })
    return obj
}
function find_by_id(root: NodeElement, id: string) {
    if(root.props.id && root.props.id === id) return root
    for(let ch of root.props.children) {
        let match = find_by_id(ch,id)
        if(match) return match
    }
    return undefined
}
function l(...args: any) {
    console.log(...args)
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
    const three_fun_levels:RComp = () => {
        return RE(two_fun_levels)
    }
    deepStrictEqual(RT(null,three_fun_levels).tree(),{
        type:"group",
        props:{
            children:[
                {type: "text", props: {text: "foo"}},
                {type: "text", props: {text: "bar"}},
            ]
        },
    },three_fun_levels.name)
}



{
    const with_click:RComp = () => {
        const [name, set_name] = useState(() => "bob")
        const [count, set_count] = useState(()=>1)
        return RE("text", {id:"tb",text: `hi ${name} ${count} times`,on_click:()=>{
            set_name("bill")
            set_count(count+1)
        }})
    }
    let state1 = RT(null, with_click)
    deepStrictEqual(clean(state1.tree()),{type:"text", props:{id:"tb", text:"hi bob 1 times"}},'with_click')
    find_by_id(state1.tree(),"tb").props.on_click()
    let state2 = RT(state1,with_click)
    deepStrictEqual(clean(state2.tree()),{type:"text",props:{id:"tb",text:"hi bill 2 times"}})

}

{
    const Button:RComp = ({id,text="empty"}) => {
        const [active, setActive] = useState(()=>1)
        console.log("rendering Button with active = ",active)

        return RE("group",{
            id,
            on_click:()=> {
              console.log("onclick happening")
                setActive(2)
            },
            children:[
                RE("rect",{x:0,y:0,w:40,h:40,fill:(active===1)?"aqua":"blue"}),
                RE("text",{x:10,y:10,text:text}),
            ]})
    }
    const with_button:RComp = () => {
        return RE("group",{children:[
            RE(Button,{id:"foo",text:"foo"}),
        ]})
    }
    let state1 = RT(null, with_button)
    // console.log("doing here")
    console.log(util.inspect(state1.tree(),{depth:10}))
    deepStrictEqual(clean(state1.tree()),{
        type:'group',
        props:{
            children:[
                {
                    type:"group",
                    props:{
                        id:"foo",
                        children:[
                            {type:"rect",props:{x:0,y:0,w:40,h:40,fill:"aqua"} },
                            {type:"text",props:{x:10,y:10, text:"foo"} },
                        ]
                    }
                },
            ]
        },
    },'with_button')

    find_by_id(state1.tree(),"foo").props.on_click()
    let state2 = RT(state1,with_button)

    deepStrictEqual(clean(state2.tree()),{
        type:'group',
        props:{
            children:[
                {
                    type:"group",
                    props:{
                        id:"foo",
                        children:[
                            {type:"rect",props:{x:0,y:0,w:40,h:40,fill:"blue"} },
                            {type:"text",props:{x:10,y:10, text:"foo"} },
                        ]
                    }
                },
            ]
        },
    },'with_button')
}


/*

//manually find and execute the on_click by searching for the node by ID
//then render again and see if its updated correctly. number in text should be updated
//then again when two levels deep. number in text should be updated

 */
