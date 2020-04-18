const { ObjectView, ArrayView } = require('structurae');

const TYPE = {
  DOUBLE: 0x01,
  STRING: 0x02,
  DOCUMENT: 0x03,
  ARRAY: 0x04,
  BINARY: 0x05,
  OBJECTID: 0x07,
  BOOLEAN: 0x08,
  DATETIME: 0x09,
  NULL: 0x0a,
  REGEXP: 0x0b,
  CODE: 0x0d,
  INT32: 0x10,
  TIMESTAMP: 0x11,
  INT64: 0x12,
  DECIMAL128: 0x13,
};

const supportedTypes = Object.values(TYPE).reduce((a, v) => {
  a[v] = true;
  return a;
}, {});

class BSONParser {
  static hasLength(type) {
    return (type > 0x01 && type < 0x06) || (type > 0x0c && type < 0x10);
  }

  static getInt32(bson, index) {
    let length = 0xff & bson[index];
    length |= (0xff & bson[index + 1]) << 8;
    length |= (0xff & bson[index + 2]) << 16;
    length |= (0xff & bson[index + 3]) << 24;
    return length;
  }

  static getElementLength(bson, type, startIndex) {
    switch (type) {
      case TYPE.INT32:
        return 4;
      case TYPE.DOUBLE:
      case TYPE.DATETIME:
      case TYPE.TIMESTAMP:
      case TYPE.INT64:
        return 8;
      case TYPE.DOCUMENT:
      case TYPE.ARRAY:
        return this.getInt32(bson, startIndex) - 4;
      case TYPE.STRING:
      case TYPE.BINARY:
      case TYPE.CODE:
        return this.getInt32(bson, startIndex);
      case TYPE.OBJECTID:
        return 12;
      case TYPE.BOOLEAN:
        return 1;
      case TYPE.REGEXP:
        const petternEnd = bson.indexOf(0, startIndex);
        return bson.indexOf(0, petternEnd + 1) - startIndex + 1;
      case TYPE.DECIMAL128:
        return 16;
      default:
        return 0;
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

  static read(bson, begin, end, view, offset, View, itemLength) {
    let caret = begin;
    let index = 0;
    while (caret < end - 1) {
      const elementType = bson[caret];
      if (!Reflect.has(supportedTypes, elementType)) {
        throw new TypeError(`Type ${elementType} is not supported.`);
      }
      const elementLength = this.hasLength(elementType) ? 4 : 0;
      const nameStart = caret + 1;
      let nameEnd = nameStart;
      while (bson[nameEnd]) nameEnd++;
      const fieldStart = nameEnd + 1;
      // offset subtype byte for binary
      const valueStart = fieldStart + elementLength + (elementType === 0x05);
      const valueLength = this.getElementLength(bson, elementType, fieldStart);
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
        this.write(bson, elementType, valueStart, valueLength, view, start, fieldLength, SubView);
      }
      index++;
    }
  }

  static write(bson, type, valueStart, valueLength, view, start, length, View) {
    switch (type) {
      case TYPE.BOOLEAN:
        view[start] = bson[valueStart];
        break;
      case TYPE.DOCUMENT:
        this.read(bson, valueStart, valueStart + valueLength, view, start, View);
        break;
      case TYPE.ARRAY:
        this.read(bson, valueStart, valueStart + valueLength, view, start, View, View.itemLength);
        break;
      default:
        const minLength = valueLength > length ? length : valueLength;
        for (let i = 0; i < minLength; i++) {
          view[start + i] = bson[valueStart + i];
        }
        break;
    }
  }
}

module.exports = BSONParser;
