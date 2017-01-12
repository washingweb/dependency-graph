
var zoomTiger = null;

const DEFAULT_NAME = "**未命名**";

const USE_ACTION = true;

const DEFAULT_KEYS = ["分类", "链接", "说明", "存档"];

const app = new Vue({
  el: '#app',
  computed : {
    propsSelected : function() {
      if (!!this.nameSelected) {
        const prop = this.propertiesDefaulted[this.nameSelected];

        return Object.keys(prop).map(k => ({
          key  : k,
          value : prop[k],
        }));
      } else {
        return [];
      }
    },
    defaultKeysString : {
      get : function() {
        return this.defaultKeys.join(",");
      },
      set : function(newValue) {
        this.defaultKeys = newValue
                              .trim()
                              .split(/,|，/)
                              .map(k => k.trim());
      }
    },
    helpString : function() {
      const globalString   = `Esc: 全看（清空filter）, db-click: 加节点`;
      const selectedString = this.selectedIsFocused ? `TAB: 编辑名字, x: 删, a: 加右, p: 加左, >:只看右, <:只看左, left/right: 选左右, up/down: 选上下， ctrl-z: 回退, ctrl-y: 重做` : "";
      return [globalString, selectedString].join(" | ");
    },
    unnamedNode : function() {
      return DEFAULT_NAME in this.propertiesComputed;
    },
    backable : function() {
      return this.actions.length > 0;
    },

    forwardable : function() {
      return this.actionsForward.length > 0;
    },

    dependenciesComputed : function() {
      if (USE_ACTION) {
        var result = this.dependencies.map(d => d);
        for (var actions of this.actions) {
          for (var action of actions) {
            if (action.type == "dep") {
              result.push({
                from : action.from,
                to   : action.to,
              })
            } else if (action.type == "undep") {
              result = result.filter(d => (d.from != action.from) || (d.to != action.to));
            } else if (action.type == "rename") {
              result = result.map(d => ({
                from : d.from == action.name ? action.new_name : d.from,
                to   : d.to == action.name ? action.new_name : d.to,
              }));
            } else if (action.type == "del") {
              result = result.filter(d => (d.from != action.name) && (d.to != action.name))
            }
          }
        }
        return result;
      }
    },
    propertiesComputed : function() {
      if (USE_ACTION) {
        var result = Object.assign({}, this.nodes);
        for (var actions of this.actions) {
          for (var action of actions) {
            if (action.type == "add") {
              result[action.name] = {};
            } else if (action.type == "del") {
              delete result[action.name];
            } else if (action.type == "set") {
              const newNode = Object.assign({}, result[action.name]);
              if (action.value == undefined) {
                newNode[action.key] = "";
              } else {
                newNode[action.key] = action.value;
              }
              result[action.name] = newNode;
            } else if (action.type == "rename") {
              result[action.new_name] = result[action.name];
              delete result[action.name];
            }
          }
        }
        return result;
      }
    },
    nodeCount : function() {
      return Object.keys(this.nodes).length;
    },
    nameConflict : function() {
      return this.newName in this.propertiesComputed;
    },
    nameIsSame : function() {
      return this.newName == this.nameSelected;
    },
    nameEmpty : function() {
      return !!!this.newName;
    },
    dot : function() {
      return toDot(this.dependenciesFilterred.filter(d => d.from != "" && d.to != ""), this.propertiesDefaulted, this.nameSelected);
    },
    filterList : function() {
      return this.filterStringList.map(filterString => {
        return this.filterStringToFilter(filterString);
      });
    },
    namesFilterred : function() {

      var depsIn = this.dependenciesComputed;

      var namesOut = Object.keys(this.propertiesComputed).reduce((p, c) => {
        p[c] = true;
        return p;
      }, {});
      var depsOut  = this.dependenciesComputed;

      for (var filter of this.filterList) {

        const cmd  = filter.cmd;
        const name = filter.name;

        if (cmd == ">" && !!name) {
          namesOut = {};
          depsOut = [];
          gt(name, depsIn, namesOut, depsOut);
          depsIn = depsOut;
        } else if (cmd == "<" && !!name) {
          namesOut = {};
          depsOut = [];
          lt(name, depsIn, namesOut, depsOut);
          depsIn = depsOut;
        } else {
          // return undefined;
        }
      }

      return {
        names : namesOut,
        deps  : depsOut,
      }
    },
    dependenciesFilterred : function() {
      if (this.namesFilterred == undefined)
        return this.dependenciesComputed;
      else
        return this.namesFilterred.deps;
    },
    propertiesFilterred : function() {
      if (this.namesFilterred == undefined)
        return this.propertiesComputed;
      else {
        const properties = {};
        for (var name of Object.keys(this.propertiesComputed)) {
          if (name in this.namesFilterred.names) {
            properties[name] = this.propertiesComputed[name];
          }
        }
        return properties;
      }
    },
    propertiesDefaulted : function() {
      const newProperties = Object.assign({}, this.propertiesFilterred);
      for (var key in this.propertiesFilterred) {
        newProperties[key] = Object.assign({}, this.propertiesFilterred[key]);
        for (var defaultKey of app.defaultKeys) {
          if (newProperties[key][defaultKey] == undefined) {
            newProperties[key][defaultKey] = "";
          }
        }
      }
      return newProperties;
    },
    updatePropsActions : function() {

      if (!!!this.nameSelected)
        return [];

      const existProp = this.propertiesComputed[this.nameSelected];
      actions = [];
      
      for (var prop of this.propsSelected) {
        if (!(prop.key in existProp) || (prop.key in existProp) && (prop.value != existProp[prop.key])) {
            actions.push({
              type  : "set",
              name  : this.nameSelected,
              key   : prop.key,
              value : prop.value == "" ? undefined : prop.value,
            });
        }
      }

      for (var key in existProp) {
        if (this.propsSelected.filter(p => p.key == key).length == 0) {
          actions.push({
              type  : "set",
              name  : this.nameSelected,
              key,
              value : undefined,
          });
        }
      }

      return actions;
    },
    propsAreNew : function() {
      return this.updatePropsActions.length > 0;
    }
  },
  watch : {
    defaultKeys : function() {
      this.updateUrl();
    },
    nameSelected : function() {
      this.updateDot();
    },
    actions : function() {
      this.updateUrl();
    },
    dot : function() {
      this.updateDot();
      this.updateUrl();
    },
    zoomLevel : debounce(function() {
      this.updateUrl();
    }, 500),
    panPoint : debounce(function() {
      this.updateUrl();
    }, 500),
  },
  data : {
    /*
      {
        type : "add",
        name : <string>
      }
      |
      {
        type : "del",
        name : <string>
      },
      {
        type  : "rename",
        name     : <string>,
        new_name : <string>,
      }
      |
      {
        type  : "set",
        name  : <string>,
        key   : <string>,
        value : <string>
      }
      |
      {
        type : "dep",
        from : <string>,
        to   : <string>,
      }
      |
      {
        type : "undep",
        from : <string>,
        to   : <string>,
      }
    */
    defaultKeys : [],
    actionsForward : [],
    actions : [],
    newName : "",
    filterStringList : [""],
    nameSelected : "",
    dependencies : [],
    nodes : {},
    zoomLevel : 1.0,
    panPoint  : {
      x : 0.0,
      y : 0.0,
    },
    propsSelected: [],
    docReady     : true,
    selectedIsFocused : false,
  },
  methods : {
    filterStringToFilter : function(filterString) {
      const parts = filterString.trim().split(/\s+/);
      const cmd    = parts[0];
      const name   = parts[1];
      return {
        cmd,
        name,
      };
    },
    delFilter   : function(index) {
      this.filterStringList.splice(index, 1);
      if (this.filterStringList.length == 0) {
        this.filterStringList.push("");
      }
    },
    pushFilter  : function(t) {
      if (this.filterStringList.length == 1 && !!!this.filterStringList[0]) {
        this.filterStringList.pop();
      }
      switch (t) {
        case "":
          this.filterStringList.push("");
          break;
        case ">":
          this.filterStringList.push(`> ${this.nameSelected}`);
          break;
        case "<":
          this.filterStringList.push(`< ${this.nameSelected}`);
          break;
      }
    },
    popFilter : function() {
        this.filterStringList.pop();
        if (this.filterStringList.length == 0) {
          this.filterStringList.push("");
        }
    },
    propIsLink : function(key, value) {
      return key == "链接" && !!value;
    },
    gotoFrom : function() {
      const dep = this.dependenciesComputed.filter(d => d.to == this.nameSelected)[0];
      if (dep != undefined) {
        this.selectName(dep.from);
      }
    },
    gotoTo : function() {
      const dep = this.dependenciesComputed.filter(d => d.from == this.nameSelected)[0];
      if (dep != undefined) {
        this.selectName(dep.to);
      }
    },
    gotoSibling : function(step) {
      if (this.siblings == undefined) {
        const fromNames = _.uniq(this.dependenciesComputed
                                     .filter(d => d.to == this.nameSelected)
                                     .map(d => d.from));
        const names = [this.nameSelected];
        for (var from of fromNames) {
          const toNames = this.dependenciesComputed
                                .filter(d => d.from == from)
                                .map(d => d.to);
          names.push(toNames);
        }
        const siblings = _.uniq(_.flatten(names));
        this.siblings = siblings;
      }

      const curIdx = this.siblings.indexOf(this.nameSelected);
      var nextIdx = (curIdx + step + this.siblings.length) % this.siblings.length;
      this.selectName(this.siblings[nextIdx], false);
    },
    focusRename : function() {
      setTimeout(() => {
        $("#new-name").select().focus();
      });
    },
    prependNode : function() {
      if (!(DEFAULT_NAME in this.propertiesComputed)) {
        this.push(addNewNodeAction().concat([{
          type  : "dep",
          from  : DEFAULT_NAME,
          to    : this.nameSelected,
        }]));
        this.selectName(DEFAULT_NAME);
      }
    },
    appendNode : function() {
      if (!(DEFAULT_NAME in this.propertiesComputed)) {
        this.push(addNewNodeAction().concat([{
          type  : "dep",
          from  : this.nameSelected,
          to : DEFAULT_NAME,
        }]));
        this.selectName(DEFAULT_NAME);
      }
    },
    newDoc : function() {
      const url = window.location.href.split('#')[0];
      const win = window.open(url, '_blank');
      win.focus();
    },
    shareDoc : function() {
      prompt('Press Ctrl + C, then Enter to copy to clipboard', window.location.href);
    },
    updateUrl : function() {
      const format = getParameterByName("format");
      if (format != "lz") {
        document.location.search = "?format=lz";
      }
      window.location.hash = LZString.compressToEncodedURIComponent(JSON.stringify({
        version : "1.3",
        data : {
          dependencies : this.dependenciesComputed,
          nodes        : this.propertiesComputed,
          actions      : [],
        },
        config : {
          defaultKeys : this.defaultKeys.filter(k => !!k),
        },
        view : {
          filters   : this.filterStringList,
          zoomLevel : this.zoomLevel,
          panPoint  : this.panPoint,
        }
      }));
    },
    push : function(actions) {
      this.actions.push(actions);
      this.actionsForward = [];
    },
    back : function() {
      if (this.backable) {
        this.actionsForward.push(this.actions.pop());
        this.selectName("");
      }
    },
    forward : function() {
      if (this.forwardable) {
        this.actions.push(this.actionsForward.pop());
        this.selectName("");
      }
    },
    goToAction : function(index) {
      while (this.actions.length > (index + 1)) {
        this.back();
      }
    },

    goToActionForward : function(index) {
      while ((index+1) > 0) {
        this.forward();
        index--;
      }
    },
    updateProps : function() {
      const actions = this.updatePropsActions;
      if (actions.length > 0)
        this.push(actions);

      this.assignNewName();

      $("#focus-control").focus();
    },
    deleteNodeSelected : function() {
      this.deleteNode(this.nameSelected);
    },
    deleteNode : function(name) {

      // action
      if (USE_ACTION) {
        this.push([{
          type : "del",
          name : name,
        }]);
      }

      if (name == this.nameSelected) {
        this.selectName("");
      }
    },
    assignNewName : function() {

      if (this.nameEmpty || this.nameConflict) return; 

      // action
      if (USE_ACTION) {
        this.push([{
          type : "rename",
          name : this.nameSelected,
          new_name : this.newName,
        }]);
      }
      
      this.selectName(this.newName);
    },
    selectName : function(name, clearSiblings=true) {

      if (clearSiblings) {
        this.siblings = undefined;
      }

      this.newName = name;
      this.nameSelected = name;
      if (!!name) {
        setTimeout(() => {
          $("#focus-control").focus();
        });
      } else {
        setTimeout(() => {
          $("#output").focus();
        });
      }
    },
    updateDot : function() {
      const result = Viz(this.dot, { format: "svg",  engine : "dot", });
      const parser = new DOMParser();
      const doc = parser.parseFromString(result, "image/svg+xml");
      const graph = document.querySelector("#output");

      if (zoomTiger != undefined) {
        zoomTiger.destroy()
        delete zoomTiger;
      }

      while (graph.hasChildNodes()) {
          graph.removeChild(graph.lastChild);
      }

      graph.appendChild(doc.documentElement);

      // change size
      const svg = graph.firstChild;
      $(svg).addClass('full');

      $(svg).dblclick(function(e) {

          if (USE_ACTION) {
            if (DEFAULT_NAME in that.propertiesComputed) {
            }
            else {
              that.push(addNewNodeAction().concat());
            }
          }

          that.selectName(DEFAULT_NAME);
      });

      const texts = $(svg).find("text");

      const that = this;

      texts.on("click", function(e) {
        if (e.altKey) {
          if (!!that.nameSelected) {
            const name = $(this)[0].innerHTML;

            const dependenciesRest = that.dependenciesComputed.filter(d => d.from != that.nameSelected || d.to != name);

            if (dependenciesRest.length != that.dependenciesComputed.length) {
              if (USE_ACTION) {
                that.push([{
                  type : "undep",
                  from : that.nameSelected,
                  to   : name,
                }]);
              }
            } else {
              if (USE_ACTION) {
                that.push([{
                  type : "dep",
                  from : that.nameSelected,
                  to   : name,
                }]);
              }
            }
          }
        } else {
          const name = $(this)[0].innerHTML;

          if (name == that.nameSelected) {
            that.selectName("");
          }
          else {
            const name = $(this)[0].innerHTML;
            that.selectName(name);
          }
        }

        e.stopPropagation();
      });

      texts.css("cursor", "pointer");

      var zoomTiger = svgPanZoom(svg, {
        dblClickZoomEnabled: false
      });
      if (this.zoomLevel != undefined) {
        zoomTiger.zoom(this.zoomLevel);
      }
      if (this.panPoint != undefined) {
        zoomTiger.pan(this.panPoint);
      }

      zoomTiger.setOnZoom((level) => {
        this.zoom(level);
      })

      zoomTiger.setOnPan((point) => {
        this.pan(point);
      })
    },
    zoom : function(zoomLevel) {
      this.zoomLevel = zoomLevel;
    },
    pan  : function(panPoint) {
      this.panPoint = panPoint;
    }
  }
});

