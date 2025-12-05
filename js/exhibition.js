// 数字展览空间主程序
// 使用Three.js创建3D展览空间

// 检查Three.js是否已加载
if (typeof THREE === 'undefined') {
    console.error('Three.js未加载，请检查网络连接或CDN源');
    document.body.innerHTML = '<div style="color: white; padding: 20px; text-align: center; background: rgba(0,0,0,0.8);"><h2>错误：Three.js库未加载</h2><p>请检查网络连接并刷新页面重试</p></div>';
    throw new Error('THREE is not defined');
}

let scene, camera, renderer;
let controls;
let exhibitionItems = [];
let gltfLoader = null;
let displayCase = null; // 展示柜对象
let displayCaseGroup = null; // 展示柜组，用于存放展品
let currentImportedModel = null; // 当前场景中导入的模型（用于替换）
let currentDisplayCaseModel = null; // 当前展示柜内的模型（用于替换）
let currentImportedModelBaseScale = 1; // 场景中导入模型的基准缩放值
let currentDisplayCaseModelBaseScale = 1; // 展示柜中导入模型的基准缩放值
let displayCasePedestal = null; // 展示柜基座对象
let displayCaseBase = null; // 展示柜底座对象
let displayCasePlatform = null; // 展示柜展示台对象
let displayCaseGlasses = []; // 展示柜玻璃数组
let displayCaseFrames = []; // 展示柜框架数组
let displayCaseLight = null; // 展示柜内部照明
let displayCaseBaseHeight = 0.3; // 展示柜底座高度
let displayCasePedestalHeight = 3.2; // 展示柜基座当前高度（新标度32对应实际高度3.2）
let displayCaseRotationDirection = 0; // 展示柜内物体旋转方向：-1=左旋转，0=停止，1=右旋转
let displayCaseVerticalRotationDirection = 0; // 展示柜内物体上下旋转方向：-1=向下旋转，0=停止，1=向上旋转
let displayCaseRotationSpeed = 0.01; // 展示柜内物体旋转速度（实际值）
let displayCaseRotationSpeedScale = 10; // 展示柜内物体旋转速度（新标度：1-100，100=原0.1）
let isPointerLocked = false; // 指针锁定状态（全局）
let raycaster = null; // 射线检测器
let heldObject = null; // 当前手持的物体
let heldObjectOriginalParent = null; // 手持物体原来的父对象
let heldObjectOriginalPosition = null; // 手持物体原来的位置
let heldObjectOriginalRotation = null; // 手持物体原来的旋转
let heldObjectOriginalScale = null; // 手持物体原来的缩放
let heldObjectDistance = -3.0; // 手持物体离人的距离（z轴，负值表示前方）
let pickableObjects = []; // 可拾取的物体列表
let heldObjectContainer = null; // 手持物体的容器组（用于跟随相机）
let signboard = null; // 告示牌对象
let isDialogOpen = false; // 对话框是否打开
let dialogContainer = null; // 对话框容器
let showSignboard = true; // 控制告示牌是否显示，默认为true
let lastLoadedFile = null; // 最后加载的文件信息（用于显示文件大小）
let textureLoader = null; // 纹理加载器

// 初始化GLTFLoader
function initGLTFLoader() {
    // 尝试多种方式加载GLTFLoader
    if (typeof THREE !== 'undefined') {
        if (THREE.GLTFLoader) {
            gltfLoader = new THREE.GLTFLoader();
            console.log('GLTFLoader初始化成功');
        } else {
            // 尝试动态加载GLTFLoader
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/three@0.144.0/examples/js/loaders/GLTFLoader.js';
            script.onload = function() {
                if (THREE.GLTFLoader) {
                    gltfLoader = new THREE.GLTFLoader();
                    console.log('GLTFLoader动态加载成功');
                }
            };
            document.head.appendChild(script);
            console.warn('GLTFLoader未预加载，尝试动态加载');
        }
    } else {
        console.warn('THREE未定义，GLB文件加载功能不可用');
    }
}

// 初始化场景
function init() {
    // 创建场景（明亮干净的风格）
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff); // 白色背景，干净明亮
    scene.fog = new THREE.Fog(0xffffff, 50, 200); // 淡白色雾效，更远距离

    // 创建相机
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 6, 8); // 初始视角在展示柜后面

    // 创建渲染器（高质量设置）
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance",
        stencil: false,
        depth: true
    });
    // 设置高像素比，提高渲染质量
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 限制最大为2，避免性能问题
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 使用软阴影
    renderer.shadowMap.autoUpdate = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // 使用ACES色调映射，更真实
    renderer.toneMappingExposure = 1.0;
    renderer.outputEncoding = THREE.sRGBEncoding; // 使用sRGB编码
    renderer.physicallyCorrectLights = true; // 物理正确光照
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // 初始化GLTFLoader
    initGLTFLoader();
    
    // 初始化纹理加载器
    textureLoader = new THREE.TextureLoader();

    // 初始化射线检测器
    raycaster = new THREE.Raycaster();

    // 创建手持物体容器（用于跟随相机）
    heldObjectContainer = new THREE.Group();
    scene.add(heldObjectContainer);

    // 创建灯光
    setupLighting();

    // 创建展览空间
    createExhibitionSpace();

    // 添加展品
    addExhibitionItems();

    // 添加相机控制
    setupControls();

    // 窗口大小调整
    window.addEventListener('resize', onWindowResize);

    // 开始渲染循环
    animate();
}

// 设置灯光（明亮干净的风格 - 白色照明）
function setupLighting() {
    // 环境光（白色，适度强度，保持阴影可见）
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // 降低环境光强度，使阴影更明显
    scene.add(ambientLight);

    // 主光源（从上方，白色）
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8); // 适度降低主光源强度
    mainLight.position.set(0, 20, 0);
    mainLight.castShadow = true;
    // 提高阴影贴图分辨率，获得更细腻的阴影
    mainLight.shadow.mapSize.width = 4096;
    mainLight.shadow.mapSize.height = 4096;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -20;
    mainLight.shadow.camera.right = 20;
    mainLight.shadow.camera.top = 20;
    mainLight.shadow.camera.bottom = -20;
    mainLight.shadow.bias = -0.0001; // 减少阴影失真
    mainLight.shadow.normalBias = 0.02; // 法线偏移
    mainLight.shadow.radius = 8; // 阴影模糊半径
    scene.add(mainLight);

    // 辅助光源（从侧面，白色）
    const sideLight = new THREE.DirectionalLight(0xffffff, 0.4); // 降低辅助光源强度
    sideLight.position.set(15, 10, 15);
    scene.add(sideLight);

    // 点光源（用于展品照明，白色）
    const pointLight1 = new THREE.PointLight(0xffffff, 0.5, 30); // 降低点光源强度
    pointLight1.position.set(-8, 8, -8);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffffff, 0.5, 30); // 降低点光源强度
    pointLight2.position.set(8, 8, 8);
    scene.add(pointLight2);
    
    // 添加明亮风格的聚光灯（从天花板向下）
    const spotLight1 = new THREE.SpotLight(0xffffff, 0.7, 25, Math.PI / 6, 0.3); // 降低聚光灯强度
    spotLight1.position.set(-5, 12, 0);
    spotLight1.target.position.set(-5, 0, 0);
    spotLight1.castShadow = true;
    scene.add(spotLight1);
    scene.add(spotLight1.target);
    
    const spotLight2 = new THREE.SpotLight(0xffffff, 0.7, 25, Math.PI / 6, 0.3); // 降低聚光灯强度
    spotLight2.position.set(5, 12, 0);
    spotLight2.target.position.set(5, 0, 0);
    spotLight2.castShadow = true;
    scene.add(spotLight2);
    scene.add(spotLight2.target);
}

