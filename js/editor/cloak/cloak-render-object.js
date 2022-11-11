class CloakRenderObject {
  canvas = document.createElement("canvas");
  context = this.canvas.getContext("2d");
  
  constructor(world, cell) {
    this.world = world;
    this.cell = cell;
  }
  
  draw(context) {
    context.drawImage(this.canvas, this.cell.x * this.world.width, this.cell.y * this.world.height, this.world.width, this.world.height);
  }
  
  render() {
    let canvas = this.canvas;
    let context = this.context;
    let world = this.world;
    let cell = this.cell;
    
    canvas.width = world.width * 10;
    canvas.height = world.height * 10;
    
    context.fillStyle = "black";
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let y = 0, i = 0; y < world.height; ++y) {
      for (let x = 0; x < world.width; ++x, ++i) {
        let value = cell.data[i];
        
        if (value != -1) {
          context.fillStyle = `hsl(${value}deg, 100%, 50%)`;
          context.fillRect(x * 10, y * 10, 10, 10);
        }
      }
    }
  }
}