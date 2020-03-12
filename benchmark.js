const { ArrayViewMixin } = require('structurae');
const BSON = require('bson');
const Benchmark = require('benchmark');
const jsf = require('json-schema-faker');
const BSONView = require('./index')(BSON);

const benchmarkOptions = {
  onStart(event) {
    console.log(event.currentTarget.name);
  },
  onCycle(event) {
    console.log(`   ${String(event.target)}`);
  },
  onComplete(event) {
    console.log(` Fastest is ${event.currentTarget.filter('fastest').map('name')}`);
    console.log('');
  },
};

const getIndex = (size) => (Math.random() * size) | 0;

const JSONSchema = {
  type: 'object',
  properties: {
    type: { type: 'integer', minimum: 0, maximum: 255 },
    id: { type: 'integer' },
    name: { type: 'string', minLength: 5, maxLength: 50 },
    weight: { type: 'number' },
    height: { type: 'number' },
    scores: {
      type: 'array',
      items: {
        type: 'integer',
        minimum: 0,
        maximum: 255,
      },
      minItems: 50,
      maxItems: 50,
    },
  },
  required: ['type', 'id', 'name', 'weight', 'height', 'scores'],
};

class CView extends BSONView {}
CView.schema = {
  type: { type: 'uint8' },
  id: { type: 'int' },
  name: { type: 'string', length: 50 },
  weight: { type: 'double' },
  height: { type: 'double' },
  scores: { type: 'int', size: 50 },
};
CView.initialize();

const objects = [];
const bsons = [];

for (let i = 0; i < 100; i++) {
  const object = jsf.generate(JSONSchema);
  objects.push(object);
  bsons.push(BSON.serialize(object));
}

const Views = ArrayViewMixin(CView);
const views = Views.from(objects);
const tempView = CView.from({});

const suits = [
  new Benchmark.Suite('Serialize JSON:', benchmarkOptions)
    .add('JSON to BSON', () => {
      const object = objects[getIndex(100)];
      return BSON.serialize(object);
    })
    .add('JSON to View', () => {
      const object = objects[getIndex(100)];
      return CView.from(object);
    }),
  new Benchmark.Suite('Deserialize to JSON:', benchmarkOptions)
    .add('BSON to JSON', () => {
      const bson = bsons[getIndex(100)];
      return BSON.deserialize(bson);
    })
    .add('BSON to View', () => {
      const bson = bsons[getIndex(100)];
      return CView.from(bson, tempView);
    })
    .add('View to JSON', () => {
      const view = views.get(getIndex(100));
      return view.toJSON();
    }),
];

if (require.main === module) {
  suits.forEach((suite) => suite.run());
}

module.exports = {
  suits,
};