// 创建展览空间（博物馆风格）
function createExhibitionSpace() {
    // 地板（浅色风格，提高几何体细分）
    const floorGeometry = new THREE.PlaneGeometry(40, 40, 40, 40); // 增加细分，40x40段
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xf0f0f0, // 稍亮的浅灰色地板，与墙壁形成对比
        roughness: 0.5, // 稍微增加粗糙度，增强阴影效果
        metalness: 0.0,
        flatShading: false // 使用平滑着色
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 添加地板装饰网格（黑色边缘线，模拟瓷砖）
    const floorGrid = new THREE.GridHelper(40, 8, 0x000000, 0x333333); // 黑色网格线，模拟瓷砖边缘
    floorGrid.position.y = 0.01;
    scene.add(floorGrid);

    // 创建博物馆风格的墙壁纹理（浅色、平滑、优雅）
    function createMuseumWallTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        
        // 明亮干净的白色墙壁背景
        const baseColor = '#ffffff'; // 纯白色
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, 1024, 1024);
        
        // 添加非常细微的纹理变化（保持干净简洁）
        for (let i = 0; i < 1000; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 1024;
            const size = Math.random() * 1.0 + 0.3;
            const brightness = Math.random() * 0.01 - 0.005; // 非常细微的变化
            const alpha = Math.random() * 0.015 + 0.005;
            
            ctx.fillStyle = `rgba(${255 + brightness * 255}, ${255 + brightness * 255}, ${255 + brightness * 255}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 添加非常细微的水平纹理（保持干净）
        for (let i = 0; i < 10; i++) {
            const y = (i * 1024 / 10) + (Math.random() - 0.5) * 3;
            const alpha = 0.005 + Math.random() * 0.01;
            ctx.strokeStyle = `rgba(250, 250, 250, ${alpha})`;
            ctx.lineWidth = 0.2;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(1024, y);
            ctx.stroke();
        }
        
        // 添加装饰性的垂直分割线（非常淡）
        for (let i = 0; i < 6; i++) {
            const x = (i * 1024 / 6) + (Math.random() - 0.5) * 1;
            const alpha = 0.01 + Math.random() * 0.015;
            ctx.strokeStyle = `rgba(245, 245, 245, ${alpha})`;
            ctx.lineWidth = 0.3;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 1024);
            ctx.stroke();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 2);
        texture.encoding = THREE.sRGBEncoding;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        return texture;
    }
    
    // 尝试加载本地博物馆墙壁纹理，失败则使用程序生成
    let wallTexture = createMuseumWallTexture(); // 默认使用程序生成
    let wallNormalTexture = null;
    let wallRoughnessTexture = null;
    
    // 检测是否在file://协议下运行（直接打开HTML文件）
    const isFileProtocol = window.location.protocol === 'file:';
    
    // 尝试加载本地纹理文件（按优先级顺序）
    // 注意：路径是相对于HTML文件的
    const wallTexturePaths = [
        'textures/wall_diffuse.png',  // 优先尝试PNG（用户已添加）
        'textures/wall_diffuse.jpg',
        'textures/wall.png',
        'textures/wall.jpg'
    ];
    
    let wallTextureLoadAttempt = 0;
    function tryLoadLocalWallTexture() {
        // 如果是file://协议，直接使用程序生成的纹理，不尝试加载本地文件
        if (isFileProtocol) {
            console.log('检测到file://协议，使用程序生成的墙壁纹理（可直接打开HTML文件）');
            return;
        }
        
        if (wallTextureLoadAttempt >= wallTexturePaths.length) {
            console.log('本地墙壁纹理未找到，使用程序生成的纹理');
            return;
        }
        
        const currentPath = wallTexturePaths[wallTextureLoadAttempt];
        console.log('尝试加载墙壁纹理:', currentPath);
        
        textureLoader.load(
            currentPath,
            function(texture) {
                console.log('【纹理加载】墙壁纹理加载成功:', currentPath);
                console.log('【纹理信息】图片尺寸:', texture.image.width, 'x', texture.image.height);
                
                // 使用ClampToEdgeWrapping而不是RepeatWrapping，避免图片重复
                // 这是关键：ClampToEdgeWrapping 会拉伸边缘像素，而不是重复整个纹理
                texture.wrapS = THREE.ClampToEdgeWrapping;  // 1001
                texture.wrapT = THREE.ClampToEdgeWrapping;  // 1001
                
                // 设置为(1, 1)使整张图片只显示一次，铺满整个墙壁
                // 这样无论图片尺寸如何，都会整张显示，不会重复镶嵌
                texture.repeat.set(1, 1);
                texture.offset.set(0, 0); // 确保从(0,0)开始，不偏移
                texture.encoding = THREE.sRGBEncoding;
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                texture.magFilter = THREE.LinearFilter;
                
                // 确保纹理更新
                texture.needsUpdate = true;
                
                wallTexture = texture;
                // 更新材质
                wallMaterial.map = wallTexture;
                wallMaterial.needsUpdate = true;
                
                // 更新所有使用该材质的墙壁
                scene.traverse(function(child) {
                    if (child instanceof THREE.Mesh && child.material === wallMaterial) {
                        child.material.needsUpdate = true;
                    }
                });
                
                console.log('【纹理应用】本地博物馆墙壁纹理应用成功:', currentPath);
                console.log('【纹理设置确认】wrapS=' + texture.wrapS + ' (应该是1001=ClampToEdgeWrapping, 不是1000=RepeatWrapping)');
                console.log('【纹理设置确认】wrapT=' + texture.wrapT + ' (应该是1001=ClampToEdgeWrapping)');
                console.log('【纹理设置确认】repeat=(' + texture.repeat.x + ', ' + texture.repeat.y + ') (应该是(1, 1))');
                
                // 尝试加载法线贴图
                textureLoader.load(
                    'textures/wall_normal.jpg',
                    function(normalTexture) {
                        normalTexture.wrapS = THREE.ClampToEdgeWrapping;
                        normalTexture.wrapT = THREE.ClampToEdgeWrapping;
                        normalTexture.repeat.set(1, 1);
                        wallNormalTexture = normalTexture;
                        wallMaterial.normalMap = wallNormalTexture;
                        wallMaterial.needsUpdate = true;
                        console.log('墙壁法线贴图加载成功');
                    },
                    undefined,
                    function(err) {
                        // 尝试PNG格式
                        textureLoader.load(
                            'textures/wall_normal.png',
                            function(normalTexture) {
                                normalTexture.wrapS = THREE.ClampToEdgeWrapping;
                                normalTexture.wrapT = THREE.ClampToEdgeWrapping;
                                normalTexture.repeat.set(1, 1);
                                wallNormalTexture = normalTexture;
                                wallMaterial.normalMap = wallNormalTexture;
                                wallMaterial.needsUpdate = true;
                                console.log('墙壁法线贴图加载成功');
                            },
                            undefined,
                            function(err) {
                                // 法线贴图不存在，继续
                            }
                        );
                    }
                );
                
                // 尝试加载粗糙度贴图
                textureLoader.load(
                    'textures/wall_roughness.jpg',
                    function(roughnessTexture) {
                        roughnessTexture.wrapS = THREE.ClampToEdgeWrapping;
                        roughnessTexture.wrapT = THREE.ClampToEdgeWrapping;
                        roughnessTexture.repeat.set(1, 1);
                        wallRoughnessTexture = roughnessTexture;
                        wallMaterial.roughnessMap = wallRoughnessTexture;
                        wallMaterial.needsUpdate = true;
                        console.log('墙壁粗糙度贴图加载成功');
                    },
                    undefined,
                    function(err) {
                        // 尝试PNG格式
                        textureLoader.load(
                            'textures/wall_roughness.png',
                            function(roughnessTexture) {
                                roughnessTexture.wrapS = THREE.ClampToEdgeWrapping;
                                roughnessTexture.wrapT = THREE.ClampToEdgeWrapping;
                                roughnessTexture.repeat.set(1, 1);
                                wallRoughnessTexture = roughnessTexture;
                                wallMaterial.roughnessMap = wallRoughnessTexture;
                                wallMaterial.needsUpdate = true;
                                console.log('墙壁粗糙度贴图加载成功');
                            },
                            undefined,
                            function(err) {
                                // 粗糙度贴图不存在，继续
                            }
                        );
                    }
                );
            },
            undefined,
            function(err) {
                console.warn('墙壁纹理加载失败:', currentPath, err);
                // 尝试下一个路径
                wallTextureLoadAttempt++;
                tryLoadLocalWallTexture();
            }
        );
    }
    
    // 开始尝试加载本地纹理（如果是file://协议会自动跳过）
    tryLoadLocalWallTexture();
    
    // 墙壁（明亮干净的风格，使用纹理贴图）
    const wallMaterial = new THREE.MeshStandardMaterial({
        map: wallTexture, // 使用明亮风格纹理
        normalMap: wallNormalTexture, // 法线贴图（可选）
        roughnessMap: wallRoughnessTexture, // 粗糙度贴图（可选）
        color: 0xffffff, // 纯白色基础色
        roughness: 0.3, // 降低粗糙度，使墙面更平滑明亮
        metalness: 0.0, // 无金属感
        side: THREE.DoubleSide, // 双面渲染，确保从任何角度都能看到
        flatShading: false // 使用平滑着色
    });

    // 后墙（应该在相机后面，面向场景中心，提高细分）
    const backWall = new THREE.Mesh(
        new THREE.PlaneGeometry(40, 15, 40, 15), // 增加细分
        wallMaterial
    );
    backWall.position.set(0, 7.5, 20); // 改为 z=20，在相机后面
    backWall.rotation.y = Math.PI; // 旋转180度，面向场景中心（-Z方向）
    backWall.receiveShadow = true;
    backWall.castShadow = true; // 让墙壁投射阴影到地面
    scene.add(backWall);

    // 左墙（提高细分）
    const leftWall = new THREE.Mesh(
        new THREE.PlaneGeometry(40, 15, 40, 15), // 增加细分
        wallMaterial
    );
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-20, 7.5, 0);
    leftWall.receiveShadow = true;
    leftWall.castShadow = true; // 让墙壁投射阴影到地面
    scene.add(leftWall);

    // 右墙（提高细分）
    const rightWall = new THREE.Mesh(
        new THREE.PlaneGeometry(40, 15, 40, 15), // 增加细分
        wallMaterial
    );
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(20, 7.5, 0);
    rightWall.receiveShadow = true;
    rightWall.castShadow = true; // 让墙壁投射阴影到地面
    scene.add(rightWall);

    // 前墙（相机前方的墙，提高细分）
    const frontWall = new THREE.Mesh(
        new THREE.PlaneGeometry(40, 15, 40, 15), // 增加细分
        wallMaterial
    );
    frontWall.position.set(0, 7.5, -20); // 在相机前方
    frontWall.rotation.y = 0; // PlaneGeometry默认面向+Z方向，前墙在z=-20，正好面向场景内部
    frontWall.receiveShadow = true;
    frontWall.castShadow = true; // 让墙壁投射阴影到地面
    scene.add(frontWall);
    
    // 为前墙添加额外的照明（确保可见）
    const frontWallLight = new THREE.PointLight(0xfff5e6, 0.6, 25); // 提高前墙照明强度
    frontWallLight.position.set(0, 8, -15); // 在前墙前方
    scene.add(frontWallLight);

    // 创建程序生成的天花板纹理（作为备用）
    function createCeilingTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // 创建白色天花板纹理
        const baseColor = '#ffffff';
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, 512, 512);
        
        // 添加非常细微的纹理（保持干净）
        for (let i = 0; i < 300; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = Math.random() * 1.5 + 0.3;
            const alpha = Math.random() * 0.02 + 0.01;
            
            ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255' : '250'}, ${Math.random() > 0.5 ? '255' : '250'}, ${Math.random() > 0.5 ? '255' : '250'}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 添加网格纹理（非常淡）
        ctx.strokeStyle = 'rgba(245, 245, 245, 0.05)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 12; i++) {
            const pos = (i * 512 / 12);
            ctx.beginPath();
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, 512);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, pos);
            ctx.lineTo(512, pos);
            ctx.stroke();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        // 使用ClampToEdgeWrapping使程序生成的纹理也不重复
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.repeat.set(1, 1);
        texture.encoding = THREE.sRGBEncoding;
        return texture;
    }
    
    // 使用程序生成的天花板纹理
    let ceilingTexture = createCeilingTexture();
    let ceilingNormalTexture = null;
    
    // 尝试加载本地天花板纹理
    const ceilingTexturePaths = [
        'textures/ceiling_diffuse.jpg',
        'textures/ceiling_diffuse.png',
        'textures/ceiling.jpg',
        'textures/ceiling.png'
    ];
    
    let ceilingTextureLoadAttempt = 0;
    function tryLoadLocalCeilingTexture() {
        // 如果是file://协议，直接使用程序生成的纹理，不尝试加载本地文件
        if (isFileProtocol) {
            console.log('检测到file://协议，使用程序生成的天花板纹理（可直接打开HTML文件）');
            return;
        }
        
        if (ceilingTextureLoadAttempt >= ceilingTexturePaths.length) {
            console.log('本地天花板纹理未找到，使用程序生成的纹理');
            return;
        }
        
        const currentPath = ceilingTexturePaths[ceilingTextureLoadAttempt];
        console.log('尝试加载天花板纹理:', currentPath);
        
        textureLoader.load(
            currentPath,
            function(texture) {
                console.log('【纹理加载】天花板纹理加载成功:', currentPath);
                console.log('【纹理信息】图片尺寸:', texture.image.width, 'x', texture.image.height);
                
                // 使用ClampToEdgeWrapping而不是RepeatWrapping，避免图片重复
                // 这是关键：ClampToEdgeWrapping 会拉伸边缘像素，而不是重复整个纹理
                texture.wrapS = THREE.ClampToEdgeWrapping;  // 1001
                texture.wrapT = THREE.ClampToEdgeWrapping;  // 1001
                
                // 设置为(1, 1)使整张图片只显示一次，铺满整个天花板
                // 这样无论图片尺寸如何，都会整张显示，不会重复镶嵌
                texture.repeat.set(1, 1);
                texture.offset.set(0, 0); // 确保从(0,0)开始，不偏移
                texture.encoding = THREE.sRGBEncoding;
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                texture.magFilter = THREE.LinearFilter;
                
                // 确保纹理更新
                texture.needsUpdate = true;
                
                ceilingTexture = texture;
                // 更新材质
                ceilingMaterial.map = ceilingTexture;
                ceilingMaterial.needsUpdate = true;
                
                // 更新使用该材质的天花板
                if (ceiling) {
                    ceiling.material.needsUpdate = true;
                }
                
                console.log('【纹理应用】本地天花板纹理应用成功:', currentPath);
                console.log('【纹理设置确认】wrapS=' + texture.wrapS + ' (应该是1001=ClampToEdgeWrapping, 不是1000=RepeatWrapping)');
                console.log('【纹理设置确认】wrapT=' + texture.wrapT + ' (应该是1001=ClampToEdgeWrapping)');
                console.log('【纹理设置确认】repeat=(' + texture.repeat.x + ', ' + texture.repeat.y + ') (应该是(1, 1))');
                
                // 尝试加载天花板法线贴图
                textureLoader.load(
                    'textures/ceiling_normal.jpg',
                    function(normalTexture) {
                        normalTexture.wrapS = THREE.ClampToEdgeWrapping;
                        normalTexture.wrapT = THREE.ClampToEdgeWrapping;
                        normalTexture.repeat.set(1, 1);
                        ceilingNormalTexture = normalTexture;
                        ceilingMaterial.normalMap = ceilingNormalTexture;
                        ceilingMaterial.needsUpdate = true;
                        console.log('天花板法线贴图加载成功');
                    },
                    undefined,
                    function(err) {
                        // 尝试PNG格式
                        textureLoader.load(
                            'textures/ceiling_normal.png',
                            function(normalTexture) {
                                normalTexture.wrapS = THREE.ClampToEdgeWrapping;
                                normalTexture.wrapT = THREE.ClampToEdgeWrapping;
                                normalTexture.repeat.set(1, 1);
                                ceilingNormalTexture = normalTexture;
                                ceilingMaterial.normalMap = ceilingNormalTexture;
                                ceilingMaterial.needsUpdate = true;
                                console.log('天花板法线贴图加载成功');
                            },
                            undefined,
                            function(err) {
                                // 法线贴图不存在，继续
                            }
                        );
                    }
                );
            },
            undefined,
            function(err) {
                console.warn('天花板纹理加载失败:', currentPath, err);
                // 尝试下一个路径
                ceilingTextureLoadAttempt++;
                tryLoadLocalCeilingTexture();
            }
        );
    }
    
    // 开始尝试加载本地天花板纹理（如果是file://协议会自动跳过）
    tryLoadLocalCeilingTexture();
    
    // 天花板（明亮干净的风格，使用纹理贴图）
    const ceilingMaterial = new THREE.MeshStandardMaterial({ 
        map: ceilingTexture, // 使用程序生成的纹理
        normalMap: ceilingNormalTexture, // 法线贴图（可选）
        color: 0xffffff, // 纯白色基础色
        roughness: 0.3, // 降低粗糙度，使天花板更明亮
        metalness: 0.0,
        flatShading: false
    });
    const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(40, 40, 40, 40), // 增加细分
        ceilingMaterial
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 15;
    scene.add(ceiling);
}

// 添加展品
function addExhibitionItems() {
    // 创建展示柜
    createDisplayCase();
    
    // 注意：现在只能从展示柜中拾取物体，场景中的物体不能拾取
    // 如果需要测试，请先通过"导入GLB模型到展示柜"功能将模型导入到展示柜中
}

// 创建画作
function createPainting(color, width, height) {
    const frameGeometry = new THREE.BoxGeometry(width + 0.2, height + 0.2, 0.1);
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 0.8
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);

    const canvasGeometry = new THREE.PlaneGeometry(width, height);
    const canvasMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.9
    });
    const canvas = new THREE.Mesh(canvasGeometry, canvasMaterial);
    canvas.position.z = 0.06;

    const painting = new THREE.Group();
    painting.add(frame);
    painting.add(canvas);
    painting.castShadow = true;
    painting.receiveShadow = true;

    return painting;
}

// 创建花瓶
function createVase(color, radius, height) {
    const vase = new THREE.Group();

    // 使用LatheGeometry创建花瓶形状（旋转体）
    const points = [];
    const segments = 20;
    
    // 定义花瓶轮廓点（从底部到顶部）
    // 底部较窄，中间较宽，顶部收窄
    points.push(new THREE.Vector2(radius * 0.3, 0)); // 底部
    points.push(new THREE.Vector2(radius * 0.4, height * 0.1));
    points.push(new THREE.Vector2(radius * 0.6, height * 0.2));
    points.push(new THREE.Vector2(radius * 0.9, height * 0.4)); // 中间最宽
    points.push(new THREE.Vector2(radius * 0.95, height * 0.6));
    points.push(new THREE.Vector2(radius * 0.8, height * 0.75)); // 瓶颈开始
    points.push(new THREE.Vector2(radius * 0.6, height * 0.85));
    points.push(new THREE.Vector2(radius * 0.5, height * 0.92));
    points.push(new THREE.Vector2(radius * 0.45, height * 0.97));
    points.push(new THREE.Vector2(radius * 0.4, height)); // 瓶口

    const vaseGeometry = new THREE.LatheGeometry(points, segments);
    const vaseMaterial = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.3,
        roughness: 0.4,
        side: THREE.DoubleSide
    });
    const vaseBody = new THREE.Mesh(vaseGeometry, vaseMaterial);
    vaseBody.castShadow = true;
    vaseBody.receiveShadow = true;
    vase.add(vaseBody);

    // 添加装饰线条
    for (let i = 0; i < 2; i++) {
        const lineGeometry = new THREE.RingGeometry(
            radius * 0.85 + i * 0.05,
            radius * 0.9 + i * 0.05,
            segments
        );
        const lineMaterial = new THREE.MeshStandardMaterial({
            color: color * 0.7,
            metalness: 0.5,
            roughness: 0.3
        });
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.rotation.x = -Math.PI / 2;
        line.position.y = height * (0.3 + i * 0.2);
        vase.add(line);
    }

    return vase;
}

// 创建桌子
function createTable() {
    const table = new THREE.Group();

    // 桌面
    const tableTop = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.1, 1.5),
        new THREE.MeshStandardMaterial({
            color: 0x8B4513, // 棕色木桌
            roughness: 0.8,
            metalness: 0.1
        })
    );
    tableTop.position.y = 1.0;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    table.add(tableTop);

    // 桌腿1（前左）
    const leg1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 1, 0.1),
        new THREE.MeshStandardMaterial({
            color: 0x654321,
            roughness: 0.7
        })
    );
    leg1.position.set(-1.4, 0.5, 0.6);
    leg1.castShadow = true;
    leg1.receiveShadow = true;
    table.add(leg1);

    // 桌腿2（前右）
    const leg2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 1, 0.1),
        new THREE.MeshStandardMaterial({
            color: 0x654321,
            roughness: 0.7
        })
    );
    leg2.position.set(1.4, 0.5, 0.6);
    leg2.castShadow = true;
    leg2.receiveShadow = true;
    table.add(leg2);

    // 桌腿3（后左）
    const leg3 = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 1, 0.1),
        new THREE.MeshStandardMaterial({
            color: 0x654321,
            roughness: 0.7
        })
    );
    leg3.position.set(-1.4, 0.5, -0.6);
    leg3.castShadow = true;
    leg3.receiveShadow = true;
    table.add(leg3);

    // 桌腿4（后右）
    const leg4 = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 1, 0.1),
        new THREE.MeshStandardMaterial({
            color: 0x654321,
            roughness: 0.7
        })
    );
    leg4.position.set(1.4, 0.5, -0.6);
    leg4.castShadow = true;
    leg4.receiveShadow = true;
    table.add(leg4);

    // 添加桌面边缘装饰
    const edge1 = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.05, 0.05),
        new THREE.MeshStandardMaterial({
            color: 0x654321,
            roughness: 0.6
        })
    );
    edge1.position.set(0, 1.025, 0.725);
    table.add(edge1);

    const edge2 = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.05, 0.05),
        new THREE.MeshStandardMaterial({
            color: 0x654321,
            roughness: 0.6
        })
    );
    edge2.position.set(0, 1.025, -0.725);
    table.add(edge2);

    const edge3 = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, 1.5),
        new THREE.MeshStandardMaterial({
            color: 0x654321,
            roughness: 0.6
        })
    );
    edge3.position.set(1.475, 1.025, 0);
    table.add(edge3);

    const edge4 = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, 1.5),
        new THREE.MeshStandardMaterial({
            color: 0x654321,
            roughness: 0.6
        })
    );
    edge4.position.set(-1.475, 1.025, 0);
    table.add(edge4);

    return table;
}

// 创建文物展示柜
function createDisplayCase() {
    const caseGroup = new THREE.Group();
    
    // 展示柜尺寸
    const caseWidth = 3;
    const caseHeight = 2.5;
    const caseDepth = 1.5;
    const glassThickness = 0.05;
    displayCaseBaseHeight = 0.3;
    displayCasePedestalHeight = 3.2; // 基座高度，抬高展示柜（可调整，新标度32对应实际高度3.2）
    
    // 基座（与展示柜底面积相等的长方体，用于抬高展示柜）
    const pedestal = new THREE.Mesh(
        new THREE.BoxGeometry(caseWidth + 0.2, displayCasePedestalHeight, caseDepth + 0.2),
        new THREE.MeshStandardMaterial({
            color: 0x3a3a3a,
            roughness: 0.6,
            metalness: 0.4
        })
    );
    pedestal.position.y = displayCasePedestalHeight / 2;
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    caseGroup.add(pedestal);
    displayCasePedestal = pedestal; // 保存基座引用
    
    // 底座（深色金属，放在基座上）
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(caseWidth + 0.2, displayCaseBaseHeight, caseDepth + 0.2),
        new THREE.MeshStandardMaterial({
            color: 0x2c2c2c,
            roughness: 0.3,
            metalness: 0.7
        })
    );
    base.position.y = displayCasePedestalHeight + displayCaseBaseHeight / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    caseGroup.add(base);
    displayCaseBase = base; // 保存底座引用
    
    // 展示台（白色平台，放在基座上）
    const platform = new THREE.Mesh(
        new THREE.BoxGeometry(caseWidth - 0.1, 0.05, caseDepth - 0.1),
        new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.8,
            metalness: 0.1
        })
    );
    platform.position.y = displayCasePedestalHeight + displayCaseBaseHeight + 0.025;
    platform.receiveShadow = true;
    caseGroup.add(platform);
    displayCasePlatform = platform; // 保存展示台引用
    
    // 玻璃材质（半透明，有反射）
    const glassMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.1,
        roughness: 0.1,
        metalness: 0.9,
        side: THREE.DoubleSide
    });
    
    // 玻璃和框架的相对高度（相对于基座）
    const glassBaseY = displayCasePedestalHeight + displayCaseBaseHeight + 0.05;
    
    // 清空玻璃和框架数组
    displayCaseGlasses = [];
    displayCaseFrames = [];
    
    // 前玻璃（可打开）
    const frontGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(caseWidth, caseHeight),
        glassMaterial
    );
    frontGlass.position.set(0, glassBaseY + caseHeight / 2, caseDepth / 2 + glassThickness / 2);
    frontGlass.castShadow = false;
    caseGroup.add(frontGlass);
    displayCaseGlasses.push(frontGlass);
    
    // 后玻璃
    const backGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(caseWidth, caseHeight),
        glassMaterial
    );
    backGlass.position.set(0, glassBaseY + caseHeight / 2, -caseDepth / 2 - glassThickness / 2);
    caseGroup.add(backGlass);
    displayCaseGlasses.push(backGlass);
    
    // 左玻璃
    const leftGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(caseDepth, caseHeight),
        glassMaterial
    );
    leftGlass.rotation.y = Math.PI / 2;
    leftGlass.position.set(-caseWidth / 2 - glassThickness / 2, glassBaseY + caseHeight / 2, 0);
    caseGroup.add(leftGlass);
    displayCaseGlasses.push(leftGlass);
    
    // 右玻璃
    const rightGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(caseDepth, caseHeight),
        glassMaterial
    );
    rightGlass.rotation.y = -Math.PI / 2;
    rightGlass.position.set(caseWidth / 2 + glassThickness / 2, glassBaseY + caseHeight / 2, 0);
    caseGroup.add(rightGlass);
    displayCaseGlasses.push(rightGlass);
    
    // 顶部玻璃（完全透明）
    const topGlassMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.2, // 提高透明度，使其更明显
        roughness: 0.1,
        metalness: 0.9,
        side: THREE.DoubleSide
    });
    const topGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(caseWidth, caseDepth),
        topGlassMaterial
    );
    topGlass.rotation.x = -Math.PI / 2;
    topGlass.position.set(0, glassBaseY + caseHeight, 0);
    caseGroup.add(topGlass);
    displayCaseGlasses.push(topGlass);
    
    // 顶部玻璃边框（四条边，类似侧面玻璃的边框效果）
    const topFrameMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.2,
        metalness: 0.8
    });
    const topFrameThickness = 0.05; // 边框厚度（垂直方向）
    const topFrameHeight = 0.08; // 边框高度（从玻璃面向上）
    
    // 前边框（沿X轴方向，位于前边）
    const topFrameFront = new THREE.Mesh(
        new THREE.BoxGeometry(caseWidth, topFrameThickness, topFrameHeight),
        topFrameMaterial
    );
    topFrameFront.position.set(0, glassBaseY + caseHeight + topFrameHeight / 2, caseDepth / 2);
    caseGroup.add(topFrameFront);
    displayCaseFrames.push(topFrameFront);
    
    // 后边框（沿X轴方向，位于后边）
    const topFrameBack = new THREE.Mesh(
        new THREE.BoxGeometry(caseWidth, topFrameThickness, topFrameHeight),
        topFrameMaterial
    );
    topFrameBack.position.set(0, glassBaseY + caseHeight + topFrameHeight / 2, -caseDepth / 2);
    caseGroup.add(topFrameBack);
    displayCaseFrames.push(topFrameBack);
    
    // 左边框（沿Z轴方向，位于左边）
    const topFrameLeft = new THREE.Mesh(
        new THREE.BoxGeometry(topFrameThickness, topFrameHeight, caseDepth),
        topFrameMaterial
    );
    topFrameLeft.position.set(-caseWidth / 2, glassBaseY + caseHeight + topFrameHeight / 2, 0);
    caseGroup.add(topFrameLeft);
    displayCaseFrames.push(topFrameLeft);
    
    // 右边框（沿Z轴方向，位于右边）
    const topFrameRight = new THREE.Mesh(
        new THREE.BoxGeometry(topFrameThickness, topFrameHeight, caseDepth),
        topFrameMaterial
    );
    topFrameRight.position.set(caseWidth / 2, glassBaseY + caseHeight + topFrameHeight / 2, 0);
    caseGroup.add(topFrameRight);
    displayCaseFrames.push(topFrameRight);
    
    // 金属框架（四角立柱）
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.2,
        metalness: 0.8
    });
    
    const cornerWidth = 0.08;
    // 前左立柱
    const corner1 = new THREE.Mesh(
        new THREE.BoxGeometry(cornerWidth, caseHeight, cornerWidth),
        frameMaterial
    );
    corner1.position.set(-caseWidth / 2, glassBaseY + caseHeight / 2, caseDepth / 2);
    caseGroup.add(corner1);
    displayCaseFrames.push(corner1);
    
    // 前右立柱
    const corner2 = new THREE.Mesh(
        new THREE.BoxGeometry(cornerWidth, caseHeight, cornerWidth),
        frameMaterial
    );
    corner2.position.set(caseWidth / 2, glassBaseY + caseHeight / 2, caseDepth / 2);
    caseGroup.add(corner2);
    displayCaseFrames.push(corner2);
    
    // 后左立柱
    const corner3 = new THREE.Mesh(
        new THREE.BoxGeometry(cornerWidth, caseHeight, cornerWidth),
        frameMaterial
    );
    corner3.position.set(-caseWidth / 2, glassBaseY + caseHeight / 2, -caseDepth / 2);
    caseGroup.add(corner3);
    displayCaseFrames.push(corner3);
    
    // 后右立柱
    const corner4 = new THREE.Mesh(
        new THREE.BoxGeometry(cornerWidth, caseHeight, cornerWidth),
        frameMaterial
    );
    corner4.position.set(caseWidth / 2, glassBaseY + caseHeight / 2, -caseDepth / 2);
    caseGroup.add(corner4);
    displayCaseFrames.push(corner4);
    
    // 内部照明（点光源）
    const caseLight = new THREE.PointLight(0xffffff, 0.8, 5);
    caseLight.position.set(0, glassBaseY + caseHeight / 2, 0);
    caseGroup.add(caseLight);
    displayCaseLight = caseLight; // 保存照明引用
    
    // 展示柜位置（中心）
    const casePosition = { x: 0, y: 0, z: 0 };
    caseGroup.position.set(casePosition.x, casePosition.y, casePosition.z);
    scene.add(caseGroup);
    
    // 创建内部展品容器组（相对于展示柜位置）
    displayCaseGroup = new THREE.Group();
    // 展示柜内部中心位置：基座高度 + 底座高度 + 展示台厚度的一半
    displayCaseGroup.position.set(
        casePosition.x, 
        casePosition.y + displayCasePedestalHeight + displayCaseBaseHeight + 0.05, 
        casePosition.z
    );
    scene.add(displayCaseGroup);
    
    // 保存展示柜对象
    displayCase = caseGroup;
    
    exhibitionItems.push({ object: caseGroup, name: '文物展示柜' });
    
    console.log('展示柜创建成功，位置:', caseGroup.position);
    console.log('展示柜内部容器位置:', displayCaseGroup.position);
    console.log('展示柜基座高度:', displayCasePedestalHeight);
    
    // 创建告示牌（在展示柜前方，如果开关开启）
    if (showSignboard) {
        createSignboard(casePosition.x, casePosition.y, casePosition.z, caseDepth);
    }
    
    // 创建对话框UI
    createDialogUI();
    
    // 更新基座高度输入框的值（如果控件已创建，使用新标度系统）
    setTimeout(function() {
        const pedestalInput = document.getElementById('pedestal-input');
        if (pedestalInput) {
            // 将实际高度转换为新标度：新标度 = 实际高度 / 0.1
            // 例如：3.2 → 32, 10.0 → 100, 0.5 → 5
            const scaleValue = Math.round(displayCasePedestalHeight / 0.1);
            pedestalInput.value = scaleValue;
        }
    }, 1500); // 延迟1.5秒，确保控件已创建
}

// 调整展示柜基座高度（使用新标度系统：5-100，100=10.0，5=0.5）
function adjustDisplayCasePedestalHeight(scaleValue) {
    if (!displayCase || !displayCasePedestal) {
        console.warn('展示柜或基座未创建');
        return;
    }
    
    // 限制标度范围（5 到 100）
    scaleValue = Math.max(5, Math.min(100, scaleValue));
    
    // 新标度系统：5-100 映射到 0.5-10.0
    // 实际高度 = 0.1 * 新标度
    // 验证：新标度5 → 0.5, 新标度100 → 10.0
    const actualHeight = 0.1 * scaleValue;
    displayCasePedestalHeight = actualHeight;
    
    const caseWidth = 3;
    const caseHeight = 2.5;
    const caseDepth = 1.5;
    const glassThickness = 0.05;
    
    // 更新基座几何体和位置
    displayCasePedestal.geometry.dispose();
    displayCasePedestal.geometry = new THREE.BoxGeometry(caseWidth + 0.2, displayCasePedestalHeight, caseDepth + 0.2);
    displayCasePedestal.position.y = displayCasePedestalHeight / 2;
    
    // 更新底座位置
    if (displayCaseBase) {
        displayCaseBase.position.y = displayCasePedestalHeight + displayCaseBaseHeight / 2;
    }
    
    // 更新展示台位置
    if (displayCasePlatform) {
        displayCasePlatform.position.y = displayCasePedestalHeight + displayCaseBaseHeight + 0.025;
    }
    
    // 更新玻璃和框架的位置
    const glassBaseY = displayCasePedestalHeight + displayCaseBaseHeight + 0.05;
    
    // 更新前玻璃
    if (displayCaseGlasses[0]) {
        displayCaseGlasses[0].position.y = glassBaseY + caseHeight / 2;
    }
    
    // 更新后玻璃
    if (displayCaseGlasses[1]) {
        displayCaseGlasses[1].position.y = glassBaseY + caseHeight / 2;
    }
    
    // 更新左玻璃
    if (displayCaseGlasses[2]) {
        displayCaseGlasses[2].position.y = glassBaseY + caseHeight / 2;
    }
    
    // 更新右玻璃
    if (displayCaseGlasses[3]) {
        displayCaseGlasses[3].position.y = glassBaseY + caseHeight / 2;
    }
    
    // 更新顶部玻璃
    if (displayCaseGlasses[4]) {
        displayCaseGlasses[4].position.y = glassBaseY + caseHeight;
    }
    
    // 更新顶部玻璃边框（四条边）
    // 注意：边框的添加顺序是：前边框(0)、后边框(1)、左边框(2)、右边框(3)
    const topFrameHeight = 0.08; // 边框高度
    // 前边框（索引0）
    if (displayCaseFrames[0]) {
        displayCaseFrames[0].position.y = glassBaseY + caseHeight + topFrameHeight / 2;
        displayCaseFrames[0].position.z = caseDepth / 2;
        displayCaseFrames[0].position.x = 0; // 确保X位置正确
    }
    // 后边框（索引1）
    if (displayCaseFrames[1]) {
        displayCaseFrames[1].position.y = glassBaseY + caseHeight + topFrameHeight / 2;
        displayCaseFrames[1].position.z = -caseDepth / 2;
        displayCaseFrames[1].position.x = 0; // 确保X位置正确
    }
    // 左边框（索引2）
    if (displayCaseFrames[2]) {
        displayCaseFrames[2].position.y = glassBaseY + caseHeight + topFrameHeight / 2;
        displayCaseFrames[2].position.x = -caseWidth / 2;
        displayCaseFrames[2].position.z = 0; // 确保Z位置正确
    }
    // 右边框（索引3）
    if (displayCaseFrames[3]) {
        displayCaseFrames[3].position.y = glassBaseY + caseHeight + topFrameHeight / 2;
        displayCaseFrames[3].position.x = caseWidth / 2;
        displayCaseFrames[3].position.z = 0; // 确保Z位置正确
    }
    
    // 更新四角立柱（索引4-7）
    // 注意：四角立柱的添加顺序是：前左(4)、前右(5)、后左(6)、后右(7)
    if (displayCaseFrames[4]) { // 前左立柱
        displayCaseFrames[4].position.y = glassBaseY + caseHeight / 2;
        displayCaseFrames[4].position.x = -caseWidth / 2;
        displayCaseFrames[4].position.z = caseDepth / 2;
    }
    if (displayCaseFrames[5]) { // 前右立柱
        displayCaseFrames[5].position.y = glassBaseY + caseHeight / 2;
        displayCaseFrames[5].position.x = caseWidth / 2;
        displayCaseFrames[5].position.z = caseDepth / 2;
    }
    if (displayCaseFrames[6]) { // 后左立柱
        displayCaseFrames[6].position.y = glassBaseY + caseHeight / 2;
        displayCaseFrames[6].position.x = -caseWidth / 2;
        displayCaseFrames[6].position.z = -caseDepth / 2;
    }
    if (displayCaseFrames[7]) { // 后右立柱
        displayCaseFrames[7].position.y = glassBaseY + caseHeight / 2;
        displayCaseFrames[7].position.x = caseWidth / 2;
        displayCaseFrames[7].position.z = -caseDepth / 2;
    }
    
    // 更新内部照明位置
    if (displayCaseLight) {
        displayCaseLight.position.y = glassBaseY + caseHeight / 2;
    }
    
    // 更新告示牌位置（如果存在）
    if (signboard && displayCase) {
        const casePosition = displayCase.position;
        const caseWidth = 3; // 展示柜宽度
        signboard.position.set(
            casePosition.x - caseWidth / 2 - 1.5, // 在展示柜左边，距离从0.5增加到1.5
            casePosition.y, // 告示牌底部在地面上
            casePosition.z // 与展示柜Z轴位置相同
        );
    }
    
    // 更新内部展品容器位置
    if (displayCaseGroup && displayCase) {
        const casePosition = displayCase.position;
        displayCaseGroup.position.set(
            casePosition.x,
            casePosition.y + displayCasePedestalHeight + displayCaseBaseHeight + 0.05,
            casePosition.z
        );
    }
    
    console.log('展示柜基座高度已调整:', displayCasePedestalHeight);
}

// 创建展台
function createPedestal() {
    const pedestal = new THREE.Group();

    // 底座
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.5, 0.3, 32),
        new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.7
        })
    );
    base.position.y = 0.15;
    base.castShadow = true;
    base.receiveShadow = true;
    pedestal.add(base);

    // 柱身
    const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 1, 1.5, 32),
        new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.6,
            metalness: 0.3
        })
    );
    column.position.y = 1.05;
    column.castShadow = true;
    column.receiveShadow = true;
    pedestal.add(column);

    // 顶部
    const top = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 0.8, 0.2, 32),
        new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.5
        })
    );
    top.position.y = 2;
    top.castShadow = true;
    top.receiveShadow = true;
    pedestal.add(top);

    return pedestal;
}

// 创建告示牌
function createSignboard(x, y, z, caseDepth) {
    const signboardGroup = new THREE.Group();
    
    // 告示牌支撑柱（高度增加一倍：从2.0到4.0）
    const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 4.0, 0.15), // 支撑柱也稍微变粗
        new THREE.MeshStandardMaterial({
            color: 0x8B4513, // 棕色木纹
            roughness: 0.8,
            metalness: 0.1
        })
    );
    post.position.y = 2.0;
    post.castShadow = true;
    post.receiveShadow = true;
    signboardGroup.add(post);
    
    // 告示牌面板（更大，高度增加一倍）
    const board = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 1.2, 0.08), // 宽度从1.2增加到1.8，高度从0.8增加到1.2
        new THREE.MeshStandardMaterial({
            color: 0xF5F5DC, // 米白色
            roughness: 0.7,
            metalness: 0.1
        })
    );
    board.position.y = 4.0; // 高度从2.0增加到4.0
    board.castShadow = true;
    board.receiveShadow = true;
    signboardGroup.add(board);
    
    // 告示牌文字（使用Canvas纹理，更大）
    const canvas = document.createElement('canvas');
    canvas.width = 1024; // 增加分辨率
    canvas.height = 512;
    const context = canvas.getContext('2d');
    
    // 背景
    context.fillStyle = '#F5F5DC';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // 文字（更大）
    context.fillStyle = '#000000';
    context.font = 'bold 180px Arial'; // 字体从120px增加到180px
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('开始对话', canvas.width / 2, canvas.height / 2);
    
    // 创建纹理
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // 文字面板（更大）
    const textBoard = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 0.9), // 宽度从1.0增加到1.5，高度从0.6增加到0.9
        new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true
        })
    );
    textBoard.position.set(0, 4.0, 0.04); // 高度从2.0增加到4.0
    signboardGroup.add(textBoard);
    
    // 设置位置（在展示柜左边，距离更远）
    const caseWidth = 3; // 展示柜宽度
    const signboardX = x - caseWidth / 2 - 1.5; // 在展示柜左边，距离从0.5增加到1.5
    signboardGroup.position.set(
        signboardX,
        y, // 告示牌底部在地面上
        z // 与展示柜Z轴位置相同
    );
    
    // 让告示牌正面朝向相机（玩家）方向
    // 相机初始位置在 (0, 6, 8)，告示牌需要面向这个方向
    const cameraTarget = new THREE.Vector3(0, 4.0, 8); // 相机方向（高度与告示牌面板相同，从2.0改为4.0）
    const signboardPos = new THREE.Vector3(signboardX, 4.0, z); // 告示牌面板中心位置（高度从2.0改为4.0）
    const direction = new THREE.Vector3().subVectors(cameraTarget, signboardPos).normalize();
    
    // 计算旋转角度，让告示牌正面朝向相机
    const angle = Math.atan2(direction.x, direction.z);
    signboardGroup.rotation.y = angle; // 面向相机方向
    
    scene.add(signboardGroup);
    signboard = signboardGroup;
    signboard.visible = showSignboard; // 根据开关状态设置可见性
    
    // 添加到可拾取列表
    pickableObjects.push(signboard);
    
    console.log('告示牌创建成功，位置:', signboardGroup.position, '可见性:', showSignboard);
}

// 创建对话框UI
function createDialogUI() {
    dialogContainer = document.createElement('div');
    dialogContainer.id = 'dialog-container';
    dialogContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 600px;
        height: 80vh;
        max-height: 80vh;
        background: rgba(30, 30, 30, 0.95);
        border: 3px solid #4CAF50;
        border-radius: 12px;
        padding: 20px;
        z-index: 1000;
        display: none;
        color: white;
        font-family: 'Microsoft YaHei', Arial, sans-serif;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        box-sizing: border-box;
        flex-direction: column;
    `;
    
    // 标题栏
    const titleBar = document.createElement('div');
    titleBar.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 2px solid #4CAF50;
        flex-shrink: 0;
    `;
    
    const title = document.createElement('h2');
    title.textContent = '对话界面';
    title.style.cssText = 'margin: 0; color: #4CAF50; font-size: 24px;';
    titleBar.appendChild(title);
    
    // 关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
        background: #f44336;
        color: white;
        border: none;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        font-size: 24px;
        cursor: pointer;
        line-height: 1;
    `;
    closeBtn.addEventListener('click', closeDialog);
    titleBar.appendChild(closeBtn);
    
    dialogContainer.appendChild(titleBar);
    
    // 时间和日期显示
    const timeDateContainer = document.createElement('div');
    timeDateContainer.id = 'time-date-container';
    timeDateContainer.style.cssText = `
        background: rgba(0, 0, 0, 0.3);
        padding: 10px;
        border-radius: 6px;
        margin-bottom: 20px;
        text-align: center;
        flex-shrink: 0;
    `;
    
    const timeDisplay = document.createElement('div');
    timeDisplay.id = 'time-display';
    timeDisplay.style.cssText = 'font-size: 18px; color: #4CAF50; margin-bottom: 5px;';
    timeDateContainer.appendChild(timeDisplay);
    
    const dateDisplay = document.createElement('div');
    dateDisplay.id = 'date-display';
    dateDisplay.style.cssText = 'font-size: 14px; color: #aaa;';
    timeDateContainer.appendChild(dateDisplay);
    
    dialogContainer.appendChild(timeDateContainer);
    
    // 对话内容区域（微信风格）
    const dialogContent = document.createElement('div');
    dialogContent.id = 'dialog-content';
    dialogContent.style.cssText = `
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        background: linear-gradient(to bottom, #e5e5e5, #d4d4d4);
        padding: 15px;
        border-radius: 6px;
        margin-bottom: 20px;
        font-size: 14px;
        line-height: 1.4;
        box-sizing: border-box;
        min-height: 0;
    `;
    
    // 添加欢迎消息（助手消息）
    const welcomeMsg = createAssistantMessage('欢迎！请选择对话选项：');
    dialogContent.appendChild(welcomeMsg);
    
    dialogContainer.appendChild(dialogContent);
    
    // 对话选项按钮
    const optionsContainer = document.createElement('div');
    optionsContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 10px;
        flex-shrink: 0;
    `;
    
    // 选项A
    const optionA = document.createElement('button');
    optionA.textContent = 'A. 你好';
    optionA.style.cssText = `
        padding: 12px 20px;
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 16px;
        cursor: pointer;
        transition: background 0.3s;
    `;
    optionA.addEventListener('mouseenter', () => optionA.style.background = '#1976D2');
    optionA.addEventListener('mouseleave', () => optionA.style.background = '#2196F3');
    optionA.addEventListener('click', () => handleDialogOption('A'));
    optionsContainer.appendChild(optionA);
    
    // 选项B
    const optionB = document.createElement('button');
    optionB.textContent = 'B. 介绍一下展品';
    optionB.style.cssText = `
        padding: 12px 20px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 16px;
        cursor: pointer;
        transition: background 0.3s;
    `;
    optionB.addEventListener('mouseenter', () => optionB.style.background = '#45a049');
    optionB.addEventListener('mouseleave', () => optionB.style.background = '#4CAF50');
    optionB.addEventListener('click', () => handleDialogOption('B'));
    optionsContainer.appendChild(optionB);
    
    // 选项C
    const optionC = document.createElement('button');
    optionC.textContent = 'C. GLB文件的大小';
    optionC.style.cssText = `
        padding: 12px 20px;
        background: #FF9800;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 16px;
        cursor: pointer;
        transition: background 0.3s;
    `;
    optionC.addEventListener('mouseenter', () => optionC.style.background = '#F57C00');
    optionC.addEventListener('mouseleave', () => optionC.style.background = '#FF9800');
    optionC.addEventListener('click', () => handleDialogOption('C'));
    optionsContainer.appendChild(optionC);
    
    dialogContainer.appendChild(optionsContainer);
    
    document.body.appendChild(dialogContainer);
    
    // 启动时间更新
    updateTimeDate();
    setInterval(updateTimeDate, 1000); // 每秒更新一次
}

// 更新时间日期显示
function updateTimeDate() {
    if (!isDialogOpen) return;
    
    const now = new Date();
    const timeDisplay = document.getElementById('time-display');
    const dateDisplay = document.getElementById('date-display');
    
    if (timeDisplay && dateDisplay) {
        // 时间格式：HH:MM:SS
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        timeDisplay.textContent = `时间：${hours}:${minutes}:${seconds}`;
        
        // 日期格式：YYYY年MM月DD日 星期X
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekday = weekdays[now.getDay()];
        dateDisplay.textContent = `日期：${year}年${month}月${day}日 星期${weekday}`;
    }
}

// 创建用户消息气泡（右侧，绿色）
function createUserMessage(text) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const messageContainer = document.createElement('div');
    messageContainer.style.cssText = `
        display: flex;
        justify-content: flex-end;
        margin-bottom: 12px;
        align-items: flex-end;
    `;
    
    const messageBubble = document.createElement('div');
    messageBubble.style.cssText = `
        max-width: calc(70% - 50px);
        background: #95EC69;
        color: #000;
        padding: 10px 14px;
        border-radius: 8px;
        position: relative;
        word-wrap: break-word;
        word-break: break-word;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        box-sizing: border-box;
    `;
    
    // 添加三角形箭头（右侧）
    const arrow = document.createElement('div');
    arrow.style.cssText = `
        position: absolute;
        right: -6px;
        bottom: 10px;
        width: 0;
        height: 0;
        border-top: 6px solid transparent;
        border-bottom: 6px solid transparent;
        border-left: 6px solid #95EC69;
    `;
    messageBubble.appendChild(arrow);
    
    messageBubble.innerHTML = text;
    messageContainer.appendChild(messageBubble);
    
    // 添加时间
    const timeLabel = document.createElement('div');
    timeLabel.textContent = timeStr;
    timeLabel.style.cssText = `
        font-size: 11px;
        color: #999;
        margin: 0 8px 2px 0;
        align-self: flex-end;
    `;
    messageContainer.insertBefore(timeLabel, messageBubble);
    
    return messageContainer;
}

// 创建助手消息气泡（左侧，白色）
function createAssistantMessage(text) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const messageContainer = document.createElement('div');
    messageContainer.style.cssText = `
        display: flex;
        justify-content: flex-start;
        margin-bottom: 12px;
        align-items: flex-end;
    `;
    
    // 头像（圆形）
    const avatar = document.createElement('div');
    avatar.style.cssText = `
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 16px;
        margin-right: 8px;
        flex-shrink: 0;
    `;
    avatar.textContent = '助';
    messageContainer.appendChild(avatar);
    
    const messageBubble = document.createElement('div');
    messageBubble.style.cssText = `
        max-width: calc(70% - 50px);
        background: #fff;
        color: #000;
        padding: 10px 14px;
        border-radius: 8px;
        position: relative;
        word-wrap: break-word;
        word-break: break-word;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        box-sizing: border-box;
    `;
    
    // 添加三角形箭头（左侧）
    const arrow = document.createElement('div');
    arrow.style.cssText = `
        position: absolute;
        left: -6px;
        bottom: 10px;
        width: 0;
        height: 0;
        border-top: 6px solid transparent;
        border-bottom: 6px solid transparent;
        border-right: 6px solid #fff;
    `;
    messageBubble.appendChild(arrow);
    
    messageBubble.innerHTML = text;
    messageContainer.appendChild(messageBubble);
    
    // 添加时间
    const timeLabel = document.createElement('div');
    timeLabel.textContent = timeStr;
    timeLabel.style.cssText = `
        font-size: 11px;
        color: #999;
        margin: 0 0 2px 8px;
        align-self: flex-end;
    `;
    messageContainer.appendChild(timeLabel);
    
    return messageContainer;
}

// 处理对话选项
function handleDialogOption(option) {
    const dialogContent = document.getElementById('dialog-content');
    if (!dialogContent) return;
    
    let userText = '';
    let response = '';
    
    // 确定用户说的话
    switch(option) {
        case 'A':
            userText = '你好';
            response = '你好！欢迎来到数字展览空间。我是这里的虚拟助手，很高兴为您服务。';
            break;
        case 'B':
            userText = '介绍一下展品';
            if (currentDisplayCaseModel) {
                response = '当前展示柜中展示的是一个3D模型。您可以通过右侧面板导入GLB模型到展示柜中，并调整其大小和旋转角度。';
            } else {
                response = '目前展示柜中还没有展品。您可以通过右侧的"导入GLB模型到展示柜"功能来添加展品。';
            }
            break;
        case 'C':
            userText = 'GLB文件的大小';
            // 获取GLB文件大小
            if (lastLoadedFile) {
                const fileSizeMB = (lastLoadedFile.size / (1024 * 1024)).toFixed(2);
                const fileSizeKB = (lastLoadedFile.size / 1024).toFixed(2);
                response = `当前GLB文件信息：<br>文件名：${lastLoadedFile.name}<br>文件大小：${fileSizeMB} MB (${fileSizeKB} KB, ${lastLoadedFile.size.toLocaleString()} 字节)`;
            } else {
                response = '目前没有加载GLB文件。请先通过右侧面板导入GLB文件。';
            }
            break;
        default:
            userText = '未知选项';
            response = '未知选项。';
    }
    
    // 添加用户消息（右侧，绿色）
    const userMsg = createUserMessage(userText);
    dialogContent.appendChild(userMsg);
    
    // 添加助手回复（左侧，白色）
    const assistantMsg = createAssistantMessage(response);
    dialogContent.appendChild(assistantMsg);
    
    // 滚动到底部
    dialogContent.scrollTop = dialogContent.scrollHeight;
}

// 打开对话框
function openDialog() {
    if (isDialogOpen) return;
    
    isDialogOpen = true;
    if (dialogContainer) {
        dialogContainer.style.display = 'flex';
        updateTimeDate(); // 立即更新一次时间
        // 退出指针锁定
        if (isPointerLocked) {
            document.exitPointerLock();
        }
    }
}

// 关闭对话框
function closeDialog() {
    if (!isDialogOpen) return;
    
    isDialogOpen = false;
    if (dialogContainer) {
        dialogContainer.style.display = 'none';
    }
}

// 检测告示牌点击
function checkSignboardClick() {
    if (!signboard || !raycaster || !camera) return;
    
    // 从屏幕中心发射射线
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    
    // 检测与告示牌的交互
    const intersects = raycaster.intersectObject(signboard, true);
    
    if (intersects.length > 0) {
        console.log('点击了告示牌');
        openDialog();
    }
}

// 设置相机控制
// 处理拾取和放回
function handlePickAndPlace() {
    if (heldObject) {
        // 如果已经手持物体，放回展示柜原处
        returnToDisplayCase();
    } else {
        // 如果没有手持物体，执行拾取（只能从展示柜中拾取）
        pickObjectFromDisplayCase();
    }
}

// 从展示柜中拾取物体（直接拾取，不需要对准）
function pickObjectFromDisplayCase() {
    if (!displayCaseGroup) return;
    
    // 直接检查展示柜内是否有模型
    if (currentDisplayCaseModel && displayCaseGroup.children.includes(currentDisplayCaseModel)) {
        // 保存原始信息
        heldObject = currentDisplayCaseModel;
        heldObjectOriginalParent = heldObject.parent;
        heldObjectOriginalPosition = heldObject.position.clone();
        heldObjectOriginalRotation = heldObject.rotation.clone();
        heldObjectOriginalScale = heldObject.scale.clone();
        
        // 从展示柜组中移除
        displayCaseGroup.remove(heldObject);
        
        // 添加到手持容器（跟随相机）
        heldObjectContainer.add(heldObject);
        
        // 初始化手持物体距离
        heldObjectDistance = -3.0;
        
        // 设置手持位置（相对于容器，相机前方，稍微偏下）
        heldObject.position.set(0, -0.3, heldObjectDistance);
        heldObject.rotation.set(0, 0, 0);
        
        // 稍微缩小以便观察
        const scaleFactor = 0.8;
        heldObject.scale.multiplyScalar(scaleFactor);
        
        console.log('已从展示柜拾取物体:', heldObject.name || '未命名物体');
    } else {
        console.log('展示柜内没有可拾取的物体');
    }
}

// 放回展示柜原处
function returnToDisplayCase() {
    if (!heldObject || !displayCaseGroup) return;
    
    // 恢复原始缩放
    heldObject.scale.copy(heldObjectOriginalScale);
    
    // 从手持容器移除
    heldObjectContainer.remove(heldObject);
    
    // 添加到展示柜组
    displayCaseGroup.add(heldObject);
    
    // 恢复原始位置和旋转
    heldObject.position.copy(heldObjectOriginalPosition);
    heldObject.rotation.copy(heldObjectOriginalRotation);
    
    // 更新当前展示柜模型
    currentDisplayCaseModel = heldObject;
    currentDisplayCaseModelBaseScale = heldObject.scale.x;
    
    // 清除手持状态
    heldObject = null;
    heldObjectOriginalParent = null;
    heldObjectOriginalPosition = null;
    heldObjectOriginalRotation = null;
    heldObjectOriginalScale = null;
    
    console.log('已将物体放回展示柜原处');
}

function setupControls() {
    const moveSpeed = 0.1;
    const keys = {};
    
    // 鼠标控制
    const canvas = renderer.domElement;

    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        
        // 数字键1：拾取/放回物体
        if (e.code === 'Digit1' && !e.repeat) {
            e.preventDefault();
            handlePickAndPlace();
        }
        
        // Q键：退出指针锁定（与ESC键功能相同）
        if (e.code === 'KeyQ' && !e.repeat) {
            if (isPointerLocked) {
                e.preventDefault();
                document.exitPointerLock(); // 退出指针锁定
                console.log('Q键按下：退出指针锁定');
            }
        }
        
        // ESC键：关闭对话框或退出指针锁定
        if (e.code === 'Escape') {
            if (isDialogOpen) {
                e.preventDefault();
                closeDialog();
            } else if (isPointerLocked) {
                e.preventDefault();
                document.exitPointerLock();
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });

    canvas.addEventListener('click', (e) => {
        if (isDialogOpen) {
            // 如果对话框打开，不处理点击
            return;
        }
        
        if (!isPointerLocked) {
            canvas.requestPointerLock();
        } else {
            // 指针锁定时，检测是否点击了告示牌
            checkSignboardClick();
        }
    });

    document.addEventListener('pointerlockchange', () => {
        const wasLocked = isPointerLocked;
        isPointerLocked = document.pointerLockElement === canvas;
        
        // 更新十字光标显示
        const crosshair = document.getElementById('crosshair');
        if (crosshair) {
            crosshair.style.display = isPointerLocked ? 'block' : 'none';
        }
        
        // 更新鼠标样式
        if (isPointerLocked) {
            // 指针锁定时，隐藏系统鼠标光标（十字光标会显示）
            document.body.style.cursor = 'none';
        } else {
            // 退出指针锁定，恢复默认鼠标样式
            document.body.style.cursor = '';
        }
    });

    let pitch = 0;
    let yaw = 0;

    document.addEventListener('mousemove', (e) => {
        if (isPointerLocked) {
            yaw -= e.movementX * 0.002;
            pitch -= e.movementY * 0.002;
            pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
        }
    });

    // 鼠标滚轮事件：调整手持物体的距离
    document.addEventListener('wheel', (e) => {
        if (heldObject && isPointerLocked) {
            e.preventDefault();
            
            // 滚轮向上（deltaY < 0）：物体靠近（z值更正，从-3.0到-2.0等）
            // 滚轮向下（deltaY > 0）：物体远离（z值更负，从-3.0到-4.0等）
            const delta = -e.deltaY * 0.001; // 负号使方向符合直觉，调整灵敏度（原来的1/100）
            heldObjectDistance += delta;
            
            // 限制距离范围（-0.5 到 -10.0，负值表示前方）
            heldObjectDistance = Math.max(-10.0, Math.min(-0.5, heldObjectDistance));
            
            // 更新物体位置
            heldObject.position.z = heldObjectDistance;
            
            console.log('手持物体距离已调整:', heldObjectDistance);
        }
    });

    // 更新相机位置
    function updateCamera() {
        if (keys['KeyW']) {
            camera.position.x -= Math.sin(yaw) * moveSpeed;
            camera.position.z -= Math.cos(yaw) * moveSpeed;
        }
        if (keys['KeyS']) {
            camera.position.x += Math.sin(yaw) * moveSpeed;
            camera.position.z += Math.cos(yaw) * moveSpeed;
        }
        if (keys['KeyA']) {
            camera.position.x -= Math.cos(yaw) * moveSpeed;
            camera.position.z += Math.sin(yaw) * moveSpeed;
        }
        if (keys['KeyD']) {
            camera.position.x += Math.cos(yaw) * moveSpeed;
            camera.position.z -= Math.sin(yaw) * moveSpeed;
        }
        if (keys['Space']) {
            camera.position.y += moveSpeed;
        }
        if (keys['ShiftLeft'] || keys['ShiftRight']) {
            camera.position.y -= moveSpeed;
        }
        if (keys['KeyR']) {
            camera.position.set(0, 6, 8); // 初始视角在展示柜后面
            pitch = 0;
            yaw = 0;
        }

        // 限制相机高度
        camera.position.y = Math.max(1, Math.min(14, camera.position.y));

        // 应用旋转
        camera.rotation.order = 'YXZ';
        camera.rotation.y = yaw;
        camera.rotation.x = pitch;
    }

    // 将updateCamera添加到动画循环
    window.updateCamera = updateCamera;
}

// 窗口大小调整
function onWindowResize() {
    // 更新像素比
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);

    // 更新相机位置（如果控制已设置）
    if (window.updateCamera) {
        window.updateCamera();
    }

    // 更新手持物体容器的位置和旋转（跟随相机）
    if (heldObjectContainer && heldObject) {
        // 同步容器的位置和旋转到相机
        heldObjectContainer.position.copy(camera.position);
        heldObjectContainer.rotation.copy(camera.rotation);
    }

    // 已删除其他物品的旋转代码，只保留展示柜内物体的旋转

    // 旋转展示柜内的物体（左右旋转）
    if (displayCaseRotationDirection !== 0 && currentDisplayCaseModel) {
        currentDisplayCaseModel.rotation.y += displayCaseRotationSpeed * displayCaseRotationDirection;
    }
    
    // 旋转展示柜内的物体（上下旋转）
    if (displayCaseVerticalRotationDirection !== 0 && currentDisplayCaseModel) {
        currentDisplayCaseModel.rotation.x += displayCaseRotationSpeed * displayCaseVerticalRotationDirection;
    }

    renderer.render(scene, camera);
}

// 加载GLB模型文件（从URL）
function loadGLBModel(filePath, position = { x: 0, y: 0, z: 0 }, scale = 1, rotation = { x: 0, y: 0, z: 0 }) {
    if (!gltfLoader) {
        console.error('GLTFLoader未初始化，无法加载GLB文件');
        return Promise.reject('GLTFLoader not initialized');
    }

    return new Promise((resolve, reject) => {
        gltfLoader.load(
            filePath,
            // 加载成功回调
            function(gltf) {
                const model = gltf.scene;
                
                // 设置位置
                model.position.set(position.x, position.y, position.z);
                
                // 设置缩放
                model.scale.set(scale, scale, scale);
                
                // 设置旋转
                model.rotation.set(rotation.x, rotation.y, rotation.z);
                
                // 启用阴影
                model.traverse(function(child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                // 添加到场景
                scene.add(model);
                
                // 添加到可拾取列表
                pickableObjects.push(model);
                
                // 添加到展品列表
                const itemName = `GLB模型_${exhibitionItems.length + 1}`;
                exhibitionItems.push({ object: model, name: itemName });
                
                console.log('GLB模型加载成功:', filePath);
                resolve(model);
            },
            // 加载进度回调
            function(xhr) {
                if (xhr.lengthComputable) {
                    const percentComplete = (xhr.loaded / xhr.total) * 100;
                    console.log('加载进度: ' + Math.round(percentComplete) + '%');
                }
            },
            // 加载错误回调
            function(error) {
                console.error('GLB模型加载失败:', error);
                reject(error);
            }
        );
    });
}

// 从文件输入加载GLB模型（普通导入，放置在场景中，替换之前的模型）
function loadGLBFromFile(file, customScale = null) {
    if (!gltfLoader) {
        alert('GLTFLoader未初始化，无法加载GLB文件');
        return;
    }

    if (!file.name.toLowerCase().endsWith('.glb')) {
        alert('请选择GLB格式的文件');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const arrayBuffer = e.target.result;
        
        gltfLoader.parse(
            arrayBuffer,
            '',
            function(gltf) {
                // 如果已有导入的模型，先删除它
                if (currentImportedModel) {
                    // 从场景中移除
                    scene.remove(currentImportedModel);
                    
                    // 从展品列表中移除
                    const index = exhibitionItems.findIndex(item => item.object === currentImportedModel);
                    if (index !== -1) {
                        exhibitionItems.splice(index, 1);
                    }
                    
                    // 清理模型资源
                    currentImportedModel.traverse(function(child) {
                        if (child.isMesh) {
                            if (child.geometry) {
                                child.geometry.dispose();
                            }
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(material => material.dispose());
                                } else {
                                    child.material.dispose();
                                }
                            }
                        }
                    });
                    
                    console.log('已删除之前的导入模型');
                }
                
                const model = gltf.scene;
                
                // 计算模型的边界框以确定合适的缩放
                let box = new THREE.Box3().setFromObject(model);
                let size = box.getSize(new THREE.Vector3());
                let maxDim = Math.max(size.x, size.y, size.z);
                
                // 计算基准缩放（原始缩放值）
                const baseScale = maxDim > 0 ? 2 / maxDim : 1; // 将最大尺寸缩放到2单位
                
                // 如果提供了自定义缩放值（新标度），使用它；否则使用100（基准，相当于原来的250）
                let scaleValue;
                let actualScale;
                if (customScale !== null && customScale > 0) {
                    // customScale现在表示新的标度值（100为基准，相当于原来的250）
                    scaleValue = customScale;
                    actualScale = (scaleValue / 100) * baseScale * 2.5;
                } else {
                    // 默认使用100（基准值，相当于原来的250）
                    scaleValue = 100;
                    actualScale = baseScale * 2.5;
                }
                
                model.scale.set(actualScale, actualScale, actualScale);
                
                // 将模型底部对齐到地面
                box = new THREE.Box3().setFromObject(model);
                const minY = box.min.y;
                model.position.y = -minY;
                
                // 放置在相机前方
                model.position.set(0, 0, 5);
                
                // 启用阴影
                model.traverse(function(child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                // 添加到场景
                scene.add(model);
                
                // 保存当前导入的模型引用和基准缩放
                currentImportedModel = model;
                currentImportedModelBaseScale = baseScale;
                
                // 添加到可拾取列表
                pickableObjects.push(model);
                
                // 添加到展品列表
                const itemName = `导入的模型_${file.name}`;
                exhibitionItems.push({ object: model, name: itemName });
                
                console.log('GLB模型加载成功（替换）:', file.name, '缩放标度:', scaleValue, '实际缩放:', actualScale);
                alert('模型已替换！\n文件名: ' + file.name + '\n位置: 相机前方\n缩放标度: ' + scaleValue);
            },
            function(error) {
                console.error('GLB模型解析失败:', error);
                alert('模型加载失败: ' + error.message);
            }
        );
    };
    
    reader.readAsArrayBuffer(file);
}

// 应用缩放到场景中的模型（使用新的标度系统，100为基准，相当于原来的250）
function applyScaleToModel(model, scaleValue, baseScale, showAlert = false) {
    if (!model) {
        if (showAlert) {
            alert('没有可调整的模型');
        }
        return;
    }
    
    // 新的标度系统：scaleValue = 100 时，相当于原来的250
    // 实际缩放 = (scaleValue / 100) * baseScale * 2.5
    const actualScale = (scaleValue / 100) * baseScale * 2.5;
    
    // 保存当前模型的位置（底部对齐）
    const box = new THREE.Box3().setFromObject(model);
    const currentMinY = box.min.y;
    const currentPosition = model.position.clone();
    
    // 应用新缩放
    model.scale.set(actualScale, actualScale, actualScale);
    
    // 重新计算边界框
    box.setFromObject(model);
    const newMinY = box.min.y;
    
    // 调整位置，保持底部对齐
    model.position.y = currentPosition.y - (newMinY - currentMinY);
    
    if (showAlert) {
        console.log('模型缩放已应用:', scaleValue, '实际缩放:', actualScale);
    }
}

// 应用缩放到展示柜中的模型（使用新的标度系统，100为基准，相当于原来的250）
function applyScaleToDisplayCaseModel(model, scaleValue, baseScale, showAlert = false) {
    if (!model || !displayCaseGroup) {
        if (showAlert) {
            alert('没有可调整的模型');
        }
        return;
    }
    
    // 新的标度系统：scaleValue = 100 时，相当于原来的250
    // 实际缩放 = (scaleValue / 100) * baseScale * 2.5
    const actualScale = (scaleValue / 100) * baseScale * 2.5;
    
    // 保存当前模型的位置（底部对齐到展示台）
    const box = new THREE.Box3().setFromObject(model);
    const currentMinY = box.min.y;
    const currentPosition = model.position.clone();
    
    // 应用新缩放
    model.scale.set(actualScale, actualScale, actualScale);
    
    // 重新计算边界框
    box.setFromObject(model);
    const newMinY = box.min.y;
    
    // 调整位置，保持底部对齐到展示台（y=0，相对于展示柜内部容器）
    model.position.y = currentPosition.y - (newMinY - currentMinY);
    
    // 保持模型在展示柜中心
    model.position.x = 0;
    model.position.z = 0;
    
    if (showAlert) {
        console.log('展示柜模型缩放已应用:', scaleValue, '实际缩放:', actualScale);
    }
}

// 从文件输入加载GLB模型到展示柜内（替换之前的模型）
function loadGLBToDisplayCase(file, customScale = null) {
    if (!gltfLoader) {
        alert('GLTFLoader未初始化，无法加载GLB文件');
        return;
    }

    if (!displayCaseGroup) {
        alert('展示柜未创建，无法导入模型');
        return;
    }

    if (!file.name.toLowerCase().endsWith('.glb')) {
        alert('请选择GLB格式的文件');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const arrayBuffer = e.target.result;
        
        gltfLoader.parse(
            arrayBuffer,
            '',
            function(gltf) {
                // 如果展示柜内已有模型，先清除所有模型
                if (displayCaseGroup.children.length > 0) {
                    // 遍历展示柜组内的所有子对象
                    const childrenToRemove = [...displayCaseGroup.children];
                    childrenToRemove.forEach(function(child) {
                        // 从展品列表中移除
                        const index = exhibitionItems.findIndex(item => item.object === child);
                        if (index !== -1) {
                            exhibitionItems.splice(index, 1);
                        }
                        
                        // 清理模型资源
                        child.traverse(function(mesh) {
                            if (mesh.isMesh) {
                                if (mesh.geometry) {
                                    mesh.geometry.dispose();
                                }
                                if (mesh.material) {
                                    if (Array.isArray(mesh.material)) {
                                        mesh.material.forEach(material => material.dispose());
                                    } else {
                                        mesh.material.dispose();
                                    }
                                }
                            }
                        });
                        
                        // 从展示柜组中移除
                        displayCaseGroup.remove(child);
                    });
                    
                    // 清空当前模型引用
                    currentDisplayCaseModel = null;
                    
                    console.log('已清除展示柜内的所有模型');
                }
                
                const model = gltf.scene;
                
                // 计算模型的边界框以确定合适的缩放
                let box = new THREE.Box3().setFromObject(model);
                let size = box.getSize(new THREE.Vector3());
                let maxDim = Math.max(size.x, size.y, size.z);
                
                // 计算基准缩放（原始缩放值）
                // 展示柜内部尺寸：宽2.9，高2.0，深1.4
                // 将模型缩放到适合展示柜的大小（最大尺寸不超过0.8单位）
                const maxSize = 0.8;
                const baseScale = maxDim > 0 ? Math.min(maxSize / maxDim, 1.0) : 0.5;
                
                // 如果提供了自定义缩放值（新标度），使用它；否则使用100（基准，相当于原来的250）
                let scaleValue;
                let actualScale;
                if (customScale !== null && customScale > 0) {
                    // customScale现在表示新的标度值（100为基准，相当于原来的250）
                    scaleValue = customScale;
                    actualScale = (scaleValue / 100) * baseScale * 2.5;
                } else {
                    // 默认使用100（基准值，相当于原来的250）
                    scaleValue = 100;
                    actualScale = baseScale * 2.5;
                }
                
                model.scale.set(actualScale, actualScale, actualScale);
                
                // 重新计算缩放后的边界框
                box = new THREE.Box3().setFromObject(model);
                size = box.getSize(new THREE.Vector3());
                const minY = box.min.y;
                
                // 将模型底部对齐到展示台（y=0，相对于展示柜内部容器）
                model.position.y = -minY;
                
                // 放置在展示柜中心（相对于展示柜内部容器组）
                model.position.x = 0;
                model.position.z = 0;
                
                // 启用阴影
                model.traverse(function(child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                // 添加到展示柜组（内部）
                displayCaseGroup.add(model);
                
                // 保存当前展示柜内的模型引用和基准缩放
                currentDisplayCaseModel = model;
                currentDisplayCaseModelBaseScale = baseScale;
                
                // 添加到可拾取列表（展示柜内的模型也可以被拾取）
                pickableObjects.push(model);
                
                // 添加到展品列表
                const itemName = `展示柜文物_${file.name}`;
                exhibitionItems.push({ object: model, name: itemName });
                
                // 更新缩放输入框的值（使用新标度）
                const scaleInput2 = document.getElementById('scale-input-2');
                if (scaleInput2) {
                    scaleInput2.value = scaleValue;
                }
                
                console.log('GLB模型加载到展示柜成功（替换）:', file.name, '缩放标度:', scaleValue, '实际缩放:', actualScale);
                alert('模型已替换到展示柜！\n文件名: ' + file.name + '\n位置: 展示柜内部\n缩放标度: ' + scaleValue);
            },
            function(error) {
                console.error('GLB模型解析失败:', error);
                alert('模型加载失败: ' + error.message);
            }
        );
    };
    
    reader.readAsArrayBuffer(file);
}

// 创建文件输入界面（两个导入窗口）
function createFileInputUI() {
    // 创建告示牌显示开关控件
    const signboardToggleContainer = document.createElement('div');
    signboardToggleContainer.id = 'signboard-toggle-container';
    
    // 先创建内容以计算高度
    const toggleTitle = document.createElement('h3');
    toggleTitle.textContent = '对话功能';
    toggleTitle.style.cssText = 'margin: 0 0 8px 0; color: #9C27B0; font-size: 14px;';
    
    // 开关容器
    const toggleContainer = document.createElement('div');
    toggleContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';
    
    const toggleLabel = document.createElement('label');
    toggleLabel.textContent = '显示"开始对话"告示牌:';
    toggleLabel.style.cssText = 'font-size: 12px; color: #ccc; flex: 1;';
    toggleLabel.setAttribute('for', 'signboard-toggle');
    
    // 开关按钮
    const toggleSwitch = document.createElement('input');
    toggleSwitch.type = 'checkbox';
    toggleSwitch.id = 'signboard-toggle';
    toggleSwitch.checked = showSignboard; // 初始状态
    toggleSwitch.style.cssText = `
        width: 40px;
        height: 20px;
        cursor: pointer;
        appearance: none;
        background: ${showSignboard ? '#4CAF50' : '#666'};
        border-radius: 10px;
        position: relative;
        transition: background 0.3s;
    `;
    
    toggleContainer.appendChild(toggleLabel);
    toggleContainer.appendChild(toggleSwitch);
    
    signboardToggleContainer.appendChild(toggleTitle);
    signboardToggleContainer.appendChild(toggleContainer);
    
    // 临时添加到body以计算高度
    signboardToggleContainer.style.cssText = `
        position: fixed;
        top: -9999px;
        right: 20px;
        background: rgba(0, 0, 0, 0.7);
        padding: 10px;
        border-radius: 6px;
        color: white;
        z-index: 100;
        min-width: 180px;
        border: 2px solid #9C27B0;
        visibility: hidden;
    `;
    document.body.appendChild(signboardToggleContainer);
    
    // 获取面板高度
    const panelHeight = signboardToggleContainer.offsetHeight;
    
    // 计算调整高度面板的底部位置（top: 200px + 面板高度）
    // 调整高度面板大约高度为280px（包含基座高度、旋转控制等）
    const pedestalPanelHeight = 280; // 估算值
    const pedestalPanelBottom = 200 + pedestalPanelHeight;
    
    // 添加开关滑块样式
    const toggleStyle = document.createElement('style');
    toggleStyle.textContent = `
        #signboard-toggle::before {
            content: '';
            position: absolute;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: white;
            top: 2px;
            left: ${showSignboard ? '22px' : '2px'};
            transition: left 0.3s;
        }
        #signboard-toggle:checked::before {
            left: 22px;
        }
        #signboard-toggle:checked {
            background: #4CAF50;
        }
    `;
    document.head.appendChild(toggleStyle);
    
    // 切换事件
    toggleSwitch.addEventListener('change', function() {
        showSignboard = this.checked;
        toggleSwitch.style.background = showSignboard ? '#4CAF50' : '#666';
        
        // 显示或隐藏告示牌
        if (signboard) {
            signboard.visible = showSignboard;
        } else if (showSignboard && displayCase) {
            // 如果告示牌不存在但开关打开了，创建告示牌
            const casePosition = displayCase.position;
            createSignboard(casePosition.x, casePosition.y, casePosition.z, 1.5);
        }
        
        console.log('告示牌显示状态:', showSignboard ? '显示' : '隐藏');
    });
    
    // 设置最终位置：调整高度面板底部 + 对话功能面板自身高度
    signboardToggleContainer.style.cssText = `
        position: fixed;
        top: ${pedestalPanelBottom + panelHeight}px;
        right: 20px;
        background: rgba(0, 0, 0, 0.7);
        padding: 10px;
        border-radius: 6px;
        color: white;
        z-index: 100;
        min-width: 180px;
        border: 2px solid #9C27B0;
        visibility: visible;
    `;
    
    // 展示柜导入窗口
    const fileInputContainer2 = document.createElement('div');
    fileInputContainer2.id = 'file-input-container-2';
    fileInputContainer2.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.7);
        padding: 10px;
        border-radius: 6px;
        color: white;
        z-index: 100;
        min-width: 180px;
        border: 2px solid #00BCD4;
    `;
    
    const title2 = document.createElement('h3');
    title2.textContent = '导入GLB模型到展示柜';
    title2.style.cssText = 'margin: 0 0 8px 0; color: #00BCD4; font-size: 14px;';
    fileInputContainer2.appendChild(title2);
    
    const fileInput2 = document.createElement('input');
    fileInput2.type = 'file';
    fileInput2.accept = '.glb';
    fileInput2.id = 'file-input-2';
    fileInput2.style.cssText = 'margin-bottom: 8px; width: 100%; padding: 4px; font-size: 12px;';
    fileInputContainer2.appendChild(fileInput2);
    
    // 缩放参数输入（展示柜导入）- 新标度系统（100为基准，相当于原来的250）
    const scaleLabel2 = document.createElement('label');
    scaleLabel2.textContent = '缩放参数:';
    scaleLabel2.style.cssText = 'display: block; margin-bottom: 4px; font-size: 11px; color: #ccc;';
    fileInputContainer2.appendChild(scaleLabel2);
    
    // 缩放控制容器
    const scaleContainer2 = document.createElement('div');
    scaleContainer2.style.cssText = 'display: flex; align-items: center; gap: 4px; margin-bottom: 8px;';
    
    // 减号按钮（支持长按）
    const minusBtn2 = document.createElement('button');
    minusBtn2.textContent = '-';
    minusBtn2.id = 'minus-btn-2';
    minusBtn2.style.cssText = `
        width: 40px;
        height: 40px;
        font-size: 24px;
        font-weight: bold;
        background: #f44336;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
    `;
    
    // 长按功能变量
    let minusInterval2 = null;
    let minusTimeout2 = null;
    
    // 减号按钮功能
    function decreaseScale2() {
        if (currentDisplayCaseModel) {
            const currentValue = parseFloat(scaleInput2.value) || 100;
            const newValue = Math.max(1, currentValue - 1);
            scaleInput2.value = newValue;
            applyScaleToDisplayCaseModel(currentDisplayCaseModel, newValue, currentDisplayCaseModelBaseScale, false);
        } else {
            const currentValue = parseFloat(scaleInput2.value) || 100;
            const newValue = Math.max(1, currentValue - 1);
            scaleInput2.value = newValue;
        }
    }
    
    // 鼠标按下
    minusBtn2.addEventListener('mousedown', function() {
        decreaseScale2(); // 立即执行一次
        // 延迟后开始连续执行
        minusTimeout2 = setTimeout(function() {
            minusInterval2 = setInterval(decreaseScale2, 50); // 每50ms执行一次
        }, 300); // 300ms后开始连续执行
    });
    
    // 鼠标释放或离开
    function stopDecrease2() {
        if (minusTimeout2) {
            clearTimeout(minusTimeout2);
            minusTimeout2 = null;
        }
        if (minusInterval2) {
            clearInterval(minusInterval2);
            minusInterval2 = null;
        }
    }
    
    minusBtn2.addEventListener('mouseup', stopDecrease2);
    minusBtn2.addEventListener('mouseleave', stopDecrease2);
    minusBtn2.addEventListener('blur', stopDecrease2);
    
    // 触摸设备支持
    minusBtn2.addEventListener('touchstart', function(e) {
        e.preventDefault();
        decreaseScale2();
        minusTimeout2 = setTimeout(function() {
            minusInterval2 = setInterval(decreaseScale2, 50);
        }, 300);
    });
    
    minusBtn2.addEventListener('touchend', stopDecrease2);
    minusBtn2.addEventListener('touchcancel', stopDecrease2);
    
    scaleContainer2.appendChild(minusBtn2);
    
    // 缩放输入框（隐藏spinner箭头）
    const scaleInput2 = document.createElement('input');
    scaleInput2.type = 'number';
    scaleInput2.step = '1';
    scaleInput2.min = '1';
    scaleInput2.max = '500';
    scaleInput2.value = '100';
    scaleInput2.placeholder = '100';
    scaleInput2.id = 'scale-input-2';
    scaleInput2.style.cssText = `
        flex: 1;
        padding: 6px;
        text-align: center;
        font-size: 13px;
        border: 1px solid #555;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        box-sizing: border-box;
    `;
    // 隐藏数字输入框的spinner箭头（Chrome, Safari, Edge）
    scaleInput2.style.webkitAppearance = 'none';
    scaleInput2.style.mozAppearance = 'textfield';
    // 隐藏spinner（Firefox）
    scaleInput2.addEventListener('wheel', function(e) {
        e.preventDefault();
    });
    // 移除spinner箭头样式
    const style2 = document.createElement('style');
    style2.textContent = `
        #scale-input-2::-webkit-outer-spin-button,
        #scale-input-2::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        #scale-input-2[type=number] {
            -moz-appearance: textfield;
        }
    `;
    document.head.appendChild(style2);
    scaleContainer2.appendChild(scaleInput2);
    
    // 加号按钮（支持长按）
    const plusBtn2 = document.createElement('button');
    plusBtn2.textContent = '+';
    plusBtn2.id = 'plus-btn-2';
    plusBtn2.style.cssText = `
        width: 32px;
        height: 32px;
        font-size: 20px;
        font-weight: bold;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
    `;
    
    // 长按功能变量
    let plusInterval2 = null;
    let plusTimeout2 = null;
    
    // 加号按钮功能
    function increaseScale2() {
        if (currentDisplayCaseModel) {
            const currentValue = parseFloat(scaleInput2.value) || 100;
            const newValue = Math.min(500, currentValue + 1);
            scaleInput2.value = newValue;
            applyScaleToDisplayCaseModel(currentDisplayCaseModel, newValue, currentDisplayCaseModelBaseScale, false);
        } else {
            const currentValue = parseFloat(scaleInput2.value) || 100;
            const newValue = Math.min(500, currentValue + 1);
            scaleInput2.value = newValue;
        }
    }
    
    // 鼠标按下
    plusBtn2.addEventListener('mousedown', function() {
        increaseScale2(); // 立即执行一次
        // 延迟后开始连续执行
        plusTimeout2 = setTimeout(function() {
            plusInterval2 = setInterval(increaseScale2, 50); // 每50ms执行一次
        }, 300); // 300ms后开始连续执行
    });
    
    // 鼠标释放或离开
    function stopIncrease2() {
        if (plusTimeout2) {
            clearTimeout(plusTimeout2);
            plusTimeout2 = null;
        }
        if (plusInterval2) {
            clearInterval(plusInterval2);
            plusInterval2 = null;
        }
    }
    
    plusBtn2.addEventListener('mouseup', stopIncrease2);
    plusBtn2.addEventListener('mouseleave', stopIncrease2);
    plusBtn2.addEventListener('blur', stopIncrease2);
    
    // 触摸设备支持
    plusBtn2.addEventListener('touchstart', function(e) {
        e.preventDefault();
        increaseScale2();
        plusTimeout2 = setTimeout(function() {
            plusInterval2 = setInterval(increaseScale2, 50);
        }, 300);
    });
    
    plusBtn2.addEventListener('touchend', stopIncrease2);
    plusBtn2.addEventListener('touchcancel', stopIncrease2);
    
    scaleContainer2.appendChild(plusBtn2);
    
    fileInputContainer2.appendChild(scaleContainer2);
    
    fileInput2.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // 保存文件信息，用于后续显示文件大小
            lastLoadedFile = {
                name: file.name,
                size: file.size,
                type: file.type
            };
            
            // 文件选择时，使用输入框中的缩放值（如果有），否则使用null（自动缩放，即100）
            const scaleValue = parseFloat(scaleInput2.value);
            const customScale = (scaleValue > 0) ? scaleValue : null;
            loadGLBToDisplayCase(file, customScale);
            // 清空输入，允许重复选择同一文件
            e.target.value = '';
        }
    });
    
    // 实时调整缩放（通过输入框变化实时调整，延迟500ms避免频繁调整）
    let scaleTimeout2 = null;
    scaleInput2.addEventListener('input', function() {
        // 清除之前的定时器
        if (scaleTimeout2) {
            clearTimeout(scaleTimeout2);
        }
        // 延迟500ms后应用，避免频繁调整
        scaleTimeout2 = setTimeout(function() {
            if (currentDisplayCaseModel) {
                const scaleValue = parseFloat(scaleInput2.value);
                if (scaleValue > 0) {
                    applyScaleToDisplayCaseModel(currentDisplayCaseModel, scaleValue, currentDisplayCaseModelBaseScale, false);
                }
            }
        }, 500);
    });
    
    const info2 = document.createElement('p');
    info2.textContent = '选择文件导入，然后调整缩放参数';
    info2.style.cssText = 'margin: 0; font-size: 11px; color: #aaa;';
    fileInputContainer2.appendChild(info2);
    
    document.body.appendChild(fileInputContainer2);
    
    // 展示柜基座高度调整控件
    const pedestalControlContainer = document.createElement('div');
    pedestalControlContainer.id = 'pedestal-control-container';
    pedestalControlContainer.style.cssText = `
        position: fixed;
        top: 200px;
        right: 20px;
        background: rgba(0, 0, 0, 0.7);
        padding: 10px;
        border-radius: 6px;
        color: white;
        z-index: 100;
        min-width: 180px;
        border: 2px solid #FF5722;
    `;
    
    const pedestalTitle = document.createElement('h3');
    pedestalTitle.textContent = '调整展示柜基座高度';
    pedestalTitle.style.cssText = 'margin: 0 0 8px 0; color: #FF5722; font-size: 14px;';
    pedestalControlContainer.appendChild(pedestalTitle);
    
    const pedestalLabel = document.createElement('label');
    pedestalLabel.textContent = '基座高度:';
    pedestalLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 11px; color: #ccc;';
    pedestalControlContainer.appendChild(pedestalLabel);
    
    // 基座高度控制容器
    const pedestalControl = document.createElement('div');
    pedestalControl.style.cssText = 'display: flex; align-items: center; gap: 4px; margin-bottom: 8px;';
    
    // 减号按钮（降低基座）
    const minusPedestalBtn = document.createElement('button');
    minusPedestalBtn.textContent = '-';
    minusPedestalBtn.id = 'minus-pedestal-btn';
    minusPedestalBtn.style.cssText = `
        width: 32px;
        height: 32px;
        font-size: 20px;
        font-weight: bold;
        background: #f44336;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
    `;
    
    // 基座高度输入框（新标度系统：5-100）
    const pedestalInput = document.createElement('input');
    pedestalInput.type = 'number';
    pedestalInput.step = '1';
    pedestalInput.min = '5';
    pedestalInput.max = '100';
    pedestalInput.value = '32'; // 3.2的实际高度对应新标度32
    pedestalInput.placeholder = '32';
    pedestalInput.id = 'pedestal-input';
    pedestalInput.style.cssText = `
        flex: 1;
        padding: 6px;
        text-align: center;
        font-size: 13px;
        border: 1px solid #555;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        box-sizing: border-box;
    `;
    // 隐藏spinner箭头
    pedestalInput.style.webkitAppearance = 'none';
    pedestalInput.style.mozAppearance = 'textfield';
    pedestalInput.addEventListener('wheel', function(e) {
        e.preventDefault();
    });
    // 移除spinner箭头样式
    const stylePedestal = document.createElement('style');
    stylePedestal.textContent = `
        #pedestal-input::-webkit-outer-spin-button,
        #pedestal-input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        #pedestal-input[type=number] {
            -moz-appearance: textfield;
        }
    `;
    document.head.appendChild(stylePedestal);
    
    // 加号按钮（升高基座）
    const plusPedestalBtn = document.createElement('button');
    plusPedestalBtn.textContent = '+';
    plusPedestalBtn.id = 'plus-pedestal-btn';
    plusPedestalBtn.style.cssText = `
        width: 32px;
        height: 32px;
        font-size: 20px;
        font-weight: bold;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
    `;
    
    // 调整基座高度的函数（新标度系统：5-100）
    function adjustPedestalHeight(delta) {
        const currentValue = parseFloat(pedestalInput.value) || 12;
        const newValue = Math.max(5, Math.min(100, currentValue + delta));
        pedestalInput.value = newValue;
        adjustDisplayCasePedestalHeight(newValue);
    }
    
    // 减号按钮事件（支持长按）
    let minusPedestalInterval = null;
    let minusPedestalTimeout = null;
    
    function decreasePedestalHeight() {
        adjustPedestalHeight(-1); // 新标度系统：每次-1
    }
    
    minusPedestalBtn.addEventListener('mousedown', function() {
        decreasePedestalHeight();
        minusPedestalTimeout = setTimeout(function() {
            minusPedestalInterval = setInterval(decreasePedestalHeight, 50);
        }, 300);
    });
    
    function stopDecreasePedestal() {
        if (minusPedestalTimeout) {
            clearTimeout(minusPedestalTimeout);
            minusPedestalTimeout = null;
        }
        if (minusPedestalInterval) {
            clearInterval(minusPedestalInterval);
            minusPedestalInterval = null;
        }
    }
    
    minusPedestalBtn.addEventListener('mouseup', stopDecreasePedestal);
    minusPedestalBtn.addEventListener('mouseleave', stopDecreasePedestal);
    minusPedestalBtn.addEventListener('blur', stopDecreasePedestal);
    minusPedestalBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        decreasePedestalHeight();
        minusPedestalTimeout = setTimeout(function() {
            minusPedestalInterval = setInterval(decreasePedestalHeight, 50);
        }, 300);
    });
    minusPedestalBtn.addEventListener('touchend', stopDecreasePedestal);
    minusPedestalBtn.addEventListener('touchcancel', stopDecreasePedestal);
    
    // 加号按钮事件（支持长按）
    let plusPedestalInterval = null;
    let plusPedestalTimeout = null;
    
    function increasePedestalHeight() {
        adjustPedestalHeight(1); // 新标度系统：每次+1
    }
    
    plusPedestalBtn.addEventListener('mousedown', function() {
        increasePedestalHeight();
        plusPedestalTimeout = setTimeout(function() {
            plusPedestalInterval = setInterval(increasePedestalHeight, 50);
        }, 300);
    });
    
    function stopIncreasePedestal() {
        if (plusPedestalTimeout) {
            clearTimeout(plusPedestalTimeout);
            plusPedestalTimeout = null;
        }
        if (plusPedestalInterval) {
            clearInterval(plusPedestalInterval);
            plusPedestalInterval = null;
        }
    }
    
    plusPedestalBtn.addEventListener('mouseup', stopIncreasePedestal);
    plusPedestalBtn.addEventListener('mouseleave', stopIncreasePedestal);
    plusPedestalBtn.addEventListener('blur', stopIncreasePedestal);
    plusPedestalBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        increasePedestalHeight();
        plusPedestalTimeout = setTimeout(function() {
            plusPedestalInterval = setInterval(increasePedestalHeight, 50);
        }, 300);
    });
    plusPedestalBtn.addEventListener('touchend', stopIncreasePedestal);
    plusPedestalBtn.addEventListener('touchcancel', stopIncreasePedestal);
    
    // 输入框实时调整（新标度系统：5-100）
    let pedestalTimeout = null;
    pedestalInput.addEventListener('input', function() {
        if (pedestalTimeout) {
            clearTimeout(pedestalTimeout);
        }
        pedestalTimeout = setTimeout(function() {
            const value = parseFloat(pedestalInput.value);
            if (value >= 5 && value <= 100) {
                adjustDisplayCasePedestalHeight(value);
            }
        }, 500);
    });
    
    pedestalControl.appendChild(minusPedestalBtn);
    pedestalControl.appendChild(pedestalInput);
    pedestalControl.appendChild(plusPedestalBtn);
    pedestalControlContainer.appendChild(pedestalControl);
    
    const pedestalInfo = document.createElement('p');
    pedestalInfo.textContent = '调整展示柜基座高度';
    pedestalInfo.style.cssText = 'margin: 0; font-size: 11px; color: #aaa;';
    pedestalControlContainer.appendChild(pedestalInfo);
    
    // 添加分隔线
    const separator = document.createElement('hr');
    separator.style.cssText = 'margin: 10px 0; border: none; border-top: 1px solid #555;';
    pedestalControlContainer.appendChild(separator);
    
    // 展示柜内物体旋转控制
    const rotationTitle = document.createElement('h3');
    rotationTitle.textContent = '展示柜物体旋转';
    rotationTitle.style.cssText = 'margin: 0 0 8px 0; color: #FF5722; font-size: 14px;';
    pedestalControlContainer.appendChild(rotationTitle);
    
    // 旋转按钮容器
    const rotationButtonsContainer = document.createElement('div');
    rotationButtonsContainer.style.cssText = 'display: flex; gap: 6px; margin-bottom: 8px; align-items: center;';
    
    // 左旋转按钮
    const leftRotationBtn = document.createElement('button');
    leftRotationBtn.textContent = '◄ 左旋转';
    leftRotationBtn.id = 'left-rotation-btn';
    leftRotationBtn.style.cssText = `
        flex: 1;
        padding: 8px;
        font-size: 12px;
        font-weight: bold;
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        user-select: none;
        transition: background 0.2s;
    `;
    
    // 右旋转按钮
    const rightRotationBtn = document.createElement('button');
    rightRotationBtn.textContent = '右旋转 ►';
    rightRotationBtn.id = 'right-rotation-btn';
    rightRotationBtn.style.cssText = `
        flex: 1;
        padding: 8px;
        font-size: 12px;
        font-weight: bold;
        background: #FF9800;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        user-select: none;
        transition: background 0.2s;
    `;
    
    // 左旋转按钮事件
    leftRotationBtn.addEventListener('mousedown', function() {
        displayCaseRotationDirection = -1;
        leftRotationBtn.style.background = '#1976D2';
        console.log('开始左旋转');
    });
    
    leftRotationBtn.addEventListener('mouseup', function() {
        displayCaseRotationDirection = 0;
        leftRotationBtn.style.background = '#2196F3';
        console.log('停止旋转');
    });
    
    leftRotationBtn.addEventListener('mouseleave', function() {
        displayCaseRotationDirection = 0;
        leftRotationBtn.style.background = '#2196F3';
        console.log('停止旋转');
    });
    
    leftRotationBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        displayCaseRotationDirection = -1;
        leftRotationBtn.style.background = '#1976D2';
        console.log('开始左旋转');
    });
    
    leftRotationBtn.addEventListener('touchend', function(e) {
        e.preventDefault();
        displayCaseRotationDirection = 0;
        leftRotationBtn.style.background = '#2196F3';
        console.log('停止旋转');
    });
    
    leftRotationBtn.addEventListener('touchcancel', function(e) {
        e.preventDefault();
        displayCaseRotationDirection = 0;
        leftRotationBtn.style.background = '#2196F3';
        console.log('停止旋转');
    });
    
    // 右旋转按钮事件
    rightRotationBtn.addEventListener('mousedown', function() {
        displayCaseRotationDirection = 1;
        rightRotationBtn.style.background = '#F57C00';
        console.log('开始右旋转');
    });
    
    rightRotationBtn.addEventListener('mouseup', function() {
        displayCaseRotationDirection = 0;
        rightRotationBtn.style.background = '#FF9800';
        console.log('停止旋转');
    });
    
    rightRotationBtn.addEventListener('mouseleave', function() {
        displayCaseRotationDirection = 0;
        rightRotationBtn.style.background = '#FF9800';
        console.log('停止旋转');
    });
    
    rightRotationBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        displayCaseRotationDirection = 1;
        rightRotationBtn.style.background = '#F57C00';
        console.log('开始右旋转');
    });
    
    rightRotationBtn.addEventListener('touchend', function(e) {
        e.preventDefault();
        displayCaseRotationDirection = 0;
        rightRotationBtn.style.background = '#FF9800';
        console.log('停止旋转');
    });
    
    rightRotationBtn.addEventListener('touchcancel', function(e) {
        e.preventDefault();
        displayCaseRotationDirection = 0;
        rightRotationBtn.style.background = '#FF9800';
        console.log('停止旋转');
    });
    
    // 添加上下旋转按钮
    const verticalRotationContainer = document.createElement('div');
    verticalRotationContainer.style.cssText = 'margin-top: 8px;';
    
    const verticalRotationLabel = document.createElement('label');
    verticalRotationLabel.textContent = '上下旋转:';
    verticalRotationLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 11px; color: #ccc;';
    verticalRotationContainer.appendChild(verticalRotationLabel);
    
    const verticalRotationButtons = document.createElement('div');
    verticalRotationButtons.style.cssText = 'display: flex; gap: 4px;';
    
    // 向上旋转按钮
    const upRotationBtn = document.createElement('button');
    upRotationBtn.textContent = '↑ 向上';
    upRotationBtn.id = 'up-rotation-btn';
    upRotationBtn.style.cssText = `
        flex: 1;
        padding: 8px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        user-select: none;
    `;
    
    // 向下旋转按钮
    const downRotationBtn = document.createElement('button');
    downRotationBtn.textContent = '↓ 向下';
    downRotationBtn.id = 'down-rotation-btn';
    downRotationBtn.style.cssText = `
        flex: 1;
        padding: 8px;
        background: #9C27B0;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        user-select: none;
    `;
    
    // 向上旋转按钮事件
    upRotationBtn.addEventListener('mousedown', function() {
        displayCaseVerticalRotationDirection = 1;
        upRotationBtn.style.background = '#45a049';
        console.log('开始向上旋转');
    });
    
    upRotationBtn.addEventListener('mouseup', function() {
        displayCaseVerticalRotationDirection = 0;
        upRotationBtn.style.background = '#4CAF50';
        console.log('停止上下旋转');
    });
    
    upRotationBtn.addEventListener('mouseleave', function() {
        displayCaseVerticalRotationDirection = 0;
        upRotationBtn.style.background = '#4CAF50';
        console.log('停止上下旋转');
    });
    
    upRotationBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        displayCaseVerticalRotationDirection = 1;
        upRotationBtn.style.background = '#45a049';
        console.log('开始向上旋转');
    });
    
    upRotationBtn.addEventListener('touchend', function(e) {
        e.preventDefault();
        displayCaseVerticalRotationDirection = 0;
        upRotationBtn.style.background = '#4CAF50';
        console.log('停止上下旋转');
    });
    
    upRotationBtn.addEventListener('touchcancel', function(e) {
        e.preventDefault();
        displayCaseVerticalRotationDirection = 0;
        upRotationBtn.style.background = '#4CAF50';
        console.log('停止上下旋转');
    });
    
    // 向下旋转按钮事件
    downRotationBtn.addEventListener('mousedown', function() {
        displayCaseVerticalRotationDirection = -1;
        downRotationBtn.style.background = '#7b1fa2';
        console.log('开始向下旋转');
    });
    
    downRotationBtn.addEventListener('mouseup', function() {
        displayCaseVerticalRotationDirection = 0;
        downRotationBtn.style.background = '#9C27B0';
        console.log('停止上下旋转');
    });
    
    downRotationBtn.addEventListener('mouseleave', function() {
        displayCaseVerticalRotationDirection = 0;
        downRotationBtn.style.background = '#9C27B0';
        console.log('停止上下旋转');
    });
    
    downRotationBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        displayCaseVerticalRotationDirection = -1;
        downRotationBtn.style.background = '#7b1fa2';
        console.log('开始向下旋转');
    });
    
    downRotationBtn.addEventListener('touchend', function(e) {
        e.preventDefault();
        displayCaseVerticalRotationDirection = 0;
        downRotationBtn.style.background = '#9C27B0';
        console.log('停止上下旋转');
    });
    
    downRotationBtn.addEventListener('touchcancel', function(e) {
        e.preventDefault();
        displayCaseVerticalRotationDirection = 0;
        downRotationBtn.style.background = '#9C27B0';
        console.log('停止上下旋转');
    });
    
    verticalRotationButtons.appendChild(upRotationBtn);
    verticalRotationButtons.appendChild(downRotationBtn);
    verticalRotationContainer.appendChild(verticalRotationButtons);
    
    // 添加快捷键提示
    upRotationBtn.title = '↑ 向上旋转';
    downRotationBtn.title = '↓ 向下旋转';
    
    rotationButtonsContainer.appendChild(leftRotationBtn);
    rotationButtonsContainer.appendChild(rightRotationBtn);
    pedestalControlContainer.appendChild(rotationButtonsContainer);
    
    // 添加上下旋转按钮到控制面板
    pedestalControlContainer.appendChild(verticalRotationContainer);
    
    // 旋转速度控制（新标度系统：1-100，100=原0.1）
    const rotationSpeedLabel = document.createElement('label');
    rotationSpeedLabel.textContent = '旋转速度:';
    rotationSpeedLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 11px; color: #ccc;';
    pedestalControlContainer.appendChild(rotationSpeedLabel);
    
    const rotationSpeedControl = document.createElement('div');
    rotationSpeedControl.style.cssText = 'display: flex; align-items: center; gap: 4px; margin-bottom: 8px;';
    
    // 减号按钮（降低速度）
    const minusSpeedBtn = document.createElement('button');
    minusSpeedBtn.textContent = '-';
    minusSpeedBtn.id = 'minus-speed-btn';
    minusSpeedBtn.style.cssText = `
        width: 32px;
        height: 32px;
        font-size: 20px;
        font-weight: bold;
        background: #f44336;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
    `;
    
    // 旋转速度输入框（新标度系统：1-100）
    const rotationSpeedInput = document.createElement('input');
    rotationSpeedInput.type = 'number';
    rotationSpeedInput.step = '1';
    rotationSpeedInput.min = '1';
    rotationSpeedInput.max = '100';
    rotationSpeedInput.value = displayCaseRotationSpeedScale.toString();
    rotationSpeedInput.id = 'rotation-speed-input';
    rotationSpeedInput.style.cssText = `
        flex: 1;
        padding: 6px;
        text-align: center;
        font-size: 13px;
        border: 1px solid #555;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        box-sizing: border-box;
    `;
    rotationSpeedInput.style.webkitAppearance = 'none';
    rotationSpeedInput.style.mozAppearance = 'textfield';
    rotationSpeedInput.addEventListener('wheel', function(e) {
        e.preventDefault();
    });
    
    // 隐藏spinner箭头样式
    const styleRotationSpeed = document.createElement('style');
    styleRotationSpeed.textContent = `
        #rotation-speed-input::-webkit-outer-spin-button,
        #rotation-speed-input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        #rotation-speed-input[type=number] {
            -moz-appearance: textfield;
        }
    `;
    document.head.appendChild(styleRotationSpeed);
    
    // 加号按钮（提高速度）
    const plusSpeedBtn = document.createElement('button');
    plusSpeedBtn.textContent = '+';
    plusSpeedBtn.id = 'plus-speed-btn';
    plusSpeedBtn.style.cssText = `
        width: 32px;
        height: 32px;
        font-size: 20px;
        font-weight: bold;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
    `;
    
    // 调整旋转速度的函数（新标度系统：1-100）
    function adjustRotationSpeed(delta) {
        const currentValue = parseFloat(rotationSpeedInput.value) || displayCaseRotationSpeedScale;
        const newScaleValue = Math.max(1, Math.min(100, currentValue + delta));
        rotationSpeedInput.value = newScaleValue.toString();
        displayCaseRotationSpeedScale = newScaleValue;
        // 转换新标度到实际速度：新标度 * 0.001
        displayCaseRotationSpeed = newScaleValue * 0.001;
        console.log('旋转速度标度:', displayCaseRotationSpeedScale, '实际速度:', displayCaseRotationSpeed);
    }
    
    // 减号按钮事件（支持长按）
    let minusSpeedInterval = null;
    let minusSpeedTimeout = null;
    
    function decreaseRotationSpeed() {
        adjustRotationSpeed(-1); // 新标度系统：每次-1
    }
    
    minusSpeedBtn.addEventListener('mousedown', function() {
        decreaseRotationSpeed();
        minusSpeedTimeout = setTimeout(function() {
            minusSpeedInterval = setInterval(decreaseRotationSpeed, 50);
        }, 300);
    });
    
    function stopDecreaseSpeed() {
        if (minusSpeedTimeout) {
            clearTimeout(minusSpeedTimeout);
            minusSpeedTimeout = null;
        }
        if (minusSpeedInterval) {
            clearInterval(minusSpeedInterval);
            minusSpeedInterval = null;
        }
    }
    
    minusSpeedBtn.addEventListener('mouseup', stopDecreaseSpeed);
    minusSpeedBtn.addEventListener('mouseleave', stopDecreaseSpeed);
    minusSpeedBtn.addEventListener('blur', stopDecreaseSpeed);
    minusSpeedBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        decreaseRotationSpeed();
        minusSpeedTimeout = setTimeout(function() {
            minusSpeedInterval = setInterval(decreaseRotationSpeed, 50);
        }, 300);
    });
    minusSpeedBtn.addEventListener('touchend', stopDecreaseSpeed);
    minusSpeedBtn.addEventListener('touchcancel', stopDecreaseSpeed);
    
    // 加号按钮事件（支持长按）
    let plusSpeedInterval = null;
    let plusSpeedTimeout = null;
    
    function increaseRotationSpeed() {
        adjustRotationSpeed(1); // 新标度系统：每次+1
    }
    
    plusSpeedBtn.addEventListener('mousedown', function() {
        increaseRotationSpeed();
        plusSpeedTimeout = setTimeout(function() {
            plusSpeedInterval = setInterval(increaseRotationSpeed, 50);
        }, 300);
    });
    
    function stopIncreaseSpeed() {
        if (plusSpeedTimeout) {
            clearTimeout(plusSpeedTimeout);
            plusSpeedTimeout = null;
        }
        if (plusSpeedInterval) {
            clearInterval(plusSpeedInterval);
            plusSpeedInterval = null;
        }
    }
    
    plusSpeedBtn.addEventListener('mouseup', stopIncreaseSpeed);
    plusSpeedBtn.addEventListener('mouseleave', stopIncreaseSpeed);
    plusSpeedBtn.addEventListener('blur', stopIncreaseSpeed);
    plusSpeedBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        increaseRotationSpeed();
        plusSpeedTimeout = setTimeout(function() {
            plusSpeedInterval = setInterval(increaseRotationSpeed, 50);
        }, 300);
    });
    plusSpeedBtn.addEventListener('touchend', stopIncreaseSpeed);
    plusSpeedBtn.addEventListener('touchcancel', stopIncreaseSpeed);
    
    // 输入框实时调整（新标度系统：1-100）
    let rotationSpeedTimeout = null;
    rotationSpeedInput.addEventListener('input', function() {
        if (rotationSpeedTimeout) {
            clearTimeout(rotationSpeedTimeout);
        }
        rotationSpeedTimeout = setTimeout(function() {
            const scaleValue = parseFloat(rotationSpeedInput.value);
            if (scaleValue >= 1 && scaleValue <= 100) {
                displayCaseRotationSpeedScale = scaleValue;
                // 转换新标度到实际速度：新标度 * 0.001
                displayCaseRotationSpeed = scaleValue * 0.001;
                console.log('旋转速度标度:', displayCaseRotationSpeedScale, '实际速度:', displayCaseRotationSpeed);
            }
        }, 500);
    });
    
    rotationSpeedControl.appendChild(minusSpeedBtn);
    rotationSpeedControl.appendChild(rotationSpeedInput);
    rotationSpeedControl.appendChild(plusSpeedBtn);
    pedestalControlContainer.appendChild(rotationSpeedControl);
    
    const rotationInfo = document.createElement('p');
    rotationInfo.textContent = '按住左/右旋转按钮进行旋转，松开即停止';
    rotationInfo.style.cssText = 'margin: 0; font-size: 11px; color: #aaa;';
    pedestalControlContainer.appendChild(rotationInfo);
    
    document.body.appendChild(pedestalControlContainer);
    
    // 添加键盘快捷键支持
    setupKeyboardShortcuts();
}

