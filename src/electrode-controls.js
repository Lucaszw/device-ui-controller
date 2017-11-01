const $ = require('jquery');
const _ = require('lodash');
const Key = require('keyboard-shortcut');
const Two = require('two.js'); const two = new Two();
const THREE = require('three');
const THREEx = {}; require('threex-domevents')(THREE, THREEx);

const RenderSVG = require('./svg-renderer');

const DEFAULT_TIMEOUT = 5000;
const DIRECTIONS = {LEFT: "left", UP: "up", DOWN: "down", RIGHT: "right"};
const MAX_DISTANCE = 0.5;
const NEIGHBOUR_COLOR = "rgb(144, 210, 235)";
const OFF_COLOR = "rgb(144, 217, 242)";
const ON_COLOR = "rgb(245, 235, 164)";
const SELECTED_COLOR = "rgb(120, 255, 168)";
const SVG_SAMPLE_LENGTH = 30;

FindNearestIntersectFromEdge = function(objName, point, direction,
  collisionObjects) {
  /* Find neighbour of an object along an edge normal to the rays direction */
  /*  objName: name of currentObject
      point: any point inside currentObject (changes start location along edge)
      direction: direction towards edge
      collisionObjects: list of possible objects to collide with
  */

  // Cast ray in direction (to find the edge)
  const raycaster = new THREE.Raycaster();
  raycaster.set(point, direction);

  // Filter the intersections for that of the current object (from objName);
  var intersects = raycaster.intersectObjects( collisionObjects , true);

  var start = _.filter(intersects, {object: {parent: {name: objName}}})[0];
  if (!start) return undefined;

  // Cast another ray from the objects edge, ignoring starting object
  raycaster.set(start.point, direction);
  var intersects = raycaster.intersectObjects( collisionObjects , true);
  _.remove(intersects, {distance: 0});

  // Return object with smallest distance from start object
  const intersect = _.min(intersects, "distance");
  if (!intersect) return undefined;
  if (intersect.distance > MAX_DISTANCE) return undefined;
  return intersect;
}

FindIntersectsInDirection = function(obj, dir, collisionObjects ) {
  /* Get all neighbouring objects around an objects axis*/
  let direction;
  if (dir == DIRECTIONS.RIGHT) direction = new THREE.Vector3(1,0,0);
  if (dir == DIRECTIONS.LEFT)  direction = new THREE.Vector3(-1,0,0);
  if (dir == DIRECTIONS.UP)    direction = new THREE.Vector3(0,1,0);
  if (dir == DIRECTIONS.DOWN)  direction = new THREE.Vector3(0,-1,0);

  // Get the origin of the selected electrode (accounting for displacement)
  const origin = new THREE.Vector3();
  origin.setFromMatrixPosition( obj.matrixWorld );

  obj.geometry.computeBoundingBox();
  const bbox   = obj.geometry.boundingBox;
  const width  = bbox.max.x - bbox.min.x;
  const height = bbox.max.y - bbox.min.y;

  const numSteps = 50;
  const intersects = {};

  var point = origin.clone();
  var n = obj.parent.name;

  if (direction.y == 0) {
    point.y -= height/2;
    var step = height/numSteps;
    for (var i=0;i<numSteps;i++) {
      point.y += step;
      const intersect = FindNearestIntersectFromEdge(n, point, direction,
        collisionObjects);
      if (!intersect) continue;
      const uuid = intersect.object.uuid;
      intersects[uuid] = intersect;
    }
  }
  else if (direction.x == 0) {
    point.x -= width/2;
    var step = width/numSteps;
    for (var i=0;i<numSteps;i++) {
      point.x += step;
      const intersect = FindNearestIntersectFromEdge(n, point, direction,
        collisionObjects);
      if (!intersect) continue;
      const uuid = intersect.object.uuid;
      intersects[uuid] = intersect;
    }
  }
  return _.values(intersects);
}

