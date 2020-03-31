const { TypeViewMixin } = require('structurae');

class TimestampView extends TypeViewMixin('biguint64', true) {
  static toBSON(view, start = 0) {
    const value = this.toJSON(view, start);
    return this.BSON.fromString(value.toString(), 10);
  }
}

TimestampView.BSON = undefined;

module.exports = TimestampView;
