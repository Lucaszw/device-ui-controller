const $ = require('jquery'); window.$ = $;
require('jquery-contextmenu');
require('style-loader!css-loader!jquery-contextmenu/dist/jquery.contextMenu.css');

const _ = require('lodash'); window._ = _;
const dat = require('dat.gui/build/dat.gui'); window.dat = dat;
const THREE = require('three'); window.THREE = THREE;
const OrbitControls = require('three-orbit-controls')(THREE)

const ElectrodeControls = require('./electrode-controls');
const {RouteControls, GenerateRoute} = require('./route-controls');


window.electrodeControls = null;
window.electrodeObjects = null;
window.camera = null;
window.controls = null;
window.renderer = null;
window.routeControls = null;
window.scene = null;
window.GenerateRoute = GenerateRoute;

const init = async() => {

  // Create ThreeJS scene
  const bbox = document.body.getBoundingClientRect();
  const aspect = bbox.width / bbox.height;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera( 75, aspect, 0.1, 1000 );
  controls = new OrbitControls(camera);
  controls.enableKeys = false;
  controls.enableRotate = false;
  controls.enablePan = false;

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  electrodeObjects = null;
  document.body.appendChild( renderer.domElement );

  camera.position.z = 100;
  renderer.setSize( bbox.width, bbox.height );
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor( "rgb(55, 55, 55)", 1 );

  function animate() {
    requestAnimationFrame( animate.bind(this) );
    renderer.render( scene, camera );
  }
  electrodeControls = new ElectrodeControls(scene, camera,
    renderer, 'default.svg');

  routeControls = new RouteControls(scene, camera, electrodeControls);

  // Generate Context Menu
  $.contextMenu({
      selector: 'body',
      callback: function(key, options) {
          var m = "clicked: " + key;
          window.console && console.log(m) || alert(m);
      },
      items: {
          clearElectrodes: {name: "Clear Electrodes"},
          "sep1": "---------",
          clearRoute: {name: "Clear Route"},
          executeRoute: {name: "Execute Route"},
          "sep2": "---------",
          clearRoutes: {name: "Clear Routes"},
          executeRoutes: {name: "Execute Routes"}
      }
  });

  // Dat.Gui
  const gui = new dat.GUI();
  gui.add(controls, 'enableRotate');

  animate();
}

module.exports = init;
