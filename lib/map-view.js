const { MapView } = require('structurae');

class BSONMapView extends MapView {
  toBSON(fields) {
    return this.constructor.toBSON(this, 0, fields);
  }

  static toBSON(view, start = 0, fields = this.fields) {
    const { layout } = this;
    const object = {};
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const { View } = layout[field];
      const startOffset = start + (i << 2);
      const fieldStart = view.getUint32(startOffset, true);
      const end = view.getUint32(startOffset + 4, true);
      object[field] =
        fieldStart === end ? null : View.toBSON(view, start + fieldStart, end - fieldStart);
    }
    return object;
  }
}

module.exports = BSONMapView;
