import "./style.css";
import { Tree, TreeNode } from "./tree.js";
import * as THREE from "three";
import * as Tone from "tone";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Loader } from "three";
//import { TerrainModel } from "./assets/terrain.glb";

/*
TODO:
* Make trees more tree-like
* Figure out the musical aspect
* Figure out the visual aspect
* More interesting landscape
* More unique skybox
* Optimization
  * Mesh instancing of nodes? ✔️
*/

const maxTrees = 20;
const directionalColour = new THREE.Color("#badefc");
//const terrainModel = require("./assets/terrain.glb");

function importAll(r) {
  let images = {};
  r.keys().map((item, index) => {
    images[item.replace("./", "")] = r(item);
  });
  return images;
}

const images = importAll(
  require.context("./assets", false, /\.(png|jpe?g|svg)$/)
);
//const terrainModel = require('./')

console.log(images["top.png"]);

let scene, camera, renderer;
let composer, renderPass, bloomPass, smaaPass;
let raycaster, pointer, intersection, controls;
let ground, skybox, cursor;
let modelLoader;
let ambientLight, directionalLight;
let trees;
export let listener;
let reverb;

function init() {
  //Basics
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.y = 3;

  //Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  //Effects
  //scene.fog = new THREE.Fog("#101927", 0.25, 100);
  composer = new EffectComposer(renderer);
  renderPass = new RenderPass(scene, camera);
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1,
    0.2,
    0.5
  );
  smaaPass = new SMAAPass(
    window.innerWidth * renderer.getPixelRatio(),
    window.innerHeight * renderer.getPixelRatio()
  );
  composer.addPass(renderPass);

  composer.addPass(bloomPass);
  composer.addPass(smaaPass);

  //Raycaster
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2(-1, -1);
  intersection = null;

  //Sound
  listener = new THREE.AudioListener();
  camera.add(listener);
  Tone.setContext(listener.context);
  reverb = new Tone.Reverb(5);
  Tone.connect(listener.gain, reverb);
  reverb.connect(Tone.getDestination());

  controls = new PointerLockControls(camera, renderer.domElement);

  //Ground
  //const groundGeo = new THREE.PlaneGeometry(1, 1, 1);
  //const groundMat = new THREE.MeshLambertMaterial({ color: "#398549" });
  //ground = new THREE.Mesh(groundGeo, groundMat);
  //ground.rotateX(-Math.PI / 2);
  //ground.scale.set(1000, 1000, 1);
  //scene.add(ground);

  modelLoader = new GLTFLoader();
  modelLoader.load("./terrain.glb", (model) => {
    ground = model.scene;
    ground.scale.setScalar(2);
    scene.add(ground);
  });

  //Cursor
  const cursorGeo = new THREE.SphereGeometry(0.05, 16, 8);
  const cursorMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  cursor = new THREE.Mesh(cursorGeo, cursorMat);
  scene.add(cursor);

  //Skybox
  const skyboxLoader = new THREE.CubeTextureLoader();
  const skyboxTexture = skyboxLoader.load([
    images["right.png"].default,
    images["left.png"].default,
    images["top.png"].default,
    images["bottom.png"].default,
    images["front.png"].default,
    images["back.png"].default,
  ]);
  scene.background = skyboxTexture;

  //Lights
  ambientLight = new THREE.AmbientLight(directionalColour, 0.25);
  directionalLight = new THREE.DirectionalLight(directionalColour, 0.25);
  scene.add(ambientLight);
  scene.add(directionalLight);

  trees = new THREE.Group();
  scene.add(trees);
}
function onPointerMove(event) {
  // calculate pointer position in normalized device coordinates
  // (-1 to +1) for both components

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onClick() {
  controls.lock();
  //raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  //const intersections = raycaster.intersectObjects(scene.children);
  //intersection = intersections.length > 0 ? intersections[0] : null;
  if (canPlantTree()) {
    const tree = new Tree(intersection.point);
    trees.add(tree);
  }
}
var animate = function () {
  requestAnimationFrame(animate);
  composer.render();
  //renderer.render(scene, camera);
  if (ground != null) updateCursor();

  trees.children.forEach((tree) => {
    tree.update();
  });
};

function updateCursor() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const intersections = raycaster.intersectObjects(ground.children);
  intersection = intersections.length > 0 ? intersections[0] : null;
  if (canPlantTree()) {
    cursor.visible = true;
    cursor.position.copy(intersection.point);
  } else {
    cursor.visible = false;
  }

  //const nodeIntersections = raycaster.intersectObjects(trees.children);
  //console.log(nodeIntersections);
  //const nodeIntersection =
  //   nodeIntersections.length > 0 ? nodeIntersections[0] : null;
  //if (nodeIntersection != null && nodeIntersection.object.name == "Node")
  // console.log("Pointing at node");
}

function canPlantTree() {
  if (intersection == null) return false;
  let distance = new THREE.Vector3()
    .copy(camera.position)
    .distanceTo(intersection.point);
  if (distance < 4) return false;
  if (trees.children.length >= maxTrees) return false;
  return true;
}

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("click", onClick);
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  composer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

init();
animate();