class ElectrodeControls {
  constructor(scene, camera, renderer, filename='default.svg') {
    this.selectedElectrode = null;
    this.handlers = { click: _.noop, down: _.noop, up: _.noop, over: _.noop };

    Key("left", () => this.move(DIRECTIONS.LEFT));
    Key("right", () => this.move(DIRECTIONS.RIGHT));
    Key("up", () => this.move(DIRECTIONS.UP));
    Key("down", () => this.move(DIRECTIONS.DOWN));

    RenderSVG(filename, scene, camera, renderer, this.handlers)
      .then((d) =>{this.electrodeObjects = d;});

    this.handlers.click = this.electrodeClicked.bind(this);
  }

  move(dir='right') {
    if (!this.selectedElectrode) return;
    const electrodeId = this.selectedElectrode.name;
    const neighbour = this.findNeighbour(dir, electrodeId);
    if (!neighbour) return;
    this.selectElectrode(neighbour.electrodeId);
  }

  findNeighbour(dir='right', electrodeId) {
    /* Find neighbours of given electrode */
    let obj = this.electrodeObjects[electrodeId];
    const collisionObjects = _.map(_.values(this.electrodeObjects), "fill");

    // If the user didn't pass in an electrode, use the selectedElectrode
    if (!electrodeId && this.selectedElectrode)
      obj = this.selectedElectrode;

    const intersects = FindIntersectsInDirection(obj.fill, dir, collisionObjects);
    // Use first intersect for now:
    const intersect = intersects[0];
    if (!intersect) return undefined;

    const neighbour = new Object();
    neighbour.distance = intersect.distance;
    neighbour.electrodeObject = intersect.object.parent;
    neighbour.electrodeId = neighbour.electrodeObject.name;
    return neighbour;
  }

  _clearNeighbourColors() {
    /* Re-color electrode with NEIGHBOUR_COLOR to OFF_COLOR */
    const c = new THREE.Color(NEIGHBOUR_COLOR);
    const n = _.filter(this.electrodeObjects, {fill:{material:{color: c}}});
    for (const [i, obj] of n.entries()) {
      obj.fill.material.color = new THREE.Color(OFF_COLOR);
    }
  }

  selectElectrode(electrodeId) {
    /* Change the electrode currently being tracked*/

    // Reset the fill color of neighbours
    this._clearNeighbourColors();

    // Reset the fill color of the previously selected electrode
    if (this.selectedElectrode) {
      this.selectedElectrode.fill.material.color = new THREE.Color(OFF_COLOR);
      this.selectedElectrode.on = false;
    }

    // Turn on and color the selected electrode
    const electrodeObject = this.electrodeObjects[electrodeId];
    electrodeObject.on = true;
    electrodeObject.fill.material.color = new THREE.Color(SELECTED_COLOR);
    this.selectedElectrode = electrodeObject;

    // Darken the neighbour electrodes
    for (const [k, dir] of Object.entries(DIRECTIONS)) {
      const neighbour = this.findNeighbour(dir);
      if (!neighbour) continue;
      if (neighbour.electrodeObject.on == true) continue;
      const material = neighbour.electrodeObject.fill.material;
      material.color = new THREE.Color(NEIGHBOUR_COLOR);
    }
  }

  electrodeClicked(event) {
    /* Called when electrode object is clicked */
    const electrodeObject = this.electrodeObjects[event.target.name];

    // If shiftKey is down, unset selected electrode
    if (event.origDomEvent.shiftKey == true && this.selectedElectrode) {
      this.selectedElectrode.on = false;
      this.selectedElectrode.fill.material.color = new THREE.Color(OFF_COLOR);
      this.selectedElectrode = null;
      this._clearNeighbourColors();
    }

    // Toggle the state of the target electrode
    if (event.target.on) {
      electrodeObject.on = false;
      electrodeObject.fill.material.color = new THREE.Color(OFF_COLOR);

      // If turning off selected electroed, then also unset & clear neighbours
      if (this.selectedElectrode){
        if (electrodeObject.name == this.selectedElectrode.name) {
          this.selectedElectrode = null;
          this._clearNeighbourColors();
        }
      }
    } else {
      electrodeObject.on = true;
      electrodeObject.fill.material.color = new THREE.Color(ON_COLOR);
    }

    // If shift was pressed, select the target electrode
    if (event.origDomEvent.shiftKey == true) {
      this.selectElectrode(electrodeObject.name);
    }
  }

}

module.exports = ElectrodeControls;
