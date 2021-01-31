import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r122/build/three.module.js';

const canvas = document.querySelector('#c');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true, // lets CSS background through
});
let material;

window.addEventListener("load", init);

let cameraRot = 0;
let matrixRot = 0;

const matrixRotSpeedDefault = 0.0005; 
const cameraRotSpeedDefault = 0.2; 
let matrixRotSpeed = matrixRotSpeedDefault;
let cameraRotSpeed = cameraRotSpeedDefault;

// curve constants
const numPoints = 20; // curve algorithm parameters  (should be 20)
const dt = 0.3; // e^{0A} e^{dt A} e^{2dt A}
let A;

const origin = new THREE.Vector3(0, 0, 0);

// all the initial vectors
let vs = []; // initial point
let vsForward = []; // points for positive curve
let vsBackward = []; // points for negative curve


let positionMap = new Map();

let n = 1;
for (let i = -n; i <= n; i += 1) {
  for (let j = -n; j <= n; j += 1) {
    for (let k = -n; k <= n; k += 1) {
      let u = math.multiply(100, math.matrix([i, j, k]));
      let w = math.multiply(100, math.matrix([i, j, k]));
      vs.push(u);
      vs.push(w); // hash map needs different objects 
      vsForward.push(u);
      vsBackward.push(w);
    }
  }
}

let vsMap = new Map();
for (let v of vs) {
  vsMap.set(v, []);
  for (let i = 0; i < numPoints; i++) {
    vsMap.get(v).push(new THREE.Vector3());
  }
}

function reset() {
  cameraRot = 0;
  matrixRot = 0;
}

function resetSpeeds() {
  matrixRotSpeed = matrixRotSpeedDefault;
  cameraRotSpeed = cameraRotSpeedDefault;
  document.getElementById('theta-dot').value = matrixRotSpeedDefault.toString(); 
  document.getElementById('camera-dot').value = cameraRotSpeedDefault.toString();
}

let exprs = [
  ["sin(2 theta)", "0", "cos(6 theta)" ],
  ["0", "sin(theta)", "-cos(theta)" ],
  ["-cos(theta)", "cos(4 theta)", "sin(theta)"]
];

let compiledExprs = exprs.map(row => row.map(expr => math.compile(expr)));

function computeCurve() {
  A = math.matrix(compiledExprs.map(row => row.map(code => code.evaluate({theta: matrixRot}))));
  let edtA = math.expm(math.multiply(dt, A))

  let res = String.raw`\( \begin{bmatrix}`
  
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let expr = math.subset(A, math.index(i, j)).toFixed(2);
      res += expr;
      if (j < 2) {
        res += '&'
      } else if (i < 2) {
        res += '\\\\'
      }
    }
  }
  res += String.raw`\end{bmatrix} \)`;

  let currentMatrixDiv = document.getElementById('current-matrix');
  currentMatrixDiv.textContent = res;
  renderMathInElement(currentMatrixDiv);


  for (let v of vsForward) {
    let u = v;
    for (let i = 0; i < numPoints; i++) {
      vsMap.get(v)[i].x = math.subset(u, math.index(0));
      vsMap.get(v)[i].y = math.subset(u, math.index(1));
      vsMap.get(v)[i].z = math.subset(u, math.index(2));
      u = math.multiply(edtA, u);
    }
  }

  let edtAinv = math.expm(math.multiply(-dt, A))

  for (let v of vsBackward) {
    let u = v;
    for (let i = 0; i < numPoints; i++) {
      vsMap.get(v)[i].x = math.subset(u, math.index(0));
      vsMap.get(v)[i].y = math.subset(u, math.index(1));
      vsMap.get(v)[i].z = math.subset(u, math.index(2));
      u = math.multiply(edtAinv, u);
    }
  }

  matrixRot += matrixRotSpeed;
}

