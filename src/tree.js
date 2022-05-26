import * as THREE from "three";
import * as Tone from "tone";
import { listener, scale, oscType } from "./script.js";
import { scales, lengthToPitch } from "./music.js";
import anime from "animejs/lib/anime.es";

const NodeType = {
  Root: 0,
  Trunk: 1,
  Branch: 2,
  Leaf: 3, //Ends of the tree, do not generate further children
};

const maxHeight = 6;
const maxBranches = 3;
const branchGrowthRate = 0.03;
const trunkGrowthRate = 0.06;
const twistFactor = Math.PI * 1.33;
const twistVariation = Math.PI / 4;

const windSpeed = 0.0005;
const windAmount = 0.01;

const arpRate = 200;
const arpPeriod = 5000;
const baseFreq = 400;

const nodeGeo = new THREE.SphereGeometry(1, 4, 2);
const nodeMat = new THREE.MeshBasicMaterial();

export class Tree extends THREE.Object3D {
  constructor(position) {
    super();
    this.position.copy(position);
    this.nodes = [];
    this.tips = []; //Currently growing nodes
    this.leaves = []; //Nodes at the very end of the tree
    this.name = "Tree";

    this.growing = true;

    this.baseHeight = THREE.MathUtils.randFloat(2, 4);
    this.colours = generateColours(this.baseHeight);

    //Lines
    this.lineGeo = new THREE.BufferGeometry();
    this.lineMat = new THREE.LineBasicMaterial({
      color: this.colours.lineColour,
    });
    this.lines = new THREE.LineSegments(this.lineGeo, this.lineMat);
    this.add(this.lines);

    this.root = new TreeNode(
      NodeType.Root,
      0,
      0,
      new THREE.Vector3(0, 1, 0),
      THREE.MathUtils.randFloat(0, Math.PI * 2),
      this,
      0
    );
    this.add(this.root);
    this.tips.push(this.root);

    //Node Meshes
    this.nodeDummy = new THREE.Object3D();
    this.nodesMesh = new THREE.InstancedMesh(nodeGeo, nodeMat, 300);
    this.nodesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.nodesMesh.setColorAt(0, new THREE.Color());
    this.add(this.nodesMesh);

    //Light
    this.light = new THREE.PointLight(this.colours.lightColour, 0, 10);
    this.light.position.set(0, 1, 0);
    this.add(this.light);

    //Music
    this.voice = new THREE.PositionalAudio(listener);
    this.synth = new Tone.Synth();
    this.synth.envelope.attack = 0.5;
    this.synth.oscillator.type = oscType.key;
    this.voice.setNodeSource(this.synth.output);
    this.add(this.voice);
    this.timer;
  }

  update() {
    this.updateLines();
    this.updateNodes();
    this.updateLight();
    if (this.growing) this.grow();
  }

  beginDeletion() {
    //Doesn't work yet
    anime({
      targets: this.nodes,
      currentLength: 0,
      duration: 200,
      easing: "linear",
    });
  }

  grow() {
    if (this.tips.length > 0) this.tips.forEach((tip) => tip.grow());
    else this.growthFinished();
  }

  growthFinished() {
    this.growing = false;
    this.startArpeggio();
    this.timer = setInterval(this.startArpeggio.bind(this), arpPeriod);
  }

  updateLight() {
    let baseIntensity = 0;
    if (this.root.childNodes[0] != null)
      baseIntensity =
        this.root.childNodes[0].currentLength /
        this.root.childNodes[0].maxLength;
    this.light.intensity = baseIntensity + this.root.resonance * 2;
  }

  startArpeggio() {
    //let direction = Math.random() > 0.5 ? "UP" : "DOWN";
    let direction = "UP";
    let startNode = direction == "UP" ? this.root : this.randomLeaf();
    startNode.sendSignal(direction);
  }

  randomLeaf() {
    let leafIndex = Math.floor(Math.random() * this.leaves.length);
    return this.leaves[leafIndex];
  }

  playNote(note) {
    this.synth.triggerAttackRelease(note, "16n");
  }

  stopGrowth() {
    this.growing = false;
  }

  message(message) {
    if (message == "stopGrowth") {
      this.growing = false;
    }
  }

