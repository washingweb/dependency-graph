
var zoomTiger = null;

const DEFAULT_NAME = "**未命名**";

const USE_ACTION = true;

const app = new Vue({
  el: '#app',
  computed : {

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
        var result = Object.assign({}, this.properties);
        for (var actions of this.actions) {
          for (var action of actions) {
            if (action.type == "add") {
              result[action.name] = [];
            } else if (action.type == "del") {
              delete result[action.name];
            } else if (action.type == "set") {
              if (action.value == undefined) {
                delete result[action.name];
              } else {
                result[action.name][action.key] = action.value;
              }
            } else if (action.type == "rename") {
              result[action.new_name] = result[action.name];
              delete result[action.name];
            }
          }
        }
        return result;
      } else {
        return this.properties;
      }
    },
    nodeCount : function() {
      return Object.keys(this.properties).length;
    },
    nameConflict : function() {
      return this.newName in this.propertiesComputed;
    },
    nameEmpty : function() {
      return !!!this.newName;
    },
    dot : function() {
      return toDot(this.dependenciesComputed.filter(d => d.from != "" && d.to != ""), this.propertiesComputed);
    },
    filter : function() {
        const filter = this.filterString;
        const parts  = filter.split(/\S+/);
        const cmd    = parts[0];
        const name   = parts[1];
        return {
          cmd,
          name,
        };
    },
    dependenciesFilterred : function() {
      const cmd = this.filter.cmd;
      const name = this.filter.name;

    },
  },
  watch : {
    nameSelected : function() {
      this.updateDot();
    },
    dot : function() {
      this.updateDot();
      this.serialized = JSON.stringify({
        dependencies : this.dependencies,
        properties   : this.properties,
        actions      : this.actions,
      });
    },
    serialized : function() {
      try {
        const obj = JSON.parse(this.serialized);
        this.dependencies = obj.dependencies;
        this.properties   = obj.properties;
        this.actions      = obj.actions || [];
      } catch(e) {}
    },
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
    actions : [],
    newName : "",
    filterString : "",
    serialized   : "",
    nameSelected : "",
    dependencies : [],
    properties : {},
    zoomLevel : undefined,
    panPoint  : undefined,
    propsSelected: [],
  },
  methods : {
    updateProps : function() {
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

      this.actions.push(actions);
    },
    deleteNodeSelected : function() {
      this.deleteNode(this.nameSelected);
    },
    deleteNode : function(name) {

      // action
      if (USE_ACTION) {
        this.actions.push([{
          type : "del",
          name : name,
        }]);
      }
      else {
        Vue.delete(this.properties, name);
        this.dependencies = this.dependencies.filter(d => (d.from != name) && (d.to != name));
      }

      if (name == this.nameSelected) {
        this.nameSelected = "";
      }
    },
    assignNewName : function() {

      if (this.nameEmpty || this.nameConflict) return; 

      // action
      if (USE_ACTION) {
        this.actions.push([{
          type : "rename",
          name : this.nameSelected,
          new_name : this.newName,
        }]);
      } else {
        Vue.set(this.properties, this.newName, this.properties[this.nameSelected]);
        Vue.delete(this.properties, this.nameSelected);
        this.dependencies = this.dependencies.map(dep => ({
          from  : dep.from  == this.nameSelected ? this.newName : dep.from,
          to : dep.to == this.nameSelected ? this.newName : dep.to,
        }));
      }
      
      this.nameSelected = this.newName;
      this.newName = "";
    },
    selectName : function(name) {
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
              // that.actions.push([{
              //   type : "set",
              //   name : DEFAULT_NAME,
              // }]);
            }
            else {
              that.actions.push([{
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
            Vue.set(that.properties, DEFAULT_NAME, [{
              name : '分类',
              value : ''
            }]);
          }

          that.nameSelected = DEFAULT_NAME;
        } else {
          that.selectName("");
        }
      });

      const texts = $(svg).find("text");

      const that = this;

      texts.on("click", function(e) {
        if (e.ctrlKey) {
          if (!!that.nameSelected) {
            const name = $(this)[0].innerHTML;

            const dependenciesRest = that.dependenciesComputed.filter(d => d.from != that.nameSelected || d.to != name);

            if (dependenciesRest.length != that.dependenciesComputed.length) {
              if (USE_ACTION) {
                that.actions.push([{
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
                that.actions.push([{
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
            // that.selectName("");
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

      var zoomTiger = svgPanZoom(svg);
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


app.properties = {
  [DEFAULT_NAME] : {
    "分类" : "",
  }
};
