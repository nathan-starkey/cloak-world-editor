class CloakSmallRenderObject extends CloakRenderObject {
  render() {
    let canvas = this.canvas;
    let context = this.context;
    let world = this.world;
    let cell = this.cell;
    
    canvas.width = world.width * 10;
    canvas.height = world.height * 10;
    
    context.fillStyle = "black";
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = "lime";
    
    for (let y = 0, i = 0; y < world.height; ++y) {
      for (let x = 0; x < world.width; ++x, ++i) {
        let value = cell.data[i];
        
        if (value != -1) {
          context.fillRect(x * 10, y * 10, 10, 10);
        }
      }
    }
  }
}