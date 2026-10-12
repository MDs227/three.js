import * as THREE from 'three';

// GPU rain: world-stable streaks wrapped around the camera, lit by nearby light sources,
// culled under roofs / eaves / the umbrella; ground splashes; CPU drips & footstep splashes.

const MAX_LIGHTS = 8;
const MAX_BLOCKERS = 8;

const sharedUniforms = {
	uTime: { value: 0 },
	uCenter: { value: new THREE.Vector3() },
	uLightPos: { value: Array.from( { length: MAX_LIGHTS }, () => new THREE.Vector4( 0, - 100, 0, 1 ) ) },
	uLightCol: { value: Array.from( { length: MAX_LIGHTS }, () => new THREE.Vector3() ) },
	uBlock: { value: Array.from( { length: MAX_BLOCKERS }, () => new THREE.Vector4( 1e5, 1e5, 1e5, 1e5 ) ) },
	uBlockY: { value: new Array( MAX_BLOCKERS ).fill( - 100 ) },
	uUmbrella: { value: new THREE.Vector4( 0, - 100, 0, 0 ) },
	uIntensity: { value: 1 },
	uAmbient: { value: new THREE.Color( 0.16, 0.22, 0.33 ) }
};

const commonGLSL = /* glsl */`
	#define MAX_LIGHTS ${MAX_LIGHTS}
	#define MAX_BLOCKERS ${MAX_BLOCKERS}
	uniform float uTime;
	uniform vec3 uCenter;
	uniform vec4 uLightPos[ MAX_LIGHTS ];
	uniform vec3 uLightCol[ MAX_LIGHTS ];
	uniform vec4 uBlock[ MAX_BLOCKERS ];
	uniform float uBlockY[ MAX_BLOCKERS ];
	uniform vec4 uUmbrella;
	uniform float uIntensity;
	uniform vec3 uAmbient;

	float hash11( float p ) { p = fract( p * .1031 ); p *= p + 33.33; p *= p + p; return fract( p ); }
	vec2 hash21( float p ) { vec3 p3 = fract( vec3( p ) * vec3( .1031, .1030, .0973 ) ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.xx + p3.yz ) * p3.zy ); }

	bool rainBlocked( vec3 p ) {
		for ( int i = 0; i < MAX_BLOCKERS; i ++ ) {
			vec4 b = uBlock[ i ];
			if ( p.x > b.x && p.x < b.y && p.z > b.z && p.z < b.w && p.y < uBlockY[ i ] ) return true;
		}
		vec2 d = p.xz - uUmbrella.xz;
		if ( uUmbrella.w > 0.0 && p.y < uUmbrella.y && dot( d, d ) < uUmbrella.w * uUmbrella.w ) return true;
		return false;
	}

	vec3 rainLight( vec3 p ) {
		vec3 c = uAmbient;
		for ( int i = 0; i < MAX_LIGHTS; i ++ ) {
			vec3 d = p - uLightPos[ i ].xyz;
			float r = uLightPos[ i ].w;
			float k = max( 0.0, 1.0 - dot( d, d ) / ( r * r ) );
			c += uLightCol[ i ] * k * k;
		}
		return c;
	}

	float groundY( vec2 xz ) {
		return ( ( xz.y > 9.0 && xz.y < 12.0 ) || ( xz.y > 22.0 && xz.y < 25.0 ) ) ? 0.12 : 0.0;
	}
`;

