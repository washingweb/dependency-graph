
var zoomTiger = null;

const app = new Vue({
  el: '#app',
  computed : {
    dot : function() {
      console.log('compute dot');
      return toDot(this.dependencies.filter(d => d.left != "" && d.right != ""), {});
    }
  },
  watch : {
    dot : function() {
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
    }
  },
  data: {
    dependencies : [{
      left  : "",
      right : "",
    }],
    zoomLevel : undefined,
    panPoint  : undefined,
  },
  methods : {
    addDep : function() {
      this.dependencies.push({
        left  : "",
        right : "",
      });
    },
    delDep : function(index) {
      this.dependencies.splice(index, 1);
    },
    zoom : function(zoomLevel) {
      this.zoomLevel = zoomLevel;
    },
    pan  : function(panPoint) {
      this.panPoint = panPoint;
    }
  }
});
