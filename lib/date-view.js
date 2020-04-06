const { TypeViewMixin } = require('structurae');

const BigInt = globalThis.BigInt || Number;

class DateView extends TypeViewMixin('bigint64', true) {
  static from(value, view, start) {
    return super.from(BigInt(value.valueOf()), view, start);
  }

  static toJSON(view, start) {
    const value = super.toJSON(view, start);
    return new Date(Number(value));
  }

  static toBSON(view, start) {
    return this.toJSON(view, start);
  }
}

module.exports = DateView;