function init() {
  // all three.js code goes here! :)) 

  const scene = new THREE.Scene();

  const color = 'black';
  const near = 10;
  const far = 2000;
  scene.fog = new THREE.Fog(color, near, far);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 5000);
  const geometry = new THREE.Geometry();

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    // transparent: true, // make the material transparent
    // alphaTest: 0.5,
    blending: THREE.AdditiveBlending,
    // make this more transparent ?
  });


  camera.position.y = 300;

  reset();
  computeCurve();

  const numCatmullPoints = 100;

  for (let v of vs) {
    const catmullCurve = new THREE.CatmullRomCurve3(vsMap.get(v));
    
    const points = catmullCurve.getPoints( numCatmullPoints );
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const position = lineGeometry.attributes.position;
    position.usage = THREE.DynamicDrawUsage;

    const curve = new THREE.Line(lineGeometry, lineMaterial);
    positionMap.set(v, position)
    scene.add(curve);
  }

  function render() {
    computeCurve();

    for (let v of vs) {
      const catmullCurve = new THREE.CatmullRomCurve3(vsMap.get(v));
      const points = catmullCurve.getPoints( numCatmullPoints );

      for (let i = 0; i < points.length; i++) {
        positionMap.get(v).setX(i, points[i].x)
        positionMap.get(v).setY(i, points[i].y)
        positionMap.get(v).setZ(i, points[i].z)
      }

      positionMap.get(v).needsUpdate = true;
    }

    cameraRot += cameraRotSpeed;
    const radian = (cameraRot * Math.PI) / 180;
    camera.position.x = 1000 * Math.sin(radian);
    camera.position.z = 1000 * Math.cos(radian);
    camera.lookAt(origin);

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  render();

  window.addEventListener("resize", onResize);

  function onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
  }

  onResize();
}

// ######################
// #       EVENTS       #
// ######################


