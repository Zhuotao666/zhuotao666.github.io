// Usage: node scripts/build-earth-map.cjs path/to/world-atlas/countries-110m.json
// Source: world-atlas 2.0.2 / Natural Earth 1:110m, public-domain geography.
const fs = require('node:fs');
const path = require('node:path');
const topology = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const { scale, translate } = topology.transform;
const arcs = topology.arcs.map(arc => {
  let x = 0, y = 0;
  return arc.map(([dx, dy]) => {
    x += dx; y += dy;
    return [+(x * scale[0] + translate[0]).toFixed(4), +(y * scale[1] + translate[1]).toFixed(4)];
  });
});
const owners = arcs.map(() => new Set());
function visit(value, owner) {
  if (Array.isArray(value)) value.forEach(item => visit(item, owner));
  else owners[value < 0 ? ~value : value].add(owner);
}
topology.objects.countries.geometries.forEach((geometry, owner) => {
  visit(geometry.arcs, owner);
});
const data = {
  source: 'Natural Earth 4.1.0 via world-atlas 2.0.2, 1:110m; public-domain geographic data',
  coastlines: arcs.filter((_, i) => owners[i].size === 1),
  borders: arcs.filter((_, i) => owners[i].size > 1)
};
const output = path.join(__dirname, '../assets/data/earth-map.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(data));
console.log(`${data.coastlines.length} coast arcs, ${data.borders.length} shared borders`);
