let editor = new WorldEditor(onChange);
let canvas = document.getElementById("canvas");
let context = canvas.getContext("2d");
let highContrast = false;
let showSpawns = true;
let colorMode = false;
let showGrid = 1;


draw();


/**
 * EDITOR
 **/


window.addEventListener("beforeunload", ev => {
  if (!editor.saved()) {
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
  saveBtn.disabled = false; // editor.saved();
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
  
  for (let tile of project.data.tiles) {
    let index = project.data.tiles.indexOf(tile);
    let thumb = project.resources.thumbs[tile.sprite];
    
    thumbs.push(thumb);
    thumb.title = tile.name +
      "\nSolid: " + tile.solid +
      "\nOpaque: " + tile.opaque;
    
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
        if (!creature) return;
        
        return (point.x > spawn.x && point.x < spawn.x + creature.width && point.y > spawn.y && point.y < spawn.y + creature.height);
      });
      
      if (!spawn) return;
      
      editor.spawn = spawn;
      
      canvas.addEventListener("pointermove", pointermove);
      canvas.addEventListener("pointerup", pointerup);
      canvas.addEventListener("lostpointercapture", lostpointercapture);
    }
  }
  
  function pointermove(ev) {
    let point = editor.state.matrix.inverse().transformPoint(new DOMPoint(ev.x, ev.y));
    
    spawn.x = Math.floor(point.x);
    spawn.y = Math.floor(point.y);
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

  let text = YAML.stringify(data);

  let file = await folder.getFileHandle("content.yml");
  let writable = await file.createWritable();

  await writable.write(text);
  await writable.close();

  editor.markSaved();
  onChange();
}


async function openProjectIn(folder) {
  if (await folder.requestPermission({mode: "readwrite"}) != "granted") {
    return;
  }

  await idb.update("cloak-editor", (storage = {}) => {
    storage.folder = folder;
    return storage;
  });

  let data = await fetchCloakData(folder);
  let resources = await fetchCloakResources(folder, data);

  processDataInput(data);

  let project = {folder, data, resources};

  Object.defineProperty(window, "project", {value: project});

  displayProject(editor, project);
}


function processDataInput(data) {
  for (let world of data.worlds) {
    for (let cell of world.cells) {
      cell.x *= world.width;
      cell.y *= world.height;
      cell.data = decodeCloakCellData(cell.data);

      for (let [i, value] of cell.data.entries()) {
        if (value == -1) continue;

        let tileId = world.tiles[value];

        cell.data[i] = data.tiles.findIndex(tile => tile.id == tileId);
      }
    }

    delete world.tiles;
  }
}


function processDataOutput(data) {
  for (let world of data.worlds) {
    let emptyCells = [];

    world.tiles = [];

    for (let cell of world.cells) {
      let empty = true;

      for (let [i, value] of cell.data.entries()) {
        if (value == -1) continue;

        empty = false;

        let tileId = data.tiles[value].id;
        let index = world.tiles.indexOf(tileId);

        if (index == -1) index = world.tiles.push(tileId) - 1;

        cell.data[i] = index;
      }

      cell.data = encodeCloakCellData(cell.data);
      cell.x /= world.width;
      cell.y /= world.height;

      if (empty) {
        emptyCells.push(world.cells.indexOf(cell));
      }
    }

    while (emptyCells.length) world.cells.splice(emptyCells.pop(), 1);
  }
}