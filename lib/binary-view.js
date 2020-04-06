const { ArrayViewMixin } = require('structurae');

class BinaryView extends ArrayViewMixin('uint8', true) {
  static toBSON(view, start, length) {
    const value = this.toJSON(view, start, length);
    // todo refactor when https://github.com/mongodb/js-bson/pull/348 is fixed
    const string = value.map((i) => String.fromCharCode(i)).join('');
    return new this.BSON(string);
  }
}

BinaryView.BSON = globalThis.BSON && globalThis.BSON.Binary;

module.exports = BinaryView;
