function toDot(dependencies, properties) {

    const names = Object.keys(properties).filter(n => n != "");
    
    const objs = names.map(n => ({
        name  : n,
        props : properties[n],
    }));

    const groups = _.groupBy(objs, (o) => {
        const prop = o.props.filter(p => p.name == "分类")[0];
        return prop.value;
    });

    const groupNames = Object.keys(groups).filter(n => n != "");

    const rankGroups = groupNames.map(n => groups[n].map(o => o.name));

    const rankSpecs = rankGroups.map(arr => `{rank=same; ${arr.map(n => `"${n}"`).join(' ')}}`).join('\n');

    const personNames = [];
    
    names.forEach(n => {
        if (properties[n].some(p => p.name == "分类" && p.value == "人")) {
            personNames.push(n);
        }
    });

    const personSpecs = personNames.map(n => `"${n}" [shape=circle]`).join('\n');

    deps = dependencies.map(d => `"${d.from}" -> "${d.to}";`).join('\n');

    const nameDeclarations = names.map(n => `"${n}"`).join('\n');

    return `
digraph {

rankdir=LR;
node [shape=box];
edge [color=blue];

${rankSpecs}

${nameDeclarations}

${personSpecs}

${deps}
}
`
};
