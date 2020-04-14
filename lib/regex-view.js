const { StringView } = require('structurae');

const ZERO_CHAR = '\x00';

class RegexView extends StringView {
  toString() {
    return this.toJSON().toString();
  }

  toJSON() {
    return this.constructor.toJSON(this, 0, this.length);
  }

  static from(arrayLike, mapFn, thisArg, length) {
    if (arrayLike && Object.prototype.toString.call(arrayLike) !== '[object RegExp]')
      return super.from(arrayLike, mapFn, thisArg);
    const string = `${arrayLike.source}${ZERO_CHAR}${arrayLike.flags}`;
    return super.from(string, mapFn, thisArg, length);
  }

  static toJSON(view, start, length) {
    const regexView = new this(view.buffer, view.byteOffset + start, length);
    if (regexView[0] === 0) return new RegExp(); // the field is empty
    const decoded = this.decoder.decode(regexView);
    const [pattern, flags] = decoded.split(ZERO_CHAR);
    try {
      return new RegExp(pattern, flags);
    } catch (e) {
      return new RegExp();
    }
  }
}

module.exports = RegexView;
