/**
 * ASTRA-REFORM: THE SOLAR RESTORATION
 * A survival-terraforming game in p5.js
 * Combines space navigation, surface exploration, resource management,
 * and real planet science (gravity, diameter, unit conversion).
 */

// === PLANET DATA (real values) ===
const PLANET_DATA = [
  { name: "Mercury", color: [169, 169, 169], sizeFactor: 0.38, orbitDist: 80,  speed: 0.018,  gravity: 3.7,   diameterKm: 4879,   fact: "Mercury has no atmosphere — you'd need to build one from scratch!" },
  { name: "Venus",   color: [255, 198, 73],  sizeFactor: 0.95, orbitDist: 130, speed: 0.013,  gravity: 8.87,  diameterKm: 12104,  fact: "Venus is almost the same size as Earth but way too hot (460 C)!" },
  { name: "Earth",   color: [70, 130, 230],   sizeFactor: 1.0,  orbitDist: 185, speed: 0.01,   gravity: 9.81,  diameterKm: 12756,  fact: "Earth is already habitable — nice work, nature!" },
  { name: "Mars",    color: [210, 90, 60],    sizeFactor: 0.53, orbitDist: 240, speed: 0.008,  gravity: 3.72,  diameterKm: 6792,   fact: "Mars gravity is 38% of Earth's — you'd weigh much less!" },
  { name: "Jupiter", color: [220, 180, 130],  sizeFactor: 11.2, orbitDist: 330, speed: 0.004,  gravity: 24.79, diameterKm: 142984, fact: "Jupiter is 11x wider than Earth! 142,984 km = 88,846 miles" },
  { name: "Saturn",  color: [235, 210, 150],  sizeFactor: 9.45, orbitDist: 420, speed: 0.003,  gravity: 10.44, diameterKm: 120536, fact: "Saturn's rings span 282,000 km — that's 175,000 miles!" },
  { name: "Uranus",  color: [150, 220, 230],  sizeFactor: 4.0,  orbitDist: 490, speed: 0.002,  gravity: 8.69,  diameterKm: 51118,  fact: "Uranus is 4x wider than Earth. 51,118 km = 31,763 miles" },
  { name: "Neptune", color: [60, 100, 220],   sizeFactor: 3.88, orbitDist: 550, speed: 0.0015, gravity: 11.15, diameterKm: 49528,  fact: "Neptune's gravity is 1.14x Earth's — slightly heavier!" }
];

// === GAME STATE ===
let gameState = "INTRO"; // INTRO, SPACE, LANDING, SURFACE, WIN
let planets = [];
let sun;
let stars = [];
let currentPIdx = 2; // Start focused on Earth
let selectedPIdx = -1;

// Milestone tracking for first-time feedback
let milestones = {
  firstDig: false,
  firstWater: false,
  firstMineral: false,
  firstSeed: false,
  firstBrickDrop: false,
  firstHouse: false,
  firstPlant: false,
  firstIrrigation: false,
  firstPlanetRestored: false,
  firstAirBuy: false,
};

// Text scale — everything bigger
function T(size) {
  let scale = isMobile() ? 1.25 : 1.4;
  return size * scale;
}

// Milestone feedback — shows an encouraging message on first-time actions
function milestone(key, msg) {
  if (!milestones[key]) {
    milestones[key] = true;
    addMessage(msg, 360); // longer duration so they can read it
  }
}

// Player / Survival
let airSupply = 100;
let playerWeight = 70; // kg on Earth

// Resources
let resources = { bricks: 5, airTanks: 3, minerals: 0, water: 0, spaceBucks: 0, seeds: 2 };
let dragging = null;

// Surface grid
let surfaceGrid = [];
const GRID_COLS = 10, GRID_ROWS = 8;

// Particles & messages
let particles = [];
let messages = [];

// Landing animation
let landingProgress = 0;
let landingTarget = null;

// Score
let score = 0;
let planetsRestored = 0;

// Auto-advance timer (after restoring a planet)
let autoAdvanceTimer = 0;

// Irrigation system
let irrigationMode = false;
let irrigationConnections = []; // tracks completed irrigation links for visual flow

// Mobile / responsive layout
let mobile = false;
let SIDEBAR_W = 260;
let PANEL_H = 0; // bottom panel height on mobile

function isMobile() {
  return width < 768;
}