function makeStreaks( count ) {

	const quad = new THREE.PlaneGeometry( 1, 1 );
	quad.translate( 0, 0.5, 0 );
	const geo = new THREE.InstancedBufferGeometry();
	geo.index = quad.index;
	geo.setAttribute( 'position', quad.getAttribute( 'position' ) );
	geo.setAttribute( 'uv', quad.getAttribute( 'uv' ) );
	const off = new Float32Array( count * 4 );
	for ( let i = 0; i < count; i ++ ) {

		off[ i * 4 ] = Math.random();
		off[ i * 4 + 1 ] = Math.random();
		off[ i * 4 + 2 ] = Math.random();
		off[ i * 4 + 3 ] = Math.random();

	}

	geo.setAttribute( 'aOff', new THREE.InstancedBufferAttribute( off, 4 ) );
	geo.instanceCount = count;

	const mat = new THREE.ShaderMaterial( {
		uniforms: {
			...sharedUniforms,
			uBox: { value: new THREE.Vector3( 36, 16, 36 ) },
			uWind: { value: new THREE.Vector3( 1.2, 0, 0.5 ) },
			uSpeed: { value: 10.5 }
		},
		vertexShader: commonGLSL + /* glsl */`
			uniform vec3 uBox;
			uniform vec3 uWind;
			uniform float uSpeed;
			attribute vec4 aOff;
			varying vec2 vUv;
			varying vec3 vCol;
			varying float vAlpha;
			void main() {
				float spd = uSpeed * ( 0.8 + 0.4 * aOff.w );
				vec3 vel = vec3( uWind.x, - spd, uWind.z );
				vec3 base = aOff.xyz * uBox + vel * uTime;
				vec3 origin = uCenter - uBox * 0.5;
				vec3 head = origin + mod( base - origin, uBox );
				vec3 dir = normalize( vel );
				float len = 0.38 + 0.3 * aOff.w;
				vec3 toCam = cameraPosition - head;
				float dist = length( toCam );
				vec3 side = normalize( cross( dir, toCam ) );
				float width = 0.007 + dist * 0.0009;
				vec3 p = head - dir * ( 1.0 - position.y ) * len + side * position.x * width;
				vAlpha = smoothstep( 0.35, 1.6, dist ) * ( 1.0 - smoothstep( uBox.x * 0.32, uBox.x * 0.5, length( head.xz - uCenter.xz ) ) );
				if ( rainBlocked( head ) || head.y < groundY( head.xz ) ) vAlpha = 0.0;
				vCol = rainLight( head ) * uIntensity;
				vUv = uv;
				gl_Position = projectionMatrix * viewMatrix * vec4( p, 1.0 );
				if ( vAlpha <= 0.0 ) gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 );
			}
		`,
		fragmentShader: /* glsl */`
			varying vec2 vUv;
			varying vec3 vCol;
			varying float vAlpha;
			void main() {
				float a = smoothstep( 0.0, 0.35, vUv.y ) * ( 1.0 - abs( vUv.x - 0.5 ) * 2.0 );
				gl_FragColor = vec4( vCol * a * vAlpha * 0.55, 1.0 );
			}
		`,
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending
	} );

	const mesh = new THREE.Mesh( geo, mat );
	mesh.frustumCulled = false;
	mesh.renderOrder = 10;
	return mesh;

}

function makeSplashes( count ) {

	const geo = new THREE.BufferGeometry();
	const seeds = new Float32Array( count * 2 );
	for ( let i = 0; i < count; i ++ ) {

		seeds[ i * 2 ] = Math.random() * 1000;
		seeds[ i * 2 + 1 ] = Math.random();

	}

	geo.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array( count * 3 ), 3 ) );
	geo.setAttribute( 'aSeed', new THREE.BufferAttribute( seeds, 2 ) );

	const mat = new THREE.ShaderMaterial( {
		uniforms: {
			...sharedUniforms,
			uRadius: { value: 16 },
			uScale: { value: 600 }
		},
		vertexShader: commonGLSL + /* glsl */`
			uniform float uRadius;
			uniform float uScale;
			attribute vec2 aSeed;
			varying float vT;
			varying vec3 vCol;
			void main() {
				float rate = 2.2 + aSeed.y * 1.6;
				float cyc = uTime * rate + aSeed.y * 7.0;
				float id = floor( cyc );
				vT = fract( cyc );
				vec2 h = hash21( aSeed.x + id * 17.31 );
				float ang = h.x * 6.2831853;
				float r = sqrt( h.y ) * uRadius;
				vec3 p = vec3( uCenter.x + cos( ang ) * r, 0.0, uCenter.z + sin( ang ) * r );
				p.y = groundY( p.xz ) + 0.012;
				vec4 mv = viewMatrix * vec4( p, 1.0 );
				gl_Position = projectionMatrix * mv;
				gl_PointSize = uScale * ( 0.05 + 0.05 * aSeed.y ) / max( 0.5, - mv.z );
				vCol = rainLight( p + vec3( 0.0, 0.4, 0.0 ) ) * uIntensity;
				if ( rainBlocked( p + vec3( 0.0, 0.05, 0.0 ) ) || vT > 0.35 ) gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 );
			}
		`,
		fragmentShader: /* glsl */`
			varying float vT;
			varying vec3 vCol;
			void main() {
				float t = vT / 0.35;
				vec2 c = gl_PointCoord * 2.0 - 1.0;
				c.y *= 2.2; // flattened crown, seen at grazing angles
				c.y += 0.6;
				float d = length( c );
				float ring = smoothstep( 0.12, 0.0, abs( d - t * 0.9 ) );
				// tiny droplets thrown upward
				vec2 q = gl_PointCoord * 2.0 - 1.0;
				float drops = 0.0;
				for ( int i = 0; i < 4; i ++ ) {
					float fi = float( i );
					float ax = ( fi - 1.5 ) * 0.35;
					vec2 dp = vec2( ax * t * 1.6, 0.6 - ( t * 1.4 - t * t * 1.6 ) * 1.6 );
					drops += smoothstep( 0.09, 0.0, length( q - dp ) );
				}
				float a = ( ring * 0.8 + drops ) * ( 1.0 - t );
				if ( a < 0.01 ) discard;
				gl_FragColor = vec4( vCol * a * 0.9, 1.0 );
			}
		`,
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending
	} );

	const pts = new THREE.Points( geo, mat );
	pts.frustumCulled = false;
	pts.renderOrder = 11;
	return pts;

}

