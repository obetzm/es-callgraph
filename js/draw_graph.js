
//let cytoscape = require("cytoscape");
let cytosnap = require("cytosnap");
cytosnap.use(["cytoscape-cose-bilkent"]);
let renderer = cytosnap();


function convert_callgraph_to_cytoscape(cg) {
    return [...cg.nodes]
        .map((n) => ({ data: {
            id: n.value,
            label: n.label,
            parent: (n.type === "lambda") ? `lambda_${n.group}` : undefined,
            type: n.type
        }}))
        .concat(
            [...cg.edges]
                .map((e) => ({ data: {
                    id: e.from.value+"->"+e.to.value,
                    source: e.from.value,
                    target: e.to.value,
                    type: e.type || "plain"
                }}))
        )
        .concat(
            [...[...cg.nodes]
                .filter((n)=>n.type === "lambda")
                .reduce((a,n)=> a.add("lambda_"+n.group), new Set())]
                .map((l) => ({ data: { id: l, type: 'group'}})));


}

function draw_graph(call_graph) {
    return renderer.start().then(()=> renderer.shot({
        elements: convert_callgraph_to_cytoscape(call_graph),
        layout: {
            name: 'cose-bilkent',
            fit: true,
            idealEdgeLength: 80,
        },
        style: [{
                selector: 'node',
                style: {
                    'label': 'data(label)',
                    'text-rotation': 'autorotate'
                }
            },
            { selector: 'node[type="lambda"]', style: {'background-color': '#50b080'} },
            { selector: 'node[type="Schedule"]', style: {'background-color': '#502050'} },
            { selector: 'node[type="stream"]', style: {'background-color': '#ff6600'} },
            { selector: 'node[type="Stream"]', style: {'background-color': '#ff6600'} },
            { selector: 'node[type="http"]', style: {'background-color': '#6688EE'} },
            { selector: 'node[type="Api"]', style: {'background-color': '#6688EE'} },
            {
                selector: 'edge',
                style: {
                    'curve-style': 'bezier',
                    'target-arrow-shape': 'triangle'
                }
            },
            { selector: 'edge[type="dashed"]', style: {'line-style': 'dashed', 'line-color': '#dd7722'}}

            ],
        height: 600,
        width: 800
    }));
}


module.exports = {
    draw_graph: draw_graph
};