function getLayout() {
  let m = isMobile();
  if (m) {
    let panelH = height * 0.38;
    let gridArea = { x: 0, y: 70, w: width, h: height - panelH - 70 };
    return {
      mobile: true,
      sidebarX: 0,
      sidebarY: height - panelH,
      sidebarW: width,
      sidebarH: panelH,
      gridAreaW: width,
      gridOffsetSub: 0,
      skyW: width,
      cellSize: min(gridArea.w / GRID_COLS, gridArea.h / GRID_ROWS),
      gridOx: 0, // recalculated after cellSize
      gridOy: gridArea.y,
      ts: max(8, width / 55), // scaled text size base
    };
  } else {
    return {
      mobile: false,
      sidebarX: width - 255,
      sidebarY: 0,
      sidebarW: 260,
      sidebarH: height,
      gridAreaW: width - 280,
      gridOffsetSub: 260,
      skyW: width - 260,
      cellSize: min((width - 280) / GRID_COLS, (height - 160) / GRID_ROWS),
      gridOx: 0, // recalculated
      gridOy: 90,
      ts: 11,
    };
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("monospace");
  mobile = isMobile();

  sun = { x: width / 2, y: height / 2, radius: 35 };

  // Stars
  for (let i = 0; i < 300; i++) {
    stars.push({
      x: random(width), y: random(height),
      brightness: random(100, 255),
      twinkle: random(0.01, 0.05)
    });
  }

  // Build planets
  for (let i = 0; i < PLANET_DATA.length; i++) {
    let d = PLANET_DATA[i];
    let scaledOrbit = map(d.orbitDist, 80, 550, min(width, height) * 0.08, min(width, height) * 0.45);
    let scaledRadius = constrain(map(d.sizeFactor, 0.38, 11.2, 8, 32), 8, 32);
    planets.push({
      ...d,
      orbitRadius: scaledOrbit,
      radius: scaledRadius,
      angle: random(TWO_PI),
      x: 0, y: 0,
      hab: d.name === "Earth" ? 100 : 0,
      screenX: 0, screenY: 0
    });
  }
  planetsRestored = 1; // Earth
}

function draw() {
  background(5, 5, 15);

  if (gameState === "INTRO") {
    drawStars();
    drawIntroScreen();
  } else if (gameState === "SPACE") {
    drawStars();
    drawSpaceView();
    drawSpaceUI();
  } else if (gameState === "LANDING") {
    drawStars();
    drawLandingAnimation();
  } else if (gameState === "SURFACE") {
    drawSurfaceView();
    updateSurvival();
    drawSurfaceUI();
    // Auto-advance to next planet after restoring one
    if (autoAdvanceTimer > 0) {
      autoAdvanceTimer--;
      // Show countdown message
      fill(100, 255, 100, 200);
      textAlign(CENTER, CENTER);
      textSize(18);
      let nextP = findNextUnrestored();
      if (nextP !== -1) {
        text(`Heading to ${planets[nextP].name} in ${Math.ceil(autoAdvanceTimer / 60)}...`, (width - 260) / 2, height / 2);
      }
      if (autoAdvanceTimer <= 0 && nextP !== -1) {
        currentPIdx = nextP;
        landingProgress = 0;
        gameState = "LANDING";
        airSupply = min(airSupply + 20, 100); // Small air refill for travel
        addMessage(`Traveling to ${planets[nextP].name}...`);
      }
    }
  } else if (gameState === "WIN") {
    drawStars();
    drawSpaceView();
    drawWinScreen();
  }

  drawMessages();
  drawParticles();
  handleDragRender();
}

// ===========================
//       INTRO SCREEN
// ===========================

function drawIntroScreen() {
  let m = isMobile();
  let cx = width / 2;
  let cy = height / 2;

  // Animated sun glow in background
  let pulse = sin(frameCount * 0.02) * 10;
  for (let i = 4; i > 0; i--) {
    fill(255, 200, 50, 15);
    noStroke();
    circle(cx, cy * 0.3, 60 + i * 25 + pulse);
  }
  fill(255, 220, 50);
  circle(cx, cy * 0.3, 50);

  // Title
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(m ? 28 : 48);
  text("ASTRA-REFORM", cx, cy * 0.55);

  fill(150, 220, 255);
  textSize(m ? 14 : 22);
  text("The Solar Restoration", cx, cy * 0.55 + (m ? 30 : 45));

  // How to play steps
  let startY = cy * (m ? 0.85 : 0.82);
  let lineH = m ? 26 : 34;
  textSize(m ? 13 : 18);
  fill(255, 255, 255, 220);

  let steps = [
    ["1.", "Click a planet to land on it", [255, 200, 100]],
    ["2.", "Tap tiles to DIG for water, minerals & seeds", [180, 140, 100]],
    ["3.", "Drag bricks to villages -- 10 bricks = a HOUSE (+5 Space Bucks!)", [180, 70, 50]],
    ["4.", "Drag seeds to dirt to grow vegetation", [60, 200, 60]],
    ["5.", "Build irrigation pipes from water to villages", [50, 120, 255]],
    ["6.", "Get each planet to 100% habitability to restore it!", [100, 255, 100]],
  ];

  for (let i = 0; i < steps.length; i++) {
    let y = startY + i * lineH;
    fill(steps[i][2][0], steps[i][2][1], steps[i][2][2]);
    textAlign(RIGHT);
    text(steps[i][0], cx - (m ? 120 : 200), y);
    fill(230);
    textAlign(LEFT);
    textSize(m ? 12 : 16);
    text(steps[i][1], cx - (m ? 110 : 185), y);
    textSize(m ? 13 : 18);
  }

  // Tip
  fill(200, 200, 100);
  textAlign(CENTER);
  textSize(m ? 11 : 15);
  text("Watch your air supply! Higher gravity = faster drain.", cx, startY + steps.length * lineH + (m ? 20 : 30));

  // Start button
  let btnW = m ? 200 : 280;
  let btnH = m ? 45 : 55;
  let btnX = cx - btnW / 2;
  let btnY = height - (m ? 70 : 100);
  let hover = mouseX > btnX && mouseX < btnX + btnW && mouseY > btnY && mouseY < btnY + btnH;

  fill(hover ? color(80, 200, 120) : color(50, 160, 90));
  noStroke();
  rect(btnX, btnY, btnW, btnH, 12);
  fill(255);
  textSize(m ? 18 : 24);
  text("START MISSION", cx, btnY + btnH / 2);
}

// ===========================
//        SPACE VIEW
// ===========================

function drawStars() {
  for (let s of stars) {
    let b = s.brightness + sin(frameCount * s.twinkle) * 50;
    fill(b);
    noStroke();
    circle(s.x, s.y, random(1, 2.5));
  }
}

function drawSpaceView() {
  let cx = width / 2;
  let cy = height / 2;

  // Orbit rings
  noFill();
  for (let p of planets) {
    stroke(255, 255, 255, 20);
    strokeWeight(0.5);
    ellipse(cx, cy, p.orbitRadius * 2, p.orbitRadius * 2);
  }

  // Sun glow
  for (let i = 3; i > 0; i--) {
    fill(255, 200, 50, 30);
    noStroke();
    circle(cx, cy, sun.radius * 2 + i * 20);
  }
  fill(255, 220, 50);
  circle(cx, cy, sun.radius * 2);
  fill(255, 250, 200);
  circle(cx, cy, sun.radius * 1.3);

  // Planets
  for (let i = 0; i < planets.length; i++) {
    let p = planets[i];
    p.angle += p.speed;
    p.x = cx + cos(p.angle) * p.orbitRadius;
    p.y = cy + sin(p.angle) * p.orbitRadius;
    p.screenX = p.x;
    p.screenY = p.y;

    // Habitable glow
    if (p.hab >= 100) {
      for (let g = 3; g > 0; g--) {
        fill(100, 255, 100, 20);
        noStroke();
        circle(p.x, p.y, p.radius * 2 + g * 10);
      }
    }

    // Planet color lerps toward green as hab increases
    let baseC = color(p.color[0], p.color[1], p.color[2]);
    let habC = color(60, 200, 120);
    let c = lerpColor(baseC, habC, p.hab / 100);
    noStroke();
    fill(c);
    circle(p.x, p.y, p.radius * 2);

    // Saturn rings
    if (p.name === "Saturn") {
      stroke(235, 210, 150, 150);
      strokeWeight(2);
      noFill();
      ellipse(p.x, p.y, p.radius * 3.5, p.radius * 0.8);
    }

    // Habitability bar (if in progress)
    if (p.hab > 0 && p.hab < 100) {
      let barW = p.radius * 2.5;
      let barH = 4;
      let barX = p.x - barW / 2;
      let barY = p.y - p.radius - 14;
      fill(50);
      noStroke();
      rect(barX, barY, barW, barH, 3);
      fill(100, 255, 100);
      rect(barX, barY, barW * (p.hab / 100), barH, 3);
    }

    // Label
    fill(255, 255, 255, 180);
    noStroke();
    textAlign(CENTER);
    textSize(T(10));
    text(p.name, p.x, p.y + p.radius + 18);

    // Checkmark
    if (p.hab >= 100) {
      fill(100, 255, 100);
      textSize(T(13));
      text("✓", p.x + p.radius + 8, p.y - p.radius + 4);
    }

    // Selection ring
    if (i === selectedPIdx) {
      stroke(255, 255, 100, 180);
      strokeWeight(2);
      noFill();
      circle(p.x, p.y, p.radius * 2 + 16);
    }
  }
}

function drawSpaceUI() {
  let m = isMobile();

  // Top bar
  fill(0, 0, 0, 180);
  noStroke();
  rect(0, 0, width, m ? 35 : 50);

  fill(255);
  textAlign(LEFT, CENTER);
  textSize(m ? 14 : 18);
  let topY = m ? 17 : 25;
  text(`SCORE: ${score}`, 10, topY);
  text(`${planetsRestored}/${planets.length}`, m ? 130 : 180, topY);

  if (!m) {
    textAlign(CENTER, CENTER);
    textSize(16);
    fill(200);
    text("ASTRA-REFORM: THE SOLAR RESTORATION", width / 2, 25);
  }

  // Planet status panel
  if (m) {
    // Bottom strip on mobile
    let stripH = 30;
    let stripY = height - stripH;
    fill(0, 0, 0, 180);
    noStroke();
    rect(0, stripY, width, stripH);
    let dotSpacing = width / planets.length;
    for (let i = 0; i < planets.length; i++) {
      let px = dotSpacing * (i + 0.5);
      let py = stripY + stripH / 2;
      let p = planets[i];
      if (p.hab >= 100) fill(100, 255, 100);
      else fill(p.color[0], p.color[1], p.color[2]);
      noStroke();
      circle(px, py - 4, 10);
      fill(180);
      textSize(7);
      textAlign(CENTER);
      text(p.name.substring(0, 3), px, py + 10);
    }
  } else {
    // Right sidebar on desktop
    let sideX = width - 200;
    let sideY = 65;
    fill(0, 0, 0, 170);
    noStroke();
    rect(sideX - 10, sideY - 10, 205, planets.length * 30 + 25, 8);

    textSize(14);
    textAlign(LEFT);
    fill(180);
    text("PLANET STATUS", sideX, sideY + 2);

    for (let i = 0; i < planets.length; i++) {
      let p = planets[i];
      let y = sideY + 20 + i * 30;

      fill(p.color[0], p.color[1], p.color[2]);
      noStroke();
      circle(sideX + 6, y + 6, 10);

      fill(255);
      textSize(13);
      text(p.name, sideX + 18, y + 10);

      let barX = sideX + 85;
      let barW = 80;
      fill(40);
      rect(barX, y + 1, barW, 10, 3);
      if (p.hab >= 100) fill(100, 255, 100);
      else if (p.hab > 0) fill(200, 200, 50);
      else fill(40);
      rect(barX, y + 1, barW * (p.hab / 100), 10, 3);

      if (p.hab >= 100) {
        fill(100, 255, 100);
        textSize(10);
        text("✓", sideX + 172, y + 10);
      } else {
        fill(150);
        textSize(9);
        text(Math.round(p.hab) + "%", sideX + 170, y + 10);
      }
    }
  }

  // Bottom hint
  fill(255, 255, 255, 120);
  textAlign(CENTER);
  textSize(m ? 13 : 16);
  text(m ? "Tap a planet to land" : "Click a planet to land on its surface and begin terraforming", width / 2, m ? height - 38 : height - 25);

  // Resource display
  drawResourcePanel(10, m ? 42 : 65);
}

function drawResourcePanel(x, y) {
  let m = isMobile();
  let items = [
    { label: "Bricks", val: resources.bricks, col: color(180, 70, 50) },
    { label: "Air", val: resources.airTanks, col: color(100, 200, 255) },
    { label: "Min", val: resources.minerals, col: color(160, 160, 160) },
    { label: "H2O", val: resources.water, col: color(50, 120, 255) },
    { label: "Seeds", val: resources.seeds, col: color(60, 180, 60) },
    { label: "$", val: resources.spaceBucks, col: color(255, 220, 50) }
  ];

  if (m) {
    // Compact horizontal strip
    let stripW = min(width - 20, items.length * 55);
    fill(0, 0, 0, 170);
    noStroke();
    rect(x - 3, y - 5, stripW + 6, 22, 5);
    for (let i = 0; i < items.length; i++) {
      let ix = x + i * (stripW / items.length);
      fill(items[i].col);
      noStroke();
      rect(ix + 2, y, 8, 8, 2);
      fill(255);
      textSize(10);
      textAlign(LEFT);
      text(`${items[i].val}`, ix + 13, y + 8);
    }
  } else {
    fill(0, 0, 0, 170);
    noStroke();
    rect(x - 5, y - 10, 180, 185, 8);

    fill(180);
    textAlign(LEFT);
    textSize(14);
    text("RESOURCES", x + 5, y + 3);

    for (let i = 0; i < items.length; i++) {
      let iy = y + 20 + i * 25;
      fill(items[i].col);
      noStroke();
      rect(x + 5, iy, 14, 14, 3);
      fill(255);
      textSize(14);
      text(`${items[i].label}: ${items[i].val}`, x + 25, iy + 11);
    }
  }
}

// ===========================
//     LANDING ANIMATION
// ===========================

function drawLandingAnimation() {
  landingProgress += 0.02;

  let p = planets[currentPIdx];
  let t = constrain(landingProgress, 0, 1);

  // Zoom effect — planet grows
  let sz = lerp(p.radius * 2, min(width, height) * 0.8, t);
  let baseC = color(p.color[0], p.color[1], p.color[2]);
  let habC = color(60, 200, 120);
  let c = lerpColor(baseC, habC, p.hab / 100);

  fill(c);
  noStroke();
  circle(width / 2, height / 2, sz);

  // Atmosphere ring
  noFill();
  stroke(255, 255, 255, 80 * (1 - t));
  strokeWeight(3);
  circle(width / 2, height / 2, sz + 30);

  // Text
  fill(255, 255 * (1 - t * 0.5));
  textAlign(CENTER, CENTER);
  textSize(T(20));
  text(`Landing on ${p.name}...`, width / 2, height / 2 - sz / 2 - 40);

  textSize(T(13));
  fill(200, 200 * (1 - t * 0.5));
  text(`Gravity: ${p.gravity} m/s²  |  Diameter: ${p.diameterKm.toLocaleString()} km (${Math.round(p.diameterKm * 0.621371).toLocaleString()} mi)`, width / 2, height / 2 + sz / 2 + 30);

  if (landingProgress >= 1) {
    gameState = "SURFACE";
    generateSurface();
    addMessage(p.fact);
    let weightHere = (playerWeight * p.gravity / 9.81).toFixed(1);
    addMessage(`Your weight on ${p.name}: ${weightHere} kg (gravity: ${p.gravity} m/s²)`);
    addMessage(`Diameter: ${p.diameterKm.toLocaleString()} km = ${Math.round(p.diameterKm * 0.621371).toLocaleString()} miles`);
    if (!milestones.firstDig) {
      addMessage("Click/tap the ground tiles to start digging for resources!", 360);
    }
  }
}

// ===========================
//       SURFACE VIEW
// ===========================

function drawSurfaceView() {
  let L = getLayout();
  let p = planets[currentPIdx];
  let cellSize = L.cellSize;
  let gridW = cellSize * GRID_COLS;
  let gridH = cellSize * GRID_ROWS;
  let ox = L.mobile ? (width - gridW) / 2 : (width - 260 - gridW) / 2;
  let oy = L.gridOy;
  let skyW = L.mobile ? width : width - 260;

  // Sky gradient based on habitability
  let skyTop = lerpColor(color(5, 5, 15), color(30, 80, 140), p.hab / 100);
  let skyBot = lerpColor(color(p.color[0] * 0.3, p.color[1] * 0.3, p.color[2] * 0.3), color(100, 180, 220), p.hab / 100);
  for (let y = 0; y < oy; y++) {
    let inter = map(y, 0, oy, 0, 1);
    stroke(lerpColor(skyTop, skyBot, inter));
    line(0, y, skyW, y);
  }

  // Ground color under grid
  let groundC = lerpColor(color(p.color[0] * 0.5, p.color[1] * 0.5, p.color[2] * 0.5), color(60, 140, 80), p.hab / 100);
  fill(groundC);
  noStroke();
  rect(0, oy, skyW, height - oy);

  // Planet name header
  let headerH = L.mobile ? 35 : 50;
  fill(0, 0, 0, 140);
  noStroke();
  rect(0, 0, skyW, headerH);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(L.mobile ? 15 : 20);
  text(`${p.name} — SURFACE`, skyW / 2, headerH / 2);

  // Science info bar
  if (!L.mobile) {
    fill(0, 0, 0, 100);
    rect(0, 50, skyW, 35);
    fill(200);
    textSize(14);
    text(`Gravity: ${p.gravity} m/s²  |  Diameter: ${p.diameterKm.toLocaleString()} km (${Math.round(p.diameterKm * 0.621371).toLocaleString()} mi)  |  Your weight: ${(playerWeight * p.gravity / 9.81).toFixed(1)} kg`, skyW / 2, 67);
  } else {
    fill(0, 0, 0, 100);
    rect(0, headerH, skyW, 22);
    fill(200);
    textSize(11);
    text(`G: ${p.gravity} m/s²  |  D: ${p.diameterKm.toLocaleString()} km  |  Wt: ${(playerWeight * p.gravity / 9.81).toFixed(1)} kg`, skyW / 2, headerH + 11);
  }

  // Draw grid
  for (let i = 0; i < GRID_COLS; i++) {
    for (let j = 0; j < GRID_ROWS; j++) {
      let cell = surfaceGrid[i][j];
      let cx = ox + i * cellSize;
      let cy = oy + j * cellSize;

      if (cell.hasVillage) {
        // Village — purple glow
        fill(120, 40, 200);
        drawingContext.shadowBlur = 12;
        drawingContext.shadowColor = "rgba(140, 0, 255, 0.6)";
      } else if (cell.dug) {
        if (cell.hasWater) {
          fill(30, 100, 230);
        } else if (cell.hasVegetation) {
          fill(lerpColor(color(50, 100, 40), color(60, 150, 50), p.hab / 100));
        } else {
          fill(lerpColor(color(60, 45, 30), color(80, 100, 60), p.hab / 100));
        }
        drawingContext.shadowBlur = 0;
      } else {
        // Undug terrain
        let tCol = lerpColor(
          color(p.color[0] * 0.7, p.color[1] * 0.7, p.color[2] * 0.7),
          color(80, 160, 80),
          p.hab / 100
        );
        fill(tCol);
        drawingContext.shadowBlur = 0;
      }

      stroke(0, 60);
      strokeWeight(1);
      rect(cx, cy, cellSize, cellSize, 3);

      // Village building icon
      if (cell.hasVillage) {
        drawingContext.shadowBlur = 0;

        if (cell.houses > 0) {
          // Draw houses — up to 3 visible small houses, stacked
          let hCount = min(cell.houses, 3);
          for (let h = 0; h < hCount; h++) {
            let hx = cx + cellSize * (0.1 + h * 0.28);
            let hy = cy + cellSize * 0.35;
            // House body
            fill(255, 240, 200);
            noStroke();
            rect(hx, hy, cellSize * 0.25, cellSize * 0.35, 2);
            // Roof
            fill(180, 70, 50);
            triangle(hx - cellSize * 0.03, hy, hx + cellSize * 0.28, hy, hx + cellSize * 0.125, hy - cellSize * 0.15);
            // Door
            fill(100, 60, 30);
            rect(hx + cellSize * 0.08, hy + cellSize * 0.18, cellSize * 0.09, cellSize * 0.17, 1);
          }
          // House count badge
          if (cell.houses > 1) {
            fill(255, 220, 50);
            noStroke();
            circle(cx + cellSize * 0.85, cy + cellSize * 0.15, cellSize * 0.25);
            fill(0);
            textAlign(CENTER, CENTER);
            textSize(cellSize * 0.15);
            text(cell.houses, cx + cellSize * 0.85, cy + cellSize * 0.15);
          }
        } else {
          // No houses yet — show base village
          fill(255, 220);
          noStroke();
          rect(cx + cellSize * 0.25, cy + cellSize * 0.3, cellSize * 0.5, cellSize * 0.55, 2);
          fill(120, 40, 200);
          rect(cx + cellSize * 0.35, cy + cellSize * 0.5, cellSize * 0.12, cellSize * 0.2);
          rect(cx + cellSize * 0.53, cy + cellSize * 0.5, cellSize * 0.12, cellSize * 0.2);
          triangle(cx + cellSize * 0.2, cy + cellSize * 0.3, cx + cellSize * 0.8, cy + cellSize * 0.3, cx + cellSize * 0.5, cy + cellSize * 0.1);
        }

        // Brick progress bar (if bricks deposited but house not yet complete)
        if (cell.bricksDeposited > 0) {
          let barW = cellSize * 0.8;
          let barH = cellSize * 0.08;
          let barX = cx + cellSize * 0.1;
          let barY = cy + cellSize * 0.9;
          fill(50, 150);
          noStroke();
          rect(barX, barY, barW, barH, 2);
          fill(255, 180, 50);
          rect(barX, barY, barW * (cell.bricksDeposited / 10), barH, 2);
          // Tiny label
          fill(255, 200);
          textAlign(CENTER, CENTER);
          textSize(cellSize * 0.1);
          text(`${cell.bricksDeposited}/10`, cx + cellSize / 2, barY - cellSize * 0.05);
        }
      }

      // Pipe overlay
      if (cell.hasPipe) {
        let midX = cx + cellSize / 2;
        let midY = cy + cellSize / 2;
        // Draw pipe connections to neighbors
        stroke(60, 120, 200, 180);
        strokeWeight(cellSize * 0.15);
        let dirs = [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]];
        for (let [ni, nj] of dirs) {
          if (ni >= 0 && ni < GRID_COLS && nj >= 0 && nj < GRID_ROWS) {
            let nb = surfaceGrid[ni][nj];
            if (nb.hasPipe || (nb.dug && nb.hasWater) || (nb.hasVillage && nb.irrigated)) {
              let nx = ox + ni * cellSize + cellSize / 2;
              let ny = oy + nj * cellSize + cellSize / 2;
              line(midX, midY, (midX + nx) / 2, (midY + ny) / 2);
            }
          }
        }
        // Pipe center node
        fill(80, 140, 220, 160);
        noStroke();
        circle(midX, midY, cellSize * 0.3);
        // Animated water flow dot
        let flowPhase = (frameCount * 0.08 + i * 1.5 + j * 1.5) % TWO_PI;
        fill(140, 210, 255, 180 + sin(flowPhase) * 60);
        circle(midX + cos(flowPhase) * cellSize * 0.08, midY + sin(flowPhase) * cellSize * 0.08, cellSize * 0.12);
      }

      // Irrigated village glow
      if (cell.hasVillage && cell.irrigated) {
        fill(30, 120, 255, 40 + sin(frameCount * 0.04) * 20);
        noStroke();
        rect(cx - 2, cy - 2, cellSize + 4, cellSize + 4, 5);
      }

      // Water ripple
      if (cell.dug && cell.hasWater) {
        noFill();
        stroke(100, 180, 255, 80);
        strokeWeight(1);
        let ripple = sin(frameCount * 0.05 + i + j) * 3;
        ellipse(cx + cellSize / 2, cy + cellSize / 2, cellSize * 0.5 + ripple, cellSize * 0.3 + ripple * 0.5);
      }

      // Vegetation
      if (cell.hasVegetation) {
        let vx = cx + cellSize / 2;
        let vy = cy + cellSize * 0.85;
        // Grass base
        fill(40, 160, 40);
        noStroke();
        ellipse(vx, vy, cellSize * 0.6, cellSize * 0.2);
        // Little plant/tree
        let sway = sin(frameCount * 0.03 + i * 2 + j * 3) * 2;
        stroke(30, 120, 30);
        strokeWeight(2);
        line(vx + sway, vy, vx + sway, vy - cellSize * 0.35);
        // Leaves
        noStroke();
        fill(50, 190, 50, 200);
        circle(vx + sway - cellSize * 0.08, vy - cellSize * 0.3, cellSize * 0.18);
        circle(vx + sway + cellSize * 0.08, vy - cellSize * 0.28, cellSize * 0.16);
        fill(70, 210, 70, 180);
        circle(vx + sway, vy - cellSize * 0.38, cellSize * 0.2);
      }

      // Undug mineral hint
      if (!cell.dug && !cell.hasVillage && cell.hasMineral) {
        fill(200, 200, 200, 40);
        noStroke();
        circle(cx + cellSize * 0.5, cy + cellSize * 0.5, cellSize * 0.3);
      }
    }
  }

  // Grid legend (desktop only)
  if (!L.mobile) {
    fill(255, 150);
    textAlign(LEFT);
    textSize(13);
    let ly = oy + gridH + 15;
    let legendText = "Click tiles to dig  |  Drag resources onto villages  |  ESC = return to space";
    if (irrigationMode) {
      fill(100, 200, 255, 200);
      legendText = "IRRIGATION MODE: Click dug tiles to lay pipes (1 water each)  |  Connect water to a village!  |  Click button again to cancel";
    }
    text(legendText, ox, ly);
  }
}

