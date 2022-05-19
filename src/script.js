import "./style.css";
import { Tree, TreeNode } from "./tree.js";
import * as THREE from "three";
import * as Tone from "tone";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const maxTrees = 20;
const lightColour = new THREE.Color("#badefc");
const lightIntensity = 0.6;
const reverbDecay = 15;

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

  controls = new PointerLockControls(camera, renderer.domElement);

  //Effects
  scene.fog = new THREE.Fog("#25386b", 0.25, 900);
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
  reverb = new Tone.Reverb(reverbDecay);
  Tone.connect(listener.gain, reverb);
  reverb.connect(Tone.getDestination());

  //Ground
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
  ambientLight = new THREE.AmbientLight(lightColour, 0.1);
  directionalLight = new THREE.DirectionalLight(lightColour, lightIntensity);
  directionalLight.rotation.set(-Math.PI, 0, -Math.PI);
  scene.add(ambientLight);
  scene.add(directionalLight);

  trees = new THREE.Group();
  scene.add(trees);
}
function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onClick(event) {
  controls.lock();
  if (controls.isLocked) {
    if (event.button == 0 && canPlantTree()) {
      const tree = new Tree(intersection.point);
      trees.add(tree);
    } else if (event.button == 2) {
      clearTrees();
    }
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
    cursor.position.lerp(intersection.point, 0.75);
  } else {
    cursor.visible = false;
  }
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

function clearTrees() {
  //Actual clear trees function will go here
  //Currently, this only removes them visually
  trees.clear();
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
