const TypeViewMixin = require('./type-view-mixin');

class TimestampView extends TypeViewMixin('biguint64') {
  static toBSON(view, start = 0) {
    const value = this.toJSON(view, start);
    return this.BSON.fromString(value.toString(), 10);
  }
}

module.exports = TimestampView;