window.addEventListener('load', () => {
  let editingMatrix = false;
  let matrixInputDiv = document.getElementById('matrix-input');
  let matrixInputWrapper = document.getElementById('matrix-input-wrapper');

  function getExprs() {
    let exprs = [];

    for (let i = 1; i <= 3; i++) {
      let row = [];
      for (let j = 1; j <= 3; j++) {
        row.push(document.getElementById('matrix-entry-' + i + j).value);
      }
      exprs.push(row);
    }
    return exprs;
  }

  function generateLaTeXMatrix() {
    let res = String.raw`\( \begin{bmatrix}`

    let exprs = getExprs();
    
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let expr = exprs[i][j];
        res += math.parse(expr).toTex();
        if (j < 2) {
          res += '&'
        } else if (i < 2) {
          res += '\\\\'
        }
      }
    }

    res += String.raw`\end{bmatrix} \)`;

    let matrixExpresssionDiv = document.getElementById('matrix-expression');
    matrixExpresssionDiv.textContent = res;
  
    renderMathInElement(matrixExpresssionDiv);
  }

  generateLaTeXMatrix();

  document.getElementById('info-button').addEventListener('click', () => {
    document.getElementById('info').classList.toggle('hidden');
  });

  document.getElementById('reset-button').addEventListener('click', () => {
    reset();
    resetSpeeds();
  });


  let editMatrixButton = document.getElementById('edit-matrix-button');
  editMatrixButton.addEventListener('click', () => {
    if (editingMatrix) {
      generateLaTeXMatrix();
      editMatrixButton.textContent = 'Edit Matrix Expression';
      let exprs = getExprs();
      reset();
      compiledExprs = exprs.map(row => row.map(expr => math.compile(expr)));
    } else {
      editMatrixButton.textContent = 'Update Matrix Expression';
    }
    editingMatrix = !editingMatrix;
    matrixInputWrapper.classList.toggle('hidden');
  });

  document.getElementById('camera-dot').addEventListener('change', event => {
    cameraRotSpeed = parseFloat(event.target.value);
  });

  document.getElementById('theta-dot').addEventListener('change', event => {
    matrixRotSpeed = parseFloat(event.target.value);
  });

  document.getElementById('matrix-select').addEventListener('change', event => {
    let choice = event.target.value;
    if (choice == 'identity') {
      // 1 0 0
      // 0 1 0
      // 0 0 1
      document.getElementById("matrix-entry-11").textContent = "1";
      document.getElementById("matrix-entry-12").textContent = "0";
      document.getElementById("matrix-entry-13").textContent = "0";
      document.getElementById("matrix-entry-21").textContent = "0";
      document.getElementById("matrix-entry-22").textContent = "1";
      document.getElementById("matrix-entry-23").textContent = "0";
      document.getElementById("matrix-entry-31").textContent = "0";
      document.getElementById("matrix-entry-32").textContent = "0";
      document.getElementById("matrix-entry-33").textContent = "1";
    } else if (choice == 'rotation') {
      // 0 0 1
      // 0 0 2
      // -1 -2 0
      document.getElementById("matrix-entry-11").textContent = "0";
      document.getElementById("matrix-entry-12").textContent = "-1";
      document.getElementById("matrix-entry-13").textContent = "1";
      document.getElementById("matrix-entry-21").textContent = "1";
      document.getElementById("matrix-entry-22").textContent = "0";
      document.getElementById("matrix-entry-23").textContent = "2";
      document.getElementById("matrix-entry-31").textContent = "-1";
      document.getElementById("matrix-entry-32").textContent = "-2";
      document.getElementById("matrix-entry-33").textContent = "0";
    }  else if (choice == 'swirly1') {
      // 0 cos(theta) sin(theta)
      // -cos(theta) 0 cos(2theta)
      // -sin(theta) -cos(2theta) 0
      document.getElementById("matrix-entry-11").textContent = "0";
      document.getElementById("matrix-entry-12").textContent = "cos(theta)";
      document.getElementById("matrix-entry-13").textContent = "sin(theta)";
      document.getElementById("matrix-entry-21").textContent = "-cos(theta)";
      document.getElementById("matrix-entry-22").textContent = "0";
      document.getElementById("matrix-entry-23").textContent = "cos(2theta)";
      document.getElementById("matrix-entry-31").textContent = "-sin(theta)";
      document.getElementById("matrix-entry-32").textContent = "-cos(2theta)";
      document.getElementById("matrix-entry-33").textContent = "0";
    } else if (choice == 'swirly2') {
      // sin(theta) cos(2theta) sin(3theta)
      // -cos(4theta) sin(5theta) cos(6theta)
      // -sin(7theta) -cos(8theta) sin(9theta)
      document.getElementById("matrix-entry-11").textContent = "sin(theta)";
      document.getElementById("matrix-entry-12").textContent = "cos(2theta)";
      document.getElementById("matrix-entry-13").textContent = "sin(3theta)";
      document.getElementById("matrix-entry-21").textContent = "-cos(4theta)";
      document.getElementById("matrix-entry-22").textContent = "sin(5theta)";
      document.getElementById("matrix-entry-23").textContent = "cos(6theta)";
      document.getElementById("matrix-entry-31").textContent = "-sin(7theta)";
      document.getElementById("matrix-entry-32").textContent = "-cos(8theta)";
      document.getElementById("matrix-entry-33").textContent = "sin(9theta)";
    } else if (choice == 'spider') {
      document.getElementById("matrix-entry-11").textContent = "1";
      document.getElementById("matrix-entry-12").textContent = "0";
      document.getElementById("matrix-entry-13").textContent = "cos(2 theta)";
      document.getElementById("matrix-entry-21").textContent = "0";
      document.getElementById("matrix-entry-22").textContent = "sin(theta)";
      document.getElementById("matrix-entry-23").textContent = "-cos(theta)";
      document.getElementById("matrix-entry-31").textContent = "1";
      document.getElementById("matrix-entry-32").textContent = "sin(theta)";
      document.getElementById("matrix-entry-33").textContent = "sin(2theta)";
    } else if (choice == 'original') {
      document.getElementById("matrix-entry-11").textContent = "sin(2 theta)";
      document.getElementById("matrix-entry-12").textContent = "0";
      document.getElementById("matrix-entry-13").textContent = "cos(6 theta)";
      document.getElementById("matrix-entry-21").textContent = "0";
      document.getElementById("matrix-entry-22").textContent = "sin(theta)";
      document.getElementById("matrix-entry-23").textContent = "-cos(theta)";
      document.getElementById("matrix-entry-31").textContent = "-cos(theta)";
      document.getElementById("matrix-entry-32").textContent = "cos(4 theta)";
      document.getElementById("matrix-entry-33").textContent = "sin(theta)";
    } else if (choice == 'pancake') {
      document.getElementById("matrix-entry-11").textContent = "sin(theta)";
      document.getElementById("matrix-entry-12").textContent = "sin(theta)";
      document.getElementById("matrix-entry-13").textContent = "1";
      document.getElementById("matrix-entry-21").textContent = "0";
      document.getElementById("matrix-entry-22").textContent = "0";
      document.getElementById("matrix-entry-23").textContent = "0";
      document.getElementById("matrix-entry-31").textContent = "-1";
      document.getElementById("matrix-entry-32").textContent = "0";
      document.getElementById("matrix-entry-33").textContent = "0";
    }
  });

  renderMathInElement(document.body);
});