  updateLines() {
    let vertices = new Float32Array(this.nodes.length * 6);
    let index = 0;
    this.nodes.forEach((node) =>
      node.getBranchVertices().forEach((vert) => {
        vertices[index] = vert;
        index++;
      })
    );
    this.lineGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(vertices, 3)
    );
    this.lines.geometry.computeBoundingSphere();
  }

  updateNodes() {
    this.nodes.forEach((node, index) => {
      //Apply wind to trunk
      if (node.type == NodeType.Trunk || node.type == NodeType.Root)
        node.sway();
      //Decay node resonance
      if (node.resonance > 0) node.resonance -= 0.02;

      let matrix = new THREE.Matrix4();
      //Find position of node relative to tree
      let position = new THREE.Vector3(0, 0, 0);
      let size = node.nodeSize * (node.resonance * 2 + 1);
      node.localToWorld(position);
      this.worldToLocal(position);
      //Set matrix
      matrix.makeScale(size, size, size);
      matrix.setPosition(position.x, position.y, position.z);
      this.nodesMesh.setMatrixAt(index, matrix);
      //let colour = new THREE.Color(`hsl(${360 / node.maxLength}, 90%, 66%)`);
      this.nodesMesh.setColorAt(index, this.colours.nodeColour);
    });
    this.nodesMesh.instanceMatrix.needsUpdate = true;
    this.nodesMesh.instanceColor.needsUpdate = true;
  }

  logNodeData() {
    console.log("Tips: " + this.tips.length + " Nodes: " + this.nodes.length);
  }
}

export class TreeNode extends THREE.Object3D {
  constructor(
    type,
    heightIndex,
    branchIndex,
    direction,
    branchingAngle,
    tree,
    length
  ) {
    super();

    this.tree = tree;
    this.type = type;
    this.heightIndex = heightIndex;
    this.branchIndex = branchIndex;
    this.growing = true;
    this.name = "Node";
    this.tree.nodes.push(this);
    this.direction = direction;
    this.branchingAngle = branchingAngle;
    this.growthRate =
      this.type == NodeType.Trunk ? trunkGrowthRate : branchGrowthRate;

    this.nodeSize = 0.2 / (1 + heightIndex + branchIndex);
    this.resonance = 0;

    this.childNodes = [];

    this.currentLength = 0;
    this.maxLength = length;
    this.windOffset =
      (this.position.x + this.position.y + this.position.z) * 10;

    this.timer;
  }

  grow() {
    //Grow
    if (this.currentLength < this.maxLength) {
      this.currentLength += this.growthRate;
      this.updatePosition();
    }
    //Create branches
    else if (this.childNodes.length == 0 && this.type != NodeType.Leaf) {
      //this.growing = false;
      if (this.type == NodeType.Root)
        this.createBranches(1); //Only create one branch for the trunk
      else this.createBranches(2);
    }
    //End of branch
    else {
      this.tree.tips.splice(this.tree.tips.indexOf(this), 1);
      this.tree.leaves.push(this);
      //this.tree.logNodeData();
      //this.tree.stopGrowth();
    }
  }

  updatePosition() {
    this.position.set(
      this.direction.x * this.currentLength,
      this.direction.y * this.currentLength,
      this.direction.z * this.currentLength
    );
  }

  sway() {
    this.rotation.set(
      Math.sin((performance.now() + this.windOffset) * windSpeed) * windAmount,
      0,
      Math.sin((performance.now() + this.windOffset + 100) * windSpeed * 1.2) *
        windAmount
    );
  }

  sing() {
    this.tree.playNote(lengthToPitch(this.maxLength, baseFreq, scale));
  }

  sendSignal(direction) {
    if (this.type != NodeType.Root) this.sing();
    this.resonance = 1;
    let target;
    if (direction == "UP" && this.childNodes.length > 0) {
      target =
        this.childNodes[Math.floor(Math.random() * this.childNodes.length)];
    } else if (direction == "DOWN" && this.parent.name != "Tree") {
      target = this.parent;
    }
    if (target != null)
      this.timer = setTimeout(function () {
        target.sendSignal(direction);
      }, arpRate);
  }

  getBranchVertices() {
    let verts = [6];
    let worldPos = new THREE.Vector3(0, 0, 0);
    this.localToWorld(worldPos);
    this.tree.worldToLocal(worldPos);

    verts[0] = worldPos.x;
    verts[1] = worldPos.y;
    verts[2] = worldPos.z;
    let parentPos = new THREE.Vector3();
    parentPos.copy(this.position).negate();
    this.localToWorld(parentPos);
    this.tree.worldToLocal(parentPos);
    verts[3] = parentPos.x;
    verts[4] = parentPos.y;
    verts[5] = parentPos.z;
    return verts;
  }

