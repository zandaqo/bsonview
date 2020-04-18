const { ObjectView, BooleanView, StringView, ArrayViewMixin } = require('structurae');
const BSONParser = require('./bson-parser');
const TypeViewMixin = require('./type-view-mixin');
const ObjectIdView = require('./objectid-view');
const DateView = require('./date-view');
const RegexView = require('./regex-view');
const BinaryView = require('./binary-view');
const CodeView = require('./code-view');
const LongView = require('./long-view');
const TimestampView = require('./timestamp-view');
const DecimalView = require('./decimal-view');

class BSONObjectView extends ObjectView {
  getBSON(field) {
    const { View, start, length } = this.constructor.layout[field];
    return View.toBSON(this, start, length);
  }

  toBSON(fields) {
    return this.constructor.toBSON(this, 0, 0, fields);
  }

  static from(object, view, start = 0, length = this.objectLength) {
    if (!(object instanceof Uint8Array)) return super.from(object, view, start, length);
    const objectView = view || new this(this.defaultBuffer.slice());
    const array = new Uint8Array(objectView.buffer);
    if (view) array.fill(0, start, length);
    BSONParser.read(object, 4, object.byteLength, array, start, this);
    return objectView;
  }

  static initialize(ParentViewClass = BSONObjectView) {
    const { schema } = this;
    const schemas = this.getSchemaOrdering(schema);
    for (let i = schemas.length - 1; i >= 0; i--) {
      const objectSchema = schemas[i];
      const id = objectSchema.$id;
      if (Reflect.has(ObjectView.Views, id)) continue;
      const View = i === 0 ? this : class extends ParentViewClass {};
      [View.layout, View.objectLength, View.fields] = this.getLayoutFromSchema(objectSchema);
      ObjectView.Views[id] = View;
      View.encodedFields = View.fields.map((name) => StringView.encoder.encode(name));
      View.setDefaultBuffer();
    }
  }

  static toBSON(view, start = 0, length, fields = this.fields) {
    const { layout } = this;
    const result = {};
    for (let i = 0; i < fields.length; i++) {
      const name = fields[i];
      const { View, start: fieldStart, length: fieldLength } = layout[name];
      result[name] = View.toBSON(view, start + fieldStart, fieldLength);
    }
    return result;
  }

  static get Array() {
    return ArrayViewMixin(this);
  }
}

BSONObjectView.types = {
  boolean() {
    return BooleanView;
  },

  string() {
    return StringView;
  },

  number(field) {
    const { btype = 'float64' } = field;
    return TypeViewMixin(btype);
  },

  integer(field) {
    const { btype = 'int32' } = field;
    return TypeViewMixin(btype);
  },

  double() {
    return TypeViewMixin('float64');
  },

  binData() {
    return BinaryView;
  },

  binary() {
    return BinaryView;
  },

  objectId() {
    return ObjectIdView;
  },

  bool() {
    return BooleanView;
  },

  date() {
    return DateView;
  },

  regex() {
    return RegexView;
  },

  javascript() {
    return CodeView;
  },

  timestamp() {
    return TimestampView;
  },

  int() {
    return TypeViewMixin('int32');
  },

  long() {
    return LongView;
  },

  decimal128() {
    return DecimalView;
  },
};

BSONObjectView.encodedFields = undefined;

module.exports = BSONObjectView;
