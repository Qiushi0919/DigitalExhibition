# Digital Exhibition Space

A complete 3D digital exhibition space application that allows users to import, display, and manipulate 3D models in a virtual environment. The project includes a beautiful display case, supports GLB format 3D model import, and provides rich interactive features such as model scaling, rotation, and pedestal height adjustment.

<img width="3090" height="1736" alt="image" src="https://github.com/user-attachments/assets/f31f24a3-71cb-43dd-b651-63d41c9e2485" />

## 🚀 Quick Start

**Simply double-click `index.html` to run the project - no configuration needed!**

### Features

- ✅ **No server required** - Open directly
- ✅ **No configuration** - Ready to use
- ✅ **Auto-generated textures** - Beautiful program-generated textures
- ✅ **Full functionality** - All features work normally
- ✅ **No CORS errors** - Works with file:// protocol

### Usage

1. Find the `index.html` file
2. Double-click to open
3. The browser will automatically run the project
4. If the browser shows a security warning, click "Allow" or "Continue"

## ✨ Features

### Core Features

- **3D Exhibition Space**: Creates a complete 3D virtual exhibition space with floor, walls, ceiling, and lighting system
- **Display Case**: Beautiful display case design with transparent glass panels, metal frames, and interior lighting
- **GLB Model Import**: Support importing GLB format 3D models to the scene or display case
- **Model Replacement Mechanism**: Automatically replaces previous models when importing new ones to avoid scene clutter
- **Real-time Scaling Control**: Dynamically adjust model size, scale range 1-500 (100 is baseline)
- **Display Case Pedestal Height Adjustment**: Adjustable pedestal height, range 5-100 (100 corresponds to original 10.0)
- **Object Rotation Control**: Manual control of object rotation in display case (left rotation/right rotation)
- **Rotation Speed Adjustment**: Adjustable rotation speed, range 1-100 (100 corresponds to original 0.1)
- **First-person Perspective**: WASD movement and mouse view control

### Interactive Features

- **Camera Control**: WASD movement, mouse view control, Space to rise, Shift to descend, R to reset camera
- **Long-press Support**: Scale and height adjustment buttons support long-press for continuous adjustment
- **Real-time Preview**: All adjustments are reflected in real-time in the 3D scene
- **Touch Device Support**: Supports touch device interactions

## 🎮 Controls

### Keyboard Controls

- **W** - Move forward
- **A** - Move left
- **S** - Move backward
- **D** - Move right
- **Space** - Move up (rise)
- **Shift** - Move down (descend)
- **R** - Reset camera position and view to initial state
- **1** - Pick up/put back object in display case
- **← Left Arrow** - Start/stop left rotation of model in display case
- **→ Right Arrow** - Start/stop right rotation of model in display case
- **↑ Up Arrow** - Start/stop upward rotation of model in display case
- **↓ Down Arrow** - Start/stop downward rotation of model in display case
- **J** - Raise display case pedestal height (supports long-press for continuous adjustment)
- **K** - Lower display case pedestal height (supports long-press for continuous adjustment)

### Mouse Controls

- **Mouse Movement** - Control view direction (up, down, left, right)
  - After clicking canvas, enter pointer lock mode
  - Crosshair cursor appears at screen center
  - Mouse movement controls view rotation
- **Click Canvas** - Enter pointer lock mode, enable mouse view control
- **Q** - Exit pointer lock mode (same as ESC)
- **ESC** - Exit pointer lock mode

### Pick Up and Put Back Feature

- **1 Key** - Pick up/put back object
  - When not holding an object: Press 1 to directly pick up the object in the display case (no need to aim, as long as there is an object in the display case)
  - When already holding an object: Press 1 again to put the object back to its original position in the display case
  - Picked up objects follow the camera movement and appear in front of the screen
  - When put back, the object returns to its original position and rotation

## 🛠️ Tech Stack

- **Three.js** (v0.144.0): 3D graphics rendering library
- **GLTFLoader**: GLB/GLTF model loader
- **HTML5/CSS3/JavaScript**: Frontend technologies
- **CDN Loading**: Multiple CDN sources as backup

## 📁 Project Structure

```bash
DigitalExhibition/
├── index.html              # Main HTML file
├── js/
│   └── exhibition.js       # Main program file
├── models/                 # 3D model folder
│   ├── model.glb          # Example model (duck)
│   ├── vase.glb           # Vase model
│   └── README.md          # Model description
├── README.md              # Project description (English)
└── READMECN.md            # Project description (Chinese)
```

## 📖 Usage

### 1. Import GLB Model to Scene

