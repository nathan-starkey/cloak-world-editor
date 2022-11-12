function* line(x0, y0, x1, y1) {
   var dx = Math.abs(x1 - x0);
   var dy = Math.abs(y1 - y0);
   var sx = (x0 < x1) ? 1 : -1;
   var sy = (y0 < y1) ? 1 : -1;
   var err = dx - dy;

   while(true) {
     yield [x0, y0];

      if ((x0 === x1) && (y0 === y1)) break;
      var e2 = 2*err;
      if (e2 > -dy) { err -= dy; x0  += sx; }
      if (e2 < dx) { err += dx; y0  += sy; }
   }
}


function setMovementControls(element, matrix) {
  if (element.movementControls) clearMovementControls(element);

  element.movementControls = {wheel, pointerdown, pointermove, pointerup, lostpointercapture};

  element.addEventListener("wheel", wheel);
  element.addEventListener("pointerdown", pointerdown);

  return element.movementControls;

  function wheel(ev) {
    let amount = 1 + ev.wheelDelta / element.offsetHeight;
    let point = matrix.inverse().transformPoint(new DOMPoint(ev.x, ev.y));

    matrix.scaleSelf(amount, amount, 1, point.x, point.y, 0);
  }

  function pointerdown(ev) {
    ev.preventDefault();
    ev.stopImmediatePropagation();
    element.setPointerCapture(ev.pointerId);
    element.addEventListener("pointermove", pointermove);
    element.addEventListener("pointerup", pointerup);
    element.addEventListener("lostpointercapture", lostpointercapture);
  }

  function pointermove(ev) {
    matrix.translateSelf(ev.movementX / matrix.a, ev.movementY / matrix.d);
  }

  function pointerup(ev) {
    element.removeEventListener("pointermove", pointermove);
    element.removeEventListener("pointerup", pointerup);
    element.removeEventListener("lostpointercapture", lostpointercapture);
  }

  function lostpointercapture(ev) {
    element.removeEventListener("pointermove", pointermove);
    element.removeEventListener("pointerup", pointerup);
    element.removeEventListener("lostpointercapture", lostpointercapture);
  }
}


function clearMovementControls(element) {
  let {wheel, pointerdown, pointermove, pointerup, lostpointercapture} = element.movementControls;

  element.removeEventListener("wheel", wheel);
  element.removeEventListener("pointerdown", pointerdown);
  element.removeEventListener("pointermove", pointermove);
  element.removeEventListener("pointerup", pointerup);
  element.removeEventListener("lostpointercapture", lostpointercapture);

  delete element.movementControls;
}


function setDrawingControls(element, matrix, callback, thisArg) {
  let mode = "path";
  let size = 1;
  let points = [];

  if (element.drawingControls) {
    mode = element.drawingControls.mode;
    size = element.drawingControls.size;
    points = element.drawingControls.points;

    clearDrawingControls(element);
  }

  element.drawingControls = Object.defineProperties({}, {
    pointerdown: {value: pointerdown},
    pointermove: {value: pointermove},
    pointerup: {value: pointermove},
    lostpointercapture: {value: lostpointercapture},
    points: {
      get() { return points; },
      set(newPoints) { points = newPoints; }
    },
    mode: {
      get() { return mode; },
      set(newMode) { mode = newMode; }
    },
    size: {
      get() { return size; },
      set(newSize) { size = Math.abs(parseFloat(newSize) || size); }
    }
  });

  element.addEventListener("pointerdown", pointerdown);

  return element.drawingControls;

  function pointerdown(ev) {
    if (!ev.isPrimary || ev.shiftKey || (ev.button != 0 /* && ev.button != 2 */)) return;

    ev.preventDefault();
    ev.stopImmediatePropagation();
    element.setPointerCapture(ev.pointerId);
    element.addEventListener("pointermove", pointermove);
    element.addEventListener("pointerup", pointerup);
    element.addEventListener("lostpointercapture", lostpointercapture);
    points.length = 0;
    pointermove(ev);
  }

  function pointermove(ev) {
    let prev = matrix.inverse().transformPoint(new DOMPoint(ev.x - ev.movementX, ev.y - ev.movementY));
    let point = matrix.inverse().transformPoint(new DOMPoint(ev.x, ev.y));

    if (mode == "point") {
      pushPoint(point.x, point.y);
      pointerup(ev);
    } else if (mode == "path") {
      for (let offsetY = -size / 2 + 0.5; offsetY < size / 2; ++offsetY) {
        for (let offsetX = -size / 2 + 0.5; offsetX < size / 2; ++offsetX) {
          if (Math.hypot(offsetX, offsetY) <= size / 2) {
            for (let [x, y] of line(
              Math.floor(prev.x + offsetX),
              Math.floor(prev.y + offsetY),
              Math.floor(point.x + offsetX),
              Math.floor(point.y + offsetY))
            ) {
              pushPoint(x, y);
            }
          }
        }
      }
    } else if (mode == "line") {
      if (ev.type == "pointerdown") {
        pushPoint(point.x, point.y);
      }

      points.length = 1;

      for (let offsetY = -size / 2 + 0.5; offsetY < size / 2; ++offsetY) {
        for (let offsetX = -size / 2 + 0.5; offsetX < size / 2; ++offsetX) {
          if (Math.hypot(offsetX, offsetY) <= size / 2) {
            for (let [x, y] of line(
              Math.floor(points[0][0] + offsetX),
              Math.floor(points[0][1] + offsetY),
              Math.floor(point.x + offsetX),
              Math.floor(point.y + offsetY))
            ) {
              pushPoint(x, y);
            }
          }
        }
      }
    }
  }

  function pointerup(ev) {
    element.removeEventListener("pointermove", pointermove);
    element.removeEventListener("pointerup", pointerup);
    element.removeEventListener("lostpointercapture", lostpointercapture);

    if (points.length != 0) {
      callback.call(thisArg, points);
      points.length = 0;
    }
  }

  function lostpointercapture(ev) {
    element.removeEventListener("pointermove", pointermove);
    element.removeEventListener("pointerup", pointerup);
    element.removeEventListener("lostpointercapture", lostpointercapture);
  }

  function pushPoint(x, y) {
    x = Math.floor(x);
    y = Math.floor(y);

    let exists = points.some(point => point[0] == x && point[1] == y);

    if (!exists) {
      points.push([x, y]);
    }
  }
}


function clearDrawingControls(element) {
  let {pointerdown, pointermove, pointerup, lostpointercapture} = element.drawingControls;

  element.removeEventListener("pointerdown", pointerdown);
  element.removeEventListener("pointermove", pointermove);
  element.removeEventListener("pointerup", pointerup);
  element.removeEventListener("lostpointercapture", lostpointercapture);

  delete element.drawingControls;
}