document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generate-btn');
    const copyBtn = document.getElementById('copy-btn');
    const arLink = document.getElementById('ar-link');
    const coordDisplay = document.getElementById('coord-display');
    const heightDisplay = document.getElementById('height-display');
    const placementDisplay = document.getElementById('placement-display');
    
    // Initialize Three.js preview
    let scene, camera, renderer, model;
    
    function initPreview() {
        const container = document.getElementById('preview-container');
        const loadingMessage = document.getElementById('loading-message');
        
        // Set up scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0);
        
        // Set up camera
        camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(5, 5, 5);
        
        // Set up renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        scene.add(directionalLight);
        
        // Add ground
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90ee90 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);
        
        // Add grid helper
        const gridHelper = new THREE.GridHelper(20, 20, 0x000000, 0x000000);
        gridHelper.material.opacity = 0.2;
        gridHelper.material.transparent = true;
        scene.add(gridHelper);
        
        // Add orbit controls
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        
        // Load default model
        loadModel('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.glb');
        
        // Animation loop
        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        animate();
        
        // Handle window resize
        window.addEventListener('resize', function() {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        });
        
        loadingMessage.style.display = 'none';
    }
    
    function loadModel(url) {
        // Remove existing model
        if (model) {
            scene.remove(model);
        }
        
        const loader = new THREE.GLTFLoader();
        loader.load(url, function(gltf) {
            model = gltf.scene;
            model.scale.set(1, 1, 1);
            model.position.set(0, 0, 0);
            model.traverse(function(node) {
                if (node.isMesh) {
                    node.castShadow = true;
                }
            });
            scene.add(model);
        }, undefined, function(error) {
            console.error('Error loading model:', error);
            // Create a fallback cube if model fails to load
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshLambertMaterial({ color: 0x6a11cb });
            model = new THREE.Mesh(geometry, material);
            model.castShadow = true;
            scene.add(model);
        });
    }
    
    function generateQRCode(text) {
        const canvas = document.getElementById('qr-code');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Simple QR code simulation (in a real app, use a QR code library)
        ctx.fillStyle = 'black';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Scan for AR', canvas.width/2, canvas.height/2);
        
        ctx.font = '8px Arial';
        ctx.fillText('(QR Code)', canvas.width/2, canvas.height/2 + 15);
    }
    
    // Initialize the page
    initPreview();
    
    generateBtn.addEventListener('click', function() {
        const modelUrl = document.getElementById('model-url').value;
        const modelName = document.getElementById('model-name').value;
        const modelHeight = document.getElementById('model-height').value;
        const placementHeight = document.getElementById('placement-height').value;
        const lat = document.getElementById('latitude').value;
        const lng = document.getElementById('longitude').value;
        const locationDesc = document.getElementById('location-description').value;
        
        // Basic validation
        if (!modelUrl || !modelName || !modelHeight || !placementHeight || !lat || !lng) {
            alert('Please fill in all required fields');
            return;
        }
        
        // Update preview
        coordDisplay.textContent = `${lat}, ${lng} (${locationDesc})`;
        heightDisplay.textContent = `${modelHeight}m`;
        placementDisplay.textContent = `${placementHeight}m`;
        
        // Update 3D preview with new model
        loadModel(modelUrl);
        
        // Generate AR link
        const baseUrl = window.location.href.split('/').slice(0, -1).join('/');
        const arViewerUrl = `${baseUrl}/ar-viewer.html?model=${encodeURIComponent(modelUrl)}&lat=${lat}&lng=${lng}&height=${modelHeight}&placement=${placementHeight}&name=${encodeURIComponent(modelName)}&location=${encodeURIComponent(locationDesc)}`;
        
        arLink.textContent = arViewerUrl;
        
        // Generate QR code
        generateQRCode(arViewerUrl);
    });
    
    copyBtn.addEventListener('click', function() {
        const textToCopy = arLink.textContent;
        
        if (textToCopy === 'Generate a link to get started' || textToCopy === 'No link generated yet') {
            alert('Please generate a link first');
            return;
        }
        
        // Copy to clipboard
        navigator.clipboard.writeText(textToCopy).then(function() {
            // Change button text temporarily
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            copyBtn.style.background = '#27ae60';
            
            setTimeout(function() {
                copyBtn.textContent = originalText;
                copyBtn.style.background = '#2ecc71';
            }, 2000);
        }).catch(function(err) {
            console.error('Could not copy text: ', err);
            alert('Failed to copy link to clipboard');
        });
    });
    
    // Auto-generate link on page load with default values
    generateBtn.click();
});