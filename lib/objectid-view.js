/** Lookup tables to speed up ObjectId string <-> binary conversions. */
const hexToStringTable = [];
for (let i = 0; i < 256; i++) {
  hexToStringTable[i] = (i <= 15 ? '0' : '') + i.toString(16);
}

const stringToHexTable = [];
{
  let i = 0;
  while (i < 10) stringToHexTable[0x30 + i] = i++;
  while (i < 16) stringToHexTable[0x41 - 10 + i] = stringToHexTable[0x61 - 10 + i] = i++;
}

class ObjectIdView extends DataView {
  get() {
    return this.constructor.toJSON(this);
  }

  set(value) {
    this.constructor.from(value, this);
    return this;
  }

  toJSON() {
    return this.constructor.toJSON(this);
  }

  toBSON() {
    return this.constructor.toBSON(this);
  }

  static getLength() {
    return 12;
  }

  static from(value, view, start = 0) {
    const objectView = view || this.of();
    if (!value) return objectView;
    if (this.BSON && value instanceof this.BSON) {
      let i = 0;
      while (i < 12) objectView.setUint8(start + i++, value.id[i]);
      return objectView;
    }
    const string = typeof value === 'string' ? value : value.toString();
    let n = 0;
    let i = 0;
    while (i < 24) {
      objectView.setUint8(
        start + n++,
        (stringToHexTable[string.charCodeAt(i++)] << 4) | stringToHexTable[string.charCodeAt(i++)],
      );
    }
    return objectView;
  }

  static of() {
    return new this(new ArrayBuffer(12));
  }

  static toJSON(view, start = 0) {
    const hexChars = [];
    for (let i = 0; i < 12; i++) {
      const code = view.getUint8(start + i);
      hexChars.push(hexToStringTable[code]);
    }
    return hexChars.join('');
  }

  static toBSON(view, start = 0) {
    const value = this.toJSON(view, start);
    return new this.BSON(value);
  }
}

ObjectIdView.objectLength = 12;

ObjectIdView.BSON = globalThis.BSON && globalThis.BSON.ObjectId;

module.exports = ObjectIdView;
