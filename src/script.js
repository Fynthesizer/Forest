import { Tree } from "./tree.js";
import { oscillators, scales } from "./music.js";
import "./ui";
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
import { renderUI } from "./ui";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import { DeviceOrientationControls } from "three/examples/jsm/controls/DeviceOrientationControls.js";

const maxTrees = 10;
const lightColour = new THREE.Color("#cfdae4");
const lightIntensity = 0.75;
const reverbSettings = { decay: 15, wet: 0.6 };

let scene, camera, renderer, controller;
let composer, renderPass, bloomPass, smaaPass, bokehPass;
let raycaster, pointer, intersection, controls;
let terrain, field, mountains, cursor;
let modelLoader, skyboxLoader;
let ambientLight, directionalLight;
let trees;
export let listener;
let reverb, lpf;

let state = "loading"; //possible states: loading, title, playing, menu
let canLock = false;

//Check if browser is compatible
let browser = browserDetect();
let browserCompatible = browser != "safari" && browser != "firefox";
if (!browserCompatible) setState("error");
let isMobile = mobileCheck();

export let scale = scales.diatonic;
export let oscType = oscillators.pulse;
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
  setState("title");
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
  if (!isMobile) {
    controls = new PointerLockControls(camera, renderer.domElement);
    controls.addEventListener("unlock", onUnlock);
  } else {
    controls = new DeviceOrientationControls(camera);
  }

  //Effects
  scene.fog = new THREE.Fog("#25386b", 0.25, 900);
  composer = new EffectComposer(renderer);
  renderPass = new RenderPass(scene, camera);
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.5,
    0.2,
    0.3
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
  Tone.setContext(listener.context);
  camera.add(listener);
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
    mountains = terrain.children[1];
    if (isMobile) terrain.remove(mountains);
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
  directionalLight.rotation.set(1.3, 0, 2.5);
  scene.add(ambientLight);
  scene.add(directionalLight);

  //Mobile
  if (isMobile) {
    //document.body.appendChild(VRButton.createButton(renderer));
    renderer.xr.enabled = true;
    renderer.setAnimationLoop(function () {
      //renderer.render(scene, camera);
      composer.render();
      controls.update();
      if (terrain != null) updateCursor();
      trees.children.forEach((tree) => {
        tree.update();
      });
    });
  }
  //Desktop
  else {
    renderer.setAnimationLoop(function () {
      composer.render();
      if (terrain != null) updateCursor();
      trees.children.forEach((tree) => {
        tree.update();
      });
    });
  }

  //Listeners
  window.addEventListener("resize", onResize);
  window.addEventListener("pointerdown", onClick);
  window.addEventListener("pointermove", onPointerMove);
  controller = renderer.xr.getController(0);
  controller.addEventListener("selectstart", onClick);
  controller.addEventListener("connected", onXRConnected);

  trees = new THREE.Group();
  scene.add(trees);
}

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

function onResize() {
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
}

function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onClick(event) {
  let clickedOnCanvas = event.path[0] === renderer.domElement;
  if (state == "title" && canLock) setState("playing");
  else if (state == "playing") {
    if (event.button == 0 && clickedOnCanvas && canPlantTree())
      plantTree(intersection.point);
  }
}

function plantTree(point) {
  const tree = new Tree(point);
  trees.add(tree);
}

function onXRConnected(event) {
  setState("playing");
}

function onUnlock() {
  setState("menu");
}

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
  if (intersection == null) return false; // Cursor not on terrain
  let distance = new THREE.Vector3()
    .copy(camera.position)
    .distanceTo(intersection.point);
  if (distance < 4) return false; // Too close to player
  if (trees.children.length >= maxTrees) return false; // Too many trees
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

  //trees.children.forEach((tree) => tree.beginDeletion());
}

window.setState = setState;
function setState(newState) {
  if (newState == "playing" && canLock) {
    if (!isMobile) controls.lock();
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
  } else if (newState == "title") {
    state = "title";
    canLock = true;
  } else if (newState == "menu") {
    if (!isMobile) {
      canLock = false;
      window.setTimeout(() => (canLock = true), 1250);
    }
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
  } else if (newState == "error") {
    state = "error";
  }
  renderUI(state, isMobile);
}

window.setScale = setScale;
function setScale(newScale) {
  scale = scales[newScale];
}

window.setOsc = setOsc;
function setOsc(newOsc) {
  oscType = oscillators[newOsc];
  trees.children.forEach((tree) => {
    tree.synth.oscillator.type = oscType.key;
  });
}

if (browserCompatible) {
  init();
}

function browserDetect() {
  let userAgent = navigator.userAgent;
  let browserName;

  if (userAgent.match(/chrome|chromium|crios/i)) {
    browserName = "chrome";
  } else if (userAgent.match(/firefox|fxios/i)) {
    browserName = "firefox";
  } else if (userAgent.match(/safari/i)) {
    browserName = "safari";
  } else if (userAgent.match(/opr\//i)) {
    browserName = "opera";
  } else if (userAgent.match(/edg/i)) {
    browserName = "edge";
  } else {
    browserName = "No browser detection";
  }

  return browserName;
}

function mobileCheck() {
  let check = false;
  (function (a) {
    if (
      /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
        a
      ) ||
      /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
        a.substr(0, 4)
      )
    )
      check = true;
  })(navigator.userAgent || navigator.vendor || window.opera);
  return check;
}