function drawSurfaceUI() {
  let L = getLayout();
  let p = planets[currentPIdx];

  if (L.mobile) {
    drawSurfaceUIMobile(L, p);
  } else {
    drawSurfaceUIDesktop(L, p);
  }
}

function drawSurfaceUIDesktop(L, p) {
  let sx = L.sidebarX;
  fill(15, 15, 30);
  noStroke();
  rect(sx, 0, 260, height);

  fill(255);
  textAlign(LEFT);
  textSize(18);
  text("MISSION CONTROL", sx + 15, 35);

  drawStatusBar(sx + 15, 60, 225, "AIR SUPPLY", airSupply, color(0, 180, 255));
  drawStatusBar(sx + 15, 110, 225, `${p.name} HABITABILITY`, p.hab, color(0, 255, 100));

  fill(200);
  textSize(14);
  text(`Score: ${score}  |  Restored: ${planetsRestored}/${planets.length}`, sx + 15, 165);

  fill(255, 220, 50);
  textSize(15);
  textAlign(LEFT);
  text(`Space Bucks: ${resources.spaceBucks}`, sx + 15, 185);

  let buyBtnX = sx + 140;
  let buyBtnY = 173;
  let buyBtnW = 100;
  let buyBtnH = 22;
  drawBuyAirBtn(buyBtnX, buyBtnY, buyBtnW, buyBtnH);

  let iconX = sx + 30;
  drawDraggableIcon(iconX, 195, "BRICKS", resources.bricks, color(180, 70, 50), "bricks");
  drawDraggableIcon(iconX, 280, "AIR TANK", resources.airTanks, color(100, 200, 255), "airTanks");
  drawDraggableIcon(iconX + 110, 195, "MINERALS", resources.minerals, color(160, 160, 160), "minerals");
  drawDraggableIcon(iconX + 110, 280, "WATER", resources.water, color(50, 120, 255), "water");
  drawDraggableIcon(iconX, 365, "SEEDS", resources.seeds, color(60, 180, 60), "seeds");

  drawIrrigationBtn(sx + 15, 450, 225, 40);

  // Instructions
  fill(150);
  textSize(13);
  textAlign(LEFT);
  let iy = 510;
  let instructions = [
    "HOW TO PLAY:",
    "",
    "1. Click tiles to DIG",
    "   - Find water (+1 water, +1 air tank)",
    "   - Find minerals (+1 mineral)",
    "   - Find seeds (+1 seed)",
    "",
    "2. Drag onto VILLAGES (purple):",
    "   - Bricks -> 10 = BUILD A HOUSE!",
    "   - Houses give +5 Space Bucks",
    "   - Air Tank -> +40 air supply",
    "   - Minerals -> +2 bricks",
    "   - Water -> +30 air supply",
    "",
    "3. Drag SEEDS onto dug dirt:",
    "   - Plants vegetation (+5 hab)",
    "",
    "4. SPACE BUCKS: Buy air (5 = +25 air)",
    "",
    "5. BUILD IRRIGATION:",
    "   - Lay pipes from water to village",
    "   - +20 hab, +15 air, score bonus!",
    "",
    "6. Terraform to 100% to restore!",
    "",
    `Air drains ${p.gravity > 15 ? "FAST" : p.gravity > 8 ? "medium" : "slowly"}`,
    `(higher gravity = faster drain)`
  ];
  for (let line of instructions) {
    text(line, sx + 15, iy);
    iy += 14;
  }

  fill(120);
  textSize(10);
  text("Press ESC to return to space", sx + 15, height - 20);
}

