/* ============================================================
   Three.js 3D 渲染模块
   通过 importmap 加载 Three.js 本地模块
   暴露 window.loadWeaponModel 供 Vue 调用
============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls, modelGroup, currentModelPath, currentCameraConfig;
let animationId = null;
let isDisposed = false;
const modelLoader = new GLTFLoader();

function initThree() {
  const container = document.getElementById('threeContainer');
  if (!container) return;

  scene = new THREE.Scene();

  const rect = container.getBoundingClientRect();
  const width = rect.width || 400;
  const height = rect.height || 420;

  camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
  camera.position.set(2.5, 1.8, 4.5);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // 灯光
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
  keyLight.position.set(2, 3, 4);
  scene.add(keyLight);

  // 控制器（支持拖拽旋转）
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 2.5;
  controls.minDistance = 1.5;
  controls.maxDistance = 10;
  controls.target.set(0, 0, 0);

  // 模型容器
  modelGroup = new THREE.Group();
  scene.add(modelGroup);

  // 窗口尺寸变化
  const ro = new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w > 0 && h > 0) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
  });
  ro.observe(container);

  // 动画循环
  function animate() {
    if (isDisposed) return;
    animationId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // 处理排队的模型
  if (window.__pendingModel) {
    loadModel(window.__pendingModel, window.__pendingCamera);
    window.__pendingModel = null;
    window.__pendingCamera = null;
  }
}

function loadModel(path, cameraConfig) {
  if (!path) return;

  // 复位模型容器位置和缩放（避免累积偏移）
  modelGroup.position.set(0, 0, 0);
  modelGroup.scale.setScalar(1);

  if (path === currentModelPath) {
    // 同一模型，复位相机
    applyCamera(cameraConfig || currentCameraConfig);
    return;
  }
  currentModelPath = path;
  currentCameraConfig = cameraConfig || null;

  // 清空旧模型
  while (modelGroup.children.length > 0) {
    const child = modelGroup.children[0];
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
      else child.material.dispose();
    }
    modelGroup.remove(child);
  }

  modelLoader.load(
    path,
    (gltf) => {
      const model = gltf.scene;
      modelGroup.add(model);

      // 计算包围盒，居中并缩放
      const box = new THREE.Box3().setFromObject(modelGroup);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2.8 / maxDim;

      modelGroup.position.copy(center).negate();
      modelGroup.scale.setScalar(scale);

      // 切换完成后复位到该武器的初始视角
      applyCamera(cameraConfig || currentCameraConfig);

      // 处理模型材质
      model.traverse((child) => {
        if (child.isMesh) {
          child.material.envMapIntensity = 0;
          if (child.material.metalness !== undefined) child.material.metalness = 0;
          if (child.material.roughness !== undefined) child.material.roughness = 1;
        }
      });
    },
    undefined,
    (err) => console.error('GLTF 加载失败:', err)
  );
}

// 暴露给 Vue 调用
window.loadWeaponModel = function(path, cameraConfig) {
  if (modelLoader) {
    loadModel(path, cameraConfig);
  } else {
    window.__pendingModel = path;
    window.__pendingCamera = cameraConfig;
  }
};

// 复位相机到指定武器的初始视角
function applyCamera(config) {
  if (!config || !controls) return;
  const wasDamping = controls.enableDamping;
  controls.enableDamping = false;
  camera.position.set(config.pos[0], config.pos[1], config.pos[2]);
  controls.target.set(config.target[0], config.target[1], config.target[2]);
  controls.update();
  controls.enableDamping = wasDamping;
  controls.autoRotateSpeed = 1.0;
}

// 自动旋转控制按钮
const rotateToggle = document.getElementById('rotateToggle');
if (rotateToggle) {
  rotateToggle.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    rotateToggle.classList.toggle('paused');
    rotateToggle.querySelector('.label').textContent = controls.autoRotate ? '自动旋转中' : '已暂停旋转';
  });
}

// 当 DOM 就绪且容器可见时初始化
const container = document.getElementById('threeContainer');
if (container) initThree();

console.log('Three.js 3D 渲染器已初始化');
