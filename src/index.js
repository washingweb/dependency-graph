

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
      while (graph.hasChildNodes()) {
          graph.removeChild(graph.lastChild);
      }
      graph.appendChild(doc.documentElement);
    }
  },
  data: {
    dependencies : [{
      left  : "",
      right : "",
    }],
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
  }
});
