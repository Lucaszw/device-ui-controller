const DEFAULT_TIMEOUT = 5000;
const SVG_SAMPLE_LENGTH = 30;

const $ = require('jquery');
const _ = require('lodash');
// window.decomp = require('poly-decomp');
// XXX: pathseg: Drop in replacement for 'segs.numberOfItems undefined';
const decomp = require('poly-decomp');
const pathseg = require('pathseg');

const {parse} = require('svg-transform-parser');
const Matter = require('matter-js');

// Matter.js aliases
const Engine = Matter.Engine,
    Render = Matter.Render,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body,
    Vertices = Matter.Vertices,
    Svg = Matter.Svg;

window.Svg = Svg;
window.$ = $;

window.readFile = (url, timeout=DEFAULT_TIMEOUT) => {
  /* Read file from local url */
  return new Promise((resolve, reject) => {
    $.get(url).done((data) => {
        resolve(data);
    });
    setTimeout(()=> {reject(["timeout", timeout])}, timeout);
  });
}

class DeviceUIController {
  constructor() {
    this.engine = Engine.create();
    this.renderer = Render.create({
        element: document.body,
        engine: this.engine,
        options: {
          wireframes: false,
          background: "rgb(236, 236, 236)"
        }
    });
  }
  async render(url='default2.svg') {
    // Read svg file
    const file = await readFile(url);
    let width  = parseFloat($(file).find('svg').attr("width"));
    let height = parseFloat($(file).find('svg').attr("height"));
    const ratio = width/height;
    window.ratio = ratio;
    window.file = file;

    // Get all paths as array
    const paths = $(file).find('path');
    console.log("paths", paths);
    // Generate Matter.js body (parts) for each svg path
    const parts = new Array();
    for (const [i, path] of [...paths].entries()){
      const vertices = Svg.pathToVertices(path, SVG_SAMPLE_LENGTH);
      const mean = Vertices.mean(vertices);
      const label = path.getAttribute("channels");
      _.each(vertices, v => {v.x -= mean.x, v.y -= mean.y});

      const part = Bodies.fromVertices(mean.x, mean.y, vertices, {
        render: {
          fillStyle: "rgb(16, 159, 179)",
          strokeStyle: "black",
          lineWidth: 1
        },
        isStatic: true,
        label: label
      });
      parts.push(part);
    }

    // Construct Matter.js body (device) from all the parts
    const body = Body.create({parts: parts})
    console.log("Body", body);
    console.log("Parts", parts);

    const g = $(file).find('g')[0];
    if (g.getAttribute("transform")){
      // Apply transformations from svg file
      const transforms = parse(g.getAttribute("transform"));
      Body.rotate(body, transforms.rotate.angle*Math.PI/180);
      // Body.translate(body, {
      //   x: transforms.translate.tx,
      //   y: transforms.translate.ty
      // });
      // Body.scale(body, transforms.scale.sx, transforms.scale.sy);
    }
    width  = body.bounds.max.x - body.bounds.min.x;
    height = body.bounds.max.y - body.bounds.min.y;

    const containerWidth  = $(deviceController.renderer.canvas).width();
    const containerHeight = $(deviceController.renderer.canvas).height();
    Body.scale(body, containerWidth/width, containerHeight/height);

    Body.translate(body, {
      x: containerWidth/2 - width/2,
      y: containerHeight/2 - height/2
    });
    // Add to world
    World.add(this.engine.world, body);
    Render.run(this.renderer);
  }

}

module.exports = DeviceUIController;
