
var zoomTiger = null;

const DEFAULT_NAME = "**未命名**";

const USE_ACTION = true;

const app = new Vue({
  el: '#app',
  computed : {
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
      } else {
        return this.dependencies;
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
      } else {
        return this.nodes;
      }
    },
    nodeCount : function() {
      return Object.keys(this.nodes).length;
    },
    nameConflict : function() {
      return this.newName in this.propertiesComputed;
    },
    nameEmpty : function() {
      return !!!this.newName;
    },
    dot : function() {
      return toDot(this.dependenciesFilterred.filter(d => d.from != "" && d.to != ""), this.propertiesFilterred);
    },
    filter : function() {
        const filter = this.filterString;
        const parts = filter.trim().split(/\s+/);
        const cmd    = parts[0];
        const name   = parts[1];
        return {
          cmd,
          name,
        };
    },
    namesFilterred : function() {
      const cmd = this.filter.cmd;
      const name = this.filter.name;
      if (cmd == ">" && !!name) {
        const names = {};
        const deps = [];
        gt(name, this.dependenciesComputed, names, deps);
        return { names, deps };
      } else if (cmd == "<" && !!name) {
        const names = {};
        const deps = [];
        lt(name, this.dependenciesComputed, names, deps);
        return { names, deps };
      } else {
        return undefined;
      }
    },
    dependenciesFilterred : function() {
      if (this.namesFilterred == undefined)
        return this.dependenciesComputed
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
    nameSelected : function() {
      this.updateDot();
    },
    dot : function() {
      this.updateDot();
    },
    zoomLevel : debounce(function() {
      this.updateUrl();
    }, 500),
    panPoint : debounce(function() {
      this.updateUrl();
    }, 500),
  },
  data: {
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
    actionsForward : [],
    actions : [],
    newName : "",
    filterString : "",
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
  },
  methods : {
    prependNode : function() {
      if (!(DEFAULT_NAME in this.propertiesComputed)) {
        this.push([{
          type : "add",
          name : DEFAULT_NAME
        }, {
          type  : "dep",
          from  : DEFAULT_NAME,
          to    : this.nameSelected
        }]);
        this.selectName(DEFAULT_NAME);
      }
    },
    appendNode : function() {
      if (!(DEFAULT_NAME in this.propertiesComputed)) {
        this.push([{
          type : "add",
          name : DEFAULT_NAME
        }, {
          type  : "dep",
          from  : this.nameSelected,
          to : DEFAULT_NAME
        }]);
        this.selectName(DEFAULT_NAME);
      }
    },
    newDoc : function() {
      if (confirm('所有数据会被清除，无法恢复，确定要继续么？')) {
        this.nodes          = { [DEFAULT_NAME] : { "分类" : "" }};
        this.dependencies   = [];
        this.actions        = [];
        this.actionsForward = [];
        this.zoomLevel      = 1.0;
        this.panPoint       = { x : 0.0, y : 0.0 };
        this.nameSelected   = "";
        this.filterString   = "";
        this.propsSelected  = [];
        this.docReady       = true;
        this.updateUrl();
      } else {
          // Do nothing!
      }
    },
    updateUrl : function() {
      window.location.hash = JSON.stringify({
        data : {
          dependencies : this.dependencies,
          nodes        : this.nodes,
          actions      : this.actions,
        },
        view : {
          zoomLevel : this.zoomLevel,
          panPoint  : this.panPoint,
        }
      });
    },
    push : function(actions) {
      this.actions.push(actions);
      this.actionsForward = [];
    },
    back : function() {
      if (this.backable) {
        this.actionsForward.push(this.actions.pop());
      }
    },
    forward : function() {
      if (this.forwardable) {
        this.actions.push(this.actionsForward.pop());
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
      this.push(actions);
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
      else {
        Vue.delete(this.nodes, name);
        this.dependencies = this.dependencies.filter(d => (d.from != name) && (d.to != name));
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
      } else {
        Vue.set(this.nodes, this.newName, this.nodes[this.nameSelected]);
        Vue.delete(this.nodes, this.nameSelected);
        this.dependencies = this.dependencies.map(dep => ({
          from  : dep.from  == this.nameSelected ? this.newName : dep.from,
          to : dep.to == this.nameSelected ? this.newName : dep.to,
        }));
      }
      
      this.selectName(this.newName);
    },
    selectName : function(name) {
      this.newName = name;
      this.nameSelected = name;
      if (!!name) {
        const prop = this.propertiesComputed[name];
        this.propsSelected = Object.keys(prop).map(k => ({
          key  : k,
          value : prop[k],
        }));
      } else {
        this.propsSelected = [];
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

      $(svg).on("click", function(e) {
        if (e.shiftKey) {

          // action
          if (USE_ACTION) {
            if (DEFAULT_NAME in that.propertiesComputed) {
            }
            else {
              that.push([{
                type : "add",
                name : DEFAULT_NAME,
              }, {
                type : "set",
                name : DEFAULT_NAME,
                key   : "分类",
                value : "",
              }]);
            }
          }
          else {
            Vue.set(that.nodes, DEFAULT_NAME, [{
              name : '分类',
              value : ''
            }]);
          }

          that.selectName(DEFAULT_NAME);

        } else {
          // that.selectName("");
        }
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
              else {
                that.dependencies = dependenciesRest;
              }
            } else {
              if (USE_ACTION) {
                that.push([{
                  type : "dep",
                  from : that.nameSelected,
                  to   : name,
                }]);
              } else {
                that.dependencies.push({
                  from  : that.nameSelected,
                  to : name,
                });
              }
            }
          }
        } else if (e.shiftKey) {
            const name = $(this)[0].innerHTML;
            that.deleteNode(name);
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

      if (!!this.nameSelected) {
        const text = texts.filter(function() {
          return $(this)[0].innerHTML == that.nameSelected;
        });
        text.parent().css("fill", "red");
      }

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

if (!!window.location.hash) {
  try {
    const state = JSON.parse(window.location.hash.slice(1));
    app.nodes   = state.data.nodes;
    app.dependencies = state.data.dependencies;
    app.actions      = state.data.actions;
    app.zoomLevel    = state.view.zoomLevel;
    app.panPoint     = state.view.panPoint;
    docReady = true;
  } catch (e) {
    docReady = false;
  }
} else {
  app.nodes   = { [DEFAULT_NAME] : { "分类" : "" }};
}

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
