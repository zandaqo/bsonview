const { ArrayViewMixin } = require('structurae');

class BinaryView extends ArrayViewMixin('uint8', true) {
  static toBSON(view, start, length) {
    const value = this.toJSON(view, start, length);
    return new this.BSON(value);
  }
}

BinaryView.BSON = globalThis.BSON && globalThis.BSON.Binary;

module.exports = BinaryView;