  createBranches(count) {
    for (let i = 0; i < count; i++) {
      let direction, length, type, heightIndex, branchIndex, branchingAngle;
      branchingAngle = THREE.MathUtils.randFloat(0, Math.PI * 2);
      //Trunk
      if (this.type == NodeType.Root) {
        direction = rotateDirection(
          this.direction,
          this.branchingAngle,
          0,
          Math.PI / 16
        );
        length = this.tree.baseHeight;
        type = NodeType.Trunk;
        heightIndex = 1;
        branchIndex = 0;
        branchingAngle =
          this.branchingAngle +
          twistFactor +
          THREE.MathUtils.randFloatSpread(twistVariation);
      } else if (this.type == NodeType.Trunk) {
        if (this.heightIndex < maxHeight) {
          if (i == 0) {
            //Trunk extension
            direction = rotateDirection(
              this.direction,
              this.branchingAngle,
              0,
              Math.PI / 16
            );
            type = NodeType.Trunk;
            heightIndex = this.heightIndex + 1;
            branchIndex = 0;
            length = this.maxLength * THREE.MathUtils.randFloat(0.5, 0.8);
            branchingAngle =
              this.branchingAngle +
              twistFactor +
              THREE.MathUtils.randFloatSpread(twistVariation);
          } else {
            //First branch
            direction = rotateDirection(
              this.direction,
              this.branchingAngle,
              Math.PI / 4,
              Math.PI / 10
            );
            type = NodeType.Branch;
            heightIndex = this.heightIndex;
            branchIndex = 1;
            length =
              this.tree.baseHeight * THREE.MathUtils.randFloat(0.6, 0.8) -
              this.heightIndex * 0.2;

            branchingAngle = THREE.MathUtils.randFloat(0, Math.PI * 2);
          }
        } else {
          //Top branches
          direction = rotateDirection(
            this.direction,
            this.branchingAngle + Math.PI * i,
            Math.PI / 8,
            Math.PI / 8
          );
          type = NodeType.Branch;
          heightIndex = this.heightIndex;
          branchIndex = 1;
          length =
            (1.5 - this.heightIndex * 0.1) *
            THREE.MathUtils.randFloat(0.8, 1.2);
          branchingAngle =
            this.branchingAngle + THREE.MathUtils.randFloatSpread(Math.PI / 2);
        }
      }
      //Further branches
      else {
        direction = rotateDirection(
          this.direction,
          this.branchingAngle + Math.PI * i,
          Math.PI / 8,
          Math.PI / 8
        );
        length = this.maxLength * THREE.MathUtils.randFloat(0.6, 0.8);
        if (this.branchIndex < maxBranches) type = NodeType.Branch;
        else type = NodeType.Leaf;
        heightIndex = this.heightIndex;
        branchIndex = this.branchIndex + 1;
        branchingAngle =
          this.branchingAngle + THREE.MathUtils.randFloatSpread(Math.PI / 2);
      }
      let newNode = new TreeNode(
        type,
        heightIndex,
        branchIndex,
        direction,
        branchingAngle,
        this.tree,
        length
      );
      this.add(newNode);
      this.childNodes.push(newNode);
      this.tree.tips.push(newNode);
    }
    this.tree.tips.splice(this.tree.tips.indexOf(this), 1);
  }
}

//Takes a direction and rotates it
function rotateDirection(direction, axisAngle, amount, variation) {
  let axis = new THREE.Vector3()
    .crossVectors(direction, new THREE.Vector3(1, 1, 1))
    .normalize();
  axis.applyAxisAngle(direction, axisAngle);
  let newDirection = new THREE.Vector3().copy(direction);
  newDirection.applyAxisAngle(
    axis,
    amount + THREE.MathUtils.randFloatSpread(variation)
  );
  return newDirection;
}

function generateColours(length) {
  let hue = THREE.MathUtils.mapLinear(length, 2, 4, 360, 0); //Map length to hue
  let colours = {
    nodeColour: new THREE.Color(`hsl(${hue}, 90%, 66%)`),
    lineColour: new THREE.Color(`hsl(${hue}, 90%, 90%)`),
    lightColour: new THREE.Color(`hsl(${hue}, 90%, 50%)`),
  };
  return colours;
}
