let editor = new WorldEditor(onChange);
let canvas = document.getElementById("canvas");
let context = canvas.getContext("2d");
let highContrast = false;
let showSpawns = true;
let colorMode = false;
let showGrid = 1;
let contextPossiblyUnsaved = false;


draw();


/**
 * EDITOR
 **/


window.addEventListener("beforeunload", ev => {
  if (!editor.saved() || contextPossiblyUnsaved) {
    ev.returnValue = "";
    ev.preventDefault();
  }
});


window.addEventListener("keydown", ev => {
  if (document.querySelector("input:focus,textarea:focus")) {
    return;
  }

  if (ev.code == "KeyS" && ev.ctrlKey) {
    saveBtn.click();
    ev.preventDefault();
    ev.stopImmediatePropagation();
  } else if ((ev.code == "KeyY" && ev.ctrlKey) || (ev.code == "KeyZ" && ev.ctrlKey && ev.shiftKey)) {
    redoBtn.click();
    ev.preventDefault();
    ev.stopImmediatePropagation();
  } else if (ev.code == "KeyZ" && ev.ctrlKey) {
    undoBtn.click();
    ev.preventDefault();
    ev.stopImmediatePropagation();
  } else if (ev.code == "Tab") {
    sidebar.classList.toggle("collapsed");
    ev.preventDefault();
    ev.stopImmediatePropagation();
  }
})


function draw() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  context.imageSmoothingEnabled = false;

  editor.render();
  editor.draw(context);

  requestAnimationFrame(draw);
}


function onChange() {
  undoBtn.disabled = !editor.changes.canUndo();
  redoBtn.disabled = !editor.changes.canRedo();
  saveBtn.disabled = editor.saved() && !contextPossiblyUnsaved;
}


/**
 * DISPLAY
 **/


function displayProject(editor, project) {
  entryForm.hidden = true;
  editorForm.hidden = false;

  displayWorldButtons(editor, project);
  displayTileThumbs(editor, project);
}


function displayWorldButtons(editor, project) {
  worldList.innerHTML = "";

  for (let world of project.data.worlds) {
    let worldButton = document.createElement("button");
    worldButton.innerText = world.name;
    worldButton.onclick = openWorld.bind(undefined, editor, project, world);

    worldList.append(worldButton);
  }

  let createWorldButton = document.createElement("button");
  createWorldButton.innerText = "Create World";
  createWorldButton.onclick = createWorld.bind(undefined, editor, project);

  worldList.append(createWorldButton);
}


function displayTileThumbs(editor, project) {
  tileList.innerHTML = "";

  let thumbs = [];
  let defaultThumb = project.resources.thumbs["crab"];

  for (let tile of project.data.tiles) {
    let index = project.data.tiles.indexOf(tile);
    let thumb = project.resources.thumbs[tile.sprite] || defaultThumb;

    thumbs.push(thumb);
    thumb.title = tile.name +
      "\nSolid: " + tile.isSolid +
      "\nOpaque: " + tile.isOpaque;

    thumb.onclick = ev => toggleTile(editor, thumbs, index, ev.shiftKey);
    tileList.append(thumb);
  }
}


/**
 * OPTIONS
 **/


function toggleContrast() {
  highContrast = !highContrast;

  project.resources.colors = generateCloakColors(project.data, project.resources.images);

  for (let state of editor.states.values()) {
    state.renderQueue.length = 0;
    state.renderQueue.push(...state.renderers);
  }
}


function toggleColorMode() {
  colorMode = !colorMode;
}


function toggleGrid() {
  showGrid = (showGrid + 1) % 3;
}


function toggleSpawns() {
  showSpawns = !showSpawns;
}


function displayStats() {
  if (editor.state) {
    let world = editor.state.world;

    alert(`-- Project Stats --
Creatures: ${project.data.creatures.length}
Tiles: ${project.data.tiles.length}
Worlds: ${project.data.worlds.length}

-- ${world.name} Stats --
Cells: ${world.cells.length}
Spawns: ${world.spawns.length}`);
  }
}


/**
 * WORLD
 **/


