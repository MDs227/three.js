import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Wet asphalt + puddles: a planar reflection drawn as a transparent overlay above the lit ground.
// - puddle mask (fbm), shallow film everywhere else
// - procedural raindrop ripples + dynamic ripples (footsteps, drips) perturb the reflection
// - wet film reflections are smeared vertically (multi-tap), puddles are sharp mirrors

const MAX_RIPPLES = 24;

const WetShader = {
	name: 'WetGroundShader',
	uniforms: THREE.UniformsUtils.merge( [ THREE.UniformsLib.fog, {
		color: { value: null },
		tDiffuse: { value: null },
		textureMatrix: { value: null },
		uTime: { value: 0 },
		uRipples: { value: Array.from( { length: MAX_RIPPLES }, () => new THREE.Vector4( 0, 0, - 100, 0 ) ) },
		uStrength: { value: 1 },
		uRain: { value: 1 }
	} ] ),
	vertexShader: /* glsl */`
		uniform mat4 textureMatrix;
		varying vec4 vUv;
		varying vec3 vWorld;
		#include <common>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		void main() {
			vUv = textureMatrix * vec4( position, 1.0 );
			vec4 w = modelMatrix * vec4( position, 1.0 );
			vWorld = w.xyz;
			vec4 mvPosition = viewMatrix * w;
			gl_Position = projectionMatrix * mvPosition;
			#include <logdepthbuf_vertex>
			#include <fog_vertex>
		}
	`,
	fragmentShader: /* glsl */`
		#define MAX_RIPPLES ${MAX_RIPPLES}
		uniform vec3 color;
		uniform sampler2D tDiffuse;
		uniform float uTime;
		uniform vec4 uRipples[ MAX_RIPPLES ];
		uniform float uStrength;
		uniform float uRain;
		varying vec4 vUv;
		varying vec3 vWorld;
		#include <common>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>

		float h2( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * .1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }
		vec2 h22( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * vec3( .1031, .1030, .0973 ) ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.xx + p3.yz ) * p3.zy ); }
		float vnoise( vec2 p ) {
			vec2 i = floor( p ), f = fract( p );
			vec2 u = f * f * ( 3.0 - 2.0 * f );
			return mix( mix( h2( i ), h2( i + vec2( 1, 0 ) ), u.x ), mix( h2( i + vec2( 0, 1 ) ), h2( i + vec2( 1, 1 ) ), u.x ), u.y );
		}
		float fbm( vec2 p ) {
			float a = 0.5, s = 0.0;
			for ( int i = 0; i < 4; i ++ ) { s += a * vnoise( p ); p = p * 2.03 + 17.1; a *= 0.5; }
			return s;
		}

		// one layer of raindrop ripples: returns height-gradient (xz)
		vec2 rippleLayer( vec2 p, float t, float cell ) {
			vec2 g = p / cell;
			vec2 id = floor( g );
			vec2 grad = vec2( 0.0 );
			for ( int j = - 1; j <= 1; j ++ ) for ( int i = - 1; i <= 1; i ++ ) {
				vec2 c = id + vec2( i, j );
				vec2 r = h22( c );
				float ph = fract( t * ( 0.9 + r.y * 0.6 ) + r.x * 13.0 );
				vec2 ctr = ( c + 0.15 + 0.7 * h22( c + 7.3 ) ) * cell;
				vec2 d = p - ctr;
				float dist = length( d );
				float rad = ph * cell * 1.1;
				float x = ( dist - rad ) * 38.0 / cell;
				float env = ( 1.0 - ph ) * ( 1.0 - ph ) * smoothstep( 1.4, 0.0, abs( x ) / 3.0 );
				float dh = cos( x * 3.0 ) * env;
				grad += dh * d / max( dist, 1e-3 );
			}
			return grad;
		}

		void main() {
			#include <logdepthbuf_fragment>
			vec2 p = vWorld.xz;
			// puddles: low frequency fbm, slightly biased towards gutters / curbs
			float n = fbm( p * 0.33 + vec2( 3.1, 9.7 ) );
			float curb = smoothstep( 1.0, 0.0, abs( p.y - 12.25 ) ) + smoothstep( 0.9, 0.0, abs( p.y - 21.75 ) );
			float puddle = smoothstep( 0.55, 0.62, n + curb * 0.18 );
			float detail = fbm( p * 2.7 );

			// ripples
			vec2 grad = rippleLayer( p, uTime, 0.42 ) + rippleLayer( p + 3.7, uTime * 1.13, 0.31 ) * 0.8;
			grad *= uRain;
			for ( int k = 0; k < MAX_RIPPLES; k ++ ) {
				vec4 r = uRipples[ k ];
				float age = uTime - r.z;
				if ( age < 0.0 || age > 1.6 ) continue;
				vec2 d = p - r.xy;
				float dist = length( d );
				float rad = age * 0.55;
				float x = ( dist - rad ) * 28.0;
				float env = r.w * ( 1.0 - age / 1.6 ) * smoothstep( 4.0, 0.0, abs( x ) );
				grad += cos( x ) * env * 1.5 * d / max( dist, 1e-3 );
			}

			// projected coordinates of the reflection
			vec2 uv = vUv.xy / vUv.w;
			vec3 V = normalize( cameraPosition - vWorld );
			float cosT = clamp( V.y, 0.0, 1.0 );
			float fresnel = 0.02 + 0.98 * pow( 1.0 - cosT, 5.0 );

			vec2 distort = grad * mix( 0.012, 0.006, puddle );
			// film areas: rough micro-surface -> vertical smear + jitter
			float rough = mix( 1.0, 0.06, puddle ) * ( 0.7 + 0.6 * detail );
			vec3 refl = vec3( 0.0 );
			float wsum = 0.0;
			for ( int i = 0; i < 6; i ++ ) {
				float fi = float( i ) / 5.0;
				float w = 1.0 - fi * 0.7;
				vec2 o = vec2( ( h2( p * 91.0 + fi ) - 0.5 ) * 0.01, - fi * 0.075 ) * rough;
				refl += texture2D( tDiffuse, uv + distort + o ).rgb * w;
				wsum += w;
			}
			refl /= wsum;

			float wetK = mix( 0.22, 0.9, puddle );
			float a = wetK * mix( 0.32, 1.0, fresnel ) * uStrength;
			// water tint: slightly cool and dark
			vec3 col = refl * mix( vec3( 0.6, 0.66, 0.75 ), vec3( 0.88, 0.92, 1.0 ), puddle );
			// specular glints from ripples catching the ambient sky
			col += vec3( 0.25, 0.32, 0.45 ) * length( grad ) * 0.08;

			gl_FragColor = vec4( col, a );
			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
		}
	`
};

