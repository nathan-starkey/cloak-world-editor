class WorldEditor {
  constructor(callbackFn, thisArg) {
    this.project = undefined;
    this.world = undefined;
    this.state = undefined;
    this.states = new Map();
    this.changes = Changes(callbackFn, thisArg);
    this.tiles = [];
    this.spawn = undefined;
    
    this.savedCommand = undefined;
  }
  
  markSaved() {
    this.savedCommand = this.changes[this.changes.length - 1];
  }
  
  saved() {
    return this.savedCommand == this.changes[this.changes.length - 1];
  }
  
  hasTile(value) {
    return this.tiles.includes(value);
  }
  
  toggleTile(value, multi) {
    if (multi) {
      if (this.hasTile(value)) {
        this.tiles.splice(this.tiles.indexOf(value), 1);
        return false;
      } else {
        this.tiles.push(value);
        return true;
      }
    } else {
      if (this.tiles.length == 1 && this.tiles[0] == value) {
        this.tiles.length = 0;
        return false;
      } else {
        this.tiles.length = 0;
        this.tiles.push(value);
        return true;
      }
    }
  }

  open(project, world) {
    if (world == this.world) return;
    
    let prevProject = this.project;
    let prevWorld = this.world;

    this.changes.push([
      () => {
        this._open(project, world);
      },
      () => {
        if (prevProject) {
          this._open(prevProject, prevWorld);
        } else {
          this._close(world);
        }
      }
    ]);
  }

  _open(project, world) {
    let state = this.states.get(world) || new WorldEditorState(project, world);

    this.project = project;
    this.world = world;
    this.state = state;
    this.states.set(world, state);

    setDrawingControls(canvas, state.matrix, this.changeTiles, this);
    setMovementControls(canvas, state.matrix);
    
    canvas.drawingControls.mode = toolType.value;
    canvas.drawingControls.size = toolSize.valueAsNumber;
  }

  _close(world) {
    this.world = undefined;
    this.state = undefined;
    
    clearDrawingControls(canvas);
    clearMovementControls(canvas);
  }

  draw(context) {
    if (this.state) {
      this.state.draw(context);

      context.fillStyle = "cyan";
      context.globalAlpha = 0.5;

      for (let point of canvas.drawingControls.points) {
        context.fillRect(point[0], point[1], 1, 1);
      }
      
      if (showGrid) {
        context.lineWidth = 1 / this.state.matrix.a;
        context.strokeStyle = showGrid == 1 ? "#808080" : "white";
        
        for (let cell of this.world.cells) {
          context.strokeRect(cell.x, cell.y, this.world.width, this.world.height);
        }
      }
    }
  }

  render() {
    if (this.state) {
      this.state.render();
    }
  }

  changeTiles(points) {
    let undo = [];
    let redo = [];

    for (let [x, y] of points) {
      let cellX = Math.floor(x / this.world.width) * this.world.width;
      let cellY = Math.floor(y / this.world.height) * this.world.height;
      let cell = this.world.cells.find(cell => cell.x == cellX && cell.y == cellY);

      if (!cell) {
        cell = {
          x: cellX,
          y: cellY,
          data: new Array(this.world.width * this.world.height).fill(-1)
        };

        let stepRedo = () => {
          this.world.cells.push(cell);
          this.state.addCell(cell);
        };

        let stepUndo = () => {
          this.state.removeCell(cell);
          this.world.cells.pop();
        };

        stepRedo();
        redo.push(stepRedo);
        undo.push(stepUndo);
      }

      x = x - cellX;
      y = y - cellY;

      let i = x + y * this.world.width;
      
      let curr = this.tiles.length == 0 ? -1 : this.tiles[Math.floor(this.tiles.length * Math.random())];
      let prev = cell.data[i];

      let stepRedo = () => {
        cell.data[i] = curr;
        this.state.redrawCell(cell);
      };

      let stepUndo = () => {
        cell.data[i] = prev;
        this.state.redrawCell(cell);
      };

      stepRedo();
      redo.push(stepRedo);
      undo.push(stepUndo);
    }

    this.changes.push([redo, undo.reverse()], false);
  }
}


class WorldEditorState {
  constructor(project, world) {
    this.project = project;
    this.world = world;
    this.matrix = new DOMMatrix();
    this.renderers = [];
    this.renderQueue = [];
    
    this.matrix.translateSelf(362, 0);
    this.matrix.scaleSelf(10, 10);

    for (let cell of world.cells) {
      let renderer = new CellRenderer(project, world, cell);

      this.renderers.push(renderer);
      this.renderQueue.push(renderer);
    }
  }

  addCell(cell) {
    let renderer = new CellRenderer(this.project, this.world, cell);

    this.renderers.push(renderer);
    this.renderQueue.push(renderer);
  }

