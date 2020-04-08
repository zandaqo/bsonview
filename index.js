const {
  ArrayView, BooleanView, StringView, TypeView,
} = require('structurae');
const ObjectIdView = require('./lib/objectid-view');
const DateView = require('./lib/date-view');
const RegexView = require('./lib/regex-view');
const BinaryView = require('./lib/binary-view');
const CodeView = require('./lib/code-view');
const LongView = require('./lib/long-view');
const TimestampView = require('./lib/timestamp-view');
const BSONObjectView = require('./lib/object-view');
const BSONMapView = require('./lib/map-view');

TypeView.toBSON = function (view, start) {
  const value = this.toJSON(view, start);
  return new this.BSON(value);
};

BooleanView.toBSON = StringView.toBSON = function (view, start, length) {
  return this.toJSON(view, start, length);
};

ArrayView.toBSON = function (view, start, length) {
  const { View, itemLength } = this;
  const size = this.getSize(length);
  const array = new Array(size);
  for (let i = 0; i < size; i++) {
    const offset = this.getLength(i);
    array[i] = View.toBSON(view, start + offset, itemLength);
  }
  return array;
};

module.exports = {
  BSONObjectView,
  BSONMapView,
  ObjectIdView,
  DateView,
  RegexView,
  BinaryView,
  CodeView,
  LongView,
  TimestampView,
};
