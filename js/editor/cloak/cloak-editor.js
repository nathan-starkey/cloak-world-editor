class CloakEditor {
  world;
  renderer;
  viewMatrix;
  
  tiles = [];
  stack = new SaveableUndoRedoStack();
  brush = new InfinityBrush();
  renderersByWorld = new Map();
  viewMatricesByWorld = new Map();
  
  constructor(canvas) {
    this.brush.element = canvas;
    this.brush.stack = this.stack;
  }
  
  setWorld(world) {
    let prevWorld = this.world;
    let renderer = this.renderersByWorld.get(world);
    let viewMatrix = this.viewMatricesByWorld.get(world);
    
    if (!renderer) {
      viewMatrix = new DOMMatrix([10, 0, 0, 10, 0, 0]);
      renderer = new ScaleBlendedQueuedRenderers(10, viewMatrix);
      
      this.renderersByWorld.set(world, renderer);
      this.viewMatricesByWorld.set(world, viewMatrix);
      
      for (let cell of world.cells) {
        parseCell(world, cell);
        renderer.addToLayer0(cell.renderObject);
        renderer.addToLayer1(cell.smallRenderObject);
      }
    }
    
    this.world = world;
    this.renderer = renderer;
    this.viewMatrix = viewMatrix;
    this.brush.matrix = viewMatrix;
    this.brush.adapter = new CloakAdapter(this, world, renderer);
    
    if (prevWorld) {
      this.stack.push(new UndoableCommand(
        new FunctionCallCommand(this.setWorld, this, [world]),
        new FunctionCallCommand(this.setWorld, this, [prevWorld])
      ), false);
    }
  }
  
  getRandomTile() {
    return this.tiles.length == 0 ? -1 : this.tiles[Math.floor(Math.random() * this.tiles.length)];
  }
  
  render() {
    if (this.renderer) {
      this.renderer.render();
    }
  }
  
  draw(context) {
    if (this.renderer) {
      context.setTransform(this.viewMatrix);
      this.renderer.draw(context);
      this.brush.draw(context);
      
      context.globalAplha = 1;
      context.strokeStyle = "#888";
      context.lineWidth = 1 / this.viewMatrix.a;
      
      for (let cell of this.world.cells) {
        context.strokeRect(cell.x * this.world.width, cell.y * this.world.height, this.world.width, this.world.height);
      }
    }
  }
}