// CPU particles for drips (eave edge, umbrella rib tips), footstep splashes, tyre spray.
class DropPool {

	constructor( max ) {

		this.max = max;
		this.pos = new Float32Array( max * 3 );
		this.vel = new Float32Array( max * 3 );
		this.life = new Float32Array( max );
		this.kind = new Uint8Array( max ); // 0 = drip (makes ripple on landing), 1 = spray
		this.cursor = 0;

		const quad = new THREE.PlaneGeometry( 1, 1 );
		const geo = new THREE.InstancedBufferGeometry();
		geo.index = quad.index;
		geo.setAttribute( 'position', quad.getAttribute( 'position' ) );
		geo.setAttribute( 'uv', quad.getAttribute( 'uv' ) );
		this.aPos = new THREE.InstancedBufferAttribute( new Float32Array( max * 4 ), 4 );
		this.aVel = new THREE.InstancedBufferAttribute( new Float32Array( max * 3 ), 3 );
		this.aPos.setUsage( THREE.DynamicDrawUsage );
		this.aVel.setUsage( THREE.DynamicDrawUsage );
		geo.setAttribute( 'aPos', this.aPos );
		geo.setAttribute( 'aVel', this.aVel );
		geo.instanceCount = 0;
		this.geo = geo;

		const mat = new THREE.ShaderMaterial( {
			uniforms: { ...sharedUniforms },
			vertexShader: commonGLSL + /* glsl */`
				attribute vec4 aPos;
				attribute vec3 aVel;
				varying vec2 vUv;
				varying vec3 vCol;
				varying float vA;
				void main() {
					vec3 head = aPos.xyz;
					vec3 v = aVel;
					float sp = length( v );
					vec3 dir = sp > 0.01 ? v / sp : vec3( 0.0, - 1.0, 0.0 );
					float len = clamp( sp * 0.035, 0.02, 0.22 );
					vec3 toCam = cameraPosition - head;
					vec3 side = normalize( cross( dir, toCam ) );
					float w = 0.011 + length( toCam ) * 0.0007;
					vec3 p = head - dir * ( 0.5 - position.y ) * len + side * position.x * w;
					vUv = uv;
					vA = aPos.w;
					vCol = rainLight( head ) * uIntensity;
					gl_Position = projectionMatrix * viewMatrix * vec4( p, 1.0 );
				}
			`,
			fragmentShader: /* glsl */`
				varying vec2 vUv;
				varying vec3 vCol;
				varying float vA;
				void main() {
					float a = ( 1.0 - abs( vUv.x - 0.5 ) * 2.0 ) * smoothstep( 0.0, 0.3, vUv.y ) * vA;
					gl_FragColor = vec4( vCol * a * 1.1, 1.0 );
				}
			`,
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending
		} );

		this.mesh = new THREE.Mesh( geo, mat );
		this.mesh.frustumCulled = false;
		this.mesh.renderOrder = 12;

	}

	spawn( x, y, z, vx, vy, vz, life, kind = 0 ) {

		const i = this.cursor;
		this.cursor = ( this.cursor + 1 ) % this.max;
		this.pos[ i * 3 ] = x; this.pos[ i * 3 + 1 ] = y; this.pos[ i * 3 + 2 ] = z;
		this.vel[ i * 3 ] = vx; this.vel[ i * 3 + 1 ] = vy; this.vel[ i * 3 + 2 ] = vz;
		this.life[ i ] = life;
		this.kind[ i ] = kind;

	}