  removeCell(cell) {
    let index = this.renderers.findIndex(renderer => renderer.cell == cell);
    let indexInQueue = this.renderQueue.indexOf(this.renderers[index]);

    this.renderers.splice(index, 1);

    if (indexInQueue != -1) {
      this.renderQueue.splice(indexInQueue, 1);
    }
  }

  redrawCell(cell) {
    let renderer = this.renderers.find(renderer => renderer.cell == cell);

    if (!this.renderQueue.includes(renderer)) {
      this.renderQueue.push(renderer);
    }
  }

  draw(context) {
    context.setTransform(this.matrix);
    context.globalAlpha = 1;

    if (this.matrix.a >= 10 && !colorMode) {
      for (let renderer of this.renderers) {
        renderer.draw(context);
      }
    } else {
      for (let renderer of this.renderers) {
        renderer.drawSmall(context);
      }
    }
    
    if (showSpawns || toolType.value == "_spawns") {
      for (let spawn of this.world.spawns) {
        let creatureId = spawn.creatureId;
        let creature = this.project.data.creatures.find(creature => creature.id == creatureId);
        let x = spawn.x;
        let y = spawn.y;
        let width = creature?.width || 1;
        let height = creature?.height || 1;
        let spriteName = creature?.sprite;
        
        context.fillStyle = "black";
        context.globalAlpha = 0.8;
        context.fillRect(x, y, width, height);
        
        context.globalAlpha = 1;
        
        drawCloakSprite(context, this.project, spriteName, x, y, width, height,
          !(this.matrix.a >= 10 && !colorMode));
        
        if (spawn == editor.spawn) { // <-- WARNING: Reference to global object 'editor'
          context.strokeStyle = "lime";
          context.lineWidth = 1 / this.matrix.a;
          context.strokeRect(x, y, width, height);
        }
      }
    }
  }

  render() {
    let renderer = this.renderQueue.shift();

    if (renderer) {
      renderer.render();
    }
  }
}


class CellRenderer {
  constructor(project, world, cell) {
    this.project = project;
    this.world = world;
    this.cell = cell;
    this.context = document.createElement("canvas").getContext("2d");
    this.contextSmall = document.createElement("canvas").getContext("2d");
    
    this.context.canvas.width = 1;
    this.context.canvas.height = 1;
    this.contextSmall.canvas.width = 1;
    this.contextSmall.canvas.height = 1;
    this.context.fillStyle = "black";
    this.contextSmall.fillStyle = "black";
    this.context.fillRect(0, 0, 1, 1);
    this.contextSmall.fillRect(0, 0, 1, 1);
  }

  draw(context) {
    context.drawImage(this.context.canvas, this.cell.x, this.cell.y, this.world.width, this.world.height);
  }

  drawSmall(context) {
    context.drawImage(this.contextSmall.canvas, this.cell.x, this.cell.y, this.world.width, this.world.height);
  }

  render() {
    this.context.canvas.width = this.world.width * 10;
    this.context.canvas.height = this.world.height * 10;
    this.contextSmall.canvas.width = this.world.width;
    this.contextSmall.canvas.height = this.world.height;
    
    this.context.fillStyle = "black";
    this.contextSmall.fillStyle = "black";
    this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height);
    this.contextSmall.fillRect(0, 0, this.contextSmall.canvas.width, this.contextSmall.canvas.height);

    for (let i = 0, y = 0; y < this.world.height; ++y) {
      for (let x = 0; x < this.world.width; ++x, ++i) {
        let value = this.cell.data[i];
        if (value == -1) continue;

        // BEGIN CLOAK CELL RENDERING
        let tile = this.project.data.tiles[value];
        let spriteName = tile.sprite;
        let spriteIndex;
        let imageIndex = this.project.data.images.findIndex(node => (spriteIndex = node.sprites.indexOf(spriteName)) != -1);

        if (imageIndex == -1) {
          this.context.fillStyle = "red";
          this.contextSmall.fillStyle = "red";
          this.context.fillRect(x * 10, y * 10, 10, 10);
          this.contextSmall.fillRect(x, y, 1, 1);
          continue;
        }

        let color = this.project.resources.colors[spriteName];
        let imageNode = this.project.data.images[imageIndex];
        let image = this.project.resources.images[imageIndex];
        let spriteWidth = imageNode.width;
        let spriteHeight = imageNode.height;
        let spriteX = (spriteIndex * spriteWidth) % image.width;
        let spriteY = Math.floor(spriteIndex * spriteWidth / image.width) * spriteHeight;

        this.contextSmall.fillStyle = color;
        this.context.drawImage(image, spriteX, spriteY, spriteWidth, spriteHeight, x * 10, y * 10, 10, 10);
        this.contextSmall.fillRect(x, y, 1, 1);
        // END CLOAK CELL RENDERING
      }
    }
  }
}