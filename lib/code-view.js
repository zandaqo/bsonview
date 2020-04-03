const { StringView } = require('structurae');

class CodeView extends StringView {
  static toBSON(view, start, length) {
    const value = this.toJSON(view, start, length);
    return new this.BSON(value);
  }
}

CodeView.BSON = globalThis.BSON && globalThis.BSON.Code;

module.exports = CodeView;
