const parse = (doc) => {
  mappings = doc.split('\n').map(line => {
    parts = line.split('->');
    return [parts[0], parts[1]];
  });

  return mappings;
}

const app = new Vue({
  el: '#app',
  computed : {
    message : function() {
      return JSON.stringify(parse(this.doc));
    }
  },
  data: {
    doc : ""
  }
});
