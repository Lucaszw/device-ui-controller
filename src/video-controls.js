const THREE = require('THREE');
const THREEx = {}
require('threex.videotexture')(THREE, THREEx);
const PlaneTransform = require('../lib/three.planetransform/three.planetransform')(THREE);
window.THREEx = THREEx;

class VideoControls {
  constructor(scene, camera, renderer, updateFcts) {
    var planeTransform = new PlaneTransform(scene, camera, renderer);
    console.log("Constructing video...");
    console.log("planeTransform", planeTransform);

    var videoTexture = new THREEx.WebcamTexture();

    updateFcts.push(function(delta, now){
    	// to update the texture are every frame
    	videoTexture.update(delta, now)
    })

    videoTexture.minFilter = THREE.LinearFilter;
    var geometry = new THREE.PlaneGeometry( 100, 100, 32 );
    var material	= new THREE.MeshBasicMaterial({
    	map	: videoTexture.texture
    });
    var mesh	= new THREE.Mesh( geometry, material );
    mesh.position.z -= 0.2;
    scene.add( mesh );


  }
}

module.exports = VideoControls;
