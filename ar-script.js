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
            loadingElement.classList.add('hidden');
        }, 2000);
    }
    
    function calculateModelPosition() {
        // For demo purposes, we'll place the model 10 meters in front of the user
        // In a real app, you would calculate the position based on the target coordinates
        modelPosition = new THREE.Vector3(0, placementHeight, -10);
    }
    
    function loadModel() {
        loadingStatus.textContent = 'Loading 3D model...';
        
        const loader = new THREE.GLTFLoader();
        loader.load(modelUrl, function(gltf) {
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
            
            loadingStatus.textContent = 'Model loaded!';
        }, undefined, function(error) {
            console.error('Error loading model:', error);
            showError('Failed to load the 3D model. Please check the model URL.');
        });
    }
    
    function setupGeolocation() {
        if (!navigator.geolocation) {
            showError('Geolocation is not supported by your browser.');
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
                showError('Unable to access your location. Please enable location services.');
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
        window.close();
    });
    
    retryButton.addEventListener('click', function() {
        errorElement.classList.add('hidden');
        loadingElement.classList.remove('hidden');
        init();
    });
    
    exitButton.addEventListener('click', function() {
        window.close();
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