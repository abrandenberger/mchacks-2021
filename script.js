import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r122/build/three.module.js';

const canvas = document.querySelector('#c');
const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true, // lets CSS background through
});
let material;

window.addEventListener("load", init);

let rot = 0;

// curve constants
const numPoints = 200;
const dt = 0.1; // e^{0A} e^{dt A} e^{2dt A}
const A = math.matrix(
    [
        [0, 0, 1],
        [0, 1, 1],
        [-1, -1, 1]
    ]
);

const v = math.multiply(0.1, math.matrix([1, 2, 3]));

console.log(math.multiply(v, 3));
console.log(v);

function computeCurve() {
    const res = [];

    for (let i = 0; i < numPoints; i++) {
        let u = math.multiply(math.expm(math.multiply(i * dt, A)), v);
        let w = new THREE.Vector3();
        w.x = math.subset(u, math.index(0));
        w.y = math.subset(u, math.index(1));
        w.z = math.subset(u, math.index(2));
        res.push(w);
    }

    // returns a bunch of THREE.vector3s 
    return res;
}

function init() {
    // all three.js code goes here! :)) 

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 5000);
    const geometry = new THREE.Geometry();

    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        // transparent: true, // make the material transparent
        // alphaTest: 0.5,
        blending: THREE.AdditiveBlending,
        // make this more transparent ?
    });

    let linePoints = computeCurve();
    console.log(linePoints[10]);
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lines = new THREE.Line(lineGeometry, lineMaterial);

    scene.add(lines);

    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = 100;
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    function render() {
        rot += .75;
        const radian = (rot * Math.PI) / 180;
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