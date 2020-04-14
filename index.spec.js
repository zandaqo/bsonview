const BSON = require('bson');
globalThis.BSON = BSON;

const { ObjectViewMixin, ArrayViewMixin, MapViewMixin } = require('structurae');
const { BSONObjectView, BSONMapView } = require('./index');

const ExampleBSONView = ObjectViewMixin(
  {
    $id: 'ExampleObject',
    type: 'object',
    properties: {
      a: { type: 'integer', btype: 'uint8' },
      b: { type: 'number', btype: 'float64', default: 4 },
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
      m: {
        $id: 'NestedObject',
        type: 'object',
        properties: {
          a: { type: 'objectId' },
        },
      },
      n: {
        type: 'array',
        maxItems: 3,
        items: { $ref: '#NestedObject' },
      },
      o: { type: 'string', maxLength: 10, default: 'abc' },
    },
  },
  BSONObjectView,
);

const defaultView = {
  a: 0,
  b: 4,
  c: [1, 3],
  d: [0, 0, 0, 0, 0],
  e: '000000000000000000000000',
  f: true,
  g: new Date(0),
  h: new RegExp(''),
  i: '',
  j: 0n,
  k: 0,
  l: 0n,
  m: { a: '000000000000000000000000' },
  n: [
    { a: '000000000000000000000000' },
    { a: '000000000000000000000000' },
    { a: '000000000000000000000000' },
  ],
  o: 'abc',
};

describe('BSONObjectView', () => {
  let json = undefined;
  let bson = undefined;
  let toBson = undefined;

  beforeEach(() => {
    json = {
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
      m: { a: new BSON.ObjectID().toHexString() },
      n: [
        { a: new BSON.ObjectID().toHexString() },
        { a: new BSON.ObjectID().toHexString() },
        { a: new BSON.ObjectID().toHexString() },
      ],
      o: 'defgh',
    };
    toBson = {
      ...json,
      a: new BSON.Int32(6),
      b: new BSON.Double(57.89),
      c: [new BSON.Double(2.5), new BSON.Double(4.6)],
      d: new BSON.Binary(Buffer.from(json.d, 'binary')),
      e: new BSON.ObjectId(json.e),
      i: new BSON.Code(json.i),
      j: BSON.Timestamp.fromString(json.j.toString(), 10),
      k: new BSON.Int32(156),
      l: BSON.Long.fromString(json.l.toString()),
      m: { a: new BSON.ObjectID(json.m.a) },
      n: [
        { a: new BSON.ObjectID(json.n[0].a) },
        { a: new BSON.ObjectID(json.n[1].a) },
        { a: new BSON.ObjectID(json.n[2].a) },
      ],
    };
    bson = BSON.serialize(toBson);
  });

  describe('toBSON', () => {
    it('returns a BSON value of a field', () => {
      const view = ExampleBSONView.from(json);
      expect(view.getBSON('e')).toEqual(toBson.e);
      expect(view.getBSON('a')).toEqual(toBson.a);
      expect(view.getBSON('m')).toEqual(toBson.m);
    });
  });

  describe('from', () => {
    it('creates a default view from an empty object', () => {
      const view = ExampleBSONView.from({});
      expect(view.toJSON()).toEqual(defaultView);
    });

    it('creates a view from an object', () => {
      const view = ExampleBSONView.from(json);
      expect(view.toJSON()).toEqual(json);
    });

    it('creates a view from a BSON', () => {
      const view = ExampleBSONView.from(bson);
      expect(view.toJSON()).toEqual(json);
    });

    it('skips fields in BSON that have conflicting types', () => {
      const conflictingBson = BSON.serialize({
        ...toBson,
        a: {},
      });
      const view = ExampleBSONView.from(conflictingBson);
      expect(view.toJSON()).toEqual({ ...json, a: 0 });
    });

    it('uses an existing view when provided', () => {
      const views = ArrayViewMixin(ExampleBSONView).from([bson, bson]);
      expect(views.get(1)).toEqual(json);
    });
  });

  describe('toBSON', () => {
    it('converts a view into an object for BSON serialization', () => {
      const view = ExampleBSONView.from(json);
      const result = view.toBSON();
      expect(result).toEqual(toBson);
    });

    it('converts a list of specified fields of a view into an object for BSON serialization', () => {
      const view = ExampleBSONView.from(json);
      const { a, b, c, d, e, f, g, ...subsetBson } = toBson;
      const result = view.toBSON(['h', 'i', 'j', 'k', 'l', 'm', 'n', 'o']);
      expect(result).toEqual(subsetBson);
    });
  });

  describe('Array', () => {
    it('returns an array view class of the bson view', () => {
      const ExampleArray = ArrayViewMixin(ExampleBSONView);
      expect(ExampleBSONView.Array).toBe(ExampleArray);
      expect(ExampleBSONView.Array).toBe(ExampleArray);
    });
  });
});

describe('BSONMapView', () => {
  const ExampleBSONMapView = MapViewMixin(
    {
      $id: 'ExampleMap',
      type: 'object',
      properties: {
        o: { $ref: '#ExampleObject' },
        p: { type: 'string' },
        q: { type: 'number' },
      },
    },
    BSONMapView,
    BSONObjectView,
  );

  describe('toBSON', () => {
    it('converts a map view into an object for BSON serialization', () => {
      const view = ExampleBSONMapView.from({ o: {}, p: 'abc' });
      const bson = view.toBSON();
      expect(bson.p).toBe('abc');
      expect(bson.q).toBe(null);
    });
  });
});
