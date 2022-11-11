class CloakHelper {
  static async fetchProject(folder) {
    let file = await folder.getFileHandle("content.yml");
    let fileBlob = await file.getFile();
    let fileText = await fileBlob.text();
    let data = YAML.parse(fileText);
    let images = await this.fetchImages(folder, data);
    let spriteColors = this.generateSpriteColors(data, images);

    data = this.migrateProject(data);

    return {data, resources: {images, spriteColors}};
  }

  static async fetchImages(folder, data) {
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

  static blobAsDataURL(blob) {
    return new Promise(function (resolve, reject) {
      let reader = new FileReader();

      reader.onload = function (ev) {
        resolve(ev.target.result);
      };

      reader.onerror = function (ev) {
        reject();
      };

      reader.readAsDataURL(blob);
    });
  }

  static imageFromPath(path) {
    return new Promise(function (resolve, reject) {
      let image = new Image();

      image.onload = function (ev) {
        resolve(this);
      };

      image.onerror = function (ev) {
        reject();
      };

      image.src = path;
    });
  }

  static generateSpriteColors(data, images) {
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
          node.height);
      }
    }

    return colors;
  }

  static migrateProject(data) {
    if (!data.worlds.length || !Array.isArray(data.worlds[0].tiles)) {
      return data;
    }

    for (let world of data.worlds) {
      for (let cell of world.cells) {
        cell.data = this.decodeCellData(cell.data);

        for (let [index, value] of cell.data.entries()) {
          if (value != -1) {
            let tileId = world.tiles[value];
            let tileIndex = data.tiles.findIndex(tile => tile.id == tileId);

            if (tileIndex == -1) {
              throw new Error("unable to find corresponding tile while converting cloak legacy format");
            }

            cell.data[index] = tileIndex;
          }
        }
      }

      delete world.tiles;
    }

    return data;
  }

  static decodeCellData(str) {
    let chars = "!#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~".split("");
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
}