async function blobAsDataURL(blob) {
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


async function imageFromPath(path) {
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


function getAverageColor(context, img, sx, sy, sw, sh, includeAlpha = false) {
  context.canvas.width = sw;
  context.canvas.height = sh;

  context.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

  let data = context.getImageData(0, 0, sw, sh).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;

  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n += data[i + 3] / 255;
  }
  
  n = includeAlpha ? data.length / 4 : n;

  if (n == 0) return "rgb(0, 0, 0)";

  r = parseInt(r / n);
  g = parseInt(g / n);
  b = parseInt(b / n);

  return rgbToHex(r, g, b);
  
  // return `rgb(${parseInt(r)},${parseInt(g)},${parseInt(b)})`
}


function cropImage(image, sx, sy, sw, sh, scale = 1) {
  let context = document.createElement("canvas").getContext("2d");
  
  context.canvas.width = sw * scale;
  context.canvas.height = sh * scale;
  context.imageSmoothingEnabled = false;
  context.drawImage(image, sx, sy, sw, sh, 0, 0, sw * scale, sh * scale);
  
  return context.canvas;
}


function rgbToHex(r, g, b) {
  let chars = "0123456789ABCDEF";
  
  return "#" +
    chars[parseInt(r / 16)] + chars[r % 16] +
    chars[parseInt(g / 16)] + chars[g % 16] +
    chars[parseInt(b / 16)] + chars[b % 16];
}