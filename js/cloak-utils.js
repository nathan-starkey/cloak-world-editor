function drawCloakSprite(context, project, spriteName, x, y, width, height, color) {
  let spriteIndex;
  let imageIndex = project.data.images.findIndex(node => (spriteIndex = node.sprites.indexOf(spriteName)) != -1);

  if (imageIndex == -1) {
    context.fillStyle = "red";
    context.fillRect(x, y, width, height);
    return;
  }
  
  if (color) {
    context.fillStyle = project.resources.colors[spriteName];
    context.fillRect(x, y, width, height);
    return;
  }

  let imageNode = project.data.images[imageIndex];
  let image = project.resources.images[imageIndex];
  let spriteWidth = imageNode.width;
  let spriteHeight = imageNode.height;
  let spriteX = (spriteIndex * spriteWidth) % image.width;
  let spriteY = Math.floor(spriteIndex * spriteWidth / image.width) * spriteHeight;

  context.drawImage(image, spriteX, spriteY, spriteWidth, spriteHeight, x, y, width, height);
}


async function fetchCloakData(folder) {
  let file = await folder.getFileHandle("content.json");
  let fileBlob = await file.getFile();
  let fileText = await fileBlob.text();

  return JSON.parse(fileText);
}


function generateCloakColors(data, images) {
  let colors = {};
  let canvas = document.createElement("canvas");
  let context = canvas.getContext("2d", {willReadFrequently: true});

  for (let imageIndex = 0; imageIndex < images.length; ++imageIndex) {
    let node = data.images[imageIndex];
    let image = images[imageIndex];

    for (let spriteIndex = 0; spriteIndex < node.sprites.length; ++spriteIndex) {
      let name = node.sprites[spriteIndex];

      colors[name] = getAverageColor(context, image,
        (spriteIndex * node.width) % image.width,
        Math.floor(spriteIndex * node.width / image.width) * node.height,
        node.width,
        node.height, !highContrast);
    }
  }

  return colors;
}


function generateCloakThumbs(data, images) {
  let thumbs = {};
  
  for (let imageIndex = 0; imageIndex < images.length; ++imageIndex) {
    let node = data.images[imageIndex];
    let image = images[imageIndex];

    for (let spriteIndex = 0; spriteIndex < node.sprites.length; ++spriteIndex) {
      let name = node.sprites[spriteIndex];

      thumbs[name] = cropImage(image,
        (spriteIndex * node.width) % image.width,
        Math.floor(spriteIndex * node.width / image.width) * node.height,
        node.width,
        node.height, 5);
    }
  }
  
  
  return thumbs;
}


async function fetchCloakImages(folder, data) {
  folder = await folder.getDirectoryHandle("images");

  let images = [];

  for (let node of data.images) {
    let name = node.name + ".png";
    let file = await folder.getFileHandle(name);
    let blob = await file.getFile();

    images.push(await this.imageFromPath(await this.blobAsDataURL(blob)));
  }

  return images;
}


async function fetchCloakResources(folder, data) {
  let resources = {};

  resources.images = await fetchCloakImages(folder, data);
  resources.colors = generateCloakColors(data, resources.images);
  resources.thumbs = generateCloakThumbs(data, resources.images);

  return resources;
}


function encodeCloakCellData(data) {
  let runs = [];
  let spots = [];

  for (let i = 0; i < data.length; ++i) {
    let n = data[i] + 1;

    if (i !=0 && n == runs[runs.length - 2]) {
      ++runs[runs.length - 1];
    } else {
      runs.push(n, 1);
    }
  }

  let intArr = [runs.length / 2, ...runs, spots.length, ...spots];

  function serializeIntArray(arr, offset) {
    let chars = "!#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~".split("");
    let min = 0;
    let max = chars.length - 1;
    let str = "";

    for (let i = 0; i < arr.length; ++i) {
      let n = arr[i] - offset + min;

      if (n < min) {
        n = min;
      }

      while (n >= max) {
        n -= (max - min);
        str += chars[max];
      }

      str += chars[n];
    }

    return str;
  }

  return serializeIntArray(intArr, 0);
}


function decodeCloakCellData(str) {
  let intArr = deserializeIntArray(str, 0);
  let runsCount = intArr[0];
  let spotsCount = intArr[1 + runsCount * 2];
  let data = [];

  for (let i = 0; i < runsCount; ++i) {
    let n = intArr[1 + i * 2] - 1;
    let count = intArr[2 + i * 2];

    for (let j = 0; j < count; ++j) {
      data.push(n);
    }
  }

  function deserializeIntArray(str, offset) {
    let chars = "!#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~".split("");
    let min = 0;
    let max = chars.length - 1;
    let arr = [];
    let accum = 0;

    for (let i = 0; i < str.length; ++i) {
      let chr = str[i];
      let chrN = chars.indexOf(chr);
      let n = chrN - min + offset;

      if (chrN == max) {
        accum += (max - min);
      } else if (accum != 0) {
        arr.push(accum + n);
        accum = 0;
      } else {
        arr.push(n);
      }
    }

    return arr;
  }

  return data;
}