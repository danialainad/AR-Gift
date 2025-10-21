document.addEventListener('DOMContentLoaded', function() {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const modelUrl = urlParams.get('model');
    const lat = parseFloat(urlParams.get('lat'));
    const lng = parseFloat(urlParams.get('lng'));
    const height = parseFloat(urlParams.get('height'));
    const placementHeight = parseFloat(urlParams.get('placement'));
    const modelName = urlParams.get('name');
    const locationDesc = urlParams.get('location');
    
    // DOM elements
    const arContainer = document.getElementById('ar-container');
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    const errorMessage = document.getElementById('error-message');
    const loadingStatus = document.getElementById('loading-status');
    const closeButton = document.getElementById('close-ar');
    const retryButton = document.getElementById('retry-button');
    const exitButton = document.getElementById('exit-button');
    const modelNameElement = document.getElementById('model-name');
    const modelLocationElement = document.getElementById('model-location');
    const modelSizeElement = document.getElementById('model-size');
    const distanceElement = document.getElementById('distance');
    
    // Set UI information
    modelNameElement.textContent = modelName || '3D Model';
    modelLocationElement.textContent = locationDesc || `Location: ${lat}, ${lng}`;
    modelSizeElement.textContent = `Size: ${height}m tall`;
    
    // Three.js variables
    let scene, camera, renderer, model;
    let userPosition = null;
    let modelPosition = null;
    
    // Initialize the AR experience
    function init() {
        loadingStatus.textContent = 'Setting up scene...';
        
        // Create scene
        scene = new THREE.Scene();
        
        // Create camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        scene.add(camera);
        
        // Create renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);
        arContainer.appendChild(renderer.domElement);
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        scene.add(directionalLight);
        
        // Calculate model position based on user's location
        calculateModelPosition();
        
        // Load the 3D model
        loadModel();
        
        // Start the render loop
        animate();
        
        // Set up geolocation tracking
        setupGeolocation();
        
        // Hide loading screen after a short delay
        setTimeout(() => {
            if (model) {
                loadingElement.classList.add('hidden');
            }
        }, 3000);
    }
    
    function calculateModelPosition() {
        // For demo purposes, we'll place the model 10 meters in front of the user
        modelPosition = new THREE.Vector3(0, placementHeight, -10);
    }
    
    function loadModel() {
        loadingStatus.textContent = 'Loading 3D model...';
        
        const loader = new THREE.GLTFLoader();
        
        // Use a proxy to handle CORS issues with GitHub raw URLs
        const loadWithCORSWorkaround = (url) => {
            return new Promise((resolve, reject) => {
                // Try direct load first
                loader.load(url, resolve, undefined, (error) => {
                    console.log('Direct load failed, trying CORS proxy:', error);
                    // If direct load fails, try with a CORS proxy
                    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
                    loader.load(proxyUrl, resolve, undefined, reject);
                });
            });
        };
        
        loadWithCORSWorkaround(modelUrl)
            .then(gltf => {
                model = gltf.scene;
                
                // Scale the model based on the specified height
                const box = new THREE.Box3().setFromObject(model);
                const modelHeight = box.max.y - box.min.y;
                const scale = height / modelHeight;
                model.scale.set(scale, scale, scale);
                
                // Position the model
                model.position.copy(modelPosition);
                
                // Add the model to the scene
                scene.add(model);
                
                loadingStatus.textContent = 'Model loaded successfully!';
                
                // Hide loading after model is loaded
                setTimeout(() => {
                    loadingElement.classList.add('hidden');
                }, 1000);
            })
            .catch(error => {
                console.error('Error loading model:', error);
                // Create a fallback model
                createFallbackModel();
                loadingStatus.textContent = 'Using fallback model (original failed to load)';
                
                setTimeout(() => {
                    loadingElement.classList.add('hidden');
                }, 2000);
            });
    }
    
    function createFallbackModel() {
        // Create a simple cube as fallback
        const geometry = new THREE.BoxGeometry(2, height, 1);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0x6a11cb,
            transparent: true,
            opacity: 0.8
        });
        model = new THREE.Mesh(geometry, material);
        model.position.copy(modelPosition);
        scene.add(model);
    }
    
    function setupGeolocation() {
        if (!navigator.geolocation) {
            console.warn('Geolocation is not supported by your browser.');
            distanceElement.textContent = 'Geolocation not supported';
            return;
        }
        
        loadingStatus.textContent = 'Getting your location...';
        
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };
        
        navigator.geolocation.watchPosition(
            function(position) {
                userPosition = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // Calculate distance to target
                const distance = calculateDistance(
                    userPosition.lat, userPosition.lng,
                    lat, lng
                );
                
                distanceElement.textContent = `${distance.toFixed(1)} meters`;
                
                // Adjust model visibility based on distance
                if (model) {
                    // In a real app, you would adjust the model position based on the user's location
                    // For this demo, we'll just adjust the scale based on distance
                    const scaleFactor = Math.min(1, Math.max(0.3, 1 - (distance / 100)));
                    model.scale.set(scaleFactor, scaleFactor, scaleFactor);
                }
            },
            function(error) {
                console.error('Geolocation error:', error);
                distanceElement.textContent = 'Location unavailable';
            },
            options
        );
    }
    
    function calculateDistance(lat1, lon1, lat2, lon2) {
        // Haversine formula to calculate distance between two coordinates
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    function animate() {
        requestAnimationFrame(animate);
        
        // Rotate the model slowly
        if (model) {
            model.rotation.y += 0.005;
        }
        
        renderer.render(scene, camera);
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorElement.classList.remove('hidden');
        loadingElement.classList.add('hidden');
    }
    
    // Event listeners
    closeButton.addEventListener('click', function() {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.close();
        }
    });
    
    retryButton.addEventListener('click', function() {
        errorElement.classList.add('hidden');
        loadingElement.classList.remove('hidden');
        init();
    });
    
    exitButton.addEventListener('click', function() {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.close();
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Start the AR experience
    init();
});