function drawSurfaceUIMobile(L, p) {
  let panelY = L.sidebarY;
  let panelH = L.sidebarH;

  // Panel background
  fill(15, 15, 30, 240);
  noStroke();
  rect(0, panelY, width, panelH);

  // Drag handle
  fill(80);
  noStroke();
  rect(width / 2 - 20, panelY + 4, 40, 4, 2);

  let pad = 8;
  let col1 = pad;
  let barW = width * 0.45;

  // Row 1: Air + Hab bars side by side
  let barY = panelY + 16;
  drawStatusBar(col1, barY, barW, "AIR", airSupply, color(0, 180, 255));
  drawStatusBar(col1 + barW + 10, barY, barW, "HAB", p.hab, color(0, 255, 100));

  // Row 2: Score, Space Bucks, Buy Air btn
  let row2Y = barY + 30;
  fill(200);
  textSize(13);
  textAlign(LEFT);
  text(`Score: ${score} | ${planetsRestored}/${planets.length}`, col1, row2Y);
  fill(255, 220, 50);
  text(`$${resources.spaceBucks}`, col1 + width * 0.4, row2Y);

  let buyW = 70;
  let buyH = 20;
  let buyX = width - buyW - pad;
  let buyY = row2Y - 12;
  drawBuyAirBtn(buyX, buyY, buyW, buyH);

  // Row 3: Resource icons — horizontal strip
  let iconSize = min(42, (width - pad * 2) / 6 - 4);
  let iconY = row2Y + 12;
  let iconSpacing = (width - pad * 2) / 5;
  let icons = [
    { label: "BRK", val: resources.bricks, col: color(180, 70, 50), type: "bricks" },
    { label: "AIR", val: resources.airTanks, col: color(100, 200, 255), type: "airTanks" },
    { label: "MIN", val: resources.minerals, col: color(160, 160, 160), type: "minerals" },
    { label: "H2O", val: resources.water, col: color(50, 120, 255), type: "water" },
    { label: "SEED", val: resources.seeds, col: color(60, 180, 60), type: "seeds" },
  ];
  for (let i = 0; i < icons.length; i++) {
    let ix = pad + i * iconSpacing;
    drawDraggableIcon(ix, iconY, icons[i].label, icons[i].val, icons[i].col, icons[i].type, iconSize);
  }

  // Row 4: Irrigation button + Back button
  let btnRow = iconY + iconSize + 22;
  let irrW = width * 0.55;
  let irrH = 30;
  drawIrrigationBtn(pad, btnRow, irrW, irrH);

  // Back to space button (replaces ESC on mobile)
  let backW = width - irrW - pad * 3;
  let backX = irrW + pad * 2;
  fill(100, 40, 40);
  noStroke();
  rect(backX, btnRow, backW, irrH, 8);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(13);
  text("BACK TO SPACE", backX + backW / 2, btnRow + irrH / 2);

  // Irrigation mode indicator
  if (irrigationMode) {
    fill(100, 200, 255, 200);
    textAlign(CENTER);
    textSize(11);
    text("TAP dug tiles for pipes, TAP village to connect", width / 2, panelY - 8);
  }
}

