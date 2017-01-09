function toDot(dependencies, properties, nameSelected) {

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
    const taskNames = [];
    const repoNames = [];
    const bugNames  = [];

    names.forEach(n => {
        switch (properties[n]["分类"]) {
            case "人":
                personNames.push(n);
                break;
            case "项目":
                projectNames.push(n);
                break;
            case "任务":
                taskNames.push(n);
                break;
            case "repo":
                repoNames.push(n);
                break;
            case "bug":
                bugNames.push(n);
        }
    });

    rankTaskBugSpecs = `{rank=same; ${_.uniq([].concat(taskNames).concat(bugNames)).map(n => `"${n}"`).join(' ')}}\n`

    const notPersonNamesOrRepoNames  = _.difference(onlyTos, personNames.concat(repoNames));
    const notProjectNamesOrRepoNames = _.difference(onlyFroms, projectNames.concat(repoNames));

    const errorNames = _.uniq(
                            [].concat(notPersonNamesOrRepoNames)
                              .concat(notProjectNamesOrRepoNames)
                              .concat(isolatedNames));

    // specs
    const projectSpecs = projectNames.map(n => `"${n}" [shape=tab, fontsize=30, style=filled,fillcolor=azure3]`).join('\n');
    const taskSpecs    = taskNames.map(n => `"${n}" [shape=ellipse]`).join('\n');
    const bugSpecs     = bugNames.map(n => `"${n}" [shape=ellipse, fontcolor=darkviolet]`).join('\n');
    const personSpecs  = personNames.map(n => `"${n}" [shape=circle]`).join('\n');
    const repoSpecs    = repoNames.map(n => `"${n}" [shape=folder, fontsize=30, style=filled,fillcolor=azure3]`).join('\n');
    const errorSpecs = errorNames.map(n => `"${n}" [color=red]`).join('\n');

    const nameDeclarations = names.map(n => `"${n}"`).join('\n');

    const selectedSpecs = !!nameSelected ? `"${nameSelected}" [style=filled,fillcolor=cadetblue2]\n` : "\n";

    const deps = dependencies.map(d => `"${d.from}" -> "${d.to}";`).join('\n');

    return `
digraph {

rankdir=LR;
node [shape=box];
edge [color=blue];

${rankSpecs}
${rankTaskBugSpecs}

${nameDeclarations}

${projectSpecs}
${taskSpecs}
${bugSpecs}
${personSpecs}
${repoSpecs}

${errorSpecs}

${selectedSpecs}

${deps}
}
`
};
