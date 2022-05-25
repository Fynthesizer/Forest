import "./style.css";
import { Tree, TreeNode } from "./tree.js";
import { scales } from "./music.js";
import * as THREE from "three";
import * as Tone from "tone";
import anime from "animejs/lib/anime.es";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const maxTrees = 10;
const lightColour = new THREE.Color("#badefc");
const lightIntensity = 0.8;
const reverbSettings = { decay: 15, wet: 0.6 };

let scene, camera, renderer;
let composer, renderPass, bloomPass, smaaPass, bokehPass;
let raycaster, pointer, intersection, controls;
let terrain, field, skybox, cursor;
let modelLoader, skyboxLoader;
let ambientLight, directionalLight;
let trees;
export let listener;
let reverb, lpf;

let loaded = false;
let state = "title";

export let scale = scales.diatonic;
export let oscType = "pulse";
let menuFilterFreq = 800;

THREE.DefaultLoadingManager.onProgress = function (
  url,
  itemsLoaded,
  itemsTotal
) {
  console.log(
    "Loading file: " +
      url +
      ".\nLoaded " +
      itemsLoaded +
      " of " +
      itemsTotal +
      " files."
  );
};

THREE.DefaultLoadingManager.onLoad = function () {
  console.log("Loading Complete!");
  loaded = true;
};

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

  //Controls
  controls = new PointerLockControls(camera, renderer.domElement);
  controls.addEventListener("unlock", onUnlock);
  controls.addEventListener("lock", onLock);

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
  bokehPass = new BokehPass(scene, camera, {
    focus: 1.0,
    aperture: 0.025,
    maxblur: 0.0,
  });

  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(smaaPass);
  composer.addPass(bokehPass);

  //Raycaster
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2(-1, -1);
  intersection = null;

  //Sound
  listener = new THREE.AudioListener();
  camera.add(listener);
  Tone.setContext(listener.context);
  reverb = new Tone.Reverb();
  reverb.set(reverbSettings);
  lpf = new Tone.Filter(10000, "lowpass");
  listener.gain.disconnect();
  Tone.connect(listener.gain, reverb);
  Tone.connect(reverb, lpf);
  lpf.connect(Tone.getDestination());

  //Terrain
  modelLoader = new GLTFLoader();
  modelLoader.load("./terrain.glb", (model) => {
    terrain = model.scene;
    terrain.scale.setScalar(2);
    scene.add(terrain);
    field = terrain.children[0];
  });

  //Cursor
  const cursorGeo = new THREE.SphereGeometry(0.05, 16, 8);
  const cursorMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  cursor = new THREE.Mesh(cursorGeo, cursorMat);
  scene.add(cursor);

  //Skybox
  skyboxLoader = new THREE.CubeTextureLoader();
  const skyboxTexture = skyboxLoader.load([
    "./right.jpg",
    "./left.jpg",
    "./top.jpg",
    "./bottom.jpg",
    "./front.jpg",
    "./back.jpg",
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

window.addEventListener("pointerdown", onClick);
window.addEventListener("pointermove", onPointerMove);

function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onClick(event) {
  if (state == "title") setState("playing");
  else if (state == "playing") {
    if (event.button == 0 && canPlantTree()) {
      const tree = new Tree(intersection.point);
      trees.add(tree);
    }
  }
}

window.setState = setState;
function setState(newState) {
  if (newState == "playing") controls.lock();
  else if (newState == "menu") {
    state = "menu";
    bokehPass.enabled = true;
    anime({
      targets: bokehPass.uniforms["maxblur"],
      value: 0.01,
      duration: 200,
      easing: "linear",
    });
    lpf.frequency.rampTo(menuFilterFreq, 0.5);
    anime({
      targets: ["#menuScreen"],
      opacity: 1,
      duration: 200,
      easing: "linear",
    });
  }
}

function onUnlock() {
  setState("menu");
}

function onLock() {
  state = "playing";
  lpf.frequency.rampTo(10000, 0.5);
  anime({
    targets: bokehPass.uniforms["maxblur"],
    value: 0,
    duration: 200,
    easing: "linear",
    complete: () => {
      bokehPass.enabled = false;
    },
  });
  anime({
    targets: ["#startScreen"],
    opacity: 0,
    duration: 500,
    easing: "linear",
  });
  anime({
    targets: ["#menuScreen"],
    opacity: 0,
    duration: 200,
    easing: "linear",
  });
}

var animate = function () {
  requestAnimationFrame(animate);
  if (loaded) composer.render();
  //renderer.render(scene, camera);
  if (terrain != null) updateCursor();

  trees.children.forEach((tree) => {
    tree.update();
  });
};

function updateCursor() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const intersections = raycaster.intersectObject(field);
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
  if (state == "playing") return true;
}

window.clearTrees = clearTrees;
function clearTrees() {
  trees.children.forEach((tree) => {
    tree.nodes.forEach((node) => {
      node.clear(); //Remove all children
      clearTimeout(node.timer); //Stop timer
      for (const key in node) {
        delete node[key]; //Delete all properties
      }
    });
    tree.synth.dispose(); //Dispose of synth
    tree.clear(); //Remove all children
    tree.lineGeo.dispose(); //Dispose of line geometry
    tree.lineMat.dispose(); //Dispose of line material
    clearInterval(tree.timer); //Stop timer
    for (const key in tree) {
      delete tree[key]; //Delete all properties
    }
  });
  trees.clear();
}

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

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

window.setScale = setScale;
function setScale(newScale) {
  scale = scales[newScale];
}

window.setOsc = setOsc;
function setOsc(newOsc) {
  oscType = newOsc;
  trees.children.forEach((tree) => {
    tree.synth.oscillator.type = newOsc;
  });
}

init();
animate();
