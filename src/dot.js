function toDot(dependencies, options) {

    deps = dependencies.map(d => `"${d.left}" -- "${d.right}";`).join('\n');

    return `
graph {

rankdir=LR;
node [shape=box];
edge [color=blue];

${deps}
}
`
};
