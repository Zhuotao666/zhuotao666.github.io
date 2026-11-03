(() => {
  'use strict';

  const canvas = document.getElementById('earth-background');
  const context = canvas && canvas.getContext('2d');
  if (!context) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const radians = Math.PI / 180;
  const tilt = -18 * radians;
  // Five inhabited continents (the Americas grouped together), four oceans.
  // English labels match the homepage; far-side labels are never drawn.
  const labels = [
    ['ASIA', 95, 45], ['EUROPE', 20, 54], ['AFRICA', 20, 12],
    ['AMERICAS', -90, 30], ['OCEANIA', 135, -22],
    ['PACIFIC OCEAN', -150, 14], ['ATLANTIC OCEAN', -35, 25],
    ['INDIAN OCEAN', 75, -18], ['ARCTIC OCEAN', 20, 79]
  ];
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
    const night = dark ? [28, 51, 78] : [133, 162, 188];
    const day = dark ? [73, 115, 143] : [210, 230, 235];
    // A distant warm light source follows the same direction as sphere lighting.
    const sunX = centerX + sun[0] * radius * 1.15;
    const sunY = centerY - radius * 1.03;
    const glowSize = Math.max(width, height) * 0.52;
    const glow = context.createRadialGradient(sunX, sunY, 0, sunX, sunY, glowSize);
    glow.addColorStop(0, dark ? 'rgba(255, 229, 177, 0.28)' : 'rgba(255, 217, 151, 0.46)');
    glow.addColorStop(0.12, 'rgba(255, 224, 172, 0.17)');
    glow.addColorStop(0.45, 'rgba(246, 216, 173, 0.06)');
    glow.addColorStop(1, 'rgba(255, 224, 172, 0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
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

    // A narrow atmospheric halo makes the curvature visible without a hard rim.
    const atmosphere = context.createRadialGradient(centerX, centerY, radius * 0.97, centerX, centerY, radius * 1.025);
    atmosphere.addColorStop(0, 'rgba(142, 196, 219, 0)');
    atmosphere.addColorStop(0.5, dark ? 'rgba(155, 210, 235, 0.28)' : 'rgba(131, 185, 208, 0.23)');
    atmosphere.addColorStop(1, 'rgba(142, 196, 219, 0)');
    context.fillStyle = atmosphere;
    context.fillRect(0, 0, width, height);

    context.lineWidth = 0.85;
    context.strokeStyle = dark ? 'rgba(149, 194, 215, 0.42)' : 'rgba(74, 117, 141, 0.40)';
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
        ? `rgba(151, 199, 213, ${0.22 + light * 0.3})`
        : `rgba(72, 123, 140, ${0.24 + light * 0.24})`;
      context.beginPath();
      context.ellipse(centerX + x * radius, centerY - y * radius, Math.max(0.65, radius * 0.0022), Math.max(0.5, radius * 0.0022 * z), 0, 0, Math.PI * 2);
      context.fill();
    }

    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const occupied = [];
    for (const [name, lon, lat] of labels) {
      const [x, y, z] = project(lon, lat, rotation);
      if (z < 0.18) continue;
      const px = centerX + x * radius, py = centerY - y * radius;
      const ocean = name.includes('OCEAN');
      const fontSize = width < 640 ? 10 : 12;
      context.font = `${ocean ? 'italic 400' : '500'} ${fontSize}px Georgia, serif`;
      const halfWidth = context.measureText(name).width / 2 + 10;
      if (px < halfWidth || px > width - halfWidth || py < 90 || py > height - 20) continue;
      if (occupied.some(box => Math.abs(px - box.x) < halfWidth + box.halfWidth && Math.abs(py - box.y) < 24)) continue;
      occupied.push({ x: px, y: py, halfWidth });
      const alpha = Math.min(1, (z - 0.18) / 0.25) * (ocean ? 0.66 : 0.8);
      context.fillStyle = dark ? `rgba(192, 218, 230, ${alpha})` : `rgba(48, 86, 110, ${alpha})`;
      context.fillText(name, px, py);
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
