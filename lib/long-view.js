const TypeViewMixin = require('./type-view-mixin');

class LongView extends TypeViewMixin('bigint64') {
  static toBSON(view, start = 0) {
    const value = this.toJSON(view, start);
    return this.BSON.fromString(value.toString(), false, 10);
  }
}

module.exports = LongView;
