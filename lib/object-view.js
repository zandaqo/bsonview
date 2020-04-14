const { ObjectView, ArrayView, BooleanView, StringView, ArrayViewMixin } = require('structurae');
const TypeViewMixin = require('./type-view-mixin');
const ObjectIdView = require('./objectid-view');
const DateView = require('./date-view');
const RegexView = require('./regex-view');
const BinaryView = require('./binary-view');
const CodeView = require('./code-view');
const LongView = require('./long-view');
const TimestampView = require('./timestamp-view');

const supportedBSONTypes = {
  0x01: 1, // double
  0x02: 1, // string
  0x03: 1, // document
  0x04: 1, // array
  0x05: 1, // binary
  0x07: 1, // ObjectID
  0x08: 1, // Boolean
  0x09: 1, // UTC datetime int64
  0x0a: 1, // Null
  0x0b: 1, // RegExp
  0x0d: 1, // JavaScript code
  0x10: 1, // int32
  0x11: 1, // Timestamp uint64
  0x12: 1, // 64bit integer
  0x13: 1, // 128bit decimal
};

class BSONObjectView extends ObjectView {
  getBSON(field) {
    const { View, start, length } = this.constructor.layout[field];
    return View.toBSON(this, start, length);
  }

  toBSON(fields) {
    return this.constructor.toBSON(this, 0, 0, fields);
  }

  static from(object, view, start, length) {
    if (object && object instanceof Uint8Array) return this.fromBSON(object, view, start, length);
    return super.from(object, view, start, length);
  }

  static fromBSON(object, view, start = 0, length = this.objectLength) {
    const objectView = view || new this(this.defaultBuffer.slice());
    const array = new Uint8Array(objectView.buffer);
    if (view) array.fill(0, start, length);
    this.readBSONObject(object, 4, object.byteLength, array, start, this);
    return objectView;
  }

  static hasBSONLength(type) {
    return (type > 0x01 && type < 0x06) || (type > 0x0c && type < 0x10);
  }

  static getBSONInt32(bson, index) {
    let length = 0xff & bson[index];
    length |= (0xff & bson[index + 1]) << 8;
    length |= (0xff & bson[index + 2]) << 16;
    length |= (0xff & bson[index + 3]) << 24;
    return length;
  }

  static getBSONElementLength(bson, type, startIndex) {
    switch (type) {
      case 0x01: // double
      case 0x09: // UTC datetime int64
      case 0x11: // Timestamp uint64
      case 0x12: // 64bit integer
        return 8;
      case 0x03: // document
      case 0x04: // array
        return this.getBSONInt32(bson, startIndex) - 4;
      case 0x02: // string
      case 0x05: // binary
      case 0x0d: // JavaScript code
        return this.getBSONInt32(bson, startIndex);
      case 0x07: // ObjectID
        return 12;
      case 0x08: // Boolean
        return 1;
      case 0x0b: // RegExp
        const petternEnd = bson.indexOf(0, startIndex);
        return bson.indexOf(0, petternEnd + 1) - startIndex + 1;
      case 0x10: // int32
        return 4;
      case 0x13: // 128bit decimal
        return 16;
      default:
        return 0;
    }
  }

  static readBSONObject(bson, begin, end, view, offset, View, itemLength) {
    let caret = begin;
    let index = 0;
    while (caret < end - 1) {
      const elementType = bson[caret];
      if (!Reflect.has(supportedBSONTypes, elementType)) {
        throw new TypeError(`Type ${elementType} is not supported.`);
      }
      const elementLength = this.hasBSONLength(elementType) ? 4 : 0;
      const nameStart = caret + 1;
      let nameEnd = nameStart;
      while (bson[nameEnd]) nameEnd++;
      const fieldStart = nameEnd + 1;
      // offset subtype byte for binary
      const valueStart = fieldStart + elementLength + (elementType === 0x05);
      const valueLength = this.getBSONElementLength(bson, elementType, fieldStart);
      caret = valueStart + valueLength;
      let start = 0;
      let hasValue = false;
      let fieldLength = itemLength;
      let SubView = View;
      if (itemLength) {
        // it's an array
        start = offset + index * itemLength;
        SubView = View.View;
        hasValue = start < view.byteLength && valueLength;
      } else {
        const fieldName = this.getFieldName(bson, nameStart, nameEnd - nameStart, View);
        if (fieldName) {
          const fieldOptions = View.layout[fieldName];
          start = offset + fieldOptions.start;
          fieldLength = fieldOptions.length;
          SubView = fieldOptions.View;
          const hasTypeConflict =
            (elementType === 0x03 && !(SubView.prototype instanceof ObjectView)) ||
            (elementType === 0x04 && !(SubView.prototype instanceof ArrayView));
          hasValue = !!valueLength && !hasTypeConflict;
        }
      }
      if (hasValue) {
        this.writeBSONtoView(
          bson,
          elementType,
          valueStart,
          valueLength,
          view,
          start,
          fieldLength,
          SubView,
        );
      }
      index++;
    }
  }

  static writeBSONtoView(bson, type, valueStart, valueLength, view, start, length, View) {
    switch (type) {
      case 0x08: // boolean
        view[start] = bson[valueStart];
        break;
      case 0x03: // document
        this.readBSONObject(bson, valueStart, valueStart + valueLength, view, start, View);
        break;
      case 0x04: // array
        this.readBSONObject(
          bson,
          valueStart,
          valueStart + valueLength,
          view,
          start,
          View,
          View.itemLength,
        );
        break;
      default:
        const minLength = valueLength > length ? length : valueLength;
        for (let i = 0; i < minLength; i++) {
          view[start + i] = bson[valueStart + i];
        }
        break;
    }
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

  static getFieldName(bson, begin, length, View) {
    const { encodedFields, fields } = View;
    outer: for (let i = 0; i < encodedFields.length; i++) {
      const fieldName = encodedFields[i];
      if (fieldName.length !== length) continue;
      for (let j = 0; j < length; j++) {
        if (fieldName[j] !== bson[begin + j]) continue outer;
      }
      return fields[i];
    }
    return undefined;
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
  // todo decimal
};

BSONObjectView.encodedFields = undefined;

module.exports = BSONObjectView;
