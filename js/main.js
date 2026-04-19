// --- CONFIGURACIÓN ---
const BG_IMAGE = './assets/images/bg-city-night.webp';
const SPHERE_IMAGE = './assets/images/phere-glossy.webp';
const TEXTS = ['hi', 'hola', 'привет', '你好', 'hallo', 'bonjour', 'ciao', '안녕', 'merhaba', 'olá'];

let scene, camera, renderer;
let sphereMesh, sphereGeo, sphereMat;
let bgMesh, bgTexture, bgGeo;
let mouseX = 0, mouseY = 0;
let originalPositions; 
let particles, particlesGeometry, particlesMaterial;
let textElement, lastMove = 0, textIndex = 0;
let lastTextChange = 0;

//  Para detectar clicks 
let raycaster, mouseClick;

function init() {
    // 1. Escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.03);

    // 2. Cámara
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 7;

    // 3. Renderizador
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.domElement.style.cssText = 'display:block;position:fixed;top:0;left:0;width:100%;height:100%;outline:none;z-index:0;';
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild(renderer.domElement);

    // 4. Luces
    scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
    mainLight.position.set(4, 5, 4);
    scene.add(mainLight);
    const rimLight = new THREE.PointLight(0x4466ff, 1.2, 20);
    rimLight.position.set(-4, 2, -5);
    scene.add(rimLight);

    // 5. Cargar Texturas
    const loader = new THREE.TextureLoader();

    // FONDO
    loader.load(BG_IMAGE, (texture) => {
        bgTexture = texture;
        texture.encoding = THREE.sRGBEncoding;
        updateBackgroundSize();
        const mat = new THREE.MeshBasicMaterial({ 
            map: texture, transparent: true, opacity: 0.7 
        });
        bgMesh = new THREE.Mesh(bgGeo, mat);
        bgMesh.position.z = -12;
        scene.add(bgMesh);
    });

    // ESFERA
    loader.load(SPHERE_IMAGE, (texture) => {
        createSphere(texture);
    }, undefined, () => { createSphere(null); });

    // Texto y partículas
    textElement = document.getElementById('sphere-text');
    createParticles();

    // Inicializar raycaster para detectar clicks
    raycaster = new THREE.Raycaster();
    mouseClick = new THREE.Vector2();

    // Eventos
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);

    // AGREGAR: Evento de click para cambiar texto
    window.addEventListener('click', onClick);
    
    animate();
}

// ---  MOUSEMOVE: Solo muestra el texto (NO lo cambia) ---
function onMouseMove(e) {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    lastMove = Date.now();
    
    // Solo mostrar texto, sin cambiarlo
    if (textElement) {
        textElement.style.opacity = '1';
    }
}

// ---  CLICK: Cambia el texto SOLO si se hace click en la esfera ---
function onClick(event) {
    // Calcular posición del mouse en coordenadas normalizadas
    mouseClick.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouseClick.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Actualizar raycaster
    raycaster.setFromCamera(mouseClick, camera);
    
    // Detectar intersección con la esfera
    if (sphereMesh) {
        const intersects = raycaster.intersectObject(sphereMesh);
        
        // Si hay intersección (click en la esfera)
        if (intersects.length > 0) {
            const now = Date.now();
            // Evitar cambios muy rápidos (cooldown de 300ms)
            if (now - lastTextChange > 300) {
                textIndex = (textIndex + 1) % TEXTS.length;
                textElement.textContent = TEXTS[textIndex];
                lastTextChange = now;
                
                // Mostrar texto si estaba oculto
                if (textElement) {
                    textElement.style.opacity = '1';
                }
            }
        }
    }
}

// --- CREAR ESFERA ---
function createSphere(texture) {
    sphereGeo = new THREE.SphereGeometry(1.2, 72, 72);
    originalPositions = sphereGeo.attributes.position.array.slice();

    const matConfig = {
        color: 0x000000, roughness: 0.04, metalness: 0.92,
        clearcoat: 1.0, clearcoatRoughness: 0.02,
        envMapIntensity: 0.9, transparent: true, opacity: 0.88
    };
    if (texture) { matConfig.map = texture; matConfig.color = 0x666666; }
    
    sphereMat = new THREE.MeshPhysicalMaterial(matConfig);
    sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(sphereMesh);
}

// --- PARTÍCULAS ---
function createParticles() {
    const count = 500;
    particlesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        positions[i*3] = (Math.random()-0.5)*30;
        positions[i*3+1] = (Math.random()-0.5)*20;
        positions[i*3+2] = (Math.random()-0.5)*14 - 2;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleTexture = createParticleTexture();
    particlesMaterial = new THREE.PointsMaterial({
        size: 0.07, map: particleTexture, color: 0xffffff,
        transparent: true, opacity: 0.8, sizeAttenuation: true,
        depthWrite: false, blending: THREE.AdditiveBlending
    });
    
    particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);
}

function createParticleTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(16,16,0, 16,16,16);
    g.addColorStop(0,'rgba(255,255,255,1)');
    g.addColorStop(0.4,'rgba(255,255,255,0.5)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,32,32);
    const t = new THREE.Texture(c); t.needsUpdate = true; return t;
}

// --- FONDO: CÁLCULO MATEMÁTICO PARA MÓVIL Y PC ---
function updateBackgroundSize() {
    if (!bgTexture || !camera) return;
    const dist = camera.position.z - (-12);
    const vFovRad = THREE.MathUtils.degToRad(camera.fov);
    const visibleHeight = 2 * Math.tan(vFovRad / 2) * dist;
    const visibleWidth = visibleHeight * camera.aspect;
    const planeW = visibleWidth * 1.15;
    const planeH = visibleHeight * 1.15;
    if (bgGeo) bgGeo.dispose();
    bgGeo = new THREE.PlaneGeometry(planeW, planeH);
    if (bgMesh) bgMesh.geometry = bgGeo;
}

// --- RESIZE ---
function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    updateBackgroundSize();
    if (bgMesh) bgMesh.geometry = bgGeo;
}

// --- PARTÍCULAS: Animación ---
function updateParticles() {
    if (!particles) return;
    const pos = particles.geometry.attributes.position.array;
    const t = Date.now() * 0.0003;
    for (let i = 0; i < pos.length; i += 3) {
        pos[i+1] += 0.003;
        pos[i] += Math.sin(t + pos[i+1]) * 0.001;
        if (pos[i+1] > 12) pos[i+1] = -10;
    }
    particles.geometry.attributes.position.needsUpdate = true;
}

// --- JELLY DEFORMATION ---
function updateJelly() {
    if (!sphereMesh || !originalPositions) return;
    const pos = sphereGeo.attributes.position;
    const t = Date.now() * 0.002;
    for (let i = 0; i < pos.count; i++) {
        const ox = originalPositions[i*3], oy = originalPositions[i*3+1], oz = originalPositions[i*3+2];
        const breath = Math.sin(t + ox*1.5) * 0.025;
        const mDist = Math.sqrt((ox - mouseX*2)**2 + (oy - mouseY*2)**2);
        const ripple = Math.sin(mDist*4 - t*2) * 0.04 * Math.max(0, 1 - mDist*0.6);
        const s = 1 + breath + ripple;
        pos.setXYZ(i, ox*s, oy*s, oz*s);
    }
    pos.needsUpdate = true;
    sphereGeo.computeVertexNormals();
}

// --- LOOP PRINCIPAL ---
function animate() {
    requestAnimationFrame(animate);
    updateParticles();
    if (sphereMesh) { sphereMesh.rotation.y += 0.002; updateJelly(); }
    camera.position.x += (mouseX*0.4 - camera.position.x) * 0.04;
    camera.position.y += (-mouseY*0.3 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
    if (bgMesh) { bgMesh.position.x = -mouseX*0.2; bgMesh.position.y = mouseY*0.15; }
    if (textElement && Date.now() - lastMove > 2000) textElement.style.opacity = '0';
    renderer.render(scene, camera);
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}