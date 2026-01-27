// ==================== Config ====================
const CONFIG = {
  canvasWidth: 800,
  canvasHeight: 550,
  maxHistorySteps: 50,
  presetColors: [
    '#000000', '#ffffff', '#ff0000', '#ff9800',
    '#ffeb3b', '#4caf50', '#2196f3', '#9c27b0',
    '#795548', '#607d8b', '#e91e63', '#00bcd4'
  ]
};

// ==================== Global State ====================
let drawingLayer;
let previewLayer;

let currentTool = 'pencil';
let currentColor = '#000000';
let currentAlpha = 255;
let brushSize = 5;

let isDrawing = false;
let startX, startY;
let lastX, lastY;
let lastTime = 0;
let lastSpeed = 0;

// History
let historyStack = [];
let redoStack = [];

// Tool categories
const brushTools = ['pencil', 'brush', 'marker', 'highlighter', 'spray', 'crayon'];
const eraserTools = ['eraser-round', 'eraser-square'];
const shapeTools = ['line', 'rect', 'ellipse', 'triangle'];
const specialTools = ['picker', 'fill'];

// ==================== p5.js Main Functions ====================
function setup() {
  let canvas = createCanvas(CONFIG.canvasWidth, CONFIG.canvasHeight);
  canvas.parent('canvas-container');

  drawingLayer = createGraphics(CONFIG.canvasWidth, CONFIG.canvasHeight);
  drawingLayer.background(255);

  previewLayer = createGraphics(CONFIG.canvasWidth, CONFIG.canvasHeight);

  initUI();
  saveHistory();
}

function draw() {
  background(255);
  image(drawingLayer, 0, 0);

  if (isDrawing && shapeTools.includes(currentTool)) {
    image(previewLayer, 0, 0);
  }

  drawCursorPreview();
  updateStatus();
}

function drawCursorPreview() {
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;

  push();
  noFill();
  stroke(150);
  strokeWeight(1);

  if (brushTools.includes(currentTool) || currentTool === 'eraser-round') {
    ellipse(mouseX, mouseY, brushSize, brushSize);
  } else if (currentTool === 'eraser-square') {
    rectMode(CENTER);
    rect(mouseX, mouseY, brushSize, brushSize);
  }
  pop();
}

// ==================== UI Initialization ====================
function initUI() {
  // Color presets
  let presetsContainer = document.getElementById('color-presets');
  CONFIG.presetColors.forEach(c => {
    let preset = document.createElement('div');
    preset.className = 'color-preset';
    preset.style.backgroundColor = c;
    preset.onclick = () => {
      currentColor = c;
      document.getElementById('color-picker').value = c;
    };
    presetsContainer.appendChild(preset);
  });

  // Color picker
  document.getElementById('color-picker').addEventListener('input', e => {
    currentColor = e.target.value;
  });

  // Size slider
  document.getElementById('size-slider').addEventListener('input', e => {
    brushSize = parseInt(e.target.value);
    document.getElementById('size-value').textContent = brushSize;
  });

  // Alpha slider
  document.getElementById('alpha-slider').addEventListener('input', e => {
    currentAlpha = parseInt(e.target.value);
    document.getElementById('alpha-value').textContent = currentAlpha;
  });

  // Tool buttons
  document.querySelectorAll('[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      setTool(btn.dataset.tool);
    });
  });

  // Action buttons
  document.getElementById('undo-btn').onclick = undo;
  document.getElementById('redo-btn').onclick = redo;
  document.getElementById('clear-btn').onclick = clearCanvas;
  document.getElementById('save-btn').onclick = saveImage;
}

function setTool(tool) {
  currentTool = tool;

  // Update button states
  document.querySelectorAll('[data-tool]').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.tool === tool) {
      btn.classList.add('active');
    }
  });
}

function updateStatus() {
  const toolNames = {
    'pencil': 'Pencil', 'brush': 'Brush', 'marker': 'Marker',
    'highlighter': 'Highlighter', 'spray': 'Spray', 'crayon': 'Crayon',
    'eraser-round': 'Round Eraser', 'eraser-square': 'Square Eraser',
    'line': 'Line', 'rect': 'Rectangle', 'ellipse': 'Ellipse', 'triangle': 'Triangle',
    'picker': 'Color Picker', 'fill': 'Fill'
  };

  document.getElementById('status-tool').textContent = toolNames[currentTool] || currentTool;
  document.getElementById('status-size').textContent = brushSize;

  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    document.getElementById('status-coords').textContent = `${floor(mouseX)}, ${floor(mouseY)}`;
  }
}

// ==================== Mouse Events ====================
function mousePressed() {
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;

  isDrawing = true;
  startX = mouseX;
  startY = mouseY;
  lastX = mouseX;
  lastY = mouseY;
  lastTime = millis();

  if (currentTool === 'picker') {
    pickColor(mouseX, mouseY);
    isDrawing = false;
    return;
  }

  if (currentTool === 'fill') {
    floodFill(mouseX, mouseY);
    isDrawing = false;
    return;
  }

  if (brushTools.includes(currentTool)) {
    drawBrushStroke(mouseX, mouseY, mouseX, mouseY);
  }
}

