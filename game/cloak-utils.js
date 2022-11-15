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