const $ = require('jquery');
const _ = require('lodash');
const THREE = require('three');

class RouteControls {
  constructor(scene, camera, electrodeControls) {
    electrodeControls.handlers.down = this.mousedown.bind(this);
    electrodeControls.handlers.up = this.mouseup.bind(this);
    electrodeControls.handlers.over = this.mouseover.bind(this);
  }

  mousedown(e) {
    console.log("mousdown", e);
  }

  mouseup(e) {
    console.log("mouseup", e);
  }

  mouseover(e) {
    console.log("mouseover", e);
  }
}

module.exports = RouteControls;