function drawBuyAirBtn(x, y, w, h) {
  if (resources.spaceBucks >= 5) {
    fill(0, 150, 200);
  } else {
    fill(40);
  }
  noStroke();
  rect(x, y, w, h, 5);
  fill(resources.spaceBucks >= 5 ? 255 : 80);
  textAlign(CENTER, CENTER);
  textSize(min(13, w * 0.16));
  text("BUY AIR", x + w / 2, y + h / 2);
}

function drawIrrigationBtn(x, y, w, h) {
  let hasWaterSources = false;
  for (let i = 0; i < GRID_COLS && !hasWaterSources; i++)
    for (let j = 0; j < GRID_ROWS && !hasWaterSources; j++)
      if (surfaceGrid[i] && surfaceGrid[i][j] && surfaceGrid[i][j].dug && surfaceGrid[i][j].hasWater) hasWaterSources = true;

  if (hasWaterSources && resources.water > 0) {
    if (irrigationMode) {
      fill(30, 120, 255);
      stroke(100, 200, 255);
      strokeWeight(2);
    } else {
      fill(20, 60, 140);
      noStroke();
    }
    rect(x, y, w, h, 8);
    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(min(15, w * 0.08));
    text(irrigationMode ? "CANCEL IRRIGATION" : "BUILD IRRIGATION", x + w / 2, y + h / 2);
  } else {
    fill(60);
    noStroke();
    rect(x, y, w, h, 8);
    fill(100);
    textAlign(CENTER, CENTER);
    textSize(min(13, w * 0.07));
    text(hasWaterSources ? "Need water" : "Find water first", x + w / 2, y + h / 2);
  }
}

function drawStatusBar(x, y, w, label, val, col) {
  fill(255);
  textSize(T(11));
  textAlign(LEFT);
  text(label, x, y - 3);

  // Value text
  textAlign(RIGHT);
  fill(200);
  text(Math.round(val) + "%", x + w, y - 3);
  textAlign(LEFT);

  fill(40);
  noStroke();
  rect(x, y + 2, w, 16, 8);

  fill(col);
  rect(x, y + 2, w * constrain(val / 100, 0, 1), 16, 8);

  // Warning flash when low
  if (val <= 25 && val > 0 && frameCount % 30 < 15) {
    fill(255, 50, 50, 100);
    rect(x, y + 2, w * constrain(val / 100, 0, 1), 16, 8);
  }
}

function drawDraggableIcon(x, y, label, count, col, type, sz) {
  let s = sz || 55;
  if (dragging === type) {
    stroke(255, 255, 100);
    strokeWeight(2);
  } else {
    noStroke();
  }
  fill(col);
  rect(x, y, s, s, s * 0.18);

  fill(255);
  noStroke();
  textAlign(CENTER);
  textSize(s * 0.33);
  text(count, x + s / 2, y + s * 0.64);
  textSize(s * 0.16);
  text(label, x + s / 2, y + s + s * 0.27);
}

// ===========================
//       SYSTEMS
// ===========================

