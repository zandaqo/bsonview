const { TypeViewMixin } = require('structurae');

const BSONNumbers = {
  int8: 'Int32',
  uint8: 'Int32',
  int16: 'Int32',
  uint16: 'Int32',
  int32: 'Int32',
  uint32: 'Int32',
  // float32: 'Double',
  float64: 'Double',
  bigint64: 'Long',
  biguint64: 'Timestamp',
};

function BSONTypeViewMixin(type) {
  const BSONType = BSONNumbers[type];
  if (!BSONType) throw TypeError(`Type ${type} is not supported.`);
  const View = TypeViewMixin(type, true);
  View.BSON = globalThis.BSON && globalThis.BSON[BSONType];
  return View;
}

module.exports = BSONTypeViewMixin;