function createWorld(editor, project) {
  let id = prompt("Enter new world ID:");
  if (!id) return;

  let name = prompt("Enter new world name:");
  if (!name) return;

  let width = prompt("Enter new world cell width", 32);
  if (!width) return;

  let height = prompt("Enter new world cell height", 32);
  if (!height) return;

  width = Math.max(1, Math.abs(parseInt(width) || 0));
  height = Math.max(1, Math.abs(parseInt(height) || 0));

  let world = {
    id,
    name,
    width,
    height,
    cells: [{x:0, y:0, data:new Array(width * height).fill(-1)}],
    spawns: []
  };

  editor.changes.push([
    () => {
      project.data.worlds.push(world);
      displayWorldButtons(editor, project);
    },
    () => {
      project.data.worlds.pop();
      displayWorldButtons(editor, project);
    }
  ]);
}


function openWorld(editor, project, world) {
  editor.open(project, world);
}


/**
 * TILES
 **/


function toggleTile(editor, thumbs, index, multi) {
  editor.toggleTile(index, multi);

  for (let thumb of thumbs) {
    thumb.classList.remove("selected");
  }

  for (let index of editor.tiles) {
    thumbs[index].classList.add("selected");
  }
}


/**
 * SPAWNS
 **/


(function () {
  canvas.addEventListener("pointerdown", pointerdown);

  let spawn = undefined;

  function pointerdown(ev) {
    if (toolType.value == "_spawns" && (ev.button == 0 && !ev.shiftKey)) {
      let point = editor.state.matrix.inverse().transformPoint(new DOMPoint(ev.x, ev.y));

      spawn = editor.state.world.spawns.find(spawn => {
        let creature = project.data.creatures.find(creature => creature.id == spawn.creatureId);
        let width = creature?.width ?? 1;
        let height = creature?.height ?? 1;

        return (point.x > spawn.x && point.x < spawn.x + width && point.y > spawn.y && point.y < spawn.y + height);
      });

      if (!spawn) {
        spawn = {
          creatureId: spawnCreatureId.value,
          x: Math.floor(point.x),
          y: Math.floor(point.y),
          chanceDay: (spawnChanceDay.valueAsNumber || 0) / 100,
          chanceNight: (spawnChanceNight.valueAsNumber || 0) / 100
        };

        editor.state.world.spawns.push(spawn);
        contextPossiblyUnsaved = true;
        onChange();
      }

      selectSpawn(spawn);

      canvas.addEventListener("pointermove", pointermove);
      canvas.addEventListener("pointerup", pointerup);
      canvas.addEventListener("lostpointercapture", lostpointercapture);
    }
  }

  function pointermove(ev) {
    let point = editor.state.matrix.inverse().transformPoint(new DOMPoint(ev.x, ev.y));

    spawn.x = Math.floor(point.x);
    spawn.y = Math.floor(point.y);
    contextPossiblyUnsaved = true;
    onChange();

    selectSpawn(spawn);
  }

  function pointerup() {
    canvas.removeEventListener("pointermove", pointermove);
    canvas.removeEventListener("pointerup", pointerup);
    canvas.removeEventListener("lostpointercapture", lostpointercapture);
  }

  function lostpointercapture() {
    canvas.removeEventListener("pointermove", pointermove);
    canvas.removeEventListener("pointerup", pointerup);
    canvas.removeEventListener("lostpointercapture", lostpointercapture);
  }
})();


function selectSpawn(spawn) {
  editor.spawn = spawn;
  spawnCreatureId.value = spawn ? spawn.creatureId : "";
  spawnX.value = spawn ? spawn.x : "";
  spawnY.value = spawn ? spawn.y : "";
  spawnChanceDay.value = spawn ? spawn.chanceDay * 100 : "";
  spawnChanceNight.value = spawn ? spawn.chanceNight * 100 : "";
}


function deleteSpawn() {
  if (editor.spawn) {
    if (confirm("Are you sure? This action can't be undone")) {
      let spawns = editor.state.world.spawns;

      spawns.splice(spawns.indexOf(editor.spawn), 1);
      selectSpawn(undefined);
      contextPossiblyUnsaved = true;
      onChange();
    }
  }
}


/**
 * PROJECT
 **/


async function openLastProject() {
  let storage = await idb.get("cloak-editor") || {};
  let folder = storage.folder;

  if (!folder) return alert("Unable to find the last project, try using 'Open New Project'");

  await openProjectIn(folder);
}


async function openNewProject() {
  let folder = await showDirectoryPicker();

  await openProjectIn(folder);
}


