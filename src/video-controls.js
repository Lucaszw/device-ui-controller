const $ = require('jquery');
const _ = require('lodash');
const _fp = require('lodash/fp');
const THREE = require('THREE');
const THREEx = {}
require('threex.videotexture')(THREE, THREEx);
const PlaneTransform = require('../lib/three.planetransform/three.planetransform')(THREE);
window.THREEx = THREEx;

function GetSize(object) {
  const bbox = new THREE.Box3().setFromObject(object);
  const width = bbox.max.x - bbox.min.x;
  const height = bbox.max.y - bbox.min.y;
  return [width, height];
}

function GenerateAnchors(mesh, scene) {
  const [w, h] = GetSize(mesh);
  const o = new THREE.Vector3();
  o.setFromMatrixPosition( mesh.matrixWorld ).clone();
  const bl = new THREE.Vector3(o.x - w/2, o.y - h/2, o.z+1);
  const tl = new THREE.Vector3(o.x - w/2, o.y + h/2, o.z+1);
  const br = new THREE.Vector3(o.x + w/2, o.y - h/2, o.z+1);
  const tr = new THREE.Vector3(o.x + w/2, o.y + h/2, o.z+1);

  new THREE.CircleBufferGeometry( 10, 8 );
  new THREE.CircleBufferGeometry( 10, 8 );

  const circles = [];
  const geometry = new THREE.CircleBufferGeometry( 5, 32 );
  const material = new THREE.MeshBasicMaterial( { color: "rgb(0, 136, 75)" } );
  console.log("geometry", geometry);
  for (const [i, position] of [bl,tl,br,tr].entries()) {
    const circle = new THREE.Mesh( geometry, material );
    circle.position.x = position.x;
    circle.position.y = position.y;
    circle.position.z = position.z;
    circles.push(circle);
  }
  return circles;
}

class VideoControls {
  constructor(scene, camera, renderer, updateFcts, svgGroup) {
    const [width, height] = GetSize(svgGroup);

    const videoTexture = new THREEx.WebcamTexture();
    videoTexture.texture.minFilter = THREE.LinearFilter;

    updateFcts.push(function(delta, now){
    	videoTexture.update(delta, now);
    });

    var geometry = new THREE.PlaneGeometry(width, height, 32);
    var material	= new THREE.MeshBasicMaterial({
    	map	: videoTexture.texture
    });

    var mesh	= new THREE.Mesh( geometry, material );
    mesh.position.z -= 0.2;

    const anchors = GenerateAnchors(mesh, scene);
    console.log(anchors);
    for (const [i, anchor] of anchors.entries()){
      scene.add( anchor );
    }

    scene.add( mesh );
  }
}

module.exports = VideoControls;
