class CloakAdapter {
  constructor(editor, world, renderer) {
    this.editor = editor;
    this.world = world;
    this.renderer = renderer;
  }
  
  getCell(x, y) {
    x = Math.floor(x / this.world.width);
    y = Math.floor(y / this.world.height);
    
    return this.world.cells.find(cell => cell.x == x && cell.y == y);
  }
  
  expand(x, y) {
    let cell = this.getCell(x, y);
    
    if (cell) {
      return undefined;
    }
    
    let world = this.world;
    let renderer = this.renderer;
    
    cell = {
      x: Math.floor(x / world.width),
      y: Math.floor(y / world.height),
      data: new Array(world.width * world.height).fill(-1)
    };
    
    parseCell(world, cell);
    
    return new UndoableCommand(
      new MultipleCommands(
        new ArrayPushCommand(world.cells, cell),
        new FunctionCallCommand(renderer.addToLayer0, renderer, [cell.renderObject]),
        new FunctionCallCommand(renderer.addToLayer1, renderer, [cell.smallRenderObject])
      ),
      new MultipleCommands(
        new ArrayPopCommand(world.cells),
        new FunctionCallCommand(renderer.removeFromLayer0, renderer, [cell.renderObject]),
        new FunctionCallCommand(renderer.removeFromLayer1, renderer, [cell.smallRenderObject])
      )
    );
  }
  
  set(x, y) {
    let cell = this.getCell(x, y);
    
    if (!cell) {
      return undefined;
    }
    
    let world = this.world;
    let renderer = this.renderer;
    let editor = this.editor;
    
    let localX = x - cell.x * world.width;
    let localY = y - cell.y * world.height;
    let localI = localX + localY * world.width;
    let value = editor.getRandomTile();
    
    if (value == -1) {
      let removeCell = true;
      
      for (let i = 0; i < cell.data.length; ++i) {
        if (cell.data[i] != -1 && localI != i) {
          removeCell = false;
          break;
        }
      }
      
      if (removeCell) {
        let index = world.cells.indexOf(cell);
        
        return new UndoableCommand(
          new MultipleCommands(
            new ArraySpliceCommand(world.cells, index, 1),
            new FunctionCallCommand(renderer.removeFromLayer0, renderer, [cell.renderObject]),
            new FunctionCallCommand(renderer.removeFromLayer1, renderer, [cell.smallRenderObject])
          ),
          new MultipleCommands(
            new ArraySpliceCommand(world.cells, index, 0, [[cell]]),
            new FunctionCallCommand(renderer.addToLayer0, renderer, [cell.renderObject]),
            new FunctionCallCommand(renderer.addToLayer1, renderer, [cell.smallRenderObject])
          )
        );
      }
    }
    
    return new UndoableCommand(
      new MultipleCommands(
        new PropertySetCommand(cell.data, localI, value),
        new FunctionCallCommand(renderer.pushToQueueOfLayer0, renderer, [cell.renderObject]),
        new FunctionCallCommand(renderer.pushToQueueOfLayer1, renderer, [cell.smallRenderObject])
      ),
      new MultipleCommands(
        new PropertySetCommand(cell.data, localI, cell.data[localI]),
        new FunctionCallCommand(renderer.pushToQueueOfLayer0, renderer, [cell.renderObject]),
        new FunctionCallCommand(renderer.pushToQueueOfLayer1, renderer, [cell.smallRenderObject])
      )
    );
  }
}