function generateSurface() {
  surfaceGrid = [];
  irrigationMode = false;
  irrigationConnections = [];
  let p = planets[currentPIdx];
  // Bigger planets have more resources
  let waterChance = map(p.diameterKm, 4879, 142984, 0.12, 0.25);
  let mineralChance = map(p.diameterKm, 4879, 142984, 0.1, 0.2);
  let seedChance = 0.1;
  let villageChance = 0.08;

  for (let i = 0; i < GRID_COLS; i++) {
    surfaceGrid[i] = [];
    for (let j = 0; j < GRID_ROWS; j++) {
      let isVillage = random() < villageChance;
      surfaceGrid[i][j] = {
        dug: false,
        hasWater: !isVillage && random() < waterChance,
        hasMineral: !isVillage && random() < mineralChance,
        hasSeed: !isVillage && random() < seedChance,
        hasVillage: isVillage,
        hasPipe: false,
        irrigated: false,
        bricksDeposited: 0,
        houses: 0,
        hasVegetation: false
      };
    }
  }
  // Guarantee at least 2 villages
  let villages = 0;
  for (let i = 0; i < GRID_COLS; i++)
    for (let j = 0; j < GRID_ROWS; j++)
      if (surfaceGrid[i][j].hasVillage) villages++;
  while (villages < 2) {
    let ri = floor(random(GRID_COLS));
    let rj = floor(random(GRID_ROWS));
    if (!surfaceGrid[ri][rj].hasVillage) {
      surfaceGrid[ri][rj].hasVillage = true;
      surfaceGrid[ri][rj].hasWater = false;
      surfaceGrid[ri][rj].hasMineral = false;
      villages++;
    }
  }
}

function updateSurvival() {
  let p = planets[currentPIdx];
  // Higher gravity = air drains faster
  let drainRate = map(p.gravity, 3.7, 24.79, 0.6, 2.5);

  if (frameCount % 60 === 0 && airSupply > 0) {
    airSupply -= drainRate;
    if (airSupply <= 0) {
      airSupply = 0;
      addMessage("AIR DEPLETED! Emergency return to space!");
      gameState = "SPACE";
      airSupply = max(30, 100 - (100 - planets[currentPIdx].hab) * 0.3); // Partial refill
    }
  }
}

// ===========================
//       WIN SCREEN
// ===========================

function drawWinScreen() {
  fill(0, 0, 0, 160);
  noStroke();
  rect(0, 0, width, height);

  let m = isMobile();
  textAlign(CENTER, CENTER);
  fill(100, 255, 150);
  textSize(m ? 24 : 42);
  text("SOLAR SYSTEM RESTORED!", width / 2, height / 2 - 50);

  fill(255);
  textSize(m ? 16 : 22);
  text(`Final Score: ${score}`, width / 2, height / 2 + 10);

  fill(200);
  textSize(m ? 12 : 16);
  text("All planets are now habitable.", width / 2, height / 2 + 50);

  fill(255, 255, 100);
  textSize(m ? 12 : 14);
  text(m ? "Tap to play again" : "Press R to play again", width / 2, height / 2 + 90);
}

// ===========================
//    PARTICLES & MESSAGES
// ===========================

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let pt = particles[i];
    pt.life--;
    pt.x += pt.vx || 0;
    pt.y += pt.vy || 0;
    let alpha = map(pt.life, 0, pt.maxLife, 0, 220);
    fill(pt.col[0], pt.col[1], pt.col[2], alpha);
    noStroke();
    circle(pt.x, pt.y, pt.size * (pt.life / pt.maxLife));
    if (pt.life <= 0) particles.splice(i, 1);
  }
}

function spawnParticles(x, y, col, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: random(-2, 2), vy: random(-2, 2),
      life: random(20, 40), maxLife: 40,
      size: random(3, 7),
      col: col
    });
  }
}

function drawMessages() {
  let L = getLayout();
  textAlign(LEFT);
  textSize(L.mobile ? 13 : 15);
  let msgBottom = L.mobile ? L.sidebarY - 5 : height - 20;
  let y = msgBottom;
  for (let i = messages.length - 1; i >= 0; i--) {
    let m = messages[i];
    m.life--;
    let alpha = m.life > 30 ? 230 : map(m.life, 0, 30, 0, 230);
    fill(0, 0, 0, alpha * 0.7);
    noStroke();
    let tw = textWidth(m.text) + 20;
    rect(10, y - 15, min(tw, width - 20), 22, 5);
    fill(255, 255, 255, alpha);
    text(m.text, 18, y);
    y -= 22;
    if (m.life <= 0) messages.splice(i, 1);
  }
}

function addMessage(text, duration) {
  messages.push({ text, life: duration || 180 });
  if (messages.length > 6) messages.shift();
}

function handleDragRender() {
  if (dragging && gameState === "SURFACE") {
    let col;
    if (dragging === "bricks") col = color(180, 70, 50, 180);
    else if (dragging === "airTanks") col = color(100, 200, 255, 180);
    else if (dragging === "minerals") col = color(160, 160, 160, 180);
    else if (dragging === "seeds") col = color(60, 180, 60, 180);
    else col = color(50, 120, 255, 180);

    fill(col);
    noStroke();
    circle(mouseX, mouseY, 35);
    fill(255, 220);
    textAlign(CENTER, CENTER);
    textSize(9);
    text(dragging.toUpperCase(), mouseX, mouseY);
  }
}

// ===========================
//      INPUT HANDLING
// ===========================

function hitTest(x, y, w, h) {
  return mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h;
}

// Touch support for mobile
function touchStarted() {
  // p5.js sets mouseX/mouseY from touch automatically
  mousePressed();
  return false; // prevent default (scrolling)
}

function touchEnded() {
  mouseReleased();
  return false;
}

function touchMoved() {
  return false; // prevent scrolling while dragging
}

function mousePressed() {
  if (gameState === "INTRO") {
    let m = isMobile();
    let btnW = m ? 200 : 280;
    let btnH = m ? 45 : 55;
    let btnX = width / 2 - btnW / 2;
    let btnY = height - (m ? 70 : 100);
    if (hitTest(btnX, btnY, btnW, btnH)) {
      gameState = "SPACE";
      addMessage("Click any planet to begin terraforming!", 300);
    }
    return;
  }

  if (gameState === "WIN") {
    if (isMobile()) resetGame();
    return;
  }

  if (gameState === "SPACE") {
    // Click planet to land
    for (let i = 0; i < planets.length; i++) {
      let p = planets[i];
      let hitPad = isMobile() ? 24 : 12;
      if (dist(mouseX, mouseY, p.screenX, p.screenY) < p.radius + hitPad) {
        if (p.hab >= 100) {
          addMessage(`${p.name} is already fully habitable!`);
          return;
        }
        currentPIdx = i;
        landingProgress = 0;
        gameState = "LANDING";
        return;
      }
    }
  } else if (gameState === "SURFACE") {
    let L = getLayout();
    let sx = L.sidebarX;
    let pad = 8;

    if (L.mobile) {
      // --- MOBILE HIT DETECTION ---
      let panelY = L.sidebarY;
      let panelH = L.sidebarH;
      let barY = panelY + 16;
      let row2Y = barY + 30;

      // Buy Air button
      let buyW = 70, buyH = 20;
      let buyX = width - buyW - pad;
      let buyY = row2Y - 12;
      if (hitTest(buyX, buyY, buyW, buyH)) {
        if (resources.spaceBucks >= 5) {
          resources.spaceBucks -= 5;
          airSupply = min(airSupply + 25, 100);
          addMessage("Bought air! -5 Space Bucks, +25 air");
          milestone("firstAirBuy", "Smart! Spend Space Bucks to stay alive longer on tough planets.");
          spawnParticles(mouseX, mouseY, [255, 220, 50], 8);
        } else {
          addMessage("Not enough Space Bucks!");
        }
        return;
      }

      // Resource icons (horizontal strip)
      let iconSize = min(42, (width - pad * 2) / 6 - 4);
      let iconY = row2Y + 12;
      let iconSpacing = (width - pad * 2) / 5;
      let iconTypes = ["bricks", "airTanks", "minerals", "water", "seeds"];
      if (!irrigationMode) {
        for (let i = 0; i < iconTypes.length; i++) {
          let ix = pad + i * iconSpacing;
          if (hitTest(ix, iconY, iconSize, iconSize)) {
            if (resources[iconTypes[i]] > 0) dragging = iconTypes[i];
            return;
          }
        }
      }

      // Irrigation button
      let btnRow = iconY + iconSize + 22;
      let irrW = width * 0.55;
      let irrH = 30;
      if (hitTest(pad, btnRow, irrW, irrH)) {
        let hasWS = false;
        for (let i = 0; i < GRID_COLS && !hasWS; i++)
          for (let j = 0; j < GRID_ROWS && !hasWS; j++)
            if (surfaceGrid[i] && surfaceGrid[i][j] && surfaceGrid[i][j].dug && surfaceGrid[i][j].hasWater) hasWS = true;
        if (hasWS && resources.water > 0) {
          irrigationMode = !irrigationMode;
          addMessage(irrigationMode ? "Irrigation ON — tap tiles!" : "Irrigation OFF.");
        }
        return;
      }

      // Back to space button
      let backW = width - irrW - pad * 3;
      let backX = irrW + pad * 2;
      if (hitTest(backX, btnRow, backW, irrH)) {
        gameState = "SPACE";
        irrigationMode = false;
        addMessage("Returned to orbit.");
        return;
      }

    } else {
      // --- DESKTOP HIT DETECTION ---
      // Buy Air button
      let buyBtnX = sx + 140;
      let buyBtnY = 173;
      let buyBtnW = 100;
      let buyBtnH = 22;
      if (hitTest(buyBtnX, buyBtnY, buyBtnW, buyBtnH)) {
        if (resources.spaceBucks >= 5) {
          resources.spaceBucks -= 5;
          airSupply = min(airSupply + 25, 100);
          addMessage("Bought air supply! -5 Space Bucks, +25 air");
          spawnParticles(mouseX, mouseY, [255, 220, 50], 8);
        } else {
          addMessage("Not enough Space Bucks! Build houses (10 bricks each).");
        }
        return;
      }

      // Irrigation button
      let irrBtnY = 450;
      let irrBtnW = 225;
      let irrBtnH = 40;
      if (hitTest(sx + 15, irrBtnY, irrBtnW, irrBtnH)) {
        let hasWS = false;
        for (let i = 0; i < GRID_COLS && !hasWS; i++)
          for (let j = 0; j < GRID_ROWS && !hasWS; j++)
            if (surfaceGrid[i] && surfaceGrid[i][j] && surfaceGrid[i][j].dug && surfaceGrid[i][j].hasWater) hasWS = true;
        if (hasWS && resources.water > 0) {
          irrigationMode = !irrigationMode;
          if (irrigationMode) addMessage("Irrigation mode ON — click dug tiles to lay pipes toward a village!");
          else addMessage("Irrigation mode OFF.");
          return;
        }
      }

      // Draggable icons
      if (!irrigationMode) {
        let iconX = sx + 30;
        if (hitTest(iconX, 195, 55, 55)) { if (resources.bricks > 0) dragging = "bricks"; return; }
        if (hitTest(iconX, 280, 55, 55)) { if (resources.airTanks > 0) dragging = "airTanks"; return; }
        if (hitTest(iconX + 110, 195, 55, 55)) { if (resources.minerals > 0) dragging = "minerals"; return; }
        if (hitTest(iconX + 110, 280, 55, 55)) { if (resources.water > 0) dragging = "water"; return; }
        if (hitTest(iconX, 365, 55, 55)) { if (resources.seeds > 0) dragging = "seeds"; return; }
      }
    }

    // Grid interactions (same for both layouts)
    let p = planets[currentPIdx];
    let cellSize = L.cellSize;
    let gridW = cellSize * GRID_COLS;
    let gridOx = L.mobile ? (width - gridW) / 2 : (width - 260 - gridW) / 2;
    let gridOy = L.gridOy;

    let gi = floor((mouseX - gridOx) / cellSize);
    let gj = floor((mouseY - gridOy) / cellSize);

    if (gi >= 0 && gi < GRID_COLS && gj >= 0 && gj < GRID_ROWS) {
      let cell = surfaceGrid[gi][gj];

      if (irrigationMode) {
        // IRRIGATION MODE: lay pipe on dug tiles or connect to village
        if (cell.dug && !cell.hasVillage && !cell.hasPipe && !cell.hasWater && resources.water > 0) {
          // Check adjacency: pipe must be next to a water source, another pipe, or a village
          if (isAdjacentToPipeOrWater(gi, gj)) {
            cell.hasPipe = true;
            resources.water--;
            spawnParticles(mouseX, mouseY, [80, 140, 220], 5);
            addMessage("Pipe placed! (-1 water)");
            // Check if this pipe now connects any village to water
            checkIrrigationConnections(p);
          } else {
            addMessage("Pipes must connect to water or another pipe!");
          }
        } else if (cell.hasVillage && !cell.irrigated) {
          // Clicking a village — check if it's adjacent to a pipe
          if (isAdjacentToPipe(gi, gj)) {
            cell.irrigated = true;
            let gravityBonus = Math.round(abs(p.gravity - 9.81) * 10);
            p.hab = min(p.hab + 20, 100);
            airSupply = min(airSupply + 15, 100);
            score += 150 + gravityBonus;
            spawnParticles(mouseX, mouseY, [30, 120, 255], 15);
            addMessage(`Irrigation connected! +20 hab, +15 air (+${150 + gravityBonus} pts)`);
            milestone("firstIrrigation", "Amazing! Irrigation gives huge bonuses. Connect more water to villages!");
            irrigationConnections.push({ col: gi, row: gj });

            if (p.hab >= 100) {
              planetsRestored++;
              score += 500;
              addMessage(`${p.name} RESTORED! +500 bonus!`);
          milestone("firstPlanetRestored", "You restored your first planet! Head to the next one and keep going!");
              spawnParticles(mouseX, mouseY, [100, 255, 100], 25);
              irrigationMode = false;
              if (planetsRestored >= planets.length) {
                gameState = "WIN";
              } else {
                autoAdvanceTimer = 90;
              }
            }
          } else {
            addMessage("Build pipes next to this village first!");
          }
        } else if (cell.dug && cell.hasWater) {
          addMessage("Water source! Pipes connect from here.");
        } else if (cell.hasPipe) {
          addMessage("Pipe already placed here.");
        } else if (!cell.dug) {
          // Allow digging even in irrigation mode
          cell.dug = true;
          spawnParticles(mouseX, mouseY, p.color, 6);
          if (cell.hasWater) {
            resources.water++;
            resources.airTanks++;
            addMessage("Found water! +1 water, +1 air tank");
          } else if (cell.hasMineral) {
            resources.minerals++;
            addMessage("Found minerals! +1 mineral");
          } else if (cell.hasSeed) {
            resources.seeds++;
            addMessage("Found seeds! +1 seed");
            spawnParticles(mouseX, mouseY, [60, 180, 60], 5);
          } else {
            addMessage("Just dirt... keep digging!");
          }
        }
      } else {
        // NORMAL MODE: Dig on grid
        if (!cell.dug && !cell.hasVillage) {
          cell.dug = true;
          spawnParticles(mouseX, mouseY, p.color, 6);
          milestone("firstDig", "Nice! You dug your first tile! Keep digging to find resources.");
          let foundSomething = false;

          if (cell.hasWater) {
            resources.water++;
            resources.airTanks++;
            addMessage("Found water! +1 water, +1 air tank");
            milestone("firstWater", "Water found! Drag it to a village for air, or build irrigation pipes!");
            foundSomething = true;
          }
          if (cell.hasMineral) {
            resources.minerals++;
            addMessage("Found minerals! +1 mineral");
            milestone("firstMineral", "Minerals! Drag them to a village to turn them into bricks.");
            foundSomething = true;
          }
          if (cell.hasSeed) {
            resources.seeds++;
            addMessage("Found seeds! +1 seed");
            milestone("firstSeed", "Seeds! Drag them onto any dug dirt tile to plant vegetation (+5 hab).");
            spawnParticles(mouseX, mouseY, [60, 180, 60], 5);
            foundSomething = true;
          }
          if (!foundSomething) {
            addMessage("Just dirt... keep digging!");
          }
        }
      }
    }
  }
}

