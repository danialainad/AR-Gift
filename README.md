# AR Model Placer

A web-based AR application that allows you to place 3D models at specific GPS coordinates with manual input, map selection, or GPS location detection.

## Features

- **Manual Coordinate Input**: Enter X, Y coordinates directly
- **Map Selection**: Click on an interactive map to select coordinates
- **GPS Location**: Use your device's GPS to get current location
- **GitHub Raw GLB Support**: Use any .glb model from GitHub raw links
- **Local File Upload**: Upload your own .glb/.gltf files
- **Meter-based Scaling**: Set model size in meters for real-world accuracy
- **Height Control**: Set Z-axis height in meters
- **Shareable Links**: Generate links that open directly in AR mode

## How to Use

### 1. Setting Up Coordinates
- **Manual**: Enter latitude and longitude directly
- **Map**: Click on the map to select coordinates
- **GPS**: Use "Get My Location" to use your current position

### 2. Setting Up the Model
- **GitHub Raw Link**: Paste a raw GitHub URL to a .glb file
- **Local File**: Upload a .glb or .gltf file from your device

### 3. Configuration
- **Height**: Set how high the model should appear (in meters)
- **Size**: Set the largest dimension of the model (in meters)

### 4. Generate AR Link
Click "Generate AR Link" to create a shareable URL that opens directly in AR mode.

## Example GitHub Raw Links

Here are some example GLB files you can use:

```
https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb
https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb
https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Cube/glTF-Binary/Cube.glb
```

## Usage Instructions

1. Open `index.html` in a web browser
2. Choose your coordinate input method
3. Set the model source (GitHub URL or local file)
4. Configure height and size
5. Click "Generate AR Link"
6. Open the generated link on a mobile device
7. Allow camera and location permissions
8. Point your camera at the location to see the AR model

## Technical Requirements

- Modern web browser with WebGL support
- Mobile device with camera and GPS for AR viewing
- HTTPS connection (required for camera access)
- WebXR or WebAR support for best experience

## Browser Compatibility

- **Best**: Chrome on Android with WebXR support
- **Good**: Modern mobile browsers with WebAR support
- **Basic**: Any browser with WebGL support

## Troubleshooting

- **Model not loading**: Check that the GitHub raw URL is correct and accessible
- **AR not working**: Ensure you're using HTTPS and have granted camera/location permissions
- **Coordinates not accurate**: Make sure you're using the correct coordinate system (WGS84)
- **Model too big/small**: Adjust the size parameter to get the desired scale

## File Structure

```
AR-Gift/
├── index.html          # Main application
├── README.md           # This file
└── [your-model.glb]    # Optional local model files
```

## Development

The application uses:
- **A-Frame**: 3D/AR framework
- **AR.js**: Location-based AR
- **Leaflet**: Interactive maps
- **Three.js**: 3D model loading and manipulation

## License

This project is open source and available under the MIT License.

## Live Demo

🌐 **Try the live application**: [https://danialainad.github.io/AR-Gift/](https://danialainad.github.io/AR-Gift/)

## Recent Updates

- ✅ Added GitHub Pages deployment
- ✅ Enhanced mobile responsiveness
- ✅ Improved error handling