// 设置键盘快捷键（只保留旋转和基座高度）
// 基座高度调整的长按变量（全局）
let keyboardPedestalInterval = null;
let keyboardPedestalTimeout = null;

function setupKeyboardShortcuts() {
    // 防止在输入框中触发快捷键
    function isInputFocused() {
        const activeElement = document.activeElement;
        return activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable
        );
    }
    
    // 基座高度调整函数
    function adjustPedestalHeightByKeyboard(delta) {
        const pedestalInput = document.getElementById('pedestal-input');
        if (!pedestalInput) return;
        
        const currentValue = parseFloat(pedestalInput.value) || 32;
        const newValue = Math.max(5, Math.min(100, currentValue + delta));
        pedestalInput.value = newValue;
        adjustDisplayCasePedestalHeight(newValue);
    }
    
    // 停止基座高度调整
    function stopPedestalAdjustment() {
        if (keyboardPedestalTimeout) {
            clearTimeout(keyboardPedestalTimeout);
            keyboardPedestalTimeout = null;
        }
        if (keyboardPedestalInterval) {
            clearInterval(keyboardPedestalInterval);
            keyboardPedestalInterval = null;
        }
    }
    
    window.addEventListener('keydown', function(e) {
        // 如果焦点在输入框上，不触发快捷键（除了箭头键和J/K键）
        if (isInputFocused() && !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'j', 'J', 'k', 'K'].includes(e.key)) {
            return;
        }
        
        // 左旋转 (Left Arrow)
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const leftRotationBtn = document.getElementById('left-rotation-btn');
            if (leftRotationBtn) {
                // 模拟按下按钮
                displayCaseRotationDirection = -1;
                leftRotationBtn.style.background = '#1976D2';
                console.log('开始左旋转（快捷键）');
            }
        }
        
        // 右旋转 (Right Arrow)
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            const rightRotationBtn = document.getElementById('right-rotation-btn');
            if (rightRotationBtn) {
                // 模拟按下按钮
                displayCaseRotationDirection = 1;
                rightRotationBtn.style.background = '#F57C00';
                console.log('开始右旋转（快捷键）');
            }
        }
        
        // 向下旋转 (Up Arrow) - 上箭头向下旋转（交换后）
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            displayCaseVerticalRotationDirection = -1;
            const downRotationBtn = document.getElementById('down-rotation-btn');
            if (downRotationBtn) {
                downRotationBtn.style.background = '#7b1fa2';
            }
            console.log('开始向下旋转（快捷键）');
        }
        
        // 向上旋转 (Down Arrow) - 下箭头向上旋转（交换后）
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            displayCaseVerticalRotationDirection = 1;
            const upRotationBtn = document.getElementById('up-rotation-btn');
            if (upRotationBtn) {
                upRotationBtn.style.background = '#45a049';
            }
            console.log('开始向上旋转（快捷键）');
        }
        
        // 基座高度加 (J键) - J键增加高度
        if (e.key === 'j' || e.key === 'J') {
            e.preventDefault();
            // 立即调整一次
            adjustPedestalHeightByKeyboard(1);
            // 停止之前的定时器
            stopPedestalAdjustment();
            // 启动长按功能
            keyboardPedestalTimeout = setTimeout(function() {
                keyboardPedestalInterval = setInterval(function() {
                    adjustPedestalHeightByKeyboard(1);
                }, 50);
            }, 300);
        }
        
        // 基座高度减 (K键) - K键降低高度
        if (e.key === 'k' || e.key === 'K') {
            e.preventDefault();
            // 立即调整一次
            adjustPedestalHeightByKeyboard(-1);
            // 停止之前的定时器
            stopPedestalAdjustment();
            // 启动长按功能
            keyboardPedestalTimeout = setTimeout(function() {
                keyboardPedestalInterval = setInterval(function() {
                    adjustPedestalHeightByKeyboard(-1);
                }, 50);
            }, 300);
        }
    });
    
    window.addEventListener('keyup', function(e) {
        // 如果焦点在输入框上，不触发快捷键（除了箭头键和J/K键）
        if (isInputFocused() && !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'j', 'J', 'k', 'K'].includes(e.key)) {
            return;
        }
        
        // 左旋转释放 (Left Arrow)
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const leftRotationBtn = document.getElementById('left-rotation-btn');
            if (leftRotationBtn) {
                displayCaseRotationDirection = 0;
                leftRotationBtn.style.background = '#2196F3';
                console.log('停止旋转（快捷键）');
            }
        }
        
        // 右旋转释放 (Right Arrow)
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            const rightRotationBtn = document.getElementById('right-rotation-btn');
            if (rightRotationBtn) {
                displayCaseRotationDirection = 0;
                rightRotationBtn.style.background = '#FF9800';
                console.log('停止旋转（快捷键）');
            }
        }
        
        // 上下旋转释放 (Up Arrow 或 Down Arrow)
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            displayCaseVerticalRotationDirection = 0;
            const upRotationBtn = document.getElementById('up-rotation-btn');
            const downRotationBtn = document.getElementById('down-rotation-btn');
            // 交换后：↑键对应向下按钮，↓键对应向上按钮
            if (e.key === 'ArrowUp' && downRotationBtn) {
                downRotationBtn.style.background = '#9C27B0';
            }
            if (e.key === 'ArrowDown' && upRotationBtn) {
                upRotationBtn.style.background = '#4CAF50';
            }
            console.log('停止上下旋转（快捷键）');
        }
        
        // 基座高度调整释放 (J键 或 K键)
        if (e.key === 'j' || e.key === 'J' || e.key === 'k' || e.key === 'K') {
            e.preventDefault();
            stopPedestalAdjustment();
        }
    });
    
    // 添加快捷键提示到UI
    addShortcutHints();
}

// 添加快捷键提示到UI
function addShortcutHints() {
    // 只为旋转和基座高度按钮添加标题提示
    const shortcuts = {
        'left-rotation-btn': '← 左旋转',
        'right-rotation-btn': '→ 右旋转',
        'up-rotation-btn': '↑ 向上旋转',
        'down-rotation-btn': '↓ 向下旋转',
        'minus-pedestal-btn': 'K 降低',
        'plus-pedestal-btn': 'J 升高'
    };
    
    Object.keys(shortcuts).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.title = shortcuts[id];
        }
    });
}

// 启动应用
init();

// 页面加载完成后创建文件输入界面
window.addEventListener('load', function() {
    setTimeout(createFileInputUI, 1000); // 延迟1秒确保场景已初始化
});

