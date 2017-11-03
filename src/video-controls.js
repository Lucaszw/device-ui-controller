const $ = require('jquery');
const _ = require('lodash');
const _fp = require('lodash/fp');
const THREE = require('THREE');
const THREEx = {}
require('threex.videotexture')(THREE, THREEx);
const ThreeHelpers = require('three-helpers.svg-paths-group')(THREE);
const PlaneTransform = require('../lib/three.planetransform/three.planetransform')(THREE);
const MouseEventHandler = require('three-helpers.mouse-event-handler')(THREE);

window.THREEx = THREEx;

function GetBoundingBox(object) {
  const bbox = new THREE.Box3().setFromObject(object);
  const width  = bbox.max.x - bbox.min.x;
  const height = bbox.max.y - bbox.min.y;

  const origin = new THREE.Vector3();
  origin.setFromMatrixPosition( object.matrixWorld );

  const left = origin.x;
  const right = origin.x + width;
  const bottom = origin.y;
  const top = origin.y + height;

  return {left, right, bottom, top, width, height};
}

function GetSize(object) {
  const bbox = GetBoundingBox(object);
  return [bbox.width, bbox.height];
}

class VideoControls {
  constructor(scene, camera, renderer, updateFcts, svgGroup) {
    const [width, height] = GetSize(svgGroup);
    var plane = new PlaneTransform(scene, camera, renderer, {width, height});
    console.log("planeTransform", plane);
    updateFcts.push(function(delta, now){
      plane.update(delta, now);
    });
    this.plane = plane;
    this.svgGroup = svgGroup;
    this.scene = scene;
    this.anchors = null;
    this.canvas = renderer.domElement;
    this.camera = camera;
    // console.log("canvas", this.canvas);

    // const [width, height] = GetSize(svgGroup);
    //
    // const videoTexture = new THREEx.WebcamTexture();
    // videoTexture.texture.minFilter = THREE.LinearFilter;
    //
    // updateFcts.push(function(delta, now){
    // 	videoTexture.update(delta, now);
    // });
    //
    // var geometry = new THREE.PlaneGeometry(width, height, 32);
    // var material	= new THREE.MeshBasicMaterial({
    // 	map	: videoTexture.texture
    // });
    //
    // var mesh	= new THREE.Mesh( geometry, material );
    // mesh.position.z -= 0.2;
    //
    // scene.add( mesh );

  }

  adjustVideoAnchors() {
      if (this.display_anchors) return;
      console.log("Adjusting video anchors...");
      // Disable interaction with electrodes while adjusting anchors.
        // this.mouseHandler.disable();

      var anchors;

      if (!this.anchors) {
          const bbox = GetBoundingBox(this.svgGroup);
          console.log("bbox", bbox);
          // var bounding_box = this.shapes.boundingBox;
          // Create new anchors (including THREE.Mesh instance for each
          // anchor).
          anchors = new Anchors(bbox);
      } else {
          anchors = this.anchors;
      }

      // Position anchor meshes above video and electrodes.
      anchors.group.position.z = 1;
      console.log("anchors", anchors);

      // Add anchor meshes to device view scene.
      this.scene.add(anchors.group)
      // Style the anchors (e.g., opacity, color).
      _fp.map(_.partialRight(_.set, "material.opacity", 1))(anchors.group.children);
      _fp.map((mesh) => mesh.material.color.setHex("0x00ff00"))(anchors.group.children);
      // Set name attribute of anchor meshes.
      _.forEach(anchors.shapes, (mesh, name) => { mesh.name = name; })

      // Register mouse event handler for anchors.
      this.anchors_handler =
          anchors.mouseEventHandler(this.canvas,
                                    this.camera);
      // Make anchors more transparent while mouse button is pressed.
      this.anchors_handler.on("mousedown", (x, y, intersect, event) => {
          _fp.map(_.partialRight(_.set, "material.opacity", 1))(anchors.group.children);
      });
      this.anchors_handler.on("mouseup", (x, y, intersect, event) => {
          _fp.map(_.partialRight(_.set, "material.opacity", 1))(anchors.group.children);
      });
      // Stretch video according to click and drag of any anchor.
      this.anchors_handler.on("mousemove", (x, y, intersect, event) => {
          var mesh = intersect.object;
          if (event.buttons == 1) {
              mesh.position.x = intersect.point.x;
              mesh.position.y = intersect.point.y;
              this.plane.set_anchors(anchors.positions);
          }
      });

      /* Move anchor position on video by holding shift while clicking and
       * dragging the anchor. */
      $(this.canvas).on("keyup", (event) => {
          if (event.key == "Shift") {
              anchors.material.color.setHex("0x00ff00");
              this.plane.updatePos = true;
          }
      });
      $(this.canvas).on("keydown", (event) => {
          if (event.key == "Shift") {
              anchors.material.color.setHex("0xff0000");
              this.plane.updatePos = false;
          }
      });
      this.anchors = anchors;
      return anchors;
  }

