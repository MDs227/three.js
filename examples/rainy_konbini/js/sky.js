import * as THREE from 'three';

// Night sky dome: low rain clouds lit from below by the city (sodium/neon light pollution).
export function createSky( scene ) {

	const mat = new THREE.ShaderMaterial( {
		uniforms: { uTime: { value: 0 }, uFlash: { value: 0 } },
		vertexShader: /* glsl */`
			varying vec3 vDir;
			void main() {
				vDir = normalize( position );
				vec4 p = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				gl_Position = p.xyww;
			}
		`,
		fragmentShader: /* glsl */`
			uniform float uTime;
			uniform float uFlash;
			varying vec3 vDir;
			float h( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
			float n( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
				return mix( mix( h( i ), h( i + vec2( 1, 0 ) ), f.x ), mix( h( i + vec2( 0, 1 ) ), h( i + vec2( 1, 1 ) ), f.x ), f.y ); }
			float fbm( vec2 p ) { float s = 0.0, a = 0.5; for ( int i = 0; i < 5; i ++ ) { s += a * n( p ); p *= 2.1; a *= 0.5; } return s; }
			void main() {
				vec3 d = normalize( vDir );
				float y = max( d.y, 0.0 );
				vec2 cp = d.xz / ( d.y + 0.15 ) * 1.4 + vec2( uTime * 0.012, uTime * 0.004 );
				float c = fbm( cp );
				vec3 top = vec3( 0.006, 0.010, 0.020 );
				vec3 horizon = vec3( 0.045, 0.050, 0.075 );
				vec3 glow = vec3( 0.11, 0.065, 0.045 ); // city light pollution under clouds
				vec3 col = mix( horizon, top, pow( y, 0.55 ) );
				col += glow * pow( 1.0 - y, 6.0 ) * 0.9;
				col += vec3( 0.03, 0.035, 0.05 ) * smoothstep( 0.35, 0.85, c ) * ( 1.0 - y * 0.6 );
				col += vec3( 0.55, 0.62, 0.85 ) * uFlash * ( 0.25 + smoothstep( 0.3, 0.8, c ) ) * ( 1.0 - y * 0.5 );
				if ( d.y < 0.0 ) col = horizon * 0.6;
				gl_FragColor = vec4( col, 1.0 );
				#include <colorspace_fragment>
			}
		`,
		side: THREE.BackSide,
		depthWrite: false,
		fog: false
	} );
	const sky = new THREE.Mesh( new THREE.SphereGeometry( 400, 32, 16 ), mat );
	sky.renderOrder = - 10;
	sky.frustumCulled = false;
	scene.add( sky );
	return sky;

}

// Environment map for glossy/wet reflections: dark blue surroundings with a few warm & cold light panels.
export function createEnvironment( renderer ) {

	const env = new THREE.Scene();
	const room = new THREE.Mesh( new THREE.SphereGeometry( 20, 32, 16 ), new THREE.MeshBasicMaterial( { side: THREE.BackSide, vertexColors: true } ) );
	const pos = room.geometry.attributes.position;
	const col = new Float32Array( pos.count * 3 );
	for ( let i = 0; i < pos.count; i ++ ) {

		const y = pos.getY( i ) / 20;
		const t = THREE.MathUtils.smoothstep( y, - 0.3, 0.8 );
		col[ i * 3 ] = THREE.MathUtils.lerp( 0.03, 0.012, t );
		col[ i * 3 + 1 ] = THREE.MathUtils.lerp( 0.035, 0.02, t );
		col[ i * 3 + 2 ] = THREE.MathUtils.lerp( 0.05, 0.045, t );

	}

	room.geometry.setAttribute( 'color', new THREE.BufferAttribute( col, 3 ) );
	env.add( room );
	const panel = ( w, h, color, intensity, x, y, z ) => {

		const m = new THREE.Mesh( new THREE.PlaneGeometry( w, h ), new THREE.MeshBasicMaterial( { color: new THREE.Color( color ).multiplyScalar( intensity ), side: THREE.DoubleSide } ) );
		m.position.set( x, y, z );
		m.lookAt( 0, 0, 0 );
		env.add( m );

	};

	panel( 14, 4, 0xffd9a0, 3.0, 0, 2, - 12 ); // store glow
	panel( 6, 1.5, 0x9fd0ff, 2.0, - 12, 5, 4 ); // street LED
	panel( 3, 3, 0xff5a3a, 1.2, 10, 2, 12 ); // red lantern
	panel( 20, 2, 0x5b7db8, 0.6, 0, 14, 0 ); // overcast sky
	panel( 4, 8, 0xe8f4ff, 1.4, 12, 3, - 6 ); // vending machines

	const pmrem = new THREE.PMREMGenerator( renderer );
	const tex = pmrem.fromScene( env, 0.02 ).texture;
	pmrem.dispose();
	return tex;

}
