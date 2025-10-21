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
    const errorElement = document.getElementById('error-message');
    const errorTitle = document.getElementById('error-title');
    const errorText = document.getElementById('error-text');
    const loadingStatus = document.getElementById('loading-status');
    const retryButton = document.getElementById('retry-button');

    // Three.js variables
    let scene, camera, renderer, model;
    let videoTexture, video;
    let userPosition = null;
    let userHeading = 0;
    let deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };
    let isCompassAvailable = false;

    // Initialize everything
    async function init() {
        try {
            loadingStatus.textContent = 'Starting camera...';
            
            // Step 1: Get camera access
            await setupCamera();
            
            // Step 2: Setup Three.js scene
            setupScene();
            
            // Step 3: Load 3D model
            await loadModel();
            
            // Step 4: Setup location and orientation
            setupGeolocation();
            setupDeviceOrientation();
            
            // Step 5: Start animation
            animate();
            
            // Hide loading screen
            setTimeout(() => {
                loadingElement.classList.add('hidden');
            }, 1000);
            
        } catch (error) {
            console.error('Initialization error:', error);
            showError('Camera Access Required', 'Please allow camera permissions to view the AR experience.');
        }
    }

    async function setupCamera() {
        // Check if browser supports camera
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera not supported in this browser');
        }

        try {
            // Request camera access directly
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });

            // Create and setup video element
            video = document.createElement('video');
            video.srcObject = stream;
            video.playsInline = true;
            video.setAttribute('playsinline', 'true'); // iOS requirement
            video.play();

            // Wait for video to be ready
            return new Promise((resolve) => {
                video.addEventListener('loadeddata', () => {
                    // Create video texture
                    videoTexture = new THREE.VideoTexture(video);
                    videoTexture.minFilter = THREE.LinearFilter;
                    videoTexture.magFilter = THREE.LinearFilter;
                    resolve();
                });
            });

        } catch (error) {
            console.error('Camera setup failed:', error);
            throw new Error('Camera access denied. Please allow camera permissions.');
        }
    }

    function setupScene() {
        // Create scene
        scene = new THREE.Scene();

        // Create camera with video aspect ratio
        const aspectRatio = video.videoWidth / video.videoHeight;
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
        scene.add(camera);

        // Create renderer
        renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            preserveDrawingBuffer: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);
        arContainer.appendChild(renderer.domElement);

        // Create camera background
        const planeGeometry = new THREE.PlaneGeometry(2, 2);
        const planeMaterial = new THREE.MeshBasicMaterial({
            map: videoTexture,
            transparent: true,
            opacity: 1
        });
        const background = new THREE.Mesh(planeGeometry, planeMaterial);
        background.position.z = -0.5;
        scene.add(background);

        // Add lights for the 3D model
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);
    }

    function loadModel() {
        return new Promise((resolve) => {
            loadingStatus.textContent = 'Loading 3D model...';

            const loader = new THREE.GLTFLoader();
            
            // Try direct load first, then CORS proxy
            const tryLoad = (url) => {
                loader.load(url, 
                    (gltf) => {
                        model = gltf.scene;
                        
                        // Scale model to specified height
                        const box = new THREE.Box3().setFromObject(model);
                        const size = box.getSize(new THREE.Vector3());
                        const scale = height / size.y;
                        model.scale.set(scale, scale, scale);
                        
                        // Initial position
                        model.position.set(0, placementHeight, -3);
                        
                        scene.add(model);
                        resolve();
                    },
                    undefined,
                    (error) => {
                        console.error('Model load failed:', error);
                        // Try with CORS proxy
                        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
                        loader.load(proxyUrl,
                            (gltf) => {
                                model = gltf.scene;
                                const box = new THREE.Box3().setFromObject(model);
                                const size = box.getSize(new THREE.Vector3());
                                const scale = height / size.y;
                                model.scale.set(scale, scale, scale);
                                model.position.set(0, placementHeight, -3);
                                scene.add(model);
                                resolve();
                            },
                            undefined,
                            (proxyError) => {
                                console.error('Proxy load failed:', proxyError);
                                createFallbackModel();
                                resolve();
                            }
                        );
                    }
                );
            };

            tryLoad(modelUrl);
        });
    }

    function createFallbackModel() {
        const geometry = new THREE.BoxGeometry(1, height, 1);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0x6a11cb
        });
        model = new THREE.Mesh(geometry, material);
        model.position.set(0, placementHeight, -3);
        scene.add(model);
    }

    function setupGeolocation() {
        if (!navigator.geolocation) {
            console.warn('Geolocation not available');
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        navigator.geolocation.watchPosition(
            (position) => {
                userPosition = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                if (targetLat && targetLng) {
                    const { distance, bearing } = calculateDistanceAndBearing(
                        userPosition.lat, userPosition.lng,
                        targetLat, targetLng
                    );
                    updateModelPosition(distance, bearing);
                }
            },
            (error) => {
                console.warn('Location error:', error);
            },
            options
        );
    }

    function setupDeviceOrientation() {
        if (!window.DeviceOrientationEvent) {
            console.warn('Device orientation not available');
            return;
        }

        // Handle iOS permission
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        window.addEventListener('deviceorientation', handleOrientation);
                        isCompassAvailable = true;
                    }
                })
                .catch(console.error);
        } else {
            window.addEventListener('deviceorientation', handleOrientation);
            isCompassAvailable = true;
        }
    }

    function handleOrientation(event) {
        deviceOrientation.alpha = event.alpha || 0;
        deviceOrientation.beta = event.beta || 0;
        deviceOrientation.gamma = event.gamma || 0;
        
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

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                 Math.cos(φ1) * Math.cos(φ2) *
                 Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

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

        const visibleDistance = Math.min(distance / 10, 10);
        const relativeAngle = (bearing - userHeading + 360) % 360;
        const angleRad = relativeAngle * Math.PI / 180;

        const x = Math.sin(angleRad) * visibleDistance;
        const z = -Math.cos(angleRad) * visibleDistance;

        model.position.set(x, placementHeight, z);
        model.lookAt(0, placementHeight, 0);

        // Scale based on distance
        const scale = Math.max(0.1, 1 - (distance / 100));
        model.scale.setScalar(scale);
    }

    function animate() {
        requestAnimationFrame(animate);

        // Update camera rotation based on compass
        if (isCompassAvailable) {
            camera.rotation.y = -deviceOrientation.alpha * Math.PI / 180;
        }

        renderer.render(scene, camera);
    }

    function showError(title, message) {
        errorTitle.textContent = title;
        errorText.textContent = message;
        loadingElement.classList.add('hidden');
        errorElement.classList.remove('hidden');
    }

    // Event handlers
    retryButton.addEventListener('click', function() {
        errorElement.classList.add('hidden');
        loadingElement.classList.remove('hidden');
        setTimeout(init, 500);
    });

    window.addEventListener('resize', function() {
        if (camera && renderer) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    });

    // Double-tap to exit (hidden gesture)
    let lastTap = 0;
    arContainer.addEventListener('click', function(e) {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        
        if (tapLength < 300 && tapLength > 0) {
            // Double tap detected - go back
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.close();
            }
        }
        lastTap = currentTime;
    });

    // Start the AR experience immediately
    init();
});