  destroyVideoAnchors() {
      if (!this.display_anchors) return;

      console.log("destroyVideoAnchors");
      // Disable interaction with electrodes while adjusting anchors.
        // this.mouseHandler.enable();
      this.anchors_handler.disable();
      this.anchors_handler = null;
      // Add anchor meshes to device view scene.
      this.scene.remove(this.anchors.group);
  }

  get display_anchors() { return !(!this.anchors_handler); }
  set display_anchors(value) {
      if (value) { this.adjustVideoAnchors(); }
      else { this.destroyVideoAnchors(); }
  }

}

class Anchors {
    constructor(bounding_box) {
        this.bounding_box = bounding_box;

        const transparent = true;
        const color = "red";
        const radius = .05 * bounding_box.width;;

        var corners = this.default_positions;
        this.centers = _fp.pipe(_fp.map(_fp.zipObject(["x", "y"])),
                                        _fp.values)(corners);

        this.shapes = [];
        for (const [i, pos] of this.centers.entries()) {
          console.log("pos", pos);
          const geometry = new THREE.CircleGeometry(radius);
          const material = new THREE.MeshBasicMaterial({color, transparent});
          const shape = new THREE.Mesh(geometry, material);
          shape.position.x = pos.x;
          shape.position.y = pos.y;
          this.shapes.push(shape)
        }

        this.group = new THREE.Group();
        this.group.name = "anchors";
        _fp.forEach((v) => this.group.add(v))(this.shapes);
    }

    get default_positions() {
        // Define center position for control points as the corners of the
        // bounding box.
        var bbox = this.bounding_box;
        return [[bbox.left, bbox.bottom],
                [bbox.left + bbox.width, bbox.bottom],
                [bbox.left, bbox.top],
                [bbox.left + bbox.width, bbox.top]];
    }

    mouseEventHandler(canvas_element, camera) {
        var args = {element: canvas_element,
                    shapes: this.shapes,
                    camera: camera};
        // Create event manager to translate mouse movement and presses
        // high-level shape events.
        return new MouseEventHandler(args);
    }

    get positions() {
        return _fp.map(_fp.pipe(_fp.at(["position.x", "position.y"]),
                                _fp.zipObject(["x", "y"])))(this.shapes);
    }

    set positions(positions) {
        _.forEach(positions, (p, i) => {
            this.shapes[i].position.x = p[0];
            this.shapes[i].position.y = p[1];
        });
    }
}