async function saveProject() {
  let folder = project.folder;
  let data = project.data;
  let resources = project.resources;

  data = JSON.parse(JSON.stringify(data));

  processDataOutput(data);

  data.worlds.forEach(world => {
    world.chunks.forEach(chunk => {
      chunk.data = `{wrap}[${chunk.data}]{/wrap}`;
    });
  });

  // NOTE: Text represents only the "worlds" property of the data object,
  // as we are choosing specfically only to write the worlds output.
  let text = JSON.stringify(data.worlds, undefined, 2);

  text = text.split("\"{wrap}").join("").split("{/wrap}\"").join("");

  let file = await folder.getFileHandle("worlds.json");
  let writable = await file.createWritable();

  await writable.write(text);
  await writable.close();

  /*
  // BEGIN EXPORT DEBUG GAME CACHE
  file = await folder.getFileHandle("cache.js", {create:true});
  writable = await file.createWritable();
  await writable.write(function () {
    let components = [];

    components.push(`document.body.append(function () {
  let script = document.createElement("script");

  script.id = "content.yml";

  script.type = "text/plain";

  script.textContent = ${JSON.stringify(text)};

  return script;
} ());`);

    resources.images.forEach((image, index) => {
      let node = data.images[index];

      components.push(`document.body.append(function () {
  let image = document.createElement("img");

  image.id = ${JSON.stringify("images/" + node.name + ".png")};

  image.hidden = true;

  image.src = ${JSON.stringify(image.src)};

  return image;
} ());`);
    });

    return components.join("\n\n\n")
  } ());
  await writable.close();
  // END EXPORT DEBUG GAME CACHE
  */

  contextPossiblyUnsaved = false;

  editor.markSaved();
  onChange();
}


async function openProjectIn(folder) {
  if (await folder.requestPermission({mode: "read"}) != "granted") {
    return;
  }

  await idb.update("cloak-editor", (storage = {}) => {
    storage.folder = folder;
    return storage;
  });

  let data = await fetchCloakData(folder);

  processDataInput(data);
  
  let resources = await fetchCloakResources(folder, data);

  let project = {folder, data, resources};

  Object.defineProperty(window, "project", {value: project});

  displayProject(editor, project);
}


function processDataInput(data) {
  for (let image of data.images) {
    image.name = image.id;
    image.sprites = [];

    for (let sprite of data.sprites) {
      if (sprite.image == image.id) {
        image.sprites.push(sprite);
      }
    }

    image.width = image.sprites[0].width;
    image.height = image.sprites[0].height;

    image.sprites.sort((a, b) => a.x > b.x ? 1 : a.x == b.x ? 0 : -1).sort((a, b) => a.y > b.y ? 1 : a.y == b.y ? 0 : -1);
    image.sprites = image.sprites.map(sprite => sprite.id);
    
    delete image.id;
    delete image.path;
  }

  for (let tile of data.tiles) {
    tile.sprite = tile.sprites[0];
  }

  for (let world of data.worlds) {
    world.width = 32;
    world.height = 32;
    world.cells = world.chunks;

    for (let cell of world.cells) {
      cell.x *= 32;
      cell.y *= 32;

      for (let [i, index] of cell.data.entries()) {
        let tileId = world.tilePalette[index];
        let tile = data.tiles.findIndex(tile => tile.id == tileId);

        cell.data[i] = tile;
      }
    }
    
    // delete world.chunks;
  }
}


function processDataOutput(data) {
  for (let image of data.images) {
    image.id = image.name;
    image.path = `images/${image.name}.png`;
    delete image.name;
    delete image.width;
    delete image.height;
    delete image.sprites;
  }

  for (let tile of data.tiles) {
    delete tile.sprite;
  }

  let pitTile = data.tiles.findIndex(tile => tile.id == "pit");

  if (!pitTile) {
    console.log("UNABLE TO LOCATE PIT TILE");
  }

  for (let world of data.worlds) {
    let emptyCells = [];

    for (let cell of world.cells) {
      let empty = true;

      cell.x /= 32;
      cell.y /= 32;

      for (let [i, tileIndex] of cell.data.entries()) {
        let tile = tileIndex == -1 ? pitTile : data.tiles[tileIndex];
        let index = world.tilePalette.indexOf(tile.id);

        if (tile.id != "pit") {
          empty = false;
        }

        if (index == -1) {
          world.tilePalette.push(tile.id);
          index = world.tilePalette.length - 1;
        }

        cell.data[i] = index;
      }

      if (empty) {
        emptyCells.push(cell);
      }
    }

    while (emptyCells.length) {
      world.cells.splice(world.cells.indexOf(emptyCells.pop()), 1);
    }

    world.chunks = world.cells;
    delete world.cells;
    delete world.width;
    delete world.height;
  }
}