1. Click the "Import GLB Model to Scene" area in the right control panel
2. Click "Select File" button
3. Select a GLB format 3D model file
4. The model will automatically import to the position in front of the camera
5. Use scale controls to adjust model size (range: 1-500, 100 is baseline)

### 2. Import GLB Model to Display Case

1. Click the "Import GLB Model to Display Case" area in the right control panel
2. Click "Select File" button
3. Select a GLB format 3D model file
4. The model will automatically import into the display case
5. Use scale controls to adjust model size (range: 1-500, 100 is baseline)

### 3. Adjust Display Case Pedestal Height

1. In the "Adjust Display Case Pedestal Height" area
2. Use plus (+) or minus (-) buttons to adjust height
3. Or directly input value in the input box (range: 5-100)
4. Supports long-press for continuous adjustment

### 4. Rotate Object in Display Case

1. In the "Display Case Object Rotation" area
2. Hold "◄ Left Rotate" button for left rotation (counterclockwise)
3. Hold "Right Rotate ►" button for right rotation (clockwise)
4. Release button to stop rotation
5. Use rotation speed control to adjust speed (range: 1-100)

## 📝 Feature Details

### Scale Parameter System

- **Scene Import**: Scale range 1-500
- **Display Case Import**: Scale range 1-500

### Pedestal Height System

- **Range**: 5-100

### Rotation Speed System

- **Range**: 1-100

### Model Replacement Mechanism

- **Scene Import**: Automatically deletes previous model when importing new one
- **Display Case Import**: Automatically clears all models in display case when importing new one
- **Resource Cleanup**: Automatically cleans up geometry and material resources when deleting models

## ⚙️ Configuration

### Display Case Dimensions

- **Width**: 3 units
- **Height**: 2.5 units
- **Depth**: 1.5 units
- **Glass Thickness**: 0.05 units
- **Pedestal Height**: Adjustable (default 1.2 units)

### Camera Settings

- **Initial Position**: (0, 6, 8)
- **Field of View**: 75 degrees
- **Near Plane**: 0.1
- **Far Plane**: 1000

### Lighting Settings

- **Ambient Light**: Soft ambient light
- **Directional Light**: Main lighting source
- **Point Light**: Display case interior lighting
- **Shadows**: Soft shadows enabled

## 🔧 Development Notes

### Main Files

- **index.html**: Main page, contains CDN loading logic and UI structure
- **js/exhibition.js**: Main program file, contains all core functionality

### Core Functions

- `init()`: Initialize scene, camera, renderer
- `createExhibitionSpace()`: Create exhibition space (floor, walls, ceiling)
- `createDisplayCase()`: Create display case
- `loadGLBFromFile()`: Load GLB model from file to scene
- `loadGLBToDisplayCase()`: Load GLB model from file to display case
- `adjustDisplayCasePedestalHeight()`: Adjust display case pedestal height
- `applyScaleToModel()`: Apply scale to model in scene
- `applyScaleToDisplayCaseModel()`: Apply scale to model in display case
- `animate()`: Animation loop

### Global Variables

- `displayCase`: Display case object
- `displayCaseGroup`: Display case interior container group
- `currentImportedModel`: Currently imported model in scene
- `currentDisplayCaseModel`: Current model in display case
- `displayCasePedestalHeight`: Display case pedestal height
- `displayCaseRotationDirection`: Rotation direction (-1/0/1)
- `displayCaseRotationSpeed`: Rotation speed

## 📌 Notes

1. **Network Connection**: Project depends on CDN to load Three.js and GLTFLoader, requires network connection
2. **Browser Compatibility**: Requires modern browser with WebGL support
3. **Model Format**: Only supports GLB format 3D models
4. **Model Size**: Suggest keeping model files reasonably sized for faster loading
5. **Resource Cleanup**: Automatically cleans up old model resources when importing new models to avoid memory leaks

## 🐛 Known Issues

1. When model loading fails, error information will be displayed in the console

## 🚀 Deployment

The project supports **directly double-clicking `index.html` file** - no server startup required!

**Features:**

- ✅ Can directly open HTML file, no server needed
- ✅ Automatically uses beautiful program-generated textures (museum style)
- ✅ All features work normally
- ✅ No CORS errors

**Usage:**

1. Simply double-click `index.html` file
2. Browser will automatically open and run the project
3. If browser shows a security warning, click "Allow" or "Continue"

## 🔮 Future Plans

- [ ] Support more 3D model formats (OBJ, FBX, etc.)
- [ ] Add model animation support
- [ ] Add multiple display case support
- [ ] Add model material editing
- [ ] Add scene save/load functionality
- [ ] Add VR support
- [ ] Optimize mobile device experience

---

**Enjoy your digital exhibition journey!** 🎨✨

