import * as THREE from "three";
import * as Tone from "tone";
import { listener } from "./script.js";

const NodeType = {
  Root: 0,
  Trunk: 1,
  Branch: 2,
  Leaf: 3, //Ends of the tree, do not generate further children
};

const maxHeight = 6;
const maxBranches = 4;
const branchGrowthRate = 0.02;
const trunkGrowthRate = 0.04;
const twistFactor = Math.PI * 1.33;
const twistVariation = Math.PI / 4;

const windSpeed = 0.0005;
const windAmount = 0.01;

const nodeGeo = new THREE.SphereGeometry(1, 4, 2);

export class Tree extends THREE.Object3D {
  constructor(position) {
    super();
    this.position.copy(position);
    this.nodes = [];
    this.tips = []; //Currently growing nodes
    this.name = "Tree";

    this.growing = true;

    this.colours = generateColours();

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
    console.log(this.tips.push(this.root));

    //Node Meshes
    this.nodeDummy = new THREE.Object3D();
    this.nodeMat = new THREE.MeshBasicMaterial({
      color: this.colours.nodeColour,
    });
    this.nodesMesh = new THREE.InstancedMesh(nodeGeo, this.nodeMat, 300);
    this.nodesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.add(this.nodesMesh);

    //Light
    this.light = new THREE.PointLight(this.colours.lightColour, 1, 10);
    this.light.position.set(0, 1, 0);
    this.root.add(this.light);
  }

  update() {
    this.updateLines();
    this.updateNodes();
    this.tips.forEach((tip) => tip.grow());
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
    console.time();
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
    console.timeEnd();
  }

  updateNodes() {
    this.nodes.forEach((node, index) => {
      //Apply wind to trunk
      if (node.type == NodeType.Trunk || node.type == NodeType.Root)
        node.wind();
      //Find position of node relative to tree
      let position = new THREE.Vector3(0, 0, 0);
      node.localToWorld(position);
      this.worldToLocal(position);
      this.nodeDummy.position.copy(position);
      //Set scale
      this.nodeDummy.scale.setScalar(node.nodeSize);
      this.nodeDummy.updateMatrix();
      this.nodesMesh.setMatrixAt(index, this.nodeDummy.matrix);
    });
    this.nodesMesh.instanceMatrix.needsUpdate = true;
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

    //Node Mesh
    this.nodeSize = 0.2 / (1 + heightIndex + branchIndex);
    //this.scale.setScalar(nodeSize);
    //this.mesh = new THREE.Mesh(nodeGeo, this.tree.nodeMat);
    //this.mesh.scale.setScalar(nodeSize);
    //this.add(this.mesh);

    this.childNodes = [];

    this.currentLength = 0;
    this.maxLength = length;
    this.windOffset =
      (this.position.x + this.position.y + this.position.z) * 10;

    //Synth
    this.sound = new THREE.PositionalAudio(listener);
    this.synth = new Tone.Synth();
    this.synth.envelope.attack = 0.5;
    this.sound.setNodeSource(this.synth.output);
    this.add(this.sound);
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

  wind() {
    this.rotation.set(
      Math.sin((performance.now() + this.windOffset) * windSpeed) * windAmount,
      0,
      Math.sin((performance.now() + this.windOffset + 100) * windSpeed * 1.2) *
        windAmount
    );

    /*
    if (this.childNodes.length > 0)
      this.childNodes.forEach(function (child) {
        child.wind();
      });
      */
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
    //let freq = THREE.MathUtils.mapLinear(this.currentLength, 0, 5, 2000, 10);
    /*
    let freq = Tone.Frequency(
      THREE.MathUtils.mapLinear(this.currentLength, 0, 5, 90, 10),
      "midi"
    ).toNote();
    this.synth.triggerAttackRelease(freq, "16n");
    */
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
        length = THREE.MathUtils.randFloat(2, 4);
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
              (1.5 - this.heightIndex * 0.1) *
              THREE.MathUtils.randFloat(0.8, 1.2);
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

  message(message) {
    this.parent.message(message);
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

function generateColours() {
  let hue = THREE.MathUtils.randFloat(0, 360);
  let colours = {
    nodeColour: new THREE.Color(`hsl(${hue}, 90%, 66%)`),
    lineColour: new THREE.Color(`hsl(${hue}, 90%, 90%)`),
    lightColour: new THREE.Color(`hsl(${hue}, 90%, 50%)`),
  };
  return colours;
}
