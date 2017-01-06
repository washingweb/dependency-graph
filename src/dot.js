function toDot(dependencies, properties) {

    const names = Object.keys(properties).filter(n => n != "");
    
    const froms     = _.uniq(dependencies.map(d => d.from));
    const tos       = _.uniq(dependencies.map(d => d.to));
    const onlyFroms = _.difference(froms, tos);
    const onlyTos   = _.difference(tos, froms);

    const depNames  = _.uniq([].concat(froms).concat(tos));
    const isolatedNames = _.difference(names, depNames);

    const objs = names.map(n => ({
        name  : n,
        props : properties[n],
    }));

    const groups = _.groupBy(objs, (o) => {
        return o.props["分类"];
    });

    const groupNames = Object.keys(groups).filter(n => n != "");
    const rankGroups = groupNames.map(n => groups[n].map(o => o.name));
    const rankSpecs = rankGroups.map(arr => `{rank=same; ${arr.map(n => `"${n}"`).join(' ')}}`).join('\n');

    const personNames = [];
    const projectNames = [];
    names.forEach(n => {
        if (properties[n]["分类"] == "人") {
            personNames.push(n);
        } else if (properties[n]["分类"] == "项目") {
            projectNames.push(n);
        }
    });

    const notPersonNames  = _.difference(onlyTos, personNames);
    const notProjectNames = _.difference(onlyFroms, projectNames);

    const errorNames = _.uniq(
                            [].concat(notPersonNames)
                              .concat(notProjectNames)
                              .concat(isolatedNames));

    // specs
    const projectSpecs = projectNames.map(n => `"${n}" [shape=tab]`).join('\n');

    const personSpecs = personNames.map(n => `"${n}" [shape=circle]`).join('\n');

    const errorSpecs = errorNames.map(n => `"${n}" [color=red]`).join('\n');

    const nameDeclarations = names.map(n => `"${n}"`).join('\n');

    const deps = dependencies.map(d => `"${d.from}" -> "${d.to}";`).join('\n');

    return `
digraph {

rankdir=LR;
node [shape=box];
edge [color=blue];

${rankSpecs}

${nameDeclarations}

${projectSpecs}

${personSpecs}

${errorSpecs}

${deps}
}
`
};
