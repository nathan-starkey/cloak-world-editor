let editor = new WorldEditor(onChange);
let canvas = document.getElementById("canvas");
let context = canvas.getContext("2d");
let savedCommand = undefined;
let highContrast = false;
let showSpawns = true;
let colorMode = false;
let showGrid = 1;


draw();


window.addEventListener("beforeunload", ev => {
  if (editor.changes[editor.changes.length - 1] != savedCommand) {
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
    ev.stopImmediatePropogation();
  } else if ((ev.code == "KeyY" && ev.ctrlKey) || (ev.code == "KeyZ" && ev.ctrlKey && ev.shiftKey)) {
    redoBtn.click();
    ev.preventDefault();
    ev.stopImmediatePropogation();
  } else if (ev.code == "KeyZ" && ev.ctrlKey) {
    undoBtn.click();
    ev.preventDefault();
    ev.stopImmediatePropogation();
  } else if (ev.code == "Tab") {
    sidebar.classList.toggle("collapsed");
    ev.preventDefault();
    ev.stopImmediatePropogation();
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
  saveBtn.disabled = editor.changes[editor.changes.length - 1] == savedCommand;
}


function displayProject() {
  entryForm.hidden = true;
  editorForm.hidden = false;

  worldList.innerHTML = "";

  for (let world of project.data.worlds) {
    let btn = document.createElement("button");

    btn.innerText = world.name;
    btn.onclick = () => editor.open(project, world);
    worldList.append(btn);
  }

  let createWorldbtn = document.createElement("button");

  createWorldbtn.innerText = "Create World";
  worldList.append(createWorldbtn);

  createWorldbtn.onclick = () => {
    let id = prompt("Enter new world ID:");
    if (!id) return;

    let name = prompt("Enter new world name:");
    if (!name) return;

    let width = prompt("Enter new world width", 32);
    if (!width) return;

    let height = prompt("Enter new world height", 32);
    if (!height) return;

    width = Math.max(1, Math.abs(parseInt(width) || 0));
    height = Math.max(1, Math.abs(parseInt(height) || 0));

    let world = {
      id,
      name,
      width,
      height,
      cells: [{x:0,y:0,data:new Array(width * height).fill(-1)}],
      spawns: []
    };

    editor.changes.push([
      () => {
        project.data.worlds.push(world);
        displayProject();
      },
      () => {
        project.data.worlds.pop();
        displayProject();
      }
    ]);
  };

  for (let tile of project.data.tiles) {
    let index = project.data.tiles.indexOf(tile);
    let thumb = project.resources.thumbs[tile.sprite];
    
    thumb.title = tile.name + "\nSolid: " + tile.solid + "\nOpaque: " + tile.opaque;

    thumb.onclick = (ev) => {
      if (ev.shiftKey) {
        if (editor.tiles.includes(index)) {
          thumb.classList.remove("selected");
          editor.tiles.splice(editor.tiles.indexOf(index), 1);
        } else {
          thumb.classList.add("selected");
          editor.tiles.push(index);
        }
      } else {
        for (let el of tileList.querySelectorAll(".selected")) {
          el.classList.remove("selected");
        }

        thumb.classList.add("selected");
        editor.tiles.length = 0;
        editor.tiles.push(index);
      }
    };

    if (thumb) {
      tileList.append(thumb);
    }
  }
}


function displayStats() {
  if (editor.state) {
    let world = editor.state.world;
    
    alert(`${world.name} Stats
Cells: ${world.cells.length}
Spawns: ${world.spawns.length}`);
  }
}


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


async function openLastProject() {
  let storage = await idb.get("cloak-editor") || {};
  let folder = storage.folder;

  if (!folder) return alert("Unable to find the last project, try using 'Open new project'");

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

  savedCommand = editor.changes[editor.changes.length - 1];
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

  displayProject();
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