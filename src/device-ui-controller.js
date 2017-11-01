const $ = require('jquery'); window.$ = $;
const _ = require('lodash'); window._ = _;
const THREE = require('three'); window.THREE = THREE;
const OrbitControls = require('three-orbit-controls')(THREE)

const ElectrodeControls = require('./electrode-controls');
const RouteControls = require('./route-controls');

window.electrodeControls = null;
window.electrodeObjects = null;
window.camera = null;
window.controls = null;
window.renderer = null;
window.routeControls = null;
window.scene = null;

var options = { enableControls: false };

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
  renderer.setClearColor( 0xffffff, 1 );

  function animate() {
    requestAnimationFrame( animate.bind(this) );
    renderer.render( scene, camera );
  }
  electrodeControls = new ElectrodeControls(scene, camera,
    renderer, 'default.svg');

  routeControls = new RouteControls(scene, camera, electrodeControls);

  animate();
}

module.exports = init;
