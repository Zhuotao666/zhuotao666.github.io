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
const polygons = [];
topology.objects.countries.geometries.forEach((geometry, owner) => {
  visit(geometry.arcs, owner);
  const groups = geometry.type === 'Polygon' ? [geometry.arcs] : geometry.arcs;
  groups.forEach(group => polygons.push(group.map(ring => ring.flatMap((index, i) => {
    const points = index < 0 ? arcs[~index].slice().reverse() : arcs[index];
    return i ? points.slice(1) : points;
  }))));
});
function inside(lon, lat, ring) {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x, y] = ring[i], [px, py] = ring[j];
    if ((y > lat) !== (py > lat) && lon < (px - x) * (lat - y) / (py - y) + x) result = !result;
  }
  return result;
}
const land = [];
for (let lat = -82; lat <= 82; lat += 2.4) {
  for (let lon = -180; lon < 180; lon += 2.4 / Math.max(0.2, Math.cos(lat * Math.PI / 180))) {
    if (polygons.some(rings => inside(lon, lat, rings[0]) && !rings.slice(1).some(ring => inside(lon, lat, ring)))) {
      land.push([+lon.toFixed(4), +lat.toFixed(4)]);
    }
  }
}
const data = {
  source: 'Natural Earth 4.1.0 via world-atlas 2.0.2, 1:110m; public-domain geographic data',
  coastlines: arcs.filter((_, i) => owners[i].size === 1),
  borders: arcs.filter((_, i) => owners[i].size > 1),
  land
};
const output = path.join(__dirname, '../assets/data/earth-map.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(data));
console.log(`${data.coastlines.length} coast arcs, ${data.borders.length} shared borders, ${land.length} land points`);