// class DeviceView {
//     //constructor(canvasElement, controlHandlesElement, scene, camera, menu) {
//     constructor(three_widget, menu) {
//         this.menu = menu;
//         var transformFolder = this.menu.addFolder("Video");
//         transformFolder.add(this, "display_anchors");
//         transformFolder.add(this, "resetAnchors");
//         transformFolder.add(this.threePlane, 'rotateRight');
//         transformFolder.add(this.threePlane, 'rotateLeft');
//         transformFolder.add(this.threePlane, 'flipHorizontal');
//         transformFolder.add(this.threePlane, 'flipVertical');
//
//         this.menu.add(this.orbit, 'enableRotate');
//         this.menu.add(this.orbit, 'reset');
//
//         _.extend(this, Backbone.Events);
//     }
//
//     update() {
//         this.stats.update();
//         this.orbit.update();
//         this.threePlane.update();
//     }
//
//     resetShapes() {
//         if (this.shapes) {
//             this.three_widget.scene.remove(this.shapes.parentGroup);
//             this.shapes = null;
//         }
//         if (this.mouseHandler) {
//             // Unbind any attached mouse event handlers.
//             this.mouseHandler.unbind();
//         }
//     }
//
//     setRoutes(routes) {
//         this.routes = routes;
//
//         this.resetRoutes();
//         this.routes_group = new THREE.Group();
//         _.forEach(routes, (v) => this.routes_group.add(v));
//         this.routes_group.position.z =
//             1.05 * this.shapes.parentGroup.position.z;
//         this.three_widget.scene.add(this.routes_group);
//     }
//
//     resetRoutes() {
//         if (this.routes_group) {
//             this.three_widget.scene.remove(this.routes_group);
//             this.routes_group = null;
//             this.routes = null;
//         }
//     }
//
//     setCircles(circles) {
//         this.resetCircles();
//         this.circles = circles;
//
//         this.circles_group = new THREE.Group();
//         _.forEach(circles, (v) => this.circles_group.add(v));
//         this.circles_group.position.z =
//             1.1 * this.shapes.parentGroup.position.z;
//         this.three_widget.scene.add(this.circles_group);
//     }
//
//     resetCircles() {
//         if (this.circles_group) {
//             this.three_widget.scene.remove(this.circles_group);
//             this.circles_group = null;
//             this.circles = null;
//         }
//     }
//
//     resetCircleStyles() {
//         ThreeHelpers.f_set_attr_properties(this.circles_group.children,
//                                            "material",
//                                            {opacity: 0.8, color: ThreeHelpers
//                                             .COLORS["light blue"],
//                                             visible: false});
//         ThreeHelpers.f_set_attr_properties(this.circles_group.children,
//                                            "scale", {x: 1, y: 1, z: 1});
//     }
//
//     styleRoutes(routes) {
//         _fp.forEach((df_i) =>
//             _.forEach(_.at(this.circles, df_i.get("electrode_i")),
//                     (mesh_i, i) => {
//                         var s = (i == df_i.size - 1) ? 1 : 0;
//                         mesh_i.material.visible = true;
//                         mesh_i.material.color = ThreeHelpers.COLORS["green"];
//                         mesh_i.material.opacity = 0.4 + .6 * s;
//                         mesh_i.scale.x = .5 + .5 * s;
//                         mesh_i.scale.y = .5 + .5 * s;
//                     }))(routes);
//     }
//
//     setShapes(shapes) {
//         this.resetShapes();
//         this.shapes = shapes;
//         // Compute the center position (`THREE.Vector3`) of each shape.
//         this.shapeCenters = _fp.flow(computeMeshBoundingBoxes,
//                                      computeCenters)(shapes.shapeMeshes);
//
//         initShapes(this.three_widget.scene, this.orbit, this.shapes);
//         // Move the corners of the video plane to match the bounding box of all
//         // the shapes.
//         centerVideo(this.threePlane, this.shapes.boundingBox);
//
//         var args = {element: this.three_widget.canvas,
//                     shapes: this.shapes.shapeMeshes,
//                     camera: this.three_widget.camera};
//         // Create event manager to translate mouse movement and presses
//         // high-level shape events.
//         this.mouseHandler = new MouseEventHandler(args);
//
//         // Notify that the shapes have been set.
//         this.trigger("shapes-set", shapes);
//     }
//
//     loadSvg(svg_url) {
//         return new Promise((resolve, reject) => {
//             two.load(svg_url, (shape, svg) => {
//                 var paths = elementsById($(svg).find("g > path").toArray());
//                 var twoPaths = interpretPaths(paths);
//                 var threeShapes = _fp.mapValues(ThreeHelpers
//                                                 .extractShape)(twoPaths);
//                 var bounding_box = shape.getBoundingClientRect();
//
//                 // Create simplified adapter object which is compatible
//                 // with the `DeviceView.setShapes` API.
//                 var shapes = _.merge(wrapShapes(threeShapes),
//                                      {boundingBox: bounding_box});
//                 styleShapes(shapes);
//                 this.setShapes(shapes);
//                 resolve({shape: shape, svg: svg});
//             });
//         });
//     }
//
//     resetAnchors() {
//         if (!this.anchors) return;
//
//         this.threePlane.prev_anchor_array = [];
//         this.anchors.positions = this.anchors.default_positions;
//         this.threePlane.set_anchors(this.anchors.positions);
//         this.threePlane.update_geometry_positions(this.anchors.positions);
//         this.threePlane.updateCorners();
//         this.threePlane.geometry.attributes.position.needsUpdate = true;
//         this.threePlane.set_anchors(this.anchors.positions);
//     }
//
//     destroyVideoAnchors() {
//         if (!this.display_anchors) return;
//
//         console.log("destroyVideoAnchors");
//         // Disable interaction with electrodes while adjusting anchors.
//         this.mouseHandler.enable();
//         this.anchors_handler.disable();
//         this.anchors_handler = null;
//         // Add anchor meshes to device view scene.
//         this.three_widget.scene.remove(this.anchors.group)
//     }
//
//     adjustVideoAnchors() {
//         if (this.display_anchors) return;
//
//         // Disable interaction with electrodes while adjusting anchors.
//         this.mouseHandler.disable();
//
//         var anchors;
//
//         if (!this.anchors) {
//             var bounding_box = this.shapes.boundingBox;
//             // Create new anchors (including THREE.Mesh instance for each
//             // anchor).
//             anchors = new Anchors(bounding_box);
//         } else {
//             anchors = this.anchors;
//         }
//
//         // Position anchor meshes above video and electrodes.
//         anchors.group.position.z = 1.15 * this.shapes.parentGroup.position.z;
//         // Add anchor meshes to device view scene.
//         this.three_widget.scene.add(anchors.group)
//         // Style the anchors (e.g., opacity, color).
//         _fp.map(_.partialRight(_.set, "material.opacity", .8))(anchors.group.children);
//         _fp.map((mesh) => mesh.material.color.setHex("0x00ff00"))(anchors.group.children);
//         // Set name attribute of anchor meshes.
//         _.forEach(anchors.shapes, (mesh, name) => { mesh.name = name; })
//
//         // Register mouse event handler for anchors.
//         this.anchors_handler =
//             anchors.mouseEventHandler(this.three_widget.canvas,
//                                       this.three_widget.camera);
//         // Make anchors more transparent while mouse button is pressed.
//         this.anchors_handler.on("mousedown", (x, y, intersect, event) => {
//             _fp.map(_.partialRight(_.set, "material.opacity", .4))(anchors.group.children);
//         });
//         this.anchors_handler.on("mouseup", (x, y, intersect, event) => {
//             _fp.map(_.partialRight(_.set, "material.opacity", .8))(anchors.group.children);
//         });
//         // Stretch video according to click and drag of any anchor.
//         this.anchors_handler.on("mousemove", (x, y, intersect, event) => {
//             var mesh = intersect.object;
//             if (event.buttons == 1) {
//                 mesh.position.x = intersect.point.x;
//                 mesh.position.y = intersect.point.y;
//                 this.threePlane.set_anchors(anchors
//                                                                     .positions);
//             }
//         });
//
//         /* Move anchor position on video by holding shift while clicking and
//          * dragging the anchor. */
//         $(this.three_widget.canvas).on("keyup", (event) => {
//             if (event.key == "Shift") {
//                 anchors.material.color.setHex("0x00ff00");
//                 this.threePlane.updatePos = true;
//             }
//         });
//         $(this.three_widget.canvas).on("keydown", (event) => {
//             if (event.key == "Shift") {
//                 anchors.material.color.setHex("0xff0000");
//                 this.threePlane.updatePos = false;
//             }
//         });
//         this.anchors = anchors;
//         return anchors;
//     }
//
//     get display_anchors() { return !(!this.anchors_handler); }
//     set display_anchors(value) {
//         if (value) { this.adjustVideoAnchors(); }
//         else { this.destroyVideoAnchors(); }
//     }
// }

module.exports = VideoControls;