$(function() {
if (!!window.location.hash) {
  try {

    const format = getParameterByName("format") || "raw";
    const hashString = window.location.hash.slice(1);

    var jsonString;
    switch (format) {
      case "raw":
        jsonString = hashString;
        break;
      case "url":
        jsonString = decodeURIComponent(hashString);
        break;
      case "lz":
        jsonString = LZString.decompressFromEncodedURIComponent(hashString);
        break;
    }

    if (jsonString != undefined) {
      var state = JSON.parse(jsonString);

      if ( DATA_VERSIONS.indexOf(state.version) == -1) {
        alert("奇怪的数据版本号");
      }
      else {
        for (var update of DATA_UPDATES) {
          if (versionLT(state.version, update.version))
            state = update.update(state);
        }
        
        app.nodes   = state.data.nodes;
        app.dependencies = state.data.dependencies;
        app.actions      = state.data.actions;
        app.zoomLevel    = state.view.zoomLevel;
        app.panPoint     = state.view.panPoint;
        app.filterStringList = state.view.filters;
        app.defaultKeys  = state.config.defaultKeys;
        docReady = true;
      }
    }
  } catch (e) {
    docReady = false;
  }
} else {
  app.nodes   = { [DEFAULT_NAME] : newNode()};
}
})


function debounce(func, wait, immediate) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        var later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};

