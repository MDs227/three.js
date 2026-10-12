import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Cinematic grade in linear HDR, before tone mapping (OutputPass):
// teal shadows / amber highlights, chromatic fringe, vignette, film grain, rain drops on the lens.
const GradeShader = {
	name: 'GradeShader',
	uniforms: {
		tDiffuse: { value: null },
		uTime: { value: 0 },
		uRes: { value: new THREE.Vector2( 1, 1 ) },
		uLens: { value: 0 },
		uVignette: { value: 1 },
		uGrain: { value: 1 },
		uFlash: { value: 0 }
	},
	vertexShader: /* glsl */`
		varying vec2 vUv;
		void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }
	`,
	fragmentShader: /* glsl */`
		uniform sampler2D tDiffuse;
		uniform float uTime;
		uniform vec2 uRes;
		uniform float uLens;
		uniform float uVignette;
		uniform float uGrain;
		uniform float uFlash;
		varying vec2 vUv;

		float h( vec2 p ) { return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ); }
		vec2 h2( vec2 p ) { return fract( sin( vec2( dot( p, vec2( 127.1, 311.7 ) ), dot( p, vec2( 269.5, 183.3 ) ) ) ) * 43758.5453 ); }

		// water drops on the lens: returns uv offset (refraction) and coverage
		vec3 lensDrops( vec2 uv, float t ) {
			vec2 aspect = vec2( uRes.x / uRes.y, 1.0 );
			vec2 p = uv * aspect * 7.0;
			vec2 id = floor( p );
			vec3 res = vec3( 0.0 );
			for ( int j = - 1; j <= 1; j ++ ) for ( int i = - 1; i <= 1; i ++ ) {
				vec2 c = id + vec2( i, j );
				vec2 r = h2( c );
				float life = fract( t * 0.07 + r.x * 7.0 );
				float alive = step( 0.55, r.y ) * smoothstep( 0.0, 0.05, life ) * smoothstep( 1.0, 0.7, life );
				vec2 ctr = c + 0.2 + 0.6 * h2( c + 3.1 );
				ctr.y -= life * life * r.x * 1.5; // slow slide down
				vec2 d = p - ctr;
				d.y *= 1.0 + 0.4 * r.x;
				float rad = 0.07 + 0.11 * r.y;
				float m = smoothstep( rad, rad * 0.75, length( d ) ) * alive;
				res.xy += d / rad * m * 0.025;
				res.z = max( res.z, m );
			}
			return res;
		}

		void main() {
			vec2 uv = vUv;
			vec3 drop = uLens > 0.0 ? lensDrops( uv, uTime ) * uLens : vec3( 0.0 );
			uv -= drop.xy;

			vec2 dc = uv - 0.5;
			float r2 = dot( dc, dc );
			float ca = 0.0016 + r2 * 0.006;
			vec3 col;
			col.r = texture2D( tDiffuse, uv - dc * ca ).r;
			col.g = texture2D( tDiffuse, uv ).g;
			col.b = texture2D( tDiffuse, uv + dc * ca ).b;
			// blur-ish brighten inside drops
			col = mix( col, col * 1.15 + 0.004, drop.z * 0.5 );

			// grade (linear): split toning
			float lum = dot( col, vec3( 0.2126, 0.7152, 0.0722 ) );
			vec3 shadowTint = vec3( 0.86, 0.97, 1.16 );
			vec3 highTint = vec3( 1.10, 1.0, 0.86 );
			float k = smoothstep( 0.02, 0.9, lum );
			col *= mix( shadowTint, highTint, k );
			col = mix( vec3( lum ), col, 1.08 ); // saturation
			col += vec3( 0.002, 0.004, 0.009 ); // lifted blue blacks

			// vignette
			float vig = smoothstep( 0.95, 0.25, length( dc * vec2( 1.0, 1.15 ) ) );
			col *= mix( 1.0, vig, 0.65 * uVignette );

			// grain
			float g = h( uv * uRes + fract( uTime * 61.0 ) * 100.0 ) - 0.5;
			col += g * 0.018 * uGrain * ( 0.3 + lum );
			col += uFlash;
			gl_FragColor = vec4( max( col, 0.0 ), 1.0 );
		}
	`
};

export function createPost( renderer, scene, camera, { quality = 'high' } = {} ) {

	const size = renderer.getSize( new THREE.Vector2() );
	const pr = renderer.getPixelRatio();
	const rt = new THREE.WebGLRenderTarget( size.x * pr, size.y * pr, {
		type: THREE.HalfFloatType,
		samples: quality === 'low' ? 0 : 4
	} );
	const composer = new EffectComposer( renderer, rt );
	composer.setPixelRatio( pr );
	composer.setSize( size.x, size.y );
	const renderPass = new RenderPass( scene, camera );
	composer.addPass( renderPass );

	// sanitize HDR: kill NaN/Inf and tame extreme speculars so bloom never floods the frame
	const clampPass = new ShaderPass( {
		uniforms: { tDiffuse: { value: null }, uMax: { value: 40 } },
		vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
		fragmentShader: `uniform sampler2D tDiffuse; uniform float uMax; varying vec2 vUv;
			void main(){ vec3 c = texture2D( tDiffuse, vUv ).rgb;
				if ( any( isnan( c ) ) || any( isinf( c ) ) ) c = vec3( 0.0 );
				float m = max( c.r, max( c.g, c.b ) );
				if ( m > uMax ) c *= uMax / m;
				gl_FragColor = vec4( c, 1.0 ); }`
	} );
	composer.addPass( clampPass );

	const bloom = new UnrealBloomPass( new THREE.Vector2( size.x, size.y ), 0.28, 0.45, 2.4 );
	composer.addPass( bloom );

	const grade = new ShaderPass( GradeShader );
	composer.addPass( grade );
	composer.addPass( new OutputPass() );

	return {
		composer, bloom, grade, renderPass,
		setSize( w, h ) {

			composer.setSize( w, h );
			grade.uniforms.uRes.value.set( w, h );

		},
		render( t ) {

			grade.uniforms.uTime.value = t;
			composer.render();

		}
	};

}
