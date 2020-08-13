(() => {

    let attLocation = null;
    let attStride = null;
    let plane = null;
    let planeIBO = null;
    let planeVBO = null;
    let uniLocation = null;
    let startTime = 0;

    const webgl = new WebGLUtility; // WebGL API をまとめたユーティリティ
    const math = WebGLMath;          // 線型代数の各種算術関数群
    const geo = WebGLGeometry;      // 頂点ジオメトリを生成する関数群

    window.addEventListener('load', () => {
        const canvas = document.getElementById('webgl-canvas');
        webgl.initialize(canvas);
        const size = Math.min(window.innerWidth, window.innerHeight);
        webgl.width = size;
        webgl.height = size;

        let vs = null;
        let fs = null;
        //頂点シェーダーを最初に読み込む
        WebGLUtility.loadFile('/shader/main.vert')
            //thenの引数に戻り値が返ってくる。
            //vertexShaderSourceに頂点シェーダのソースコードが入っている
            .then((vertexShaderSource) => {
                vs = webgl.createShaderObject(vertexShaderSource, webgl.gl.VERTEX_SHADER);
                //次にフラグメントシェーダーを読み込む
                return WebGLUtility.loadFile('/shader/main.frag');
            })
            //fragmentShaderSourceにフラグメントシェーダのソースコードが入っている
            .then((fragmentShaderSource) => {
                fs = webgl.createShaderObject(fragmentShaderSource, webgl.gl.FRAGMENT_SHADER);
                //プログラムオブジェクトの生成
                webgl.program = webgl.createProgramObject(vs, fs);
                setupGeometry();
                setupLocation();

                startTime = Date.now();
                render();
            });
    }, false);

    function setupGeometry() {
        plane = geo.plane(1.0, 1.0, [1.0, 0.3, 0.1, 1.0]);

        //頂点バッファの作成(あらかじめJavaScriptで定義した配列の情報をGPUに渡すため)
        planeVBO = [
            webgl.createVBO(plane.position),
            webgl.createVBO(plane.color),
        ];

        planeIBO = webgl.createIBO(plane.index);
    }

    function setupLocation() {
        const gl = webgl.gl;
        // attribute location の取得と有効化
        attLocation = [
            gl.getAttribLocation(webgl.program, 'position'),
            gl.getAttribLocation(webgl.program, 'color'),
        ];
        attStride = [3, 4];
        uniLocation = {
            mvpMatrix: gl.getUniformLocation(webgl.program, 'mvpMatrix'),
        };
    }

    function setupRendering() {
        const gl = webgl.gl;
        gl.viewport(0, 0, webgl.width, webgl.height);
        gl.clearColor(0.3, 0.3, 0.3, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    function updateMesh(time) {
        const gl = webgl.gl;
        // VBO と IBO をバインドする
        webgl.enableAttribute(planeVBO, attLocation, attStride);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, planeIBO);

        // モデル行列を生成する
        let mMatrix = math.mat4.identity(math.mat4.create());
        // rotate メソッドは、処理対象の行列、回転量のラジアン、回転軸を受け取る
        mMatrix = math.mat4.rotate(mMatrix, time, [0.0, 1.0, 0.0]);

        // 生成したモデル行列を返す
        return mMatrix;
    }

    function render() {
        const gl = webgl.gl;
        requestAnimationFrame(render);

        //時間の計測
        const nowTime = (Date.now() - startTime) / 1000;

        setupRendering();

        //ビュー行列を作成する
        const cameraPosition = [0.0, 0.0, 5.0];
        const cameraCenter = [0.0, 0.0, 0.0];
        const cameraUpDirection = [0.0, 1.0, 0.0];
        const vMatrix = math.mat4.lookAt(cameraPosition, cameraCenter, cameraUpDirection);

        //プロジェクション行列を作成する
        const fovy = 45.0;
        const aspect = webgl.width / webgl.height;
        const near = 0.1;
        const far = 10.0;
        const pMatrix = math.mat4.perspective(fovy, aspect, near, far);

        const mMatrix = updateMesh(nowTime);

        //mvpマトリックスを生成する
        const vpMatrix = math.mat4.multiply(pMatrix, vMatrix);
        const mvpMatrix = math.mat4.multiply(vpMatrix, mMatrix);

        gl.uniformMatrix4fv(uniLocation.mvpMatrix, false, mvpMatrix);
        // ドローコール（描画命令）
        gl.drawElements(gl.TRIANGLES, plane.index.length, gl.UNSIGNED_SHORT, 0);
    }
})();