function gt(name, deps, names, depsOut) {
  names[name] = true;
  for (var dep of deps) {
    if (dep.from == name) {
      depsOut.push(dep);
      if (!(dep.to in names)) {
        gt(dep.to, deps, names, depsOut);
      }
    }
  }
}

function lt(name, deps, names, depsOut) {
  names[name] = true;
  for (var dep of deps) {
    if (dep.to == name) {
      depsOut.push(dep);
      if (!(dep.from in names)) {
        lt(dep.from, deps, names, depsOut);
      }
    }
  }
}

/*
--------
  1.0
  TODO
--------
  1.1
  add "链接"
  add "说明"
--------
*/

var DATA_VERSIONS = ["1.0", "1.1", "1.2", "1.3"];

var DATA_UPDATES = [{
  version : "1.1",
  update : (state) => {
    console.log("update to 1.1");
    const newState = Object.assign({}, state);
    newState.data  = Object.assign({}, state.data);
    newState.data.nodes = Object.assign({}, state.data.nodes);
    for (var key in state.data.nodes) {
      newNode = Object.assign({}, state.data.nodes[key]);
      newNode["链接"] = "";
      newNode["说明"] = "";
      newState.data.nodes[key] = newNode;
    }
    newState.version = "1.1";
    console.log("update to 1.1 done");
    return newState;
  },
}, {
  version : "1.2",
  update : (state) => {
    console.log("update to 1.2");
    const newState = Object.assign({}, state);
    newState.data  = Object.assign({}, state.data);
    newState.view  = Object.assign({}, state.view);
    newState.view.filters = [""];
    newState.version = "1.2";
    console.log("update to 1.2 done");
    return newState;
  },
}, {
  version : "1.3",
  update : (state) => {
    console.log("update to 1.3");
    const newState = Object.assign({}, state);
    newState.config  = {
      defaultKeys : [],
    };
    newState.version = "1.3";
    console.log("update to 1.3 done");
    return newState;
  },
}];

function versionLT(v0, v1) {
  console.log(`compare version: ${v0} ${v1}`);
  return v0 < v1; //TODO
}

function addNewNodeAction() {
    return [
      {
        type : "add",
        name : DEFAULT_NAME
      },
    ];
}

function newNode() {
  return {};
}

$(document).keydown(function(e) {
  console.log(e.keyCode);
  switch (e.keyCode) {
    case 27:
      app.popFilter()
      break;
  }
});

$(function() {
  $("#output").focus();
});

$("#focus-control").focus(function() {
  app.selectedIsFocused = true;
});

$("#focus-control").focusout(function() {
  app.selectedIsFocused = false;
});

function getParameterByName(name, url) {
    if (!url) {
      url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}
