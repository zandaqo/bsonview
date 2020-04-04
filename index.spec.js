const BSON = require('bson');
globalThis.BSON = BSON;

const { ObjectViewMixin, ArrayViewMixin } = require('structurae');
const BSONView = require('./index');

const SomeView = ObjectViewMixin({
  $id: 'SomeBson',
  type: 'object',
  properties: {
    a: { type: 'integer', btype: 'uint8' },
    b: { type: 'double', default: 4 },
    c: {
      type: 'array',
      maxItems: 2,
      items: { type: 'double' },
      default: [1, 3],
    },
    d: { type: 'binary', maxLength: 5 },
    e: { type: 'objectId' },
    f: { type: 'boolean', default: true },
    g: { type: 'date' },
    h: { type: 'regex', maxLength: 6 },
    i: { type: 'javascript', maxLength: 10 },
    j: { type: 'timestamp' },
    k: { type: 'int' },
    l: { type: 'long' },
  },
}, BSONView);

const defaultView = {
  a: 0,
  b: 4,
  c: [1, 3],
  d: [0, 0, 0, 0, 0],
  e: '000000000000000000000000',
  f: true,
  g: new Date(0),
  h: new RegExp(),
  i: '',
  j: 0n,
  k: 0,
  l: 0n,
};

describe('BSONView', () => {
  describe('from', () => {
    it('creates a default view from an empty object', () => {
      const view = SomeView.from({});
      expect(view.toJSON()).toEqual(defaultView);
    });

    it('creates a view from an object', () => {
      const object = {
        a: 6,
        b: 57.89,
        c: [1.1, 3.3],
        d: [5, 6, 100, 92, 67],
        e: new BSON.ObjectID().toHexString(),
        f: false,
        g: new Date(),
        h: new RegExp('abc', 'i'),
        i: 'var a = 10',
        j: 5n,
        k: 156,
        l: 3n,
      };
      const view = SomeView.from(object);
      expect(view.toJSON()).toEqual(object);
    });

    it('creates a view from a BSON', () => {
      const json = {
        a: 6,
        b: 57.89,
        c: [2.5, 4.6],
        d: [5, 6, 100, 92, 67],
        e: new BSON.ObjectID().toHexString(),
        f: false,
        g: new Date(),
        h: new RegExp('abc', 'i'),
        i: 'var a = 10',
        j: 0n,
        k: 156,
        l: 0n,
      };
      const bson = BSON.serialize({
        ...json,
        d: Buffer.from(json.d),
        e: new BSON.ObjectID(json.e),
        i: new BSON.Code(json.i),
        j: new BSON.Timestamp(Number(json.j)),
        l: new BSON.Long(Number(json.l)),
      });
      const view = SomeView.from(bson);
      expect(view.toJSON()).toEqual(json);
    });

    it('skips fields in BSON that have conflicting types', () => {
      const json = {
        a: {},
        b: 57.89,
        c: [1.1, 3.3],
        d: [5, 6, 100, 92, 67],
        e: new BSON.ObjectID().toHexString(),
        f: false,
        g: new Date(),
        h: new RegExp('abc', 'i'),
        i: 'var a = 10',
        j: 0n,
        k: 156,
        l: 0n,
      };
      const bson = BSON.serialize({
        ...json,
        d: Buffer.from(json.d),
        e: new BSON.ObjectID(json.e),
        i: new BSON.Code(json.i),
        j: new BSON.Timestamp(Number(json.j)),
        l: new BSON.Long(Number(json.l)),
      });
      const view = SomeView.from(bson);
      const result = view.toJSON();
      expect(result).toEqual({ ...json, a: 0 });
    });

    it('uses an existing view when provided', () => {
      const json = {
        a: 7,
        b: 57.89,
        c: [1.1, 3.3],
        d: [5, 6, 100, 92, 67],
        e: new BSON.ObjectID().toHexString(),
        f: false,
        g: new Date(),
        h: new RegExp('abc', 'i'),
        i: 'var a = 10',
        j: 0n,
        k: 156,
        l: 0n,
      };
      const bson = BSON.serialize({
        ...json,
        d: Buffer.from(json.d),
        e: new BSON.ObjectID(json.e),
        i: new BSON.Code(json.i),
        j: new BSON.Timestamp(Number(json.j)),
        l: new BSON.Long(Number(json.l)),
      });
      const views = ArrayViewMixin(SomeView).from([bson, bson]);
      expect(views.get(1)).toEqual(json);
    });
  });

  describe('toBSON', () => {
    it('converts view into an object for BSON serialization', () => {
      const json = {
        a: 6,
        b: 57.89,
        c: [1.1, 3.3],
        d: [5, 6, 100, 92, 67],
        e: new BSON.ObjectID().toHexString(),
        f: false,
        g: new Date(),
        h: new RegExp('abc', 'i'),
        i: 'var a = 10',
        j: 110n,
        k: 156,
        l: 110n,
      };
      const view = SomeView.from(json);
      const bson = view.toBSON();
      const expected = {
        ...json,
        d: new BSON.Binary(json.d),
        e: new BSON.ObjectId(json.e),
        i: new BSON.Code(json.i),
        j: BSON.Timestamp.fromString(json.j.toString(), 10),
        l: BSON.Long.fromString(json.l.toString()),
      };
      expect(bson).toEqual(expected);
    });
  });

});