function mouseDragged() {
  if (!isDrawing) return;
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;

  if (brushTools.includes(currentTool)) {
    drawBrushStroke(lastX, lastY, mouseX, mouseY);
    lastX = mouseX;
    lastY = mouseY;
  } else if (eraserTools.includes(currentTool)) {
    eraseAt(mouseX, mouseY);
    lastX = mouseX;
    lastY = mouseY;
  } else if (shapeTools.includes(currentTool)) {
    previewLayer.clear();
    drawShape(previewLayer, startX, startY, mouseX, mouseY, true);
  }
}

function mouseReleased() {
  if (!isDrawing) return;

  if (shapeTools.includes(currentTool)) {
    drawShape(drawingLayer, startX, startY, mouseX, mouseY, false);
    previewLayer.clear();
  }

  isDrawing = false;

  if (!specialTools.includes(currentTool)) {
    saveHistory();
  }
}

// ==================== Brush Drawing ====================
function drawBrushStroke(x1, y1, x2, y2) {
  let col = color(currentColor);
  col.setAlpha(currentAlpha);
  drawingLayer.stroke(col);
  drawingLayer.noFill();

  let currentTime = millis();
  let dt = currentTime - lastTime;
  let distance = dist(x1, y1, x2, y2);
  let speed = dt > 0 ? distance / dt : 0;
  lastTime = currentTime;

  switch (currentTool) {
    case 'pencil': drawPencil(x1, y1, x2, y2); break;
    case 'brush': drawCalligraphyBrush(x1, y1, x2, y2, speed); break;
    case 'marker': drawMarker(x1, y1, x2, y2); break;
    case 'highlighter': drawHighlighter(x1, y1, x2, y2); break;
    case 'spray': drawSpray(x2, y2); break;
    case 'crayon': drawCrayon(x1, y1, x2, y2); break;
  }
}

function drawPencil(x1, y1, x2, y2) {
  drawingLayer.strokeWeight(brushSize);
  drawingLayer.line(x1, y1, x2, y2);
}

function drawCalligraphyBrush(x1, y1, x2, y2, speed) {
  let targetWeight = map(speed, 0, 2, brushSize * 1.5, brushSize * 0.3);
  lastSpeed = lerp(lastSpeed, targetWeight, 0.3);
  drawingLayer.strokeWeight(max(1, lastSpeed));
  drawingLayer.line(x1, y1, x2, y2);
}

function drawMarker(x1, y1, x2, y2) {
  let col = color(currentColor);
  col.setAlpha(min(currentAlpha, 100));
  drawingLayer.stroke(col);
  drawingLayer.strokeWeight(brushSize * 1.5);
  drawingLayer.line(x1, y1, x2, y2);
}

function drawHighlighter(x1, y1, x2, y2) {
  let col = color(currentColor);
  col.setAlpha(min(currentAlpha, 80));
  drawingLayer.stroke(col);
  drawingLayer.strokeWeight(brushSize * 3);
  drawingLayer.line(x1, y1, x2, y2);
}

function drawSpray(x, y) {
  let col = color(currentColor);
  col.setAlpha(min(currentAlpha, 50));
  drawingLayer.stroke(col);
  drawingLayer.strokeWeight(1);

  let density = brushSize * 3;
  for (let i = 0; i < density; i++) {
    let angle = random(TWO_PI);
    let radius = random(brushSize);
    drawingLayer.point(x + cos(angle) * radius, y + sin(angle) * radius);
  }
}

function drawCrayon(x1, y1, x2, y2) {
  let col = color(currentColor);
  col.setAlpha(min(currentAlpha, 200));
  drawingLayer.stroke(col);

  let steps = max(1, dist(x1, y1, x2, y2) / 2);
  for (let i = 0; i <= steps; i++) {
    let t = i / steps;
    let x = lerp(x1, x2, t);
    let y = lerp(y1, y2, t);
    for (let j = 0; j < 3; j++) {
      drawingLayer.strokeWeight(random(1, brushSize / 2));
      drawingLayer.point(x + random(-brushSize/4, brushSize/4), y + random(-brushSize/4, brushSize/4));
    }
  }
}

// ==================== Eraser ====================
function eraseAt(x, y) {
  drawingLayer.noStroke();
  drawingLayer.fill(255);

  if (currentTool === 'eraser-round') {
    drawingLayer.ellipse(x, y, brushSize, brushSize);
  } else {
    drawingLayer.rectMode(CENTER);
    drawingLayer.rect(x, y, brushSize, brushSize);
  }
}