	update( dt, groundY, onLand ) {

		let n = 0;
		const P = this.aPos.array, V = this.aVel.array;
		for ( let i = 0; i < this.max; i ++ ) {

			if ( this.life[ i ] <= 0 ) continue;
			this.life[ i ] -= dt;
			const k = i * 3;
			this.vel[ k + 1 ] -= 9.8 * dt;
			this.vel[ k ] *= 0.995; this.vel[ k + 2 ] *= 0.995;
			this.pos[ k ] += this.vel[ k ] * dt;
			this.pos[ k + 1 ] += this.vel[ k + 1 ] * dt;
			this.pos[ k + 2 ] += this.vel[ k + 2 ] * dt;
			const gy = groundY( this.pos[ k ], this.pos[ k + 2 ] );
			if ( this.pos[ k + 1 ] < gy ) {

				if ( this.kind[ i ] === 0 && onLand ) onLand( this.pos[ k ], gy, this.pos[ k + 2 ] );
				this.life[ i ] = 0;
				continue;

			}

			P[ n * 4 ] = this.pos[ k ]; P[ n * 4 + 1 ] = this.pos[ k + 1 ]; P[ n * 4 + 2 ] = this.pos[ k + 2 ];
			P[ n * 4 + 3 ] = Math.min( 1, this.life[ i ] * 3 );
			V[ n * 3 ] = this.vel[ k ]; V[ n * 3 + 1 ] = this.vel[ k + 1 ]; V[ n * 3 + 2 ] = this.vel[ k + 2 ];
			n ++;

		}

		this.geo.instanceCount = n;
		this.aPos.needsUpdate = true;
		this.aVel.needsUpdate = true;

	}

}

// Soft additive light cone (volumetric look) with rain streaks sparkling inside it.
export function makeLightCone( { position, target, angle = 0.6, color = 0xffffff, strength = 0.35, length } ) {

	const dir = new THREE.Vector3().subVectors( target, position );
	const L = length || dir.length();
	dir.normalize();
	const radius = Math.tan( angle ) * L;
	const geo = new THREE.CylinderGeometry( 0.05, radius, L, 40, 1, true );
	geo.translate( 0, - L / 2, 0 );
	const mat = new THREE.ShaderMaterial( {
		uniforms: {
			uColor: { value: new THREE.Color( color ) },
			uStrength: { value: strength },
			uTime: sharedUniforms.uTime,
			uLen: { value: L }
		},
		vertexShader: /* glsl */`
			varying vec3 vN;
			varying vec3 vW;
			varying float vY;
			uniform float uLen;
			void main() {
				vN = normalize( mat3( modelMatrix ) * normal );
				vec4 w = modelMatrix * vec4( position, 1.0 );
				vW = w.xyz;
				vY = - position.y / uLen;
				gl_Position = projectionMatrix * viewMatrix * w;
			}
		`,
		fragmentShader: /* glsl */`
			uniform vec3 uColor;
			uniform float uStrength;
			uniform float uTime;
			varying vec3 vN;
			varying vec3 vW;
			varying float vY;
			float h( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
			void main() {
				vec3 V = normalize( cameraPosition - vW );
				float edge = pow( abs( dot( V, vN ) ), 1.6 );
				float fall = pow( 1.0 - vY, 1.4 ) * smoothstep( 0.0, 0.08, vY );
				// streaky rain shimmer inside the beam
				vec2 g = vec2( atan( vN.z, vN.x ) * 24.0, vW.y * 2.0 + uTime * 14.0 );
				float s = h( floor( g ) );
				float streak = 0.75 + 0.5 * step( 0.86, s );
				float a = edge * fall * uStrength * streak;
				gl_FragColor = vec4( uColor * a, 1.0 );
			}
		`,
		transparent: true,
		depthWrite: false,
		side: THREE.DoubleSide,
		blending: THREE.AdditiveBlending
	} );
	const mesh = new THREE.Mesh( geo, mat );
	mesh.position.copy( position );
	mesh.quaternion.setFromUnitVectors( new THREE.Vector3( 0, - 1, 0 ), dir );
	mesh.renderOrder = 9;
	mesh.frustumCulled = false;
	return mesh;

}

export class Rain {

	constructor( scene, { quality = 'high' } = {} ) {

		const n = quality === 'low' ? 4000 : quality === 'medium' ? 7000 : 11000;
		this.streaks = makeStreaks( n );
		this.splashes = makeSplashes( quality === 'low' ? 500 : 1300 );
		this.drops = new DropPool( 900 );
		scene.add( this.streaks, this.splashes, this.drops.mesh );
		this.uniforms = sharedUniforms;
		this.eaveTimer = 0;
		this.umbTimer = 0;
		this.eave = null; // {minX,maxX,z,y}
		this.onRipple = null; // (x, z, strength) callback for wet ground ripples
		this.groundY = ( x, z ) => ( ( z > 9 && z < 12 ) || ( z > 22 && z < 25 ) ) ? 0.12 : 0;

	}

