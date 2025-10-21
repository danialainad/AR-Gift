document.addEventListener('DOMContentLoaded', function() {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const modelUrl = urlParams.get('model');
    const targetLat = parseFloat(urlParams.get('lat'));
    const targetLng = parseFloat(urlParams.get('lng'));
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
    modelLocationElement.textContent = locationDesc || `Location: ${targetLat}, ${targetLng}`;
    modelSizeElement.textContent = `Size: ${height}m tall`;
    
    // Three.js variables
    let scene, camera, renderer, model;
    let userPosition = null;
    let userHeading = 0; // Compass heading in degrees
    let deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };
    let isCompassAvailable = false;
    
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
        
        // Load the 3D model
        loadModel();
        
        // Start the render loop
        animate();
        
        // Set up geolocation and orientation tracking
        setupGeolocation();
        setupDeviceOrientation();
        
        // Hide loading screen after a short delay
        setTimeout(() => {
            if (model) {
                loadingElement.classList.add('hidden');
            }
        }, 3000);
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
                
                // Position will be updated based on user location and direction
                model.position.set(0, placementHeight, -20);
                
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
        model.position.set(0, placementHeight, -20);
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
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };
                
                // Calculate distance and bearing to target
                const { distance, bearing } = calculateDistanceAndBearing(
                    userPosition.lat, userPosition.lng,
                    targetLat, targetLng
                );
                
                distanceElement.textContent = `${distance.toFixed(1)} meters away`;
                
                // Update model position based on user location and direction
                updateModelPosition(distance, bearing);
            },
            function(error) {
                console.error('Geolocation error:', error);
                distanceElement.textContent = 'Location unavailable';
                // Use default position if geolocation fails
                updateModelPosition(50, 0);
            },
            options
        );
    }
    
    function setupDeviceOrientation() {
        if (!window.DeviceOrientationEvent) {
            console.warn('Device orientation not supported');
            loadingStatus.textContent += ' | Orientation: Not supported';
            return;
        }
        
        // Request permission for iOS 13+ devices
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        window.addEventListener('deviceorientation', handleDeviceOrientation);
                        isCompassAvailable = true;
                        loadingStatus.textContent += ' | Orientation: Enabled';
                    } else {
                        console.warn('Device orientation permission denied');
                        loadingStatus.textContent += ' | Orientation: Denied';
                    }
                })
                .catch(console.error);
        } else {
            // For non-iOS devices
            window.addEventListener('deviceorientation', handleDeviceOrientation);
            isCompassAvailable = true;
            loadingStatus.textContent += ' | Orientation: Enabled';
        }
        
        // Also listen for compass heading
        window.addEventListener('deviceorientation', handleCompass);
    }
    
    function handleDeviceOrientation(event) {
        deviceOrientation = {
            alpha: event.alpha || 0, // Compass direction (0-360)
            beta: event.beta || 0,   // Front-back tilt (-180 to 180)
            gamma: event.gamma || 0  // Left-right tilt (-90 to 90)
        };
    }
    
    function handleCompass(event) {
        if (event.alpha !== null) {
            userHeading = event.alpha; // Compass heading in degrees
        }
    }
    
    function calculateDistanceAndBearing(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth's radius in meters
        
        // Convert to radians
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        
        // Haversine formula for distance
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                 Math.cos(φ1) * Math.cos(φ2) *
                 Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        // Bearing calculation
        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) -
                 Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
        const bearing = Math.atan2(y, x) * 180 / Math.PI;
        
        return {
            distance: distance,
            bearing: (bearing + 360) % 360 // Normalize to 0-360
        };
    }
    
    function updateModelPosition(distance, bearing) {
        if (!model) return;
        
        // Convert to relative position in front of camera
        const maxDistance = 100; // Maximum visible distance in AR
        const visibleDistance = Math.min(distance, maxDistance);
        
        // Calculate angle between user's heading and target bearing
        const relativeAngle = (bearing - userHeading + 360) % 360;
        
        // Convert to radians and calculate position
        const angleRad = (relativeAngle * Math.PI) / 180;
        
        // Position model in front of camera based on relative angle
        const x = Math.sin(angleRad) * (visibleDistance / 10);
        const z = -Math.cos(angleRad) * (visibleDistance / 10);
        
        // Update model position
        model.position.set(x, placementHeight, z);
        
        // Rotate model to face user
        model.lookAt(0, placementHeight, 0);
        
        // Adjust scale based on distance (further away = smaller)
        const scaleFactor = Math.max(0.1, 1 - (distance / 200));
        const box = new THREE.Box3().setFromObject(model);
        const modelHeight = box.max.y - box.min.y;
        const baseScale = height / modelHeight;
        model.scale.set(baseScale * scaleFactor, baseScale * scaleFactor, baseScale * scaleFactor);
        
        // Update UI with direction information
        updateDirectionUI(relativeAngle, distance);
    }
    
    function updateDirectionUI(relativeAngle, distance) {
        let directionText = '';
        
        if (distance < 10) {
            directionText = 'You are very close! Look around.';
        } else {
            // Convert relative angle to cardinal direction
            if (relativeAngle > 337.5 || relativeAngle < 22.5) {
                directionText = 'Model is North of you';
            } else if (relativeAngle >= 22.5 && relativeAngle < 67.5) {
                directionText = 'Model is Northeast of you';
            } else if (relativeAngle >= 67.5 && relativeAngle < 112.5) {
                directionText = 'Model is East of you';
            } else if (relativeAngle >= 112.5 && relativeAngle < 157.5) {
                directionText = 'Model is Southeast of you';
            } else if (relativeAngle >= 157.5 && relativeAngle < 202.5) {
                directionText = 'Model is South of you';
            } else if (relativeAngle >= 202.5 && relativeAngle < 247.5) {
                directionText = 'Model is Southwest of you';
            } else if (relativeAngle >= 247.5 && relativeAngle < 292.5) {
                directionText = 'Model is West of you';
            } else {
                directionText = 'Model is Northwest of you';
            }
            
            // Add arrow indicator
            const arrow = getDirectionArrow(relativeAngle);
            directionText = `${arrow} ${directionText}`;
        }
        
        // Update distance element with direction info
        distanceElement.innerHTML = `${distance.toFixed(1)} meters away<br><small>${directionText}</small>`;
    }
    
    function getDirectionArrow(angle) {
        // Return arrow emoji based on direction
        if (angle > 337.5 || angle < 22.5) return '⬆️';
        if (angle >= 22.5 && angle < 67.5) return '↗️';
        if (angle >= 67.5 && angle < 112.5) return '➡️';
        if (angle >= 112.5 && angle < 157.5) return '↘️';
        if (angle >= 157.5 && angle < 202.5) return '⬇️';
        if (angle >= 202.5 && angle < 247.5) return '↙️';
        if (angle >= 247.5 && angle < 292.5) return '⬅️';
        return '↖️';
    }
    
    function animate() {
        requestAnimationFrame(animate);
        
        // If we have device orientation data, rotate the camera
        if (isCompassAvailable && deviceOrientation.alpha !== null) {
            // Convert device orientation to camera rotation
            camera.rotation.y = -deviceOrientation.alpha * (Math.PI / 180);
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
    
    // Add instructions for iOS
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
        loadingStatus.textContent = 'iOS: You may need to allow motion permissions';
    }
    
    // Start the AR experience
    init();
});