// ==================== Shape Drawing ====================
function drawShape(layer, x1, y1, x2, y2, isPreview) {
  let col = color(currentColor);
  col.setAlpha(currentAlpha);
  layer.stroke(col);
  layer.strokeWeight(brushSize);
  layer.noFill();

  if (isPreview) {
    layer.drawingContext.setLineDash([5, 5]);
  } else {
    layer.drawingContext.setLineDash([]);
  }

  switch (currentTool) {
    case 'line':
      layer.line(x1, y1, x2, y2);
      break;
    case 'rect':
      layer.rectMode(CORNERS);
      layer.rect(x1, y1, x2, y2);
      break;
    case 'ellipse':
      layer.ellipseMode(CORNERS);
      layer.ellipse(x1, y1, x2, y2);
      break;
    case 'triangle':
      layer.triangle((x1 + x2) / 2, y1, x1, y2, x2, y2);
      break;
  }

  layer.drawingContext.setLineDash([]);
}

// ==================== Special Tools ====================
function pickColor(x, y) {
  let c = drawingLayer.get(floor(x), floor(y));
  currentColor = '#' + hex(c[0], 2) + hex(c[1], 2) + hex(c[2], 2);
  document.getElementById('color-picker').value = currentColor;
  setTool('pencil');
}

function floodFill(startX, startY) {
  drawingLayer.loadPixels();
  let pixels = drawingLayer.pixels;
  let w = drawingLayer.width;
  let h = drawingLayer.height;

  let sx = floor(startX);
  let sy = floor(startY);
  if (sx < 0 || sx >= w || sy < 0 || sy >= h) return;

  let targetIdx = (sy * w + sx) * 4;
  let targetR = pixels[targetIdx];
  let targetG = pixels[targetIdx + 1];
  let targetB = pixels[targetIdx + 2];

  let fillCol = color(currentColor);
  fillCol.setAlpha(currentAlpha);
  let fillR = red(fillCol);
  let fillG = green(fillCol);
  let fillB = blue(fillCol);
  let fillA = alpha(fillCol);

  if (targetR === fillR && targetG === fillG && targetB === fillB) return;

  let stack = [[sx, sy]];
  let visited = new Set();
  let tolerance = 30;

  function colorMatch(idx) {
    return Math.abs(pixels[idx] - targetR) <= tolerance &&
           Math.abs(pixels[idx + 1] - targetG) <= tolerance &&
           Math.abs(pixels[idx + 2] - targetB) <= tolerance;
  }

  while (stack.length > 0 && stack.length < 100000) {
    let [x, y] = stack.pop();
    let key = `${x},${y}`;

    if (visited.has(key) || x < 0 || x >= w || y < 0 || y >= h) continue;

    let idx = (y * w + x) * 4;
    if (!colorMatch(idx)) continue;

    visited.add(key);
    pixels[idx] = fillR;
    pixels[idx + 1] = fillG;
    pixels[idx + 2] = fillB;
    pixels[idx + 3] = fillA;

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  drawingLayer.updatePixels();
  saveHistory();
}

// ==================== History ====================
function saveHistory() {
  redoStack = [];
  historyStack.push(drawingLayer.get());
  if (historyStack.length > CONFIG.maxHistorySteps) {
    historyStack.shift();
  }
}

function undo() {
  if (historyStack.length <= 1) return;
  redoStack.push(historyStack.pop());
  let prevState = historyStack[historyStack.length - 1];
  drawingLayer.clear();
  drawingLayer.image(prevState, 0, 0);
}

function redo() {
  if (redoStack.length === 0) return;
  let nextState = redoStack.pop();
  historyStack.push(nextState);
  drawingLayer.clear();
  drawingLayer.image(nextState, 0, 0);
}

function clearCanvas() {
  drawingLayer.clear();
  drawingLayer.background(255);
  saveHistory();
}

function saveImage() {
  saveCanvas(drawingLayer, 'drawing', 'png');
}

// ==================== Keyboard Shortcuts ====================
function keyPressed() {
  if (key === 's' && (keyIsDown(CONTROL) || keyIsDown(91))) {
    saveImage();
    return false;
  }

  if (keyIsDown(CONTROL) || keyIsDown(91)) {
    if (key === 'z' || key === 'Z') { undo(); return false; }
    if (key === 'y' || key === 'Y') { redo(); return false; }
  }

  switch (key.toLowerCase()) {
    case 'b': setTool('pencil'); break;
    case 'e': setTool('eraser-round'); break;
    case 'l': setTool('line'); break;
    case 'r': setTool('rect'); break;
    case 'o': setTool('ellipse'); break;
    case 'i': setTool('picker'); break;
    case 'g': setTool('fill'); break;
    case '[':
      brushSize = max(1, brushSize - 2);
      document.getElementById('size-slider').value = brushSize;
      document.getElementById('size-value').textContent = brushSize;
      break;
    case ']':
      brushSize = min(50, brushSize + 2);
      document.getElementById('size-slider').value = brushSize;
      document.getElementById('size-value').textContent = brushSize;
      break;
  }
}
