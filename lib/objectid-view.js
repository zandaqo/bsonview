
/** Lookup tables to speed up ObjectId string <-> binary conversions. */
const hexToStringTable = [];
{
  for (let i = 0; i < 256; i++) {
    hexToStringTable[i] = (i <= 15 ? '0' : '') + i.toString(16);
  }
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
    if (!value) return;
    const objectView = view || this.of();
    const string = typeof value === 'string' ? value : value.toString();
    let n = 0;
    let i = 0;
    while (i < 24) {
      objectView.setUint8(start + n++,
        (stringToHexTable[string.charCodeAt(i++)] << 4)
        | stringToHexTable[string.charCodeAt(i++)]);
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
}

/**
 * @type {number}
 */
ObjectIdView.objectLength = 12;

/**
 * @type {boolean}
 */
ObjectIdView.isPrimitive = false;

module.exports = ObjectIdView;
