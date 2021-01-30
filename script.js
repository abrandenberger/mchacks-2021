import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r122/build/three.module.js';

const canvas = document.querySelector('#c');
const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true, // lets CSS background through
});
let material;

window.addEventListener("load", init);

let cameraRot = 0;

// curve constants
const numPoints = 100;
const dt = 0.1; // e^{0A} e^{dt A} e^{2dt A}
const A = math.matrix(
    [
        [0, 0, 1],
        [0, 0, -1],
        [-1, 1, 0]
    ]
);

let vs = []

let n = 1;
for (let i = -n; i <= n; i+=1) {
  for (let j = -n; j <= n; j+=1) {
    for (let k = -n; k <= n; k+=1) {
      vs.push(math.multiply(20, math.matrix([i, j, k])));
    }
  }
}

function computeCurve() {
    const curves = [];

    for (let v of vs) {
        let curve = [];
        for (let i = -numPoints; i < numPoints; i++) {
            let u = math.multiply(math.expm(math.multiply(i * dt, A)), v);
            let w = new THREE.Vector3();
            w.x = math.subset(u, math.index(0));
            w.y = math.subset(u, math.index(1));
            w.z = math.subset(u, math.index(2));
            curve.push(w);
        }
        curves.push(curve);
    }

    // returns a bunch of THREE.vector3s 
    return curves;
}

function init() {
    // all three.js code goes here! :)) 

    const scene = new THREE.Scene();
    
    const color = 'lightblue';
    const near = 10;
    const far = 3000;
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

    let lines = computeCurve();
    lines.forEach((linePoints) => {
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
        const curve = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(curve);
    });

    camera.position.x = 0;
    camera.position.y = 30;
    camera.position.z = 100;
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    function render() {
        cameraRot += .5;
        const radian = (cameraRot * Math.PI) / 180;
        camera.position.x = 1000 * Math.sin(radian);
        camera.position.z = 1000 * Math.cos(radian);
        camera.lookAt(new THREE.Vector3(0, 0, 0));

        renderer.render(scene, camera);

        requestAnimationFrame(render);
    }

    renderer.render(scene, camera);

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