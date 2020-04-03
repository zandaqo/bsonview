const { TypeViewMixin } = require('structurae');

class LongView extends TypeViewMixin('bigint64', true) {
  static toBSON(view, start = 0) {
    const value = this.toJSON(view, start);
    return this.BSON.fromString(value.toString(), false, 10);
  }
}

LongView.BSON = globalThis.BSON && globalThis.BSON.Long;

module.exports = LongView;
