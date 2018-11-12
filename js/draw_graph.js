
//let cytoscape = require("cytoscape");
let cytosnap = require("cytosnap");
cytosnap.use(["cytoscape-cose-bilkent"]);
let renderer = cytosnap();


function convert_callgraph_to_cytoscape(cg) {
    return [...cg.nodes]
        .map((n) => ({ data: {
            id: n.label,
            parent: (n.type === "lambda") ? `lambda_${n.group.label}` : undefined,
            type: n.type
        }}))
        .concat(
            [...cg.edges]
                .map((e) => ({ data: {
                    id: e.from.label+"->"+e.to.label,
                    source: e.from.label,
                    target: e.to.label
                }}))
        )
        .concat(
            [...[...cg.nodes]
                .filter((n)=>n.type === "lambda")
                .reduce((a,n)=> a.add("lambda_"+n.group.label), new Set())]
                .map((l) => ({ data: { id: l, type: 'group'}})));


}

function draw_graph(call_graph) {
    return renderer.start().then(()=> renderer.shot({
        elements: convert_callgraph_to_cytoscape(call_graph),
        layout: {
            name: 'cose-bilkent',
            fit: true,
        },
        style: [{
                selector: 'node',
                style: {
                    'label': 'data(id)',
                    'text-rotation': 'autorotate'
                }
            },
            { selector: 'node[type="lambda"]', style: {'background-color': '#50b080'} },
            { selector: 'node[type="http"]', style: {'background-color': '#6688EE'} },
            {
                selector: 'edge',
                style: {
                    'curve-style': 'bezier',
                    'target-arrow-shape': 'triangle'
                }
            }],
        height: 600,
        width: 800
    }));
}


module.exports = {
    draw_graph: draw_graph
};