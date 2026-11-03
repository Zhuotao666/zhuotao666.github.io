(() => {
  'use strict';

  const canvas = document.getElementById('earth-background');
  const context = canvas && canvas.getContext('2d');
  if (!context) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const radians = Math.PI / 180;
  const tilt = -18 * radians;
  // Deliberately simplified geographic silhouettes, in longitude/latitude.
  const continents = [
    [[-168,65],[-145,71],[-125,70],[-110,73],[-85,70],[-60,53],[-65,46],[-81,25],[-97,18],[-106,24],[-117,32],[-125,49],[-150,59]],
    [[-81,12],[-70,10],[-60,6],[-50,0],[-35,-7],[-40,-23],[-53,-34],[-68,-55],[-75,-40],[-80,-10]],
    [[-53,60],[-42,61],[-20,76],[-30,83],[-55,80],[-65,68]],
    [[-17,35],[4,37],[12,33],[32,31],[35,13],[51,11],[43,-12],[34,-26],[18,-35],[10,-20],[8,3],[-8,5],[-17,16]],
    [[-10,36],[-10,44],[3,49],[8,55],[5,60],[20,71],[40,69],[60,73],[100,77],[140,71],[179,66],[170,55],[145,49],[140,35],[125,39],[121,23],[108,18],[105,5],[97,16],[88,22],[78,8],[69,24],[57,25],[45,12],[35,30],[27,41],[15,38],[9,44],[0,40]],
    [[113,-22],[123,-14],[136,-12],[145,-17],[153,-27],[146,-39],[130,-33],[115,-35]],
    [[47,-13],[51,-16],[48,-26],[44,-24]],
    [[130,32],[135,35],[141,42],[145,44],[142,36]],
    [[95,5],[106,-6],[119,-8],[130,-4],[141,-5],[150,-10],[136,-10],[120,-10],[108,-8]],
    [[173,-34],[178,-39],[168,-47],[166,-44]],
    [[-180,-75],[-130,-73],[-70,-68],[-30,-76],[30,-70],[90,-67],[150,-73],[180,-75],[180,-90],[-180,-90]]
  ];

  function inside(lon, lat, polygon) {
    let result = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [x, y] = polygon[i];
      const [px, py] = polygon[j];
      if ((y > lat) !== (py > lat) && lon < (px - x) * (lat - y) / (py - y) + x) result = !result;
    }
    return result;
  }

  const land = [];
  for (let lat = -82; lat <= 82; lat += 2.4) {
    for (let lon = -180; lon < 180; lon += 2.4 / Math.max(0.2, Math.cos(lat * radians))) {
      if (continents.some(polygon => inside(lon, lat, polygon))) land.push([lon, lat]);
    }
  }

  const surface = document.createElement('canvas');
  surface.width = surface.height = 240;
  const surfaceContext = surface.getContext('2d');
  if (!surfaceContext) return;
  const pixels = surfaceContext.createImageData(240, 240);
  let width = 0, height = 0, radius = 0, centerX = 0, centerY = 0;
  let elapsed = 0, previous = 0, frame = 0;
  let dark = document.documentElement.classList.contains('dark');

  function project(lon, lat, rotation) {
    const longitude = lon * radians + rotation;
    const latitude = lat * radians;
    const x = Math.cos(latitude) * Math.sin(longitude);
    const y = Math.sin(latitude);
    const z = Math.cos(latitude) * Math.cos(longitude);
    return [x * Math.cos(tilt) - y * Math.sin(tilt), x * Math.sin(tilt) + y * Math.cos(tilt), z];
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    const rotation = -1.5 + elapsed / 110000; // One revolution in about 11.5 minutes.
    const sunAngle = -0.85 + elapsed / 75000;
    const sun = [Math.sin(sunAngle), 0.25, Math.cos(sunAngle)];
    const night = dark ? [28, 51, 78] : [153, 177, 199];
    const day = dark ? [73, 115, 143] : [225, 237, 240];
    // Shade sphere normals to make a soft, moving day/night terminator.
    for (let y = 0; y < 240; y++) {
      for (let x = 0; x < 240; x++) {
        const nx = (x - 119.5) / 119.5, ny = (119.5 - y) / 119.5;
        const distance = nx * nx + ny * ny;
        const index = (y * 240 + x) * 4;
        if (distance > 1) { pixels.data[index + 3] = 0; continue; }
        const nz = Math.sqrt(1 - distance);
        const light = Math.max(0, Math.min(1, (nx * sun[0] + ny * sun[1] + nz * sun[2] + 0.18) / 0.7));
        for (let c = 0; c < 3; c++) pixels.data[index + c] = night[c] + (day[c] - night[c]) * light;
        pixels.data[index + 3] = Math.round(150 * Math.min(1, nz * 9));
      }
    }
    surfaceContext.putImageData(pixels, 0, 0);
    context.drawImage(surface, centerX - radius, centerY - radius, radius * 2, radius * 2);

    context.lineWidth = 0.65;
    context.strokeStyle = dark ? 'rgba(149, 194, 215, 0.24)' : 'rgba(88, 130, 151, 0.24)';
    function line(points) {
      context.beginPath();
      let visible = false;
      for (const [lon, lat] of points) {
        const [x, y, z] = project(lon, lat, rotation);
        if (z <= 0.015) { visible = false; continue; }
        if (visible) context.lineTo(centerX + x * radius, centerY - y * radius);
        else context.moveTo(centerX + x * radius, centerY - y * radius);
        visible = true;
      }
      context.stroke();
    }
    for (let lat = -75; lat <= 75; lat += 15) {
      const points = [];
      for (let lon = -180; lon <= 180; lon += 3) points.push([lon, lat]);
      line(points);
    }
    for (let lon = -180; lon < 180; lon += 20) {
      const points = [];
      for (let lat = -90; lat <= 90; lat += 3) points.push([lon, lat]);
      line(points);
    }
    for (const [lon, lat] of land) {
      const [x, y, z] = project(lon, lat, rotation);
      if (z <= 0) continue;
      const light = Math.max(0, x * sun[0] + y * sun[1] + z * sun[2]);
      context.fillStyle = dark
        ? `rgba(151, 199, 213, ${0.12 + light * 0.25})`
        : `rgba(89, 137, 151, ${0.14 + light * 0.18})`;
      context.beginPath();
      context.ellipse(centerX + x * radius, centerY - y * radius, Math.max(0.65, radius * 0.0022), Math.max(0.5, radius * 0.0022 * z), 0, 0, Math.PI * 2);
      context.fill();
    }
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    radius = Math.max(width * 0.56, height * 0.78);
    centerX = width * (width < 640 ? 0.86 : 0.76);
    centerY = height + radius * 0.12;
    draw();
  }

  function animate(time) {
    if (time - previous >= 66) { // Limit decorative animation to 15 fps.
      elapsed += previous ? Math.min(time - previous, 120) : 0;
      previous = time;
      draw();
    }
    frame = requestAnimationFrame(animate);
  }

  function syncAnimation() {
    cancelAnimationFrame(frame);
    previous = 0;
    draw();
    if (!document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(animate);
  }

  new MutationObserver(() => {
    dark = document.documentElement.classList.contains('dark');
    draw();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', syncAnimation);
  reducedMotion.addEventListener('change', syncAnimation);
  resize();
  syncAnimation();
})();