function mouseReleased() {
  if (dragging && gameState === "SURFACE") {
    let L = getLayout();
    let p = planets[currentPIdx];
    let cellSize = L.cellSize;
    let gridW = cellSize * GRID_COLS;
    let gridOx = L.mobile ? (width - gridW) / 2 : (width - 260 - gridW) / 2;
    let gridOy = L.gridOy;

    let gi = floor((mouseX - gridOx) / cellSize);
    let gj = floor((mouseY - gridOy) / cellSize);

    if (gi >= 0 && gi < GRID_COLS && gj >= 0 && gj < GRID_ROWS) {
      // Seeds go on dug dirt tiles (not villages)
      if (dragging === "seeds" && resources.seeds > 0) {
        let cell = surfaceGrid[gi][gj];
        if (cell.dug && !cell.hasVillage && !cell.hasWater && !cell.hasVegetation && !cell.hasPipe) {
          resources.seeds--;
          cell.hasVegetation = true;
          let p = planets[currentPIdx];
          p.hab = min(p.hab + 5, 100);
          score += 30;
          spawnParticles(mouseX, mouseY, [60, 200, 60], 10);
          addMessage("+5 habitability! Vegetation planted!");
          milestone("firstPlant", "You grew your first plant! Each one adds +5 to habitability.");

          if (p.hab >= 100) {
            planetsRestored++;
            score += 500;
            addMessage(`${p.name} RESTORED! +500 bonus!`);
          milestone("firstPlanetRestored", "You restored your first planet! Head to the next one and keep going!");
            spawnParticles(mouseX, mouseY, [100, 255, 100], 25);
            if (planetsRestored >= planets.length) {
              gameState = "WIN";
            } else {
              autoAdvanceTimer = 90;
            }
          }
        } else if (cell.hasVegetation) {
          addMessage("Already growing here!");
        } else if (!cell.dug) {
          addMessage("Dig the tile first, then plant!");
        } else {
          addMessage("Can't plant here!");
        }
        dragging = null;
        return;
      }
    }

    if (gi >= 0 && gi < GRID_COLS && gj >= 0 && gj < GRID_ROWS && surfaceGrid[gi][gj].hasVillage) {
      if (dragging === "bricks" && resources.bricks > 0) {
        let cell = surfaceGrid[gi][gj];
        resources.bricks--;
        cell.bricksDeposited++;
        p.hab = min(p.hab + 1, 100);
        spawnParticles(mouseX, mouseY, [180, 70, 50], 4);
        addMessage(`Brick placed! (${cell.bricksDeposited}/10 toward a house)`);
        milestone("firstBrickDrop", "You placed a brick on a village! Drop 10 total to build a house.");

        // Every 10 bricks builds a house
        if (cell.bricksDeposited >= 10) {
          cell.bricksDeposited = 0;
          cell.houses++;
          resources.spaceBucks += 5;
          p.hab = min(p.hab + 9, 100);
          let gravityBonus = Math.round(abs(p.gravity - 9.81) * 15);
          score += 200 + gravityBonus;
          spawnParticles(mouseX, mouseY, [255, 220, 50], 20);
          addMessage(`HOUSE BUILT! +5 Space Bucks! (+${200 + gravityBonus} pts)`);
          milestone("firstHouse", "Your first house! Use Space Bucks to buy air with the BUY AIR button.");
        }

        if (p.hab >= 100) {
          planetsRestored++;
          score += 500;
          addMessage(`${p.name} RESTORED! +500 bonus!`);
          milestone("firstPlanetRestored", "You restored your first planet! Head to the next one and keep going!");
          spawnParticles(mouseX, mouseY, [100, 255, 100], 25);
          if (planetsRestored >= planets.length) {
            gameState = "WIN";
          } else {
            autoAdvanceTimer = 90;
          }
        }
      } else if (dragging === "airTanks" && resources.airTanks > 0) {
        resources.airTanks--;
        airSupply = min(airSupply + 40, 100);
        addMessage("+40 air supply!");
        spawnParticles(mouseX, mouseY, [100, 200, 255], 8);
      } else if (dragging === "minerals" && resources.minerals > 0) {
        resources.minerals--;
        resources.bricks += 2;
        addMessage("Refined minerals into 2 bricks!");
        spawnParticles(mouseX, mouseY, [180, 70, 50], 6);
      } else if (dragging === "water" && resources.water > 0) {
        resources.water--;
        airSupply = min(airSupply + 30, 100);
        addMessage("+30 air supply from water purification!");
        spawnParticles(mouseX, mouseY, [50, 120, 255], 8);
      }
    }
    dragging = null;
  }
}

function keyPressed() {
  if (keyCode === ESCAPE && gameState === "SURFACE") {
    gameState = "SPACE";
    irrigationMode = false;
    addMessage("Returned to orbit.");
  }
  if ((key === "r" || key === "R") && gameState === "WIN") {
    resetGame();
  }
}

function resetGame() {
  score = 0;
  planetsRestored = 1;
  airSupply = 100;
  resources = { bricks: 5, airTanks: 3, minerals: 0, water: 0, spaceBucks: 0, seeds: 2 };
  messages = [];
  for (let p of planets) {
    p.hab = p.name === "Earth" ? 100 : 0;
  }
  for (let k in milestones) milestones[k] = false;
  currentPIdx = 2;
  gameState = "INTRO";
}

// ===========================
//     IRRIGATION HELPERS
// ===========================

function isAdjacentToPipeOrWater(col, row) {
  let neighbors = [
    [col - 1, row], [col + 1, row],
    [col, row - 1], [col, row + 1]
  ];
  for (let [nc, nr] of neighbors) {
    if (nc >= 0 && nc < GRID_COLS && nr >= 0 && nr < GRID_ROWS) {
      let neighbor = surfaceGrid[nc][nr];
      if ((neighbor.dug && neighbor.hasWater) || neighbor.hasPipe) {
        return true;
      }
    }
  }
  return false;
}

function isAdjacentToPipe(col, row) {
  let neighbors = [
    [col - 1, row], [col + 1, row],
    [col, row - 1], [col, row + 1]
  ];
  for (let [nc, nr] of neighbors) {
    if (nc >= 0 && nc < GRID_COLS && nr >= 0 && nr < GRID_ROWS) {
      if (surfaceGrid[nc][nr].hasPipe || (surfaceGrid[nc][nr].dug && surfaceGrid[nc][nr].hasWater)) {
        return true;
      }
    }
  }
  return false;
}

function checkIrrigationConnections(planet) {
  // After placing a pipe, check if any non-irrigated village is now reachable
  // via pipes from a water source (BFS from each water source)
  let visited = Array.from({ length: GRID_COLS }, () => Array(GRID_ROWS).fill(false));

  // BFS from all water sources
  let queue = [];
  for (let i = 0; i < GRID_COLS; i++) {
    for (let j = 0; j < GRID_ROWS; j++) {
      if (surfaceGrid[i][j].dug && surfaceGrid[i][j].hasWater) {
        queue.push([i, j]);
        visited[i][j] = true;
      }
    }
  }

  while (queue.length > 0) {
    let [ci, cj] = queue.shift();
    let neighbors = [[ci - 1, cj], [ci + 1, cj], [ci, cj - 1], [ci, cj + 1]];
    for (let [ni, nj] of neighbors) {
      if (ni >= 0 && ni < GRID_COLS && nj >= 0 && nj < GRID_ROWS && !visited[ni][nj]) {
        let ncell = surfaceGrid[ni][nj];
        if (ncell.hasPipe || (ncell.hasVillage && !ncell.irrigated)) {
          visited[ni][nj] = true;
          if (ncell.hasPipe) queue.push([ni, nj]);
          // Auto-connect village if it touches the pipe network
          // (player still needs to click the village to confirm)
        }
      }
    }
  }
}

// Find the next planet that hasn't been restored yet (in order)
function findNextUnrestored() {
  // Start from the planet after the current one
  for (let i = currentPIdx + 1; i < planets.length; i++) {
    if (planets[i].hab < 100) return i;
  }
  // Wrap around to check earlier planets
  for (let i = 0; i < currentPIdx; i++) {
    if (planets[i].hab < 100) return i;
  }
  return -1;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  mobile = isMobile();
  sun.x = width / 2;
  sun.y = height / 2;
  // Rescale orbits
  for (let i = 0; i < planets.length; i++) {
    let d = PLANET_DATA[i];
    planets[i].orbitRadius = map(d.orbitDist, 80, 550, min(width, height) * 0.08, min(width, height) * 0.45);
  }
  // Redistribute stars
  for (let s of stars) {
    s.x = random(width);
    s.y = random(height);
  }
}