	setLights( list ) {

		// list: [{position, color, intensity, radius}]
		const P = sharedUniforms.uLightPos.value, C = sharedUniforms.uLightCol.value;
		for ( let i = 0; i < MAX_LIGHTS; i ++ ) {

			const l = list[ i ];
			if ( ! l ) {

				P[ i ].set( 0, - 1000, 0, 1 ); C[ i ].set( 0, 0, 0 ); continue;

			}

			P[ i ].set( l.position.x, l.position.y, l.position.z, l.radius );
			const c = l.color.isColor ? l.color : new THREE.Color( l.color );
			C[ i ].set( c.r, c.g, c.b ).multiplyScalar( l.intensity );

		}

	}

	setBlockers( list ) {

		const B = sharedUniforms.uBlock.value, Y = sharedUniforms.uBlockY.value;
		for ( let i = 0; i < MAX_BLOCKERS; i ++ ) {

			const b = list[ i ];
			if ( ! b ) {

				B[ i ].set( 1e5, 1e5, 1e5, 1e5 ); Y[ i ] = - 100; continue;

			}

			B[ i ].set( b.minX, b.maxX, b.minZ, b.maxZ );
			Y[ i ] = b.y;

		}

	}

	setUmbrella( cover ) {

		if ( ! cover || cover.open < 0.5 ) sharedUniforms.uUmbrella.value.set( 0, - 100, 0, 0 );
		else sharedUniforms.uUmbrella.value.set( cover.center.x, cover.center.y, cover.center.z, cover.radius * 1.05 );

	}

	footSplash( p, strength = 1, wet = true ) {

		if ( ! wet ) return;
		const n = Math.round( 6 + 10 * strength );
		for ( let i = 0; i < n; i ++ ) {

			const a = Math.random() * Math.PI * 2;
			const s = ( 0.4 + Math.random() * 1.1 ) * ( 0.6 + strength * 0.6 );
			this.drops.spawn( p.x + Math.cos( a ) * 0.05, p.y + 0.02, p.z + Math.sin( a ) * 0.05,
				Math.cos( a ) * s, 1.1 + Math.random() * 1.6 * strength, Math.sin( a ) * s, 0.8, 1 );

		}

		if ( this.onRipple ) this.onRipple( p.x, p.z, 0.8 + strength * 0.6 );

	}

	spray( x, y, z, vx, vz, amount ) {

		for ( let i = 0; i < amount; i ++ ) {

			this.drops.spawn( x + ( Math.random() - 0.5 ) * 0.3, y, z + ( Math.random() - 0.5 ) * 0.3,
				vx * ( 0.2 + Math.random() * 0.4 ) + ( Math.random() - 0.5 ) * 1.5,
				0.8 + Math.random() * 2.2,
				vz * ( 0.2 + Math.random() * 0.4 ) + ( Math.random() - 0.5 ) * 1.5, 0.9, 1 );

		}

	}

	update( dt, t, camera, { dripPoints = [], focus } = {} ) {

		sharedUniforms.uTime.value = t;
		const c = focus || camera.position;
		sharedUniforms.uCenter.value.set( c.x, 8, c.z );
		this.splashes.material.uniforms.uScale.value = window.innerHeight * 1.2;

		// curtain of drips falling off the eave edge
		if ( this.eave ) {

			this.eaveTimer += dt;
			const rate = 0.012;
			while ( this.eaveTimer > rate ) {

				this.eaveTimer -= rate;
				const e = this.eave;
				const x = e.minX + Math.random() * ( e.maxX - e.minX );
				if ( Math.abs( x - c.x ) < 22 ) this.drops.spawn( x, e.y - 0.02, e.z + Math.random() * 0.03, 0, - 0.5 - Math.random(), 0.05, 3, 0 );

			}

		}

		// drips from umbrella rib tips
		if ( dripPoints.length ) {

			this.umbTimer += dt;
			while ( this.umbTimer > 0.05 ) {

				this.umbTimer -= 0.05;
				const p = dripPoints[ ( Math.random() * dripPoints.length ) | 0 ];
				this.drops.spawn( p.x, p.y - 0.01, p.z, 0, - 0.3, 0, 2, 0 );

			}

		}

		this.drops.update( dt, this.groundY, ( x, y, z ) => {

			if ( this.onRipple && Math.random() < 0.5 ) this.onRipple( x, z, 0.35 );

		} );

	}

}
