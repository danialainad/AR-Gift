document.addEventListener('DOMContentLoaded', function() {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const modelUrl = urlParams.get('model');
    const targetLat = parseFloat(urlParams.get('lat'));
    const targetLng = parseFloat(urlParams.get('lng'));
    const height = parseFloat(urlParams.get('height'));
    const placementHeight = parseFloat(urlParams.get('placement'));

    // DOM elements
    const arContainer = document.getElementById('ar-container');
    const loadingElement = document.getElementById('loading');
    const permissionPrompt = document.getElementById('permission-prompt');
    const loadingStatus = document.getElementById('loading-status');
    const startCameraButton = document.getElementById('start-camera');

    // Three.js variables
    let scene, camera, renderer, model;
    let videoTexture, video;
    let userPosition = null;
    let userHeading = 0;
    let deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };
    let isCompassAvailable = false;

    // Initialize the AR experience
    async function init() {
        loadingStatus.textContent = 'Requesting camera access...';
        
        try {
            // First, get camera access
            await setupCamera();
            
            // Then setup Three.js scene
            setupScene();
            
            // Load the 3D model
            await loadModel();
            
            // Setup geolocation and orientation
            setupGeolocation();
            setupDeviceOrientation();
            
            // Start animation loop
            animate();
            
            // Hide loading screen
            loadingElement.classList.add('hidden');
            
        } catch (error) {
            console.error('Initialization error:', error);
            loadingStatus.textContent = 'Error: ' + error.message;
        }
    }

    async function setupCamera() {
        // Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera API not supported in this browser');
        }

        try {
            // Request camera access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Use back camera
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            // Create video element
            video = document.createElement('video');
            video.srcObject = stream;
            video.playsInline = true;
            video.play();

            // Wait for video to be ready
            await new Promise((resolve) => {
                video.addEventListener('loadedmetadata', resolve);
            });

            // Create video texture
            videoTexture = new THREE.VideoTexture(video);
            videoTexture.minFilter = THREE.LinearFilter;
            videoTexture.magFilter = THREE.LinearFilter;
            videoTexture.format = THREE.RGBFormat;

        } catch (error) {
            console.error('Camera error:', error);
            // Show permission prompt
            permissionPrompt.classList.remove('hidden');
            loadingElement.classList.add('hidden');
            throw new Error('Camera access denied or unavailable');
        }
    }

    function setupScene() {
        // Create scene
        scene = new THREE.Scene();

        // Create camera - match video aspect ratio
        const aspectRatio = video.videoWidth / video.videoHeight;
        camera = new THREE.PerspectiveCamera(60, aspectRatio, 0.1, 1000);
        scene.add(camera);

        // Create renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);
        arContainer.appendChild(renderer.domElement);

        // Create background with camera feed
        const backgroundGeometry = new THREE.PlaneGeometry(2, 2);
        const backgroundMaterial = new THREE.MeshBasicMaterial({
            map: videoTexture,
            transparent: true,
            opacity: 1
        });
        const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
        background.position.z = -1; // Place behind everything
        scene.add(background);

        // Add lights for the 3D model
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(5, 10, 7);
        scene.add(directionalLight);
    }

    async function loadModel() {
        loadingStatus.textContent = 'Loading 3D model...';

        return new Promise((resolve, reject) => {
            const loader = new THREE.GLTFLoader();
            
            // Use CORS proxy for GitHub raw URLs
            const loadWithCORSWorkaround = (url) => {
                return new Promise((resolveLoad, rejectLoad) => {
                    loader.load(url, resolveLoad, undefined, (error) => {
                        console.log('Direct load failed, trying CORS proxy:', error);
                        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
                        loader.load(proxyUrl, resolveLoad, undefined, rejectLoad);
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
                    
                    // Initial position - will be updated based on location
                    model.position.set(0, placementHeight, -5);
                    
                    // Add the model to the scene
                    scene.add(model);
                    
                    loadingStatus.textContent = 'Model loaded! Getting location...';
                    resolve();
                })
                .catch(error => {
                    console.error('Error loading model:', error);
                    // Create a fallback model
                    createFallbackModel();
                    loadingStatus.textContent = 'Using fallback model';
                    resolve();
                });
        });
    }

    function createFallbackModel() {
        const geometry = new THREE.BoxGeometry(1, height, 1);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0x6a11cb,
            transparent: true,
            opacity: 0.9
        });
        model = new THREE.Mesh(geometry, material);
        model.position.set(0, placementHeight, -5);
        scene.add(model);
    }

    function setupGeolocation() {
        if (!navigator.geolocation) {
            console.warn('Geolocation not supported');
            updateModelPosition(10, 0); // Default position
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        };

        navigator.geolocation.watchPosition(
            (position) => {
                userPosition = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                // Calculate distance and bearing to target
                const { distance, bearing } = calculateDistanceAndBearing(
                    userPosition.lat, userPosition.lng,
                    targetLat, targetLng
                );

                // Update model position
                updateModelPosition(distance, bearing);
            },
            (error) => {
                console.warn('Geolocation error:', error);
                updateModelPosition(10, 0); // Default position
            },
            options
        );
    }

    function setupDeviceOrientation() {
        if (!window.DeviceOrientationEvent) {
            console.warn('Device orientation not supported');
            return;
        }

        // Request permission for iOS 13+
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        window.addEventListener('deviceorientation', handleDeviceOrientation);
                        isCompassAvailable = true;
                    }
                })
                .catch(console.error);
        } else {
            window.addEventListener('deviceorientation', handleDeviceOrientation);
            isCompassAvailable = true;
        }
    }

    function handleDeviceOrientation(event) {
        deviceOrientation = {
            alpha: event.alpha || 0,
            beta: event.beta || 0,
            gamma: event.gamma || 0
        };
        
        // Update compass heading
        if (event.alpha !== null) {
            userHeading = event.alpha;
        }
    }

    function calculateDistanceAndBearing(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        
        // Distance
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                 Math.cos(φ1) * Math.cos(φ2) *
                 Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        // Bearing
        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) -
                 Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
        const bearing = Math.atan2(y, x) * 180 / Math.PI;
        
        return {
            distance: distance,
            bearing: (bearing + 360) % 360
        };
    }

    function updateModelPosition(distance, bearing) {
        if (!model) return;
        
        // Convert to relative position
        const visibleDistance = Math.min(distance, 50) / 10;
        const relativeAngle = (bearing - userHeading + 360) % 360;
        const angleRad = (relativeAngle * Math.PI) / 180;
        
        // Position model based on direction
        const x = Math.sin(angleRad) * visibleDistance;
        const z = -Math.cos(angleRad) * visibleDistance;
        
        model.position.set(x, placementHeight, z);
        
        // Make model face user
        model.lookAt(0, placementHeight, 0);
        
        // Scale based on distance
        const scaleFactor = Math.max(0.3, 1 - (distance / 100));
        if (model.scale) {
            model.scale.setScalar(scaleFactor);
        }
    }

    function animate() {
        requestAnimationFrame(animate);
        
        // Update camera rotation based on device orientation
        if (isCompassAvailable && deviceOrientation.alpha !== null) {
            camera.rotation.y = -deviceOrientation.alpha * (Math.PI / 180);
        }
        
        renderer.render(scene, camera);
    }

    // Handle window resize
    window.addEventListener('resize', function() {
        if (camera && video) {
            camera.aspect = video.videoWidth / video.videoHeight;
            camera.updateProjectionMatrix();
        }
        if (renderer) {
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    });

    // Handle permission prompt button
    startCameraButton.addEventListener('click', function() {
        permissionPrompt.classList.add('hidden');
        loadingElement.classList.remove('hidden');
        init();
    });

    // Double-tap to exit (hidden gesture)
    let tapCount = 0;
    let lastTap = 0;
    arContainer.addEventListener('click', function() {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        
        if (tapCount === 0 || tapLength < 300) {
            tapCount++;
            lastTap = currentTime;
            
            if (tapCount === 2) {
                // Double-tap detected - exit
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    window.close();
                }
            }
        } else {
            tapCount = 1;
            lastTap = currentTime;
        }
        
        // Reset tap count after 1 second
        setTimeout(() => { tapCount = 0; }, 1000);
    });

    // Start initialization
    init();
});
