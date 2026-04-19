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

function init() {
    console.log(' Iniciando escena...');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.03);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 7;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.domElement.style.cssText = 'display:block;position:fixed;top:0;left:0;width:100%;height:100%;';
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild(renderer.domElement);
    
    console.log(' Renderer creado');

    // Luces
    scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
    mainLight.position.set(4, 5, 4);
    scene.add(mainLight);
    const rimLight = new THREE.PointLight(0x4466ff, 1.2, 20);
    rimLight.position.set(-4, 2, -5);
    scene.add(rimLight);
    
    console.log(' Luces añadidas');

    const loader = new THREE.TextureLoader();
    let loadedCount = 0;
    let totalToLoad = 2;

    function checkReady() {
        loadedCount++;
        console.log(` Carga ${loadedCount}/${totalToLoad} completada`);
        if (loadedCount >= totalToLoad) {
            const el = document.getElementById('loading');
            if (el) {
                el.style.opacity = 0;
                console.log(' Escena lista - Loader oculto');
            }
        }
    }

    // FONDO
    console.log(' Cargando fondo:', BG_IMAGE);
    loader.load(
        BG_IMAGE,
        (texture) => {
            console.log(' Fondo cargado');
            bgTexture = texture;
            texture.encoding = THREE.sRGBEncoding;
            
            const windowAspect = window.innerWidth / window.innerHeight;
            const imageAspect = texture.image ? texture.image.width / texture.image.height : 16/9;
            let width, height;
            if (windowAspect > imageAspect) { height = 15; width = height * windowAspect; } 
            else { width = 25; height = width / windowAspect; }
            
            bgGeo = new THREE.PlaneGeometry(width, height);
            const mat = new THREE.MeshBasicMaterial({ 
                map: texture, 
                transparent: true, 
                opacity: 0.7 
            });
            bgMesh = new THREE.Mesh(bgGeo, mat);
            bgMesh.position.z = -12;
            scene.add(bgMesh);
            
            checkReady();
        },
        undefined,
        (error) => {
            console.error(' ERROR cargando fondo:', error);
            console.error(' Ruta intentada:', BG_IMAGE);
            // Crear fondo de color si la imagen falla
            scene.background = new THREE.Color(0x0a0a1a);
            checkReady();
        }
    );

    // ESFERA
    console.log(' Cargando esfera:', SPHERE_IMAGE);
    loader.load(
        SPHERE_IMAGE,
        (texture) => {
            console.log(' Esfera cargada');
            texture.encoding = THREE.sRGBEncoding;
            createSphere(texture);
            checkReady();
        },
        undefined,
        (error) => {
            console.error(' ERROR cargando esfera:', error);
            console.error(' Ruta intentada:', SPHERE_IMAGE);
            // Crear esfera de respaldo
            createSphere(null);
            checkReady();
        }
    );

    textElement = document.getElementById('sphere-text');
    console.log(' Elemento texto:', textElement ? ' Encontrado' : ' No encontrado');
    
    createParticles();
    console.log(' Partículas creadas');

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);
    
    console.log(' Iniciando animación...');
    animate();
}

function onMouseMove(e) {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    lastMove = Date.now();
    
    if (textElement) textElement.style.opacity = '1';
    
    if (sphereMesh) {
        const dist = Math.sqrt(mouseX*mouseX + mouseY*mouseY);
        if (dist < 0.38) {
            const now = Date.now();
            if (now - lastTextChange > 400) {
                textIndex = (textIndex + 1) % TEXTS.length;
                textElement.textContent = TEXTS[textIndex];
                lastTextChange = now;
            }
        }
    }
}

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
    console.log(' Esfera creada en escena');
}

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

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    if (bgTexture && bgGeo) {
        const windowAspect = window.innerWidth / window.innerHeight;
        const imageAspect = bgTexture.image.width / bgTexture.image.height;
        let w, h;
        if (windowAspect > imageAspect) { h = 15; w = h * windowAspect; } 
        else { w = 25; h = w / windowAspect; }
        bgGeo.dispose();
        bgGeo = new THREE.PlaneGeometry(w, h);
        if (bgMesh) bgMesh.geometry = bgGeo;
    }
}

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