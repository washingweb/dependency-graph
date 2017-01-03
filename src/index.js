
var zoomTiger = null;

const app = new Vue({
  el: '#app',
  computed : {
    nameConflict : function() {
      return this.newName in this.properties;
    },
    nameEmpty : function() {
      return !!!this.nameSelected;
    },
    dot : function() {
      return toDot(this.dependencies.filter(d => d.left != "" && d.right != ""), this.properties);
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
    deleteNode : function() {
      Vue.delete(this.properties, this.nameSelected);
      this.dependencies = this.dependencies.filter(d => (d.left != this.nameSelected) && (d.right != this.nameSelected));
      this.nameSelected = "";
    },
    assignNewName : function() {
      Vue.set(this.properties, this.newName, this.properties[this.nameSelected]);
      Vue.delete(this.properties, this.nameSelected);
      this.dependencies = this.dependencies.map(dep => ({
        left  : dep.left  == this.nameSelected ? this.newName : dep.left,
        right : dep.right == this.nameSelected ? this.newName : dep.right,
      }));
      this.nameSelected = this.name;
      this.newName = "";
    },
    selectName : function(name) {
      this.nameSelected = name;
      if (! (name in this.properties)) {
        Vue.set(this.properties, name, [{
          "name" : "分类",
          "value" : "",
        }]);
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
        if (e.altKey) {
          Vue.set(that.properties, "**未命名**", [{
            name : '分类',
            value : ''
          }]);
        }
      });

      const texts = $(svg).find("text");

      const that = this;

      texts.on("click", function(e) {
        if (e.ctrlKey) {
          if (!!that.nameSelected) {
            const name = $(this)[0].innerHTML;

            const dependenciesRest = that.dependencies.filter(d => d.left != that.nameSelected || d.right != name);

            if (dependenciesRest.length != that.dependencies.length) {
              that.dependencies = dependenciesRest;
            } else {
              that.dependencies.push({
                left  : that.nameSelected,
                right : name,
              });
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
    addDep : function() {
      this.dependencies.push({
        left  : "",
        right : "",
      });
    },
    delDep : function(index) {
      this.dependencies.splice(index, 1);
    },
    focus : function(name) {
      this.nameSelected = name;
      if (! (name in this.properties)) {
        Vue.set(this.properties, name, [{
          "name" : "分类",
          "value" : "",
        }]);
      }
    },
    edit  : function(name) {
      if (!(name in this.properties) && this.nameSelected in this.properties && name != this.nameSelected) {
        Vue.set(this.properties, name, this.properties[this.nameSelected]);
        Vue.delete(this.properties, this.nameSelected);
      }
      this.nameSelected = name;
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
  "**未命名**" : [{
    name  : "分类",
    value : "",
  }]
};
