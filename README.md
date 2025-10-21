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

### Common Issues and Solutions:

#### **3D Model Not Appearing:**
1. **Check GPS Accuracy**: 
   - Ensure you're within 10-50 meters of the target location
   - GPS accuracy can be ±3-10 meters
   - Try moving around the area slowly

2. **Verify Coordinates**:
   - Double-check latitude/longitude values
   - Use decimal degrees format (e.g., 52.3740, not 52°22'26")
   - Test with coordinates very close to your current location first

3. **Browser Requirements**:
   - Use HTTPS (required for camera access)
   - Enable location permissions
   - Try Chrome on Android for best results
   - Ensure WebXR/WebAR support

4. **Model Issues**:
   - Check that the GitHub raw URL is accessible
   - Verify the model file is a valid .glb format
   - Try with a simple test model first

#### **Debugging Steps:**
1. **Open browser console** (F12) to see error messages
2. **Check GPS status** - you should see GPS coordinates in the debug text
3. **Test with nearby coordinates** - place model within 10 meters of your location
4. **Try different model sizes** - start with 1-5 meters
5. **Check model URL** - ensure it loads in a new tab

#### **Quick Test:**
- Use your current GPS location as the target
- Set height to 0-5 meters
- Set size to 2-5 meters
- Use a simple model like the Duck.glb example

### **Model not loading**: 
Check that the GitHub raw URL is correct and accessible

### **AR not working**: 
Ensure you're using HTTPS and have granted camera/location permissions

### **Coordinates not accurate**: 
Make sure you're using the correct coordinate system (WGS84)

### **Model too big/small**: 
Adjust the size parameter to get the desired scale

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
