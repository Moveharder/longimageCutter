export default class LongimageCutter {
  constructor({ dpr, watermark = {}, success, fail }) {
    this.canvas = null;
    this.ctx = null;
    this.imageInfo = {};
    this.dpr = dpr || window.devicePixelRatio;
    this.watermarkConfig = watermark || {};
    this.success = typeof success == "function" ? success : (res) => {};
    this.fail = typeof fail == "function" ? fail : (err) => {};

    this.createCanvas();
  }

  createCanvas(container, width, height) {
    // this.canvas = document.querySelector(container);
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    // this.ctx.imageSmoothingEnabled = false; //关闭抗锯齿
    // let winWidth = window.innerWidth;
    // let winHeight = window.innerHeight;

    // this.canvas.width = `${(width || winWidth) * this.dpr}`;
    // this.canvas.height = `${(height || winHeight) * this.dpr}`;

    // this.canvas.style.width = `${width || winWidth}px`;
    // this.canvas.style.height = `${height || winHeight}px`;

    // document.body.appendChild(this.canvas);
  }

  loadImage(src) {
    return new Promise((resolve, reject) => {
      let img = new Image();
      img.crossOrigin = "Anonymous"; //解决跨域图片问题
      img.onload = (e) => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          whRatio: (img.naturalWidth / img.naturalHeight).toFixed(2) * 1,
          hwRatio: (img.naturalHeight / img.naturalWidth).toFixed(2) * 1,
        });
      };
      img.onerror = (err) => {
        reject(err);
      };
      img.src = src;

      this.image = img;
    });
  }

  addWatermark({
    content,
    x,
    y,
    font = "20px italic bold cursive",
    color = "black",
  }) {
    try {
      if (!content) {
        return;
      }
      this.ctx.font = font;
      let textWidth = this.ctx.measureText(content).width;
      let centerX = (this.canvas.width - textWidth) / 2; //水平居中
      let rightX = this.canvas.width - textWidth - 10;
      let rightY = this.canvas.height - 10;

      this.ctx.fillStyle = color;
      this.ctx.fillText(content, rightX, rightY);
      this.ctx.fillStyle = "lightgray";
      this.ctx.fillText(content, rightX - 2, rightY - 3);
    } catch (err) {
      this.fail(err);
    }
  }

  async clipImage(clipFrames = [], filename) {
    for (let i = 0; i < clipFrames.length; i++) {
      let { sx, sy, sw, sh, x, y, w, h } = clipFrames[i];
      this.canvas.style.height = `${h / this.dpr}px`; //style.height 需为放大dpr之前的height
      this.canvas.height = `${h}`;

      await this.sleep(500);
      this.ctx.drawImage(this.image, sx, sy, sw, sh, x, y, w, h);
      this.addWatermark(this.watermarkConfig);

      await this.sleep(100);
      this.saveImage(`${filename}_${i}`);
    }

    this.success(clipFrames);
  }

  saveImage(filename) {
    try {
      this.canvas.toBlob((blob) => {
        this.saveAsBlob(blob, filename);
      });
    } catch (err) {
      this.fail(err);
    }
  }

  saveAsBlob(blob, filename) {
    if (window.navigator.msSaveOrOpenBlob) {
      navigator.msSaveBlob(blob, filename);
    } else {
      const link = document.createElement("a");
      const body = document.querySelector("body");

      link.href = window.URL.createObjectURL(blob);
      link.download = filename;

      // fix Firefox
      link.style.display = "none";
      body.appendChild(link);

      try {
        link.click();
      } catch (err) {
        alert(err);
      }
      body.removeChild(link);

      window.URL.revokeObjectURL(link.href);
    }
  }

  sleep(ms = 1000) {
    return new Promise((resolve) => {
      setTimeout(() => {
        return resolve();
      }, ms);
    });
  }

  async pipeTask({ src = "", width, height = 300, filename = "cliped_img" }) {
    let imgInfo = {};
    try {
      // 1加载网络图片，获取图片尺寸信息
      this.imageInfo = imgInfo = await this.loadImage(src);

      this.canvas.width = `${(width || imgInfo.width) * this.dpr}`;
      this.canvas.height = `${height}`;
      this.canvas.style.width = `${width || imgInfo.width}px`;
      this.canvas.style.height = `${height}px`;

      document.body.appendChild(this.canvas);

      // 2根据指定配置，计算每次裁切的尺寸画布位置信息，生成裁切配置数组
      let clipImgFrames = [];
      let framesLen = Math.ceil(imgInfo.height / height);
      let lastFrameHeight = Math.ceil(imgInfo.height % height);

      for (let i = 0; i < framesLen; i++) {
        let sy = i * height;
        let sw = width || imgInfo.width;
        let sh = i == framesLen - 1 ? lastFrameHeight : height;
        clipImgFrames.push({
          sx: 0, //裁剪的x坐标
          sy: sy, //裁剪的y坐标
          sw: sw, //裁剪的宽度
          sh: sh, //裁剪的高度

          x: 0,
          y: 0,
          w: sw * this.dpr, //绘制到canvas上的宽度
          h: sh * this.dpr, //绘制到canvas上的高度
        });
      }

      // 3根据裁切配置数组，依次裁切，并保存为图片到本地
      this.clipImage(clipImgFrames, filename);

      // test
      //   let index = 14;
      //   let { sx, sy, sw, sh, x, y, w, h } = clipImgFrames[index];
      //   this.canvas.height = `${h * this.dpr}`;
      //   this.canvas.style.height = `${h}px`;
      //   this.ctx.drawImage(this.image, sx, sy, sw, sh, x, y, w, h);
      //   this.saveImage(`cliped_img_${index}`);
    } catch (err) {
      this.fail(err);
    }
  }
}
