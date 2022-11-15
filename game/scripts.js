let sprites = {};
let player;
let data;


window.addEventListener("keydown", function (ev) {
  // if (ev.repeat) return;
  
  if (ev.code == "KeyQ" || ev.code == "Numpad7") {
    takePlayerTurn(interactOrMove(player, -1, -1));
  }
  
  if (ev.code == "KeyW" || ev.code == "ArrowUp" || ev.code == "Numpad8") {
    takePlayerTurn(interactOrMove(player, 0, -1));
  }
  
  if (ev.code == "KeyE" || ev.code == "Numpad9") {
    takePlayerTurn(interactOrMove(player, 1, -1));
  }
  
  if (ev.code == "KeyA" || ev.code == "ArrowLeft" || ev.code == "Numpad4") {
    takePlayerTurn(interactOrMove(player, -1, 0));
  }
  
  if (ev.code == "KeyD" || ev.code == "ArrowRight" || ev.code == "Numpad6") {
    takePlayerTurn(interactOrMove(player, 1, 0));
  }
  
  if (ev.code == "KeyZ" || ev.code == "Numpad1") {
    takePlayerTurn(interactOrMove(player, -1, 1));
  }
  
  if (ev.code == "KeyS" || ev.code == "ArrowDown" || ev.code == "Numpad2") {
    takePlayerTurn(interactOrMove(player, 0, 1));
  }
  
  if (ev.code == "KeyC" || ev.code == "Numpad3") {
    takePlayerTurn(interactOrMove(player, 1, 1));
  }
  
  // console.log(ev.code);
});


function interactOrMove(creature, x, y) {
  let all = findCreaturesInArea(creature.worldData, creature.cellData, creature.x + x, creature.y + y, creature.creatureData.width, creature.creatureData.height);
  
  if (all.length == 0) {
    return move(creature, x, y);
  } else {
    let target = all[0];
    
    return interact(creature, target);
  }
}


function interact(creature, target) {
  if (target != player) {
    removeCreature(target);
  }
  return true;
}


function move(creature, x, y) {
  let cellData = findCellDataByXY(creature.worldData, creature.x + x, creature.y + y);
  if (!cellData) return false;
  
  let tileIndex = getTileFromCellDataAt(creature.worldData, cellData, creature.x + x, creature.y + y);
  let tile = data.tiles[tileIndex];
  if (tile && tile.solid) return false;
  
  creature.x += x;
  creature.y += y;
  creature.cellData = cellData;
  return true;
}


function takePlayerTurn(success) {
  if (!success) return;
  
  for (let i = 0; i < creatures.length; ++i) {
    let creature = creatures[i];
    
    if (creature == player) {
      continue;
    }
    
    let direction = Math.floor(Math.random() * 4);
    
    if (direction == 0) {
      interactOrMove(creature, -1, 0);
    } else if (direction == 1) {
      interactOrMove(creature, 0, -1);
    } else if (direction == 2) {
      interactOrMove(creature, 1, 0);
    } else if (direction == 3) {
      interactOrMove(creature, 0, 1);
    }
    
    if (creatures[i] != creature) {
      i = creatures.indexOf(creature);
      
      if (i == -1) {
        // TODO Fix me!!
        console.error("Edge case not expected where creature dies during turn");
      }
    }
  }
}


window.addEventListener("load", function (ev) {
  data = YAML.parse(window["content.yml"].textContent);
  
  processDataInput(data);
  
  initSprites(data);
  
  player = createCreature(
    findCreatureDataById(data, "crabbeach"),
    findWorldDataById(data, "overworld"), 1, 1);
  
  addCreature(player);
  
  let worldData = player.worldData;
  
  for (let spawn of worldData.spawns) {
    addCreature(createCreature(
      findCreatureDataById(data, spawn.creatureId),
      worldData, spawn.x, spawn.y));
  }
  
  draw();
});


function draw() {
  let worldData = player.worldData;
  if (!worldData) return;
  
  let cellData = player.cellData;
  if (!cellData) return;
  
  let worldWidth = worldData.width;
  let worldHeight = worldData.height;
  let tileWidth = 10;
  let tileHeight = 10;
  let scale = Math.min(canvas.width / worldWidth, canvas.height / worldHeight);
  
  context.reset();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.scale(scale, scale);
  context.translate(-worldWidth / 2, -worldHeight / 2);
  context.imageSmoothingEnabled = false;
  
  drawCell(context, worldData, cellData);
  
  for (let creature of creatures) {
    if (creature.cellData == cellData) {
      // Darken the background slightly
      context.fillStyle = "black";
      context.globalAlpha = 0.5;
      context.fillRect(creature.x - cellData.x, creature.y - cellData.y, 1, 1);
      
      // Draw the creature sprite
      context.globalAlpha = 1;
      drawSprite(context, creature == player ? "herom" : creature.creatureData.sprite, creature.x - cellData.x, creature.y - cellData.y, 1, 1);
    }
  }
  
  
  requestAnimationFrame(draw);
}


function drawCell(context, worldBase, cellBase) {
  for (let y = 0, i = 0; y < worldBase.height; ++y) {
    for (let x = 0; x < worldBase.width; ++x, ++i) {
      let tileIndex = cellBase.data[i];
      if (tileIndex == -1) continue;
      
      let tile = data.tiles[tileIndex];
      
      drawSprite(context, tile.sprite, x, y, 1, 1);
    }
  }
}


function drawSprite(context, spriteName, x, y, width, height) {
  let sprite = sprites[spriteName];
  
  if (!sprite) {
    context.fillStyle = "red";
    context.fillRect(x, y, width, height);
    return;
  }

  context.drawImage(sprite.image, sprite.x, sprite.y, sprite.width, sprite.height, x, y, width, height);
}


/* Sprites */


function initSprites(data) {
  for (let node of data.images) {
    let image = document.getElementById("images/" + node.name + ".png");
    let spriteIndex = 0;
    let spriteWidth = node.width;
    let spriteHeight = node.height;
    
    for (let spriteName of node.sprites) {
      let spriteX = (spriteIndex * spriteWidth) % image.width;
      let spriteY = Math.floor(spriteIndex * spriteWidth / image.width) * spriteHeight;
      
      sprites[spriteName] = {
        image: image,
        x: spriteX,
        y: spriteY,
        width: spriteHeight,
        height: spriteWidth
      };
      
      ++spriteIndex;
    }
  }
}


/* Creatures */


const creatures = [];


function createCreature(creatureData, worldData, x, y) {
  return {
    x: x,
    y: y,
    creatureData: creatureData,
    worldData: worldData,
    cellData: findCellDataByXY(worldData, x, y)
  };
}


function addCreature(creature) {
  creatures.push(creature);
}


function removeCreature(creature) {
  creatures.splice(creatures.indexOf(creature), 1);
}


/**
 * Returns all creatures in a given area
 * @param {Object} worldData - The world in which to search
 * @param {Object} [cellData] - The cell in which to search, if present
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @returns {Object[]}
 */
function findCreaturesInArea(worldData, cellData, x, y, width, height) {
  let results = [];
  
  for (let creature of creatures) {
    if (creature.worldData == worldData && (!cellData || creature.cellData == cellData) && rectRectHitTest(creature.x, creature.y, creature.creatureData.width, creature.creatureData.height, x, y, width, height)) {
      results.push(creature);
    }
  }
  
  return results;
}


function rectRectHitTest(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 && x2 < x1 + w1 && y1 < y2 + h2 && y2 < y1 + h1;
}