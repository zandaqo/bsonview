const {
  ObjectView, StringView, TypeViewMixin, BooleanView, ArrayView,
} = require('structurae');
const ObjectIdView = require('./lib/objectid-view');
const DateView = require('./lib/date-view');
const RegexView = require('./lib/regex-view');
const BinaryView = require('./lib/binary-view');
const CodeView = require('./lib/code-view');
const LongView = require('./lib/long-view');
const TimestampView = require('./lib/timestamp-view');

const BSONTypes = {
  0x01: 1, // double
  0x02: 1, // string
  0x03: 1, // document
  0x04: 1, // array
  0x05: 1, // binary
  0x07: 1, // ObjectID
  0x08: 1, // Boolean
  0x09: 1, // UTC datetime int64
  0x0A: 1, // Null
  0x0B: 1, // RegExp
  0x0D: 1, // JavaScript code
  0x10: 1, // int32
  0x11: 1, // Timestamp uint64
  0x12: 1, // 64bit integer
  0x13: 1, // 128bit decimal
};

class BSONView extends ObjectView {
  toBSON() {
    return this.constructor.toBSON(this);
  }

  static from(object, view, start, length) {
    if (object && object instanceof Uint8Array) return this.fromBSON(object, view, start, length);
    return super.from(object, view, start, length);
  }

  static fromBSON(object, view, start, length) {
    const objectView = view || new this(this.defaultBuffer.slice());
    if (view) new Uint8Array(view.buffer, view.byteOffset + start, length).fill(0);
    this.readBSONObject(object.subarray(4), new Uint8Array(objectView.buffer), this);
    return objectView;
  }

  static hasBSONLength(type) {
    return (type > 0x01 && type < 0x06) || (type > 0x0C && type < 0x10);
  }

  static getBSONInt32(bson, index) {
    let length = 0xFF & bson[index];
    length |= (0xFF & bson[index + 1]) << 8;
    length |= (0xFF & bson[index + 2]) << 16;
    length |= (0xFF & bson[index + 3]) << 24;
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
      case 0x0D: // JavaScript code
        return this.getBSONInt32(bson, startIndex);
      case 0x07: // ObjectID
        return 12;
      case 0x08: // Boolean
        return 1;
      case 0x0B: // RegExp
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

  static readBSONObject(bson, view, View, length) {
    let caret = 0;
    let index = 0;
    while (caret < bson.byteLength - 1) {
      const elementType = bson[caret];
      if (!BSONTypes[elementType]) {
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
      let fieldLength = length;
      let SubView = View;
      if (length) {
        start = index * length;
        hasValue = start < view.byteLength && valueLength;
      } else {
        const fieldName = this.getFieldName(bson.subarray(nameStart, nameEnd), View);
        if (fieldName) {
          const fieldOptions = View.layout[fieldName];
          start = fieldOptions.start;
          fieldLength = fieldOptions.length;
          SubView = fieldOptions.View;
          const hasTypeConflict = ((elementType === 0x03
            && !(SubView.prototype instanceof ObjectView))
            || (elementType === 0x04 && !(SubView.prototype instanceof ArrayView)));
          hasValue = !!valueLength && !hasTypeConflict;
        }
      }
      if (hasValue) {
        this.writeBSONtoView(bson, elementType, valueStart,
          valueLength, view, start, fieldLength, SubView);
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
        this.readBSONObject(bson.subarray(valueStart, valueStart + valueLength),
          view.subarray(start, start + length), View);
        break;
      case 0x04: // array
        this.readBSONObject(bson.subarray(valueStart, valueStart + valueLength),
          view.subarray(start, start + length), View, View.getLength(1));
        break;
      default:
        const minLength = valueLength > length ? length : valueLength;
        for (let i = 0; i < minLength; i++) {
          view[start + i] = bson[valueStart + i];
        }
        break;
    }
  }

  static initialize() {
    super.initialize();
    this.encodedFields = this.fields.map((name) => StringView.encoder.encode(name));
  }

  static getFieldName(name, View) {
    const { encodedFields, fields } = View;
    const nameLength = name.byteLength;
    outer: for (let i = 0; i < encodedFields.length; i++) {
      const fieldName = encodedFields[i];
      if (fieldName.length !== nameLength) continue;
      for (let j = 0; j < nameLength; j++) {
        if (fieldName[j] !== name[j]) continue outer;
      }
      return fields[i];
    }
    return undefined;
  }

  static toBSON(view, start = 0) {
    const { fields, layout } = this;
    const result = {};
    for (let i = 0; i < fields.length; i++) {
      const name = fields[i];
      const { View, start: fieldStart, length: fieldLength } = layout[name];
      result[name] = View.toBSON ? View.toBSON(view, start + fieldStart, fieldLength)
        : View.toJSON(view, start + fieldStart, fieldLength);
    }
    return result;
  }
}

BSONView.types = {
  ...ObjectView.types,
  double() {
    return TypeViewMixin('float64', true);
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
    return TypeViewMixin('int32', true);
  },

  long() {
    return LongView;
  },
  // todo decimal
};

BSONView.encodedFields = undefined;

module.exports = BSONView;