export class WetGround {

	constructor( scene, rects, { quality = 'high', renderer } = {} ) {

		const geos = [];
		for ( const r of rects ) {

			const w = r.maxX - r.minX, d = r.maxZ - r.minZ;
			const g = new THREE.PlaneGeometry( w, d, Math.max( 1, Math.round( w / 4 ) ), Math.max( 1, Math.round( d / 4 ) ) );
			// local XY plane -> after mesh rotation.x = -PI/2 : world (x, z_local, -y_local)
			g.translate( ( r.minX + r.maxX ) / 2, - ( r.minZ + r.maxZ ) / 2, ( r.y || 0 ) + 0.003 );
			geos.push( g );

		}

		const geo = mergeGeometries( geos );
		this.scale = quality === 'low' ? 0.35 : quality === 'medium' ? 0.5 : 0.65;
		const pr = renderer ? renderer.getPixelRatio() : 1;
		this.reflector = new Reflector( geo, {
			shader: WetShader,
			textureWidth: Math.round( window.innerWidth * pr * this.scale ),
			textureHeight: Math.round( window.innerHeight * pr * this.scale ),
			clipBias: 0.002,
			multisample: quality === 'high' ? 4 : 0
		} );
		this.reflector.rotation.x = - Math.PI / 2;
		const m = this.reflector.material;
		m.transparent = true;
		m.depthWrite = false;
		m.fog = true;
		m.polygonOffset = true;
		m.polygonOffsetFactor = - 2;
		m.polygonOffsetUnits = - 2;
		this.reflector.renderOrder = 1;
		this.reflector.receiveShadow = false;
		scene.add( this.reflector );
		this.uniforms = m.uniforms;
		this.ripIndex = 0;

	}

	addRipple( x, z, strength = 1 ) {

		const r = this.uniforms.uRipples.value[ this.ripIndex ];
		r.set( x, z, this.uniforms.uTime.value, strength );
		this.ripIndex = ( this.ripIndex + 1 ) % MAX_RIPPLES;

	}

	setSize( w, h, pr ) {

		this.reflector.getRenderTarget().setSize( Math.round( w * pr * this.scale ), Math.round( h * pr * this.scale ) );

	}

	update( t ) {

		this.uniforms.uTime.value = t;

	}

}
