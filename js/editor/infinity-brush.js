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


class InfinityBrush {
  constructor() {
    let element;
    let adapter;
    let matrix;
    let stack;
    let type = "pencil";
    let size = 1;
    let points = [];

    Object.defineProperties(this, {
      element: {
        get() { return element; },
        set(newElement) { if (element) detach(); if (newElement) attach(newElement); }
      },
      adapter: {
        get() { return adapter; },
        set(newAdapter) { adapter = newAdapter; }
      },
      stack: {
        get() { return stack; },
        set(newStack) { stack = newStack; }
      },
      matrix: {
        get() { return matrix; },
        set(newMatrix) { matrix = newMatrix; }
      },
      type: {
        get() { return type; },
        set(newType) { if (newType == "pencil" || newType == "line") { type = newType; } }
      },
      size: {
        get() { return size; },
        set(newSize) { size = Math.max(0, parseInt(newSize) || 0); }
      },
      draw: {
        value: draw
      }
    });

    function attach(newElement) {
      window.addEventListener("keydown", keydown);
      newElement.addEventListener("wheel", wheel);
      newElement.addEventListener("pointerdown", pointerdown);
      element = newElement;
    }

    function detach() {
      if (element) {
        window.removeEventListener("keydown", keydown);
        element.removeEventListener("wheel", wheel);
        element.removeEventListener("pointerdown", pointerdown);
        element.removeEventListener("pointermove", pointermove_pan);
        element.removeEventListener("pointerup", pointerup_pan);
        element.removeEventListener("pointermove", pointermove_draw);
        element.removeEventListener("pointerup", pointerup_draw);
        element.removeEventListener("lostpointercapture", lostpointercapture);
        element = undefined;
      }
    }
    
    function keydown(ev) {
      if (!document.querySelector(":not(button):focus")) {
        if (stack) {
          if ((ev.code == "KeyY" && ev.ctrlKey) || (ev.code == "KeyZ" && ev.shiftKey && ev.ctrlKey)) {
            stack.redo();
            ev.preventDefault();
          } else if (ev.code == "KeyZ" && ev.ctrlKey) {
            stack.undo();
            ev.preventDefault();
          } else if (ev.code == "KeyS" && ev.ctrlKey) {
            stack?.save();
            ev.preventDefault();
          }
        }
      }
    }

    function wheel(ev) {
      let scaleAmount = 1 + ev.wheelDelta / element.offsetHeight;
      let point = matrix.inverse().transformPoint(new DOMPoint(ev.x, ev.y));

      matrix.scaleSelf(scaleAmount, scaleAmount, 1, point.x, point.y, 0);
    }

    function pointerdown(ev) {
      if (!ev.isPrimary) {
        return;
      }

      if (ev.button == 1 || ev.shiftKey) {
        element.setPointerCapture(ev.pointerId);
        element.addEventListener("pointermove", pointermove_pan);
        element.addEventListener("pointerup", pointerup_pan);
      } else if (ev.button == 0 || ev.button == 2) {
        element.setPointerCapture(ev.pointerId);
        element.addEventListener("pointermove", pointermove_draw);
        element.addEventListener("pointerup", pointerup_draw);
        points.length = 0;
        
        if (type == "line") {
          points.push(matrix.inverse().transformPoint(new DOMPoint(ev.x, ev.y)));
          points[0].x = parseInt(points[0].x);
          points[0].y = parseInt(points[0].y);
        }
        
        pointermove_draw(ev);
      }
    }

    function pointermove_pan(ev) {
      if (matrix) {
        matrix.translateSelf(ev.movementX / matrix.a, ev.movementY / matrix.d);
      }
    }

    function pointerup_pan(ev) {
      element.removeEventListener("pointermove", pointermove_pan);
      element.removeEventListener("pointerup", pointerup_pan);
    }

    function pointermove_draw(ev) {
      if (type == "pencil") {
        for (let [x, y] of line(ev.x - ev.movementX, ev.y - ev.movementY, ev.x, ev.y)) {
          let origin = new DOMPoint(x, y);

          origin = matrix.inverse().transformPoint(origin);

          for (let j = 0; j < size; ++j) {
            for (let i = 0; i < size; ++i) {
              let point = new DOMPoint(origin.x + i - size / 2, origin.y + j - size / 2);
              
              if (Math.hypot((i + 0.5) - size / 2, (j + 0.5) - size / 2) <= size / 2) {
                point.x = Math.round(point.x);
                point.y = Math.round(point.y);
                
                if (!points.some(other => point.x == other.x && point.y == other.y)) {
                  points.push(point);
                }
              }
            }
          }
        }
      } else if (type == "line") {
        points.length = 1;
        
        let start = points[0];
        let end = matrix.inverse().transformPoint(new DOMPoint(ev.x, ev.y));
        
        end.x = parseInt(end.x);
        end.y = parseInt(end.y);
        
        let i = 100;
        
        for (let [x, y] of line(start.x, start.y, end.x, end.y)) {
          for (let j = 0; j < size; ++j) {
            for (let i = 0; i < size; ++i) {
              let point = new DOMPoint(x + i - size / 2, y + j - size / 2);
              
              if (Math.hypot((i + 0.5) - size / 2, (j + 0.5) - size / 2) <= size / 2) {
                point.x = Math.round(point.x);
                point.y = Math.round(point.y);
                
                if (!points.some(other => point.x == other.x && point.y == other.y)) {
                  points.push(point);
                }
              }
            }
          }
        }
      }
    }

    function pointerup_draw(ev) {
      if (adapter && stack) {
        let commands = [];
        
        for (let point of points) {
          let command;
          
          command = adapter.expand(point.x, point.y);
          
          if (command) {
            command.execute();
            commands.push(command);
          }
          
          command = adapter.set(point.x, point.y);
          
          if (command) {
            command.execute();
            commands.push(command);
          }
        }
        
        stack.push(new MultipleCommands(commands), false);
      }
      
      element.removeEventListener("pointermove", pointermove_draw);
      element.removeEventListener("pointerup", pointerup_draw);
      points.length = 0;
    }

    function lostpointercapture(ev) {
      element.removeEventListener("pointermove", pointermove_pan);
      element.removeEventListener("pointerup", pointerup_pan);
      element.removeEventListener("pointermove", pointermove_draw);
      element.removeEventListener("pointerup", pointerup_draw);
    }

    function draw(context) {
      if (!element) {
        return;
      }

      context.globalAlpha = 0.5;
      context.fillStyle = "cyan";

      for (let point of points) {
        context.fillRect(point.x, point.y, 1, 1);
      }
    }
  }
}