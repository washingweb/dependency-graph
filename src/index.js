
var zoomTiger = null;

const DEFAULT_NAME = "**未命名**";

const app = new Vue({
  el: '#app',
  computed : {
    nodeCount : function() {
      return Object.keys(this.properties).length;
    },
    nameConflict : function() {
      return this.newName in this.properties;
    },
    nameEmpty : function() {
      return !!!this.newName;
    },
    dot : function() {
      return toDot(this.dependencies.filter(d => d.from != "" && d.to != ""), this.properties);
    },
    propertiesSelected : function() {
      const result = this.properties[this.nameSelected] || [];
      return result;
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
      });
    },
    serialized : function() {
      console.log("load data");
      try {
        const obj = JSON.parse(this.serialized);
        this.dependencies = obj.dependencies;
        this.properties   = obj.properties;
      } catch(e) {}
    },
  },
  data: {
    /*
      {
        type : "add",
        id   : <string>
      }
      |
      {
        type : "del",
        id   : <string>
      }
      |
      {
        type : "set",
        id   : <string>,
        name : <string>,
      }
      |
      {
        type : "dep",
        from : <string>,
        to   : <string>,
      }
    */
    transactions : [],
    newName : "",
    filterString : "",
    serialized   : "",
    nameSelected : "",
    dependencies : [],
    properties : {},
    zoomLevel : undefined,
    panPoint  : undefined,
  },
  methods : {
    deleteNodeSelected : function() {
      this.deleteNode(this.nameSelected);
    },
    deleteNode : function(name) {
      Vue.delete(this.properties, name);
      this.dependencies = this.dependencies.filter(d => (d.from != name) && (d.to != name));
      if (name == this.nameSelected) {
        this.nameSelected = "";
      }
    },
    assignNewName : function() {

      if (this.nameEmpty || this.nameConflict) return; 

      Vue.set(this.properties, this.newName, this.properties[this.nameSelected]);
      Vue.delete(this.properties, this.nameSelected);
      this.dependencies = this.dependencies.map(dep => ({
        from  : dep.from  == this.nameSelected ? this.newName : dep.from,
        to : dep.to == this.nameSelected ? this.newName : dep.to,
      }));
      this.nameSelected = this.newName;
      this.newName = "";
    },
    selectName : function(name) {
      this.nameSelected = name;
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
          Vue.set(that.properties, DEFAULT_NAME, [{
            name : '分类',
            value : ''
          }]);
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

            const dependenciesRest = that.dependencies.filter(d => d.from != that.nameSelected || d.to != name);

            if (dependenciesRest.length != that.dependencies.length) {
              that.dependencies = dependenciesRest;
            } else {
              that.dependencies.push({
                from  : that.nameSelected,
                to : name,
              });
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
  [DEFAULT_NAME] : [{
    name  : "分类",
    value : "",
  }]
};
