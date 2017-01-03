
var zoomTiger = null;

const app = new Vue({
  el: '#app',
  computed : {
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
    filterString : "",
    serialized   : "",
    nameSelected : "",
    dependencies : [{
      left  : "",
      right : "",
    }],
    properties : {},
    zoomLevel : undefined,
    panPoint  : undefined,
  },
  methods : {

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

      const texts = $(svg).find("text");
      console.log(texts[0].innerHTML);

      const that = this;

      texts.on("click", function() {
        const name = $(this)[0].innerHTML;
        that.selectName(name);
      });

      texts.css("cursor", "pointer");

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
