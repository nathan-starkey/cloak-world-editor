function findCreatureDataById(data, id) {
  for (let creature of data.creatures) {
    if (creature.id == id) {
      return creature;
    }
  }
  
  return undefined;
}


function findWorldDataById(data, id) {
  for (let world of data.worlds) {
    if (world.id == id) {
      return world;
    }
  }
  
  return undefined;
}


function findCellDataByXY(worldData, x, y) {
  let cellX = Math.floor(x / worldData.width) * worldData.width;
  let cellY = Math.floor(y / worldData.height) * worldData.height;
  
  for (let cell of worldData.cells) {
    if (cell.x == cellX && cell.y == cellY) {
      return cell;
    }
  }
  
  return undefined;
}


function getTileFromCellDataAt(worldData, cellData, x, y) {
  let i = x - cellData.x + (y - cellData.y) * worldData.height;
  
  return cellData.data[i];
}