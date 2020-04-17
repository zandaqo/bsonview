class DecimalView extends DataView {
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
    return 16;
  }

  static from(value, view, start = 0) {
    const objectView = view || this.of();
    if (!value) return objectView;
    for (let i = 0; i < 16; i++) {
      objectView.setUint8(start + i, value[i]);
    }
    return objectView;
  }

  static of() {
    return new this(new ArrayBuffer(16));
  }

  static toJSON(view, start = 0) {
    const array = new Array(16);
    for (let i = 0; i < 16; i++) {
      array[i] = view.getUint8(view.byteOffset + start + i);
    }
    return array;
  }

  static toBSON(view, start = 0) {
    const buffer = globalThis.Buffer.from(view.buffer, view.byteOffset + start, 16);
    return new this.BSON(buffer);
  }
}

DecimalView.objectLength = 16;

DecimalView.BSON = globalThis.BSON && globalThis.BSON.Decimal128;

module.exports = DecimalView;
