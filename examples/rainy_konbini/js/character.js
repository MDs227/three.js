// character.js — procedural anime-styled girl with verlet hair, deforming skirt and vinyl umbrella.
// Origin at feet centre, faces local +Z, height ≈ 1.58 m. See SPEC.md for the API contract.
import * as THREE from 'three';

// ───────────────────────────────────────────────────────────── utilities
const clamp = ( x, a, b ) => ( x < a ? a : ( x > b ? b : x ) );
const lerp = ( a, b, t ) => a + ( b - a ) * t;
const sstep = ( a, b, x ) => { const t = clamp( ( x - a ) / ( b - a ), 0, 1 ); return t * t * ( 3 - 2 * t ); };
const sstep5 = ( t ) => { t = clamp( t, 0, 1 ); return t * t * t * ( t * ( t * 6 - 15 ) + 10 ); };
const spow = ( v, e ) => Math.sign( v ) * Math.pow( Math.abs( v ), e );
const TAU = Math.PI * 2;

function mulberry( seed ) {
	return function () {
		seed |= 0; seed = seed + 0x6D2B79F5 | 0;
		let t = Math.imul( seed ^ seed >>> 15, 1 | seed );
		t = t + Math.imul( t ^ t >>> 7, 61 | t ) ^ t;
		return ( ( t ^ t >>> 14 ) >>> 0 ) / 4294967296;
	};
}

const _v0 = new THREE.Vector3(), _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3(), _v5 = new THREE.Vector3(), _v6 = new THREE.Vector3();
const _q0 = new THREE.Quaternion(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
const _m0 = new THREE.Matrix4(), _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4();
const _e0 = new THREE.Euler();
const UP = new THREE.Vector3( 0, 1, 0 );

function eulerQ( q, x, y, z, order = 'YXZ' ) { _e0.set( x, y, z, order ); return q.setFromEuler( _e0 ); }
function worldQ( obj, q ) { return q.setFromRotationMatrix( _m2.extractRotation( obj.matrixWorld ) ); }
function worldP( obj, v ) { return v.setFromMatrixPosition( obj.matrixWorld ); }

// ───────────────────────────────────────────────────────────── gait table
const GV = [ 0, 1.5, 3.6, 5.6 ];
const GAIT = {
	freq: [ 0.9, 1.1, 1.48, 1.76 ],
	duty: [ 0.62, 0.58, 0.32, 0.26 ],
	lift: [ 0.02, 0.055, 0.20, 0.26 ],
	liftPeak: [ 0.45, 0.42, 0.36, 0.33 ],
	hipDrop: [ 0.006, 0.014, 0.040, 0.060 ],
	bob: [ 0.0, 0.013, 0.030, 0.036 ],
	sway: [ 0.0, 0.018, 0.010, 0.007 ],
	lean: [ 0.02, 0.05, 0.15, 0.26 ],
	armSwing: [ 0.0, 0.30, 0.55, 0.78 ],
	armBase: [ 0.0, 0.03, 0.16, 0.26 ],
	elbow: [ 0.20, 0.30, 1.30, 1.45 ],
	elbowVar: [ 0.0, 0.12, 0.22, 0.28 ],
	pYaw: [ 0.0, 0.07, 0.10, 0.12 ],
	pRoll: [ 0.0, 0.045, 0.03, 0.022 ],
	width: [ 0.08, 0.07, 0.055, 0.045 ],
	heel: [ 0.0, 0.30, 0.05, -0.10 ],
	toe: [ 0.0, 0.55, 0.85, 1.0 ],
	zc: [ 0.0, 0.015, - 0.06, - 0.09 ],
};
function gp( name, v ) {
	const a = GAIT[ name ];
	if ( v <= GV[ 0 ] ) return a[ 0 ];
	for ( let i = 1; i < GV.length; i ++ ) {
		if ( v <= GV[ i ] ) {
			const t = ( v - GV[ i - 1 ] ) / ( GV[ i ] - GV[ i - 1 ] );
			return lerp( a[ i - 1 ], a[ i ], lerp( t, t * t * ( 3 - 2 * t ), 0.5 ) );
		}
	}
	return a[ a.length - 1 ];
}

// ───────────────────────────────────────────────────────────── geometry helpers
// rings: [a, ra, rb, ca, cb]. axis 'y': a=y, ra=rx, rb=rz, ca=cx, cb=cz. axis 'z': a=z, ra=hx, rb=hy, ca=cx, cb=cy
function ringGeometry( rings, seg, n = 2, axis = 'y' ) {
	const pos = [], uv = [];
	const e = 2 / n;
	for ( let i = 0; i < rings.length; i ++ ) {
		const [ a, ra, rb, ca = 0, cb = 0 ] = rings[ i ];
		for ( let j = 0; j < seg; j ++ ) {
			const th = j / seg * TAU;
			const s = spow( Math.sin( th ), e ), c = spow( Math.cos( th ), e );
			if ( axis === 'y' ) pos.push( ca + ra * s, a, cb + rb * c );
			else pos.push( ca + ra * s, cb + rb * c, a );
			uv.push( j / seg, i / ( rings.length - 1 ) );
		}
	}
	const idx = [];
	for ( let i = 0; i < rings.length - 1; i ++ ) for ( let j = 0; j < seg; j ++ ) {
		const a = i * seg + j, b = i * seg + ( j + 1 ) % seg, c = ( i + 1 ) * seg + j, d = ( i + 1 ) * seg + ( j + 1 ) % seg;
		idx.push( a, b, d, a, d, c );
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute( 'position', new THREE.Float32BufferAttribute( pos, 3 ) );
	g.setAttribute( 'uv', new THREE.Float32BufferAttribute( uv, 2 ) );
	g.setIndex( idx );
	g.computeVertexNormals();
	// make normals point outward
	const P = g.attributes.position, N = g.attributes.normal;
	let score = 0;
	for ( let i = 0; i < rings.length; i ++ ) {
		const [ , , , ca = 0, cb = 0 ] = rings[ i ];
		for ( let j = 0; j < seg; j ++ ) {
			const k = i * seg + j;
			if ( axis === 'y' ) score += ( P.getX( k ) - ca ) * N.getX( k ) + ( P.getZ( k ) - cb ) * N.getZ( k );
			else score += ( P.getX( k ) - ca ) * N.getX( k ) + ( P.getY( k ) - cb ) * N.getY( k );
		}
	}
	if ( score < 0 ) {
		const I = g.index.array;
		for ( let i = 0; i < I.length; i += 3 ) { const t = I[ i + 1 ]; I[ i + 1 ] = I[ i + 2 ]; I[ i + 2 ] = t; }
		g.index.needsUpdate = true;
		g.computeVertexNormals();
	}
	return g;
}

function ellipsoid( cx, cy, cz, rx, ry, rz, ws = 18, hs = 12 ) {
	const g = new THREE.SphereGeometry( 1, ws, hs );
	g.applyMatrix4( new THREE.Matrix4().makeScale( rx, ry, rz ).setPosition( cx, cy, cz ) );
	return g;
}

function tubePath( points, radius, tubular = 12, radial = 6 ) {
	const curve = new THREE.CatmullRomCurve3( points.map( p => new THREE.Vector3( ...p ) ) );
	return new THREE.TubeGeometry( curve, tubular, radius, radial, false );
}

function mergeGeos( list ) {
	const P = [], N = [], U = [], I = [];
	let base = 0;
	for ( const g0 of list ) {
		const g = g0;
		const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
		for ( let i = 0; i < p.count; i ++ ) {
			P.push( p.getX( i ), p.getY( i ), p.getZ( i ) );
			N.push( n.getX( i ), n.getY( i ), n.getZ( i ) );
			if ( u ) U.push( u.getX( i ), u.getY( i ) ); else U.push( 0, 0 );
		}
		if ( g.index ) for ( let i = 0; i < g.index.count; i ++ ) I.push( base + g.index.getX( i ) );
		else for ( let i = 0; i < p.count; i ++ ) I.push( base + i );
		base += p.count;
	}
	const out = new THREE.BufferGeometry();
	out.setAttribute( 'position', new THREE.Float32BufferAttribute( P, 3 ) );
	out.setAttribute( 'normal', new THREE.Float32BufferAttribute( N, 3 ) );
	out.setAttribute( 'uv', new THREE.Float32BufferAttribute( U, 2 ) );
	out.setIndex( I );
	return out;
}

// Accumulates rigid / blended parts into one SkinnedMesh (one draw call per material).
class SkinBuilder {
	constructor( withColor ) {
		this.withColor = withColor;
		this.P = []; this.N = []; this.C = []; this.UV = []; this.SI = []; this.SW = []; this.I = []; this.count = 0;
	}
	add( geo, matrix, weights, color ) {
		const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
		const nm = new THREE.Matrix3().getNormalMatrix( matrix );
		const v = new THREE.Vector3(), n = new THREE.Vector3(), lv = new THREE.Vector3();
		const col = new THREE.Color();
		for ( let i = 0; i < pos.count; i ++ ) {
			lv.fromBufferAttribute( pos, i );
			let w = typeof weights === 'number' ? [ [ weights, 1 ] ] : weights( lv );
			w = w.filter( e => e[ 1 ] > 1e-4 ).sort( ( a, b ) => b[ 1 ] - a[ 1 ] ).slice( 0, 4 );
			let sum = 0; for ( const e of w ) sum += e[ 1 ];
			for ( let k = 0; k < 4; k ++ ) {
				this.SI.push( w[ k ] ? w[ k ][ 0 ] : 0 );
				this.SW.push( w[ k ] ? w[ k ][ 1 ] / sum : 0 );
			}
			v.copy( lv ).applyMatrix4( matrix ); this.P.push( v.x, v.y, v.z );
			n.fromBufferAttribute( nor, i ).applyMatrix3( nm ).normalize(); this.N.push( n.x, n.y, n.z );
			if ( uv ) this.UV.push( uv.getX( i ), uv.getY( i ) ); else this.UV.push( 0, 0 );
			if ( this.withColor ) {
				if ( typeof color === 'function' ) col.copy( color( lv ) ); else col.copy( color );
				this.C.push( col.r, col.g, col.b );
			}
		}
		if ( geo.index ) for ( let i = 0; i < geo.index.count; i ++ ) this.I.push( this.count + geo.index.getX( i ) );
		else for ( let i = 0; i < pos.count; i ++ ) this.I.push( this.count + i );
		this.count += pos.count;
	}
	build( material, skeleton ) {
		const g = new THREE.BufferGeometry();
		g.setAttribute( 'position', new THREE.Float32BufferAttribute( this.P, 3 ) );
		g.setAttribute( 'normal', new THREE.Float32BufferAttribute( this.N, 3 ) );
		g.setAttribute( 'uv', new THREE.Float32BufferAttribute( this.UV, 2 ) );
		if ( this.withColor ) g.setAttribute( 'color', new THREE.Float32BufferAttribute( this.C, 3 ) );
		g.setAttribute( 'skinIndex', new THREE.Uint16BufferAttribute( this.SI, 4 ) );
		g.setAttribute( 'skinWeight', new THREE.Float32BufferAttribute( this.SW, 4 ) );
		g.setIndex( this.I );
		const m = new THREE.SkinnedMesh( g, material );
		m.bind( skeleton, new THREE.Matrix4() );
		m.frustumCulled = false;
		m.castShadow = true; m.receiveShadow = true;
		return m;
	}
}

// ───────────────────────────────────────────────────────────── textures
const FACE_S = 1024, FACE_M = 0.2, FACE_Y0 = - 0.02;
function makeFaceTexture( skinHex ) {
	const c = document.createElement( 'canvas' ); c.width = c.height = FACE_S;
	const g = c.getContext( '2d' );
	const px = ( x ) => ( 0.5 + x / FACE_M ) * FACE_S;
	const py = ( y ) => ( 1 - ( 0.5 + ( y - FACE_Y0 ) / FACE_M ) ) * FACE_S;
	const m = FACE_S / FACE_M; // px per metre
	g.fillStyle = skinHex; g.fillRect( 0, 0, FACE_S, FACE_S );

	// soft blush
	for ( const s of [ - 1, 1 ] ) {
		const gr = g.createRadialGradient( px( s * 0.037 ), py( - 0.040 ), 0, px( s * 0.037 ), py( - 0.040 ), 0.016 * m );
		gr.addColorStop( 0, 'rgba(255,120,120,0.30)' ); gr.addColorStop( 1, 'rgba(255,120,120,0)' );
		g.fillStyle = gr; g.fillRect( 0, 0, FACE_S, FACE_S );
	}
	// eyes
	const EY = - 0.015;
	for ( const s of [ - 1, 1 ] ) {
		const cx = s * 0.0285, cy = EY;
		const inner = cx - s * 0.0118, outer = cx + s * 0.0128;
		// eye shape path (upper lid arc + lower lid arc)
		const shape = () => {
			g.beginPath();
			g.moveTo( px( inner ), py( cy + 0.0015 ) );
			g.bezierCurveTo( px( cx - s * 0.008 ), py( cy + 0.0105 ), px( cx + s * 0.007 ), py( cy + 0.0115 ), px( outer ), py( cy + 0.004 ) );
			g.bezierCurveTo( px( cx + s * 0.010 ), py( cy - 0.006 ), px( cx - s * 0.004 ), py( cy - 0.0095 ), px( inner ), py( cy + 0.0015 ) );
			g.closePath();
		};
		g.save();
		shape(); g.clip();
		// sclera
		g.fillStyle = '#fbf7f4'; g.fillRect( 0, 0, FACE_S, FACE_S );
		// iris
		const ix = cx + s * 0.0006, iy = cy - 0.0002, irx = 0.0074, iry = 0.0102;
		const ig = g.createLinearGradient( 0, py( iy + iry ), 0, py( iy - iry ) );
		ig.addColorStop( 0, '#120a14' ); ig.addColorStop( 0.45, '#2a1626' ); ig.addColorStop( 0.85, '#7a3e3a' ); ig.addColorStop( 1, '#a5604c' );
		g.fillStyle = ig;
		g.beginPath(); g.ellipse( px( ix ), py( iy ), irx * m, iry * m, 0, 0, TAU ); g.fill();
		g.strokeStyle = '#0d0710'; g.lineWidth = 0.0009 * m; g.stroke();
		// pupil
		g.fillStyle = '#07040a';
		g.beginPath(); g.ellipse( px( ix ), py( iy + 0.0006 ), 0.0033 * m, 0.0048 * m, 0, 0, TAU ); g.fill();
		// lid shadow
		const sg = g.createLinearGradient( 0, py( cy + 0.011 ), 0, py( cy + 0.002 ) );
		sg.addColorStop( 0, 'rgba(60,30,50,0.55)' ); sg.addColorStop( 1, 'rgba(60,30,50,0)' );
		g.fillStyle = sg; g.fillRect( 0, 0, FACE_S, FACE_S );
		// highlights
		g.fillStyle = '#ffffff';
		g.beginPath(); g.ellipse( px( ix - s * 0.0028 ), py( iy + 0.0042 ), 0.0024 * m, 0.0027 * m, 0, 0, TAU ); g.fill();
		g.beginPath(); g.arc( px( ix + s * 0.0030 ), py( iy - 0.0045 ), 0.0011 * m, 0, TAU ); g.fill();
		g.restore();
		// upper lash line
		g.strokeStyle = '#1a0f16'; g.lineCap = 'round'; g.lineJoin = 'round';
		g.lineWidth = 0.0021 * m;
		g.beginPath();
		g.moveTo( px( inner ), py( cy + 0.0015 ) );
		g.bezierCurveTo( px( cx - s * 0.008 ), py( cy + 0.0105 ), px( cx + s * 0.007 ), py( cy + 0.0115 ), px( outer ), py( cy + 0.004 ) );
		g.lineTo( px( outer + s * 0.0025 ), py( cy + 0.0012 ) );
		g.stroke();
		// lash flick
		g.lineWidth = 0.0012 * m;
		g.beginPath(); g.moveTo( px( outer - s * 0.001 ), py( cy + 0.006 ) ); g.lineTo( px( outer + s * 0.003 ), py( cy + 0.0075 ) ); g.stroke();
		// double lid crease
		g.strokeStyle = 'rgba(120,60,60,0.45)'; g.lineWidth = 0.0006 * m;
		g.beginPath(); g.moveTo( px( cx - s * 0.006 ), py( cy + 0.0128 ) );
		g.quadraticCurveTo( px( cx + s * 0.004 ), py( cy + 0.0148 ), px( outer - s * 0.001 ), py( cy + 0.0085 ) ); g.stroke();
		// lower lash
		g.strokeStyle = 'rgba(70,30,40,0.7)'; g.lineWidth = 0.0007 * m;
		g.beginPath(); g.moveTo( px( cx + s * 0.002 ), py( cy - 0.0092 ) );
		g.quadraticCurveTo( px( cx + s * 0.009 ), py( cy - 0.0075 ), px( outer - s * 0.0005 ), py( cy - 0.001 ) ); g.stroke();
		// brow
		g.strokeStyle = '#3b2628'; g.lineWidth = 0.0013 * m;
		g.beginPath(); g.moveTo( px( cx - s * 0.010 ), py( cy + 0.0215 ) );
		g.quadraticCurveTo( px( cx + s * 0.002 ), py( cy + 0.0255 ), px( cx + s * 0.0125 ), py( cy + 0.0225 ) ); g.stroke();
	}
	// nose
	g.strokeStyle = 'rgba(200,120,110,0.75)'; g.lineWidth = 0.0009 * m; g.lineCap = 'round';
	g.beginPath(); g.moveTo( px( 0.0015 ), py( - 0.043 ) ); g.lineTo( px( - 0.0005 ), py( - 0.0455 ) ); g.stroke();
	// mouth
	g.strokeStyle = '#a4525a'; g.lineWidth = 0.0011 * m;
	g.beginPath(); g.moveTo( px( - 0.0055 ), py( - 0.0655 ) );
	g.quadraticCurveTo( px( 0 ), py( - 0.0672 ), px( 0.0055 ), py( - 0.0655 ) ); g.stroke();
	g.fillStyle = 'rgba(230,140,140,0.35)';
	g.beginPath(); g.ellipse( px( 0 ), py( - 0.0688 ), 0.0035 * m, 0.0012 * m, 0, 0, TAU ); g.fill();

	const t = new THREE.CanvasTexture( c );
	t.colorSpace = THREE.SRGBColorSpace;
	t.anisotropy = 4;
	return t;
}

function makeHairTexture() {
	const W = 32, H = 256;
	const c = document.createElement( 'canvas' ); c.width = W; c.height = H;
	const g = c.getContext( '2d' );
	const r = mulberry( 7 );
	for ( let y = 0; y < H; y ++ ) {
		const v = 150 + r() * 105;
		g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect( 0, y, W, 1 );
	}
	const t = new THREE.CanvasTexture( c );
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}

// ───────────────────────────────────────────────────────────── constants
const HS = 1.1;                                            // head scale (anime proportions)
const HC0 = new THREE.Vector3( 0, 0.075, 0.008 );          // head centre (unscaled head geometry space)
const CAP_R0 = new THREE.Vector3( 0.087, 0.101, 0.098 );   // hair cap ellipsoid radii (unscaled)
const HC = HC0.clone().multiplyScalar( HS );               // scaled, in head-bone space
const CAP_R = CAP_R0.clone().multiplyScalar( HS );
const ANKLE_H = 0.065, HEEL_Z = - 0.05, BALL_Z = 0.115;
const L_THIGH = 0.37, L_SHIN = 0.365, L_UARM = 0.26, L_FARM = 0.23;
const GRIP_C = new THREE.Vector3( 0.024, - 0.062, 0.0 );    // right fist hole centre (hand space)

// umbrella dims (umbrella space: origin at the open-grip point on the shaft, +Y toward the tip)
const UMB = { apexY: 0.70, ribLen: 0.56, ribs: 8, runnerOpen: 0.45, runnerClosed: 0.19, tipY: 0.76, stretchS: 0.36 };
const CAN_T = [ 0, 0.035, 0.15, 0.32, 0.5, 0.68, 0.85, 0.965, 1 ];
const CAN_S = [ 0, 0.06, 0.15, 0.27, 0.4, 0.53, 0.66, 0.78, 0.88, 0.95, 0.985, 1 ];
const RIB_SAMPLES = 33;

// ═════════════════════════════════════════════════════════════ Girl
export class Girl {

	constructor( opts = {} ) {
		this.opts = opts;
		this.root = new THREE.Group();
		this.root.name = 'Girl';
		this._rand = mulberry( opts.seed ?? 1234 );

		this._buildSkeleton();
		this._buildMaterials();
		this._buildBody();
		this._buildHead();
		this._buildHairStatic();
		this._buildSkirt();
		this._buildUmbrella();
		this._initState();
		this._buildStrands();

		// settle everything in an idle pose
		this._comb = 1;
		for ( let i = 0; i < 90; i ++ ) this.update( 1 / 60, { speed: 0, umbrellaOpen: opts.umbrellaOpen ?? 1, turnRate: 0 } );
		this._comb = 0;
		for ( let i = 0; i < 120; i ++ ) this.update( 1 / 60, { speed: 0, umbrellaOpen: opts.umbrellaOpen ?? 1, turnRate: 0 } );
		this._captureHairRest();
		this._footsteps.length = 0;
		this._needsReset = true;
	}

	// ─────────────────────────────────────────── skeleton
	_buildSkeleton() {
		const B = this.B = {};
		const bones = this.bones = [];
		const mk = ( name, parent, x, y, z ) => {
			const b = new THREE.Bone(); b.name = name; b.position.set( x, y, z );
			if ( parent ) parent.add( b );
			b.userData.index = bones.length; bones.push( b ); B[ name ] = b; return b;
		};
		mk( 'hips', null, 0, 0.86, 0 );
		mk( 'spine', B.hips, 0, 0.10, 0 );
		mk( 'chest', B.spine, 0, 0.14, 0 );
		mk( 'neck', B.chest, 0, 0.19, - 0.012 );
		mk( 'head', B.neck, 0, 0.096, 0.012 );
		for ( const [ S, sx ] of [ [ 'L', 1 ], [ 'R', - 1 ] ] ) {
			mk( 'shoulder' + S, B.chest, 0.035 * sx, 0.155, - 0.01 );
			mk( 'upperArm' + S, B[ 'shoulder' + S ], 0.13 * sx, 0, 0 );
			mk( 'foreArm' + S, B[ 'upperArm' + S ], 0, - L_UARM, 0 );
			mk( 'hand' + S, B[ 'foreArm' + S ], 0, - L_FARM, 0 );
			mk( 'thigh' + S, B.hips, 0.085 * sx, - 0.06, 0 );
			mk( 'shin' + S, B[ 'thigh' + S ], 0, - L_THIGH, 0 );
			mk( 'foot' + S, B[ 'shin' + S ], 0, - L_SHIN, 0 );
			mk( 'string' + S, B.chest, 0.03 * sx, 0.142, 0.104 );
		}
		mk( 'bag', B.hips, 0.2, 0.0, 0.035 );
		this.root.add( B.hips );
		this.root.updateMatrixWorld( true );
		this.bind = {};
		for ( const b of bones ) this.bind[ b.name ] = b.matrixWorld.clone();
		this.skeleton = new THREE.Skeleton( bones );
	}

	// ─────────────────────────────────────────── materials
	_buildMaterials() {
		const skinHex = '#f7d9c8';
		this._faceTex = makeFaceTexture( skinHex );
		this._hairTex = makeHairTexture();
		const skinCommon = { roughness: 0.52, sheen: 0.5, sheenRoughness: 0.45, sheenColor: new THREE.Color( 0xff9c8c ), emissive: new THREE.Color( 0x3a1810 ), emissiveIntensity: 0.12 };
		this.mat = {
			cloth: new THREE.MeshPhysicalMaterial( { vertexColors: true, roughness: 0.8, sheen: 0.8, sheenRoughness: 0.6, sheenColor: new THREE.Color( 0x8a8c9a ) } ),
			skin: new THREE.MeshPhysicalMaterial( { color: skinHex, ...skinCommon } ),
			face: new THREE.MeshPhysicalMaterial( { map: this._faceTex, ...skinCommon } ),
			skirt: new THREE.MeshPhysicalMaterial( { color: 0x232b4c, roughness: 0.72, sheen: 0.8, sheenRoughness: 0.5, sheenColor: new THREE.Color( 0x5a6aa0 ), side: THREE.DoubleSide } ),
			hair: new THREE.MeshPhysicalMaterial( {
				color: 0x16131d, map: this._hairTex, roughness: 0.36, metalness: 0.0, side: THREE.DoubleSide,
				sheen: 1.0, sheenRoughness: 0.32, sheenColor: new THREE.Color( 0x4d5a7e ),
				clearcoat: 0.35, clearcoatRoughness: 0.28, anisotropy: 0.65,
			} ),
			canopy: new THREE.MeshPhysicalMaterial( {
				color: 0xffffff, vertexColors: true, transparent: true, roughness: 0.06, metalness: 0,
				clearcoat: 1, clearcoatRoughness: 0.04, side: THREE.DoubleSide, depthWrite: false,
				specularIntensity: 1, envMapIntensity: 1.6,
			} ),
			metal: new THREE.MeshStandardMaterial( { color: 0xc9ced6, metalness: 0.9, roughness: 0.28 } ),
			plastic: new THREE.MeshPhysicalMaterial( { color: 0xeef2f6, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1, transparent: true, opacity: 0.9 } ),
			bead: new THREE.MeshPhysicalMaterial( { color: 0xffffff, roughness: 0.02, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.7, envMapIntensity: 3.0, emissive: 0x9fb8d8, emissiveIntensity: 0.08 } ),
		};
		this._baseColors = {
			cloth: 1, skirt: this.mat.skirt.color.clone(), hair: this.mat.hair.color.clone(),
		};
	}

	// ─────────────────────────────────────────── body (two skinned meshes)
	_buildBody() {
		const B = this.B, bind = this.bind;
		const W = ( n ) => B[ n ].userData.index;
		const I = new THREE.Matrix4();
		const cloth = new SkinBuilder( true );
		const skin = new SkinBuilder( false );
		const C = ( hex ) => new THREE.Color( hex );
		const cream = C( 0xeee4cf ), creamBand = C( 0xe2d7bf ), white = C( 0xf3f2ee ), sock = C( 0x15151b ), shoe = C( 0xf1f0ec ), sole = C( 0xcfcac0 ), strap = C( 0x5a4436 ), bagC = C( 0x7a5a44 ), shoeAccent = C( 0x9fb6c9 );

		// ── hoodie torso (bind space, height-blended weights)
		const torsoW = ( v ) => {
			const y = v.y;
			const a = sstep( 0.9, 1.0, y ), b = sstep( 1.02, 1.13, y );
			return [ [ W( 'hips' ), ( 1 - a ) ], [ W( 'spine' ), a * ( 1 - b ) ], [ W( 'chest' ), b ] ];
		};
		const torso = ringGeometry( [
			[ 0.845, 0.002, 0.002, 0, 0 ],
			[ 0.80, 0.142, 0.110, 0, 0 ],
			[ 0.788, 0.156, 0.122, 0, 0 ],
			[ 0.795, 0.163, 0.128, 0, 0 ],
			[ 0.835, 0.160, 0.127, 0, 0 ],
			[ 0.848, 0.165, 0.131, 0, 0.002 ],
			[ 0.93, 0.166, 0.131, 0, 0.004 ],
			[ 1.02, 0.161, 0.127, 0, 0.005 ],
			[ 1.10, 0.157, 0.134, 0, 0.012 ],
			[ 1.17, 0.155, 0.126, 0, 0.006 ],
			[ 1.22, 0.150, 0.110, 0, - 0.004 ],
			[ 1.255, 0.132, 0.094, 0, - 0.008 ],
			[ 1.28, 0.098, 0.074, 0, - 0.01 ],
			[ 1.298, 0.066, 0.058, 0, - 0.008 ],
			[ 1.305, 0.052, 0.047, 0, - 0.006 ],
			[ 1.29, 0.035, 0.032, 0, - 0.006 ],
		], 30, 2.4 );
		cloth.add( torso, I, torsoW, ( v ) => ( v.y < 0.84 && v.y > 0.786 ) ? creamBand : cream );
		// kangaroo pocket
		cloth.add( ellipsoid( 0, 0.905, 0.122, 0.105, 0.05, 0.022, 20, 10 ), I, torsoW, cream );
		// shirt hem peeking + collar
		cloth.add( ringGeometry( [ [ 0.79, 0.02, 0.02 ], [ 0.775, 0.150, 0.118 ], [ 0.80, 0.152, 0.120 ], [ 0.82, 0.02, 0.02 ] ], 26, 2.3 ), I, W( 'hips' ), white );
		cloth.add( ringGeometry( [ [ 1.282, 0.050, 0.048, 0, 0.0 ], [ 1.30, 0.054, 0.052, 0, 0.0 ], [ 1.312, 0.047, 0.046, 0, 0.0 ], [ 1.31, 0.03, 0.03 ] ], 20 ), I, W( 'chest' ), white );
		// hood roll + flap (chest space)
		{
			const roll = new THREE.TorusGeometry( 0.083, 0.03, 10, 22, Math.PI * 1.15 );
			roll.applyMatrix4( new THREE.Matrix4().makeRotationX( Math.PI / 2 ) );
			roll.applyMatrix4( new THREE.Matrix4().makeRotationY( Math.PI / 2 + Math.PI * 0.075 + Math.PI ) );
			roll.applyMatrix4( new THREE.Matrix4().makeTranslation( 0, 0.17, - 0.012 ) );
			cloth.add( roll, bind.chest, W( 'chest' ), cream );
			cloth.add( ellipsoid( 0, 0.09, - 0.105, 0.11, 0.085, 0.03, 18, 12 ), bind.chest, W( 'chest' ), cream );
		}
		// drawstrings
		for ( const S of [ 'L', 'R' ] ) {
			const g = tubePath( [ [ 0, 0.004, - 0.004 ], [ 0, - 0.04, 0.002 ], [ 0, - 0.09, 0.004 ], [ 0, - 0.13, 0.004 ] ], 0.0032, 10, 5 );
			cloth.add( g, bind[ 'string' + S ], W( 'string' + S ), white );
			cloth.add( ellipsoid( 0, - 0.138, 0.004, 0.0048, 0.011, 0.0048, 8, 6 ), bind[ 'string' + S ], W( 'string' + S ), C( 0xcfd4da ) );
		}
		// crossbody bag strap (front + back), bag body on swinging bone
		{
			const front = tubePath( [ [ - 0.115, 1.262, 0.0 ], [ - 0.09, 1.235, 0.085 ], [ - 0.03, 1.15, 0.143 ], [ 0.06, 1.03, 0.142 ], [ 0.13, 0.94, 0.13 ], [ 0.175, 0.875, 0.09 ] ], 0.0075, 24, 4 );
			const back = tubePath( [ [ - 0.115, 1.262, 0.0 ], [ - 0.10, 1.235, - 0.085 ], [ - 0.02, 1.13, - 0.132 ], [ 0.08, 1.0, - 0.135 ], [ 0.16, 0.9, - 0.09 ], [ 0.185, 0.86, - 0.02 ] ], 0.0075, 24, 4 );
			for ( const g of [ front, back ] ) {
				g.scale( 1, 1, 1 );
				cloth.add( g, I, torsoW, strap );
			}
			const bag = ringGeometry( [
				[ 0.015, 0.002, 0.002 ], [ 0.012, 0.045, 0.018 ], [ 0.0, 0.058, 0.024 ], [ - 0.08, 0.062, 0.026 ], [ - 0.11, 0.055, 0.023 ], [ - 0.118, 0.002, 0.002 ],
			], 16, 3.2 );
			bag.applyMatrix4( new THREE.Matrix4().makeRotationY( Math.PI / 2 - 0.25 ) );
			bag.translate( 0.03, 0, 0 );
			cloth.add( bag, bind.bag, W( 'bag' ), bagC );
			cloth.add( ellipsoid( 0.03, - 0.02, 0.0, 0.012, 0.012, 0.004, 8, 6 ).rotateY( Math.PI / 2 - 0.25 ).translate( 0.0, 0, 0.0 ), bind.bag, W( 'bag' ), C( 0xd8c08a ) );
		}

		// ── arms
		for ( const [ S, sx ] of [ [ 'L', 1 ], [ 'R', - 1 ] ] ) {
			const ua = 'upperArm' + S, fa = 'foreArm' + S, hd = 'hand' + S;
			const sleeveU = ringGeometry( [
				[ 0.04, 0.002, 0.002 ], [ 0.034, 0.04, 0.04 ], [ 0.015, 0.054, 0.054 ], [ - 0.03, 0.057, 0.056 ], [ - 0.12, 0.055, 0.054 ],
				[ - 0.20, 0.052, 0.051 ], [ - 0.25, 0.05, 0.05 ], [ - 0.28, 0.048, 0.048 ], [ - 0.30, 0.036, 0.036 ], [ - 0.305, 0.002, 0.002 ],
			], 18 );
			cloth.add( sleeveU, bind[ ua ], ( v ) => { const t = sstep( - 0.2, - 0.29, v.y ) * 0.5; return [ [ W( ua ), 1 - t ], [ W( fa ), t ] ]; }, cream );
			cloth.add( ellipsoid( - 0.004 * sx, 0.0, 0, 0.056, 0.058, 0.056 ), bind[ ua ], W( ua ), cream );
			cloth.add( ellipsoid( 0, 0.0, - 0.004, 0.049, 0.05, 0.049 ), bind[ fa ], W( fa ), cream );
			const sleeveF = ringGeometry( [
				[ 0.03, 0.002, 0.002 ], [ 0.02, 0.047, 0.047 ], [ - 0.05, 0.05, 0.05 ], [ - 0.15, 0.049, 0.049 ], [ - 0.205, 0.047, 0.047 ],
				[ - 0.222, 0.041, 0.041 ], [ - 0.258, 0.038, 0.038 ], [ - 0.266, 0.036, 0.036 ], [ - 0.262, 0.027, 0.027 ], [ - 0.24, 0.002, 0.002 ],
			], 18 );
			cloth.add( sleeveF, bind[ fa ], W( fa ), ( v ) => v.y < - 0.215 ? creamBand : cream );
			// hand
			const pX = S === 'L' ? - 1 : 1;
			skin.add( ringGeometry( [ [ 0.03, 0.002, 0.002 ], [ 0.02, 0.019, 0.021 ], [ - 0.01, 0.017, 0.022 ], [ - 0.02, 0.002, 0.002 ] ], 10 ), bind[ hd ], W( hd ) );
			skin.add( ellipsoid( pX * 0.002, - 0.036, 0, 0.0155, 0.036, 0.031, 14, 10 ), bind[ hd ], W( hd ) );
			if ( S === 'R' ) {
				// fist curled around Z axis (grip hole)
				skin.add( ellipsoid( pX * 0.021, - 0.066, - 0.002, 0.016, 0.019, 0.031, 14, 10 ), bind[ hd ], W( hd ) );
				skin.add( ellipsoid( pX * 0.031, - 0.050, - 0.002, 0.009, 0.016, 0.029, 10, 8 ), bind[ hd ], W( hd ) );
				skin.add( ellipsoid( pX * 0.020, - 0.045, 0.027, 0.010, 0.017, 0.010, 10, 8 ), bind[ hd ], W( hd ) );
			} else {
				skin.add( ellipsoid( pX * 0.006, - 0.074, - 0.002, 0.012, 0.021, 0.029, 12, 8 ), bind[ hd ], W( hd ) );
				skin.add( ellipsoid( pX * 0.015, - 0.091, - 0.002, 0.010, 0.013, 0.026, 10, 8 ), bind[ hd ], W( hd ) );
				skin.add( ellipsoid( pX * 0.012, - 0.042, 0.027, 0.009, 0.018, 0.009, 10, 8 ), bind[ hd ], W( hd ) );
			}
		}

		// ── neck
		skin.add( ringGeometry( [
			[ - 0.06, 0.002, 0.002, 0, 0.004 ], [ - 0.05, 0.036, 0.038, 0, 0.004 ], [ 0.0, 0.033, 0.035, 0, 0.004 ], [ 0.06, 0.031, 0.034, 0, 0.006 ],
			[ 0.10, 0.034, 0.036, 0, 0.008 ], [ 0.13, 0.02, 0.02, 0, 0.008 ], [ 0.135, 0.002, 0.002, 0, 0.008 ],
		], 16 ), bind.neck, ( v ) => { const t = sstep( 0.05, 0.11, v.y ); return [ [ W( 'neck' ), 1 - t ], [ W( 'head' ), t ] ]; } );

		// ── legs
		for ( const [ S ] of [ [ 'L' ], [ 'R' ] ] ) {
			const th = 'thigh' + S, sh = 'shin' + S, ft = 'foot' + S;
			const thigh = ringGeometry( [
				[ 0.085, 0.002, 0.002 ], [ 0.07, 0.05, 0.05 ], [ 0.035, 0.071, 0.071 ], [ 0.0, 0.074, 0.074, 0, 0.003 ], [ - 0.08, 0.071, 0.072, 0, 0.006 ],
				[ - 0.18, 0.063, 0.064, 0, 0.005 ], [ - 0.28, 0.054, 0.055, 0, 0.003 ], [ - 0.34, 0.048, 0.049, 0, 0.002 ], [ - 0.37, 0.046, 0.047 ],
				[ - 0.39, 0.040, 0.041 ], [ - 0.405, 0.002, 0.002 ],
			], 18 );
			skin.add( thigh, bind[ th ], ( v ) => {
				const h = sstep( 0.06, - 0.03, v.y ) , k = sstep( - 0.33, - 0.40, v.y ) * 0.5;
				return [ [ W( 'hips' ), 1 - h ], [ W( th ), h * ( 1 - k ) ], [ W( sh ), h * k ] ];
			} );
			skin.add( ellipsoid( 0, 0.0, 0.003, 0.0435, 0.047, 0.0435, 14, 10 ), bind[ sh ], W( sh ) );
			skin.add( ringGeometry( [ [ 0.0, 0.043, 0.044 ], [ - 0.03, 0.045, 0.046 ], [ - 0.06, 0.046, 0.047 ], [ - 0.07, 0.002, 0.002 ] ], 16 ), bind[ sh ], W( sh ) );
			const sockG = ringGeometry( [
				[ - 0.046, 0.044, 0.045 ], [ - 0.05, 0.0495, 0.05 ], [ - 0.066, 0.0495, 0.05 ], [ - 0.072, 0.049, 0.05, 0, - 0.002 ], [ - 0.11, 0.051, 0.053, 0, - 0.006 ],
				[ - 0.17, 0.048, 0.050, 0, - 0.005 ], [ - 0.24, 0.040, 0.042, 0, - 0.003 ], [ - 0.30, 0.034, 0.035 ], [ - 0.34, 0.031, 0.032 ], [ - 0.37, 0.031, 0.033 ],
				[ - 0.40, 0.03, 0.03 ], [ - 0.41, 0.002, 0.002 ],
			], 18 );
			cloth.add( sockG, bind[ sh ], ( v ) => { const t = sstep( - 0.33, - 0.39, v.y ); return [ [ W( sh ), 1 - t ], [ W( ft ), t ] ]; }, sock );
			// sneaker upper (foot space, +Z forward)
			const upper = ringGeometry( [
				[ - 0.059, 0.002, 0.002, 0, - 0.025 ],
				[ - 0.054, 0.022, 0.03, 0, - 0.025 ],
				[ - 0.042, 0.030, 0.037, 0, - 0.019 ],
				[ - 0.015, 0.033, 0.038, 0, - 0.018 ],
				[ 0.010, 0.035, 0.034, 0, - 0.022 ],
				[ 0.040, 0.038, 0.024, 0, - 0.032 ],
				[ 0.080, 0.041, 0.017, 0, - 0.039 ],
				[ 0.115, 0.042, 0.013, 0, - 0.043 ],
				[ 0.145, 0.038, 0.0105, 0, - 0.0445 ],
				[ 0.165, 0.030, 0.0085, 0, - 0.0455 ],
				[ 0.178, 0.018, 0.0065, 0, - 0.0465 ],
				[ 0.183, 0.002, 0.002, 0, - 0.047 ],
			], 20, 2.6, 'z' );
			cloth.add( upper, bind[ ft ], W( ft ), ( v ) => ( v.y > - 0.03 && v.z < - 0.03 ) ? shoeAccent : shoe );
			const soleG = ringGeometry( [
				[ - 0.064, 0.002, 0.002, 0, - 0.057 ], [ - 0.06, 0.026, 0.009, 0, - 0.057 ], [ - 0.045, 0.034, 0.009, 0, - 0.057 ], [ 0.0, 0.036, 0.009, 0, - 0.057 ],
				[ 0.06, 0.041, 0.009, 0, - 0.057 ], [ 0.115, 0.046, 0.009, 0, - 0.057 ], [ 0.16, 0.041, 0.0085, 0, - 0.0555 ], [ 0.18, 0.031, 0.008, 0, - 0.053 ],
				[ 0.19, 0.016, 0.007, 0, - 0.051 ], [ 0.193, 0.002, 0.002, 0, - 0.05 ],
			], 20, 4, 'z' );
			cloth.add( soleG, bind[ ft ], W( ft ), sole );
		}

		this.clothMesh = cloth.build( this.mat.cloth, this.skeleton );
		this.skinMesh = skin.build( this.mat.skin, this.skeleton );
		this.root.add( this.clothMesh, this.skinMesh );
	}

	// ─────────────────────────────────────────── head
	_buildHead() {
		const g = new THREE.SphereGeometry( 1, 48, 36 );
		const P = g.attributes.position, UV = g.attributes.uv;
		for ( let i = 0; i < P.count; i ++ ) {
			let x = P.getX( i ), y = P.getY( i ), z = P.getZ( i );
			let X, Y, Z;
			if ( y >= 0 ) {
				X = x * 0.077; Y = y * 0.092; Z = z * ( z < 0 ? 0.093 : 0.088 );
			} else {
				const t = - y;
				X = x * 0.077 * ( 1 - 0.36 * Math.pow( t, 1.6 ) );
				Y = y * 0.094;
				Z = z > 0 ? z * 0.088 * ( 1 - 0.22 * t * t ) : z * 0.093 * ( 1 - 0.55 * t );
				// chin point
				if ( z > 0 ) Z += 0.006 * Math.pow( t, 3 ) * Math.exp( - x * x * 30 );
			}
			// cheek fullness
			X *= 1 + 0.05 * Math.exp( - Math.pow( ( Y + 0.035 ) / 0.03, 2 ) );
			// nose
			if ( Z > 0 ) Z += 0.0065 * Math.exp( - ( X * X ) / 0.00004 - ( ( Y + 0.036 ) * ( Y + 0.036 ) ) / 0.00012 );
			P.setXYZ( i, X + HC0.x, Y + HC0.y, Z + HC0.z );
			let u = 0.5 + X / FACE_M, v = 0.5 + ( Y - FACE_Y0 ) / FACE_M;
			if ( Z < 0.01 ) { u = X >= 0 ? 0.995 : 0.005; }
			UV.setXY( i, clamp( u, 0.002, 0.998 ), clamp( v, 0.002, 0.998 ) );
		}
		g.computeVertexNormals();
		const m = new THREE.Mesh( g, this.mat.face );
		m.scale.setScalar( HS );
		m.castShadow = true; m.receiveShadow = true;
		this.B.head.add( m );
		this.headMesh = m;
	}

	// ─────────────────────────────────────────── hair: cap + bangs + side curtains (static under head)
	_buildHairStatic() {
		const geos = [];
		const r = mulberry( 99 );
		const dirOn = ( th, ph, scale, out ) => out.set(
			HC0.x + CAP_R0.x * scale * Math.sin( th ) * Math.sin( ph ),
			HC0.y + CAP_R0.y * scale * Math.cos( th ),
			HC0.z + CAP_R0.z * scale * Math.sin( th ) * Math.cos( ph ) );
		// cap
		{
			const NP = 44, NT = 16;
			const keys = [ [ 0, 1.0 ], [ 0.33, 1.3 ], [ 0.5, 1.95 ], [ 0.75, 2.15 ], [ 1, 2.22 ] ];
			const thMax = ( ph ) => {
				let a = Math.abs( ( ( ph + Math.PI ) % TAU + TAU ) % TAU - Math.PI ) / Math.PI;
				for ( let i = 1; i < keys.length; i ++ ) if ( a <= keys[ i ][ 0 ] ) {
					const t = ( a - keys[ i - 1 ][ 0 ] ) / ( keys[ i ][ 0 ] - keys[ i - 1 ][ 0 ] );
					return lerp( keys[ i - 1 ][ 1 ], keys[ i ][ 1 ], sstep( 0, 1, t ) );
				}
				return 2.2;
			};
			const pos = [], uv = [], idx = [];
			const v = new THREE.Vector3();
			for ( let i = 0; i <= NT; i ++ ) for ( let j = 0; j < NP; j ++ ) {
				const ph = j / NP * TAU;
				const th = thMax( ph ) * i / NT;
				dirOn( th, ph, 1.0 + 0.03 * Math.sin( Math.min( 1, th / 1.2 ) * Math.PI ) * ( th < 1.2 ? 1 : 0 ), v );
				pos.push( v.x, v.y, v.z ); uv.push( i / NT, j / NP * 9 );
			}
			for ( let i = 0; i < NT; i ++ ) for ( let j = 0; j < NP; j ++ ) {
				const a = i * NP + j, b = i * NP + ( j + 1 ) % NP, c = ( i + 1 ) * NP + j, d = ( i + 1 ) * NP + ( j + 1 ) % NP;
				idx.push( a, d, b, a, c, d );
			}
			const g = new THREE.BufferGeometry();
			g.setAttribute( 'position', new THREE.Float32BufferAttribute( pos, 3 ) );
			g.setAttribute( 'uv', new THREE.Float32BufferAttribute( uv, 2 ) );
			g.setIndex( idx ); g.computeVertexNormals();
			{ const N = g.attributes.normal, pp = g.attributes.position; let sc = 0;
				for ( let k = 0; k < pp.count; k ++ ) sc += ( pp.getY( k ) - HC0.y ) * N.getY( k ) + ( pp.getZ( k ) - HC0.z ) * N.getZ( k ) + pp.getX( k ) * N.getX( k );
				if ( sc < 0 ) { const I = g.index.array; for ( let k = 0; k < I.length; k += 3 ) { const t = I[ k + 1 ]; I[ k + 1 ] = I[ k + 2 ]; I[ k + 2 ] = t; } g.computeVertexNormals(); console.log( 'cap flipped' ); } }
			geos.push( g );
		}
		// cards: bangs (front) + side curtains
		const card = ( ph0, th0, th1, w0, lift, layer, curl, phDrift = 0 ) => {
			const NU = 12;
			const pos = [], uv = [], idx = [];
			const c = new THREE.Vector3(), tan = new THREE.Vector3(), out = new THREE.Vector3(), side = new THREE.Vector3();
			for ( let i = 0; i <= NU; i ++ ) {
				const u = i / NU;
				const th = lerp( th0, th1, u );
				const ph = ph0 + phDrift * u * u;
				const sc = 1.0 + 0.012 + layer * 0.006 + lift * Math.sin( Math.PI * Math.min( 1, u * 1.3 ) ) - curl * u * u * u;
				dirOn( th, ph, sc, c );
				out.set( Math.sin( th ) * Math.sin( ph ), Math.cos( th ), Math.sin( th ) * Math.cos( ph ) ).normalize();
				side.set( Math.cos( ph ), 0, - Math.sin( ph ) );
				const w = w0 * Math.pow( 1 - u, 0.55 ) * ( 0.85 + 0.15 * Math.sin( u * 3 ) ) + 0.0006;
				const bulge = 0.0035 * ( 1 - u );
				pos.push( c.x - side.x * w, c.y - side.y * w, c.z - side.z * w );
				pos.push( c.x + out.x * bulge, c.y + out.y * bulge, c.z + out.z * bulge );
				pos.push( c.x + side.x * w, c.y + side.y * w, c.z + side.z * w );
				uv.push( u, 0, u, 0.5, u, 1 );
			}
			for ( let i = 0; i < NU; i ++ ) {
				const a = i * 3;
				idx.push( a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5 );
			}
			const g = new THREE.BufferGeometry();
			g.setAttribute( 'position', new THREE.Float32BufferAttribute( pos, 3 ) );
			g.setAttribute( 'uv', new THREE.Float32BufferAttribute( uv, 2 ) );
			g.setIndex( idx ); g.computeVertexNormals();
			// ensure outward normals
			const N = g.attributes.normal, p = g.attributes.position;
			let s = 0; for ( let k = 0; k < p.count; k ++ ) s += ( p.getX( k ) - HC0.x ) * N.getX( k ) + ( p.getY( k ) - HC0.y ) * N.getY( k ) + ( p.getZ( k ) - HC0.z ) * N.getZ( k );
			if ( s < 0 ) { const I = g.index.array; for ( let k = 0; k < I.length; k += 3 ) { const t = I[ k + 1 ]; I[ k + 1 ] = I[ k + 2 ]; I[ k + 2 ] = t; } g.computeVertexNormals(); }
			return g;
		};
		// bangs
		const NB = 13;
		for ( let i = 0; i < NB; i ++ ) {
			const f = i / ( NB - 1 ) * 2 - 1; // -1..1
			const ph = f * 0.95;
			const af = Math.abs( f );
			let th1 = 1.50 + ( i % 2 ? 0.07 : - 0.02 ) + 0.03 * r();
			if ( af > 0.62 ) th1 = 1.62 + 0.15 * ( af - 0.62 ) / 0.38;
			if ( af < 0.12 ) th1 = 1.56;
			geos.push( card( ph, 0.28 + 0.1 * r(), th1, 0.024 + 0.006 * r(), 0.045, i % 2, 0.06, - f * 0.12 ) );
		}
		// side curtains over the ears / temples
		for ( const s of [ - 1, 1 ] ) {
			for ( let k = 0; k < 6; k ++ ) {
				const ph = s * ( 0.95 + k * 0.14 );
				geos.push( card( ph, 0.5 + 0.05 * k, 2.05 + 0.08 * Math.sin( k * 2.1 ) + 0.06 * ( k < 2 ? 1 : 0 ), 0.026, 0.035, k % 2, 0.02, s * 0.05 ) );
			}
		}
		// crown cover cards (back of head, adds strand texture over cap)
		for ( let k = 0; k < 14; k ++ ) {
			const ph = 1.4 + k / 13 * ( TAU - 2.8 );
			geos.push( card( ph, 0.15, 2.1, 0.03, 0.03, k % 2, 0.0, 0 ) );
		}
		const merged = mergeGeos( geos );
		const m = new THREE.Mesh( merged, this.mat.hair );
		m.scale.setScalar( HS );
		m.castShadow = true; m.receiveShadow = true;
		this.B.head.add( m );
		this.hairStatic = m;
	}

	// ─────────────────────────────────────────── skirt (CPU deformed, child of hips)
	_buildSkirt() {
		const NP = 22, CPP = 3, NC = NP * CPP, NR = 9;
		const prof = [ 1.0, 0.3, - 0.85 ];
		const base = new Float32Array( NC * NR * 3 );
		for ( let r = 0; r < NR; r ++ ) {
			const t = r / ( NR - 1 );
			const y = lerp( 0.075, - 0.235, t );
			const te = Math.pow( t, 0.9 );
			const rx = lerp( 0.128, 0.198, te ), rz = lerp( 0.104, 0.172, te );
			const depth = 0.011 * sstep( 0.08, 1, t );
			for ( let c = 0; c < NC; c ++ ) {
				const ph = c / NC * TAU;
				const nx = Math.sin( ph ), nz = Math.cos( ph );
				const d = prof[ c % CPP ] * depth;
				const k = ( r * NC + c ) * 3;
				base[ k ] = ( rx + d ) * nx; base[ k + 1 ] = y; base[ k + 2 ] = ( rz + d ) * nz;
			}
		}
		const idx = [];
		for ( let r = 0; r < NR - 1; r ++ ) for ( let c = 0; c < NC; c ++ ) {
			const a = r * NC + c, b = r * NC + ( c + 1 ) % NC, cc = ( r + 1 ) * NC + c, d = ( r + 1 ) * NC + ( c + 1 ) % NC;
			idx.push( a, d, b, a, cc, d );
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute( 'position', new THREE.BufferAttribute( base.slice(), 3 ).setUsage( THREE.DynamicDrawUsage ) );
		g.setIndex( idx );
		g.computeVertexNormals();
		const m = new THREE.Mesh( g, this.mat.skirt );
		m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
		this.B.hips.add( m );
		this.skirt = { mesh: m, base, NC, NR, off: new Float32Array( NC * NR * 3 ), tmp: new Float32Array( NC * NR * 3 ) };
	}

	// ─────────────────────────────────────────── umbrella
	_buildUmbrella() {
		const g = this.umbrella = new THREE.Group();
		g.name = 'Umbrella';
		g.matrixAutoUpdate = false;
		this.root.add( g );

		// static plastic: handle sleeve, J crook, top cap, finial
		const parts = [];
		parts.push( new THREE.CylinderGeometry( 0.0125, 0.0125, 0.13, 12, 1 ).translate( 0, 0.005, 0 ) );
		const crook = [];
		for ( let i = 0; i <= 12; i ++ ) { const a = Math.PI + i / 12 * Math.PI; crook.push( [ 0, - 0.06 + Math.sin( a ) * 0.042, 0.042 + Math.cos( a ) * 0.042 ] ); }
		crook.unshift( [ 0, - 0.04, 0 ] );
		crook.push( [ 0, - 0.045, 0.084 ] );
		parts.push( tubePath( crook, 0.0115, 24, 8 ) );
		parts.push( ellipsoid( 0, - 0.045, 0.084, 0.0118, 0.006, 0.0118, 10, 6 ) );
		parts.push( new THREE.CylinderGeometry( 0.011, 0.017, 0.045, 12, 1 ).translate( 0, UMB.apexY + 0.004, 0 ) );
		parts.push( new THREE.CylinderGeometry( 0.004, 0.007, 0.03, 8, 1 ).translate( 0, UMB.apexY + 0.04, 0 ) );
		parts.push( ellipsoid( 0, UMB.tipY - 0.004, 0, 0.0045, 0.006, 0.0045, 8, 6 ) );
		const handle = new THREE.Mesh( mergeGeos( parts.map( p => p.index ? p : p ) ), this.mat.plastic );
		handle.castShadow = true;
		g.add( handle );

		// canopy panels (dynamic)
		const nT = CAN_T.length, nS = CAN_S.length, nR = UMB.ribs;
		const vcount = nR * nT * nS;
		const cpos = new Float32Array( vcount * 3 );
		const ccol = new Float32Array( vcount * 4 );
		const cidx = [];
		for ( let k = 0; k < nR; k ++ ) {
			for ( let j = 0; j < nT; j ++ ) for ( let i = 0; i < nS; i ++ ) {
				const vi = ( k * nT + j ) * nS + i;
				const t = CAN_T[ j ], s = CAN_S[ i ];
				let a = 0.2;
				if ( t === 0 || t === 1 ) a = 0.5; else if ( t < 0.05 || t > 0.95 ) a = 0.27;
				if ( s === 1 ) a = 0.62; else if ( s > 0.98 ) a = Math.max( a, 0.34 );
				if ( s === 0 ) a = 0.4;
				const wh = a > 0.25 ? 1 : 0.9;
				ccol[ vi * 4 ] = wh * 0.95; ccol[ vi * 4 + 1 ] = wh * 0.97; ccol[ vi * 4 + 2 ] = 1.0; ccol[ vi * 4 + 3 ] = a;
			}
			for ( let j = 0; j < nT - 1; j ++ ) for ( let i = 0; i < nS - 1; i ++ ) {
				const a = ( k * nT + j ) * nS + i, b = ( k * nT + j + 1 ) * nS + i;
				cidx.push( a, b, a + 1, a + 1, b, b + 1 );
			}
		}
		const cg = new THREE.BufferGeometry();
		cg.setAttribute( 'position', new THREE.BufferAttribute( cpos, 3 ).setUsage( THREE.DynamicDrawUsage ) );
		cg.setAttribute( 'color', new THREE.BufferAttribute( ccol, 4 ) );
		cg.setIndex( cidx );
		const canopy = new THREE.Mesh( cg, this.mat.canopy );
		canopy.frustumCulled = false; canopy.renderOrder = 2;
		g.add( canopy );

		// metal: shaft, runner, ribs, stretchers (4-sided tubes, dynamic)
		const tubes = [ { n: 2, r: 0.0052 }, { n: 2, r: 0.0085 } ];
		for ( let k = 0; k < nR; k ++ ) tubes.push( { n: nS, r: 0.0019 } );
		for ( let k = 0; k < nR; k ++ ) tubes.push( { n: 2, r: 0.0015 } );
		const SIDES = 4;
		let vtot = 0; const midx = [];
		for ( const tb of tubes ) {
			tb.base = vtot;
			for ( let i = 0; i < tb.n - 1; i ++ ) for ( let s = 0; s < SIDES; s ++ ) {
				const a = tb.base + i * SIDES + s, b = tb.base + i * SIDES + ( s + 1 ) % SIDES;
				midx.push( a, b, a + SIDES, b, b + SIDES, a + SIDES );
			}
			vtot += tb.n * SIDES;
		}
		const mg = new THREE.BufferGeometry();
		mg.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array( vtot * 3 ), 3 ).setUsage( THREE.DynamicDrawUsage ) );
		mg.setIndex( midx );
		const metal = new THREE.Mesh( mg, this.mat.metal );
		metal.frustumCulled = false; metal.castShadow = true;
		g.add( metal );

		// beads
		const NBD = 64;
		const bead = new THREE.InstancedMesh( new THREE.SphereGeometry( 1, 10, 6 ), this.mat.bead, NBD );
		bead.frustumCulled = false; bead.renderOrder = 3;
		bead.instanceMatrix.setUsage( THREE.DynamicDrawUsage );
		const r = mulberry( 4242 );
		const beads = [];
		for ( let i = 0; i < NBD; i ++ ) beads.push( { k: Math.floor( r() * nR ), t: 0.1 + 0.8 * r(), s: 0.12 + 0.83 * Math.sqrt( r() ), rad: 0.0028 + 0.0035 * r() * r() + 0.001 } );
		g.add( bead );

		this.umb = {
			canopy, metal, bead, beads, tubes, SIDES,
			ribR: new Float32Array( RIB_SAMPLES ), ribY: new Float32Array( RIB_SAMPLES ),
			lastO: - 1, rimR: 0.5, rimY: 0.5,
			ribTips: Array.from( { length: nR }, () => new THREE.Vector3() ),
		};
		this._updateCanopy( 1 );
	}

	_ribProfile( o ) {
		const U = this.umb;
		const n = RIB_SAMPLES;
		let r = 0.012, y = UMB.apexY - 0.008;
		const ds = UMB.ribLen / ( n - 1 );
		for ( let i = 0; i < n; i ++ ) {
			const s = i / ( n - 1 );
			U.ribR[ i ] = r; U.ribY[ i ] = y;
			const bOpen = lerp( 1.32, 0.62, Math.pow( s, 1.25 ) );
			const bClosed = 0.035 + 0.02 * s;
			const b = lerp( bClosed, bOpen, o );
			r += Math.sin( b ) * ds; y -= Math.cos( b ) * ds;
		}
	}
	_ribAt( s, out ) {
		const U = this.umb, n = RIB_SAMPLES;
		const f = clamp( s, 0, 1 ) * ( n - 1 ), i = Math.min( n - 2, Math.floor( f ) ), t = f - i;
		out.x = lerp( U.ribR[ i ], U.ribR[ i + 1 ], t ); out.y = lerp( U.ribY[ i ], U.ribY[ i + 1 ], t );
		return out;
	}
	_canopyPoint( k, t, s, o, out ) {
		const nR = UMB.ribs;
		const ph0 = ( k / nR ) * TAU, ph1 = ( ( k + 1 ) / nR ) * TAU;
		const se = s * ( 1 - 0.075 * o * Math.sin( Math.PI * t ) );
		const p = this._ribAt( se, { x: 0, y: 0 } );
		const ax = Math.sin( ph0 ) * p.x, az = Math.cos( ph0 ) * p.x;
		const bx = Math.sin( ph1 ) * p.x, bz = Math.cos( ph1 ) * p.x;
		const phm = ( ph0 + ph1 ) * 0.5;
		const bul = ( 0.014 * o + 0.012 * ( 1 - o ) ) * Math.sin( Math.PI * t ) * Math.sin( Math.PI * Math.min( 1, se * 1.08 + 0.02 ) );
		out.set( lerp( ax, bx, t ) + Math.sin( phm ) * bul, p.y + bul * 0.35 * o, lerp( az, bz, t ) + Math.cos( phm ) * bul );
		return out;
	}
	_updateCanopy( o ) {
		const U = this.umb;
		if ( Math.abs( o - U.lastO ) < 1e-4 ) return;
		U.lastO = o;
		this._ribProfile( o );
		const nR = UMB.ribs, nT = CAN_T.length, nS = CAN_S.length;
		const cp = U.canopy.geometry.attributes.position.array;
		const v = new THREE.Vector3();
		for ( let k = 0; k < nR; k ++ ) for ( let j = 0; j < nT; j ++ ) for ( let i = 0; i < nS; i ++ ) {
			const vi = ( ( k * nT + j ) * nS + i ) * 3;
			this._canopyPoint( k, CAN_T[ j ], CAN_S[ i ], o, v );
			cp[ vi ] = v.x; cp[ vi + 1 ] = v.y; cp[ vi + 2 ] = v.z;
		}
		U.canopy.geometry.attributes.position.needsUpdate = true;
		U.canopy.geometry.computeVertexNormals();
		U.canopy.geometry.computeBoundingSphere();

		// metal
		const mp = U.metal.geometry.attributes.position.array;
		const runnerY = lerp( UMB.runnerClosed, UMB.runnerOpen, o );
		const pts = [];
		const writeTube = ( tb, points ) => {
			const S = U.SIDES;
			for ( let i = 0; i < points.length; i ++ ) {
				const a = points[ Math.max( 0, i - 1 ) ], b = points[ Math.min( points.length - 1, i + 1 ) ];
				_v0.subVectors( b, a ).normalize();
				_v1.set( 0, 1, 0 ); if ( Math.abs( _v0.y ) > 0.9 ) _v1.set( 1, 0, 0 );
				_v2.crossVectors( _v0, _v1 ).normalize(); _v3.crossVectors( _v0, _v2 );
				for ( let s = 0; s < S; s ++ ) {
					const an = s / S * TAU + Math.PI / 4;
					const c = Math.cos( an ) * tb.r, sn = Math.sin( an ) * tb.r;
					const vi = ( tb.base + i * S + s ) * 3;
					mp[ vi ] = points[ i ].x + _v2.x * c + _v3.x * sn;
					mp[ vi + 1 ] = points[ i ].y + _v2.y * c + _v3.y * sn;
					mp[ vi + 2 ] = points[ i ].z + _v2.z * c + _v3.z * sn;
				}
			}
		};
		writeTube( U.tubes[ 0 ], [ new THREE.Vector3( 0, 0.06, 0 ), new THREE.Vector3( 0, UMB.apexY, 0 ) ] );
		writeTube( U.tubes[ 1 ], [ new THREE.Vector3( 0, runnerY - 0.035, 0 ), new THREE.Vector3( 0, runnerY + 0.008, 0 ) ] );
		for ( let k = 0; k < nR; k ++ ) {
			const ph = k / nR * TAU;
			pts.length = 0;
			for ( let i = 0; i < nS; i ++ ) {
				const p = this._ribAt( CAN_S[ i ], { x: 0, y: 0 } );
				pts.push( new THREE.Vector3( Math.sin( ph ) * ( p.x - 0.002 ), p.y - 0.003, Math.cos( ph ) * ( p.x - 0.002 ) ) );
			}
			writeTube( U.tubes[ 2 + k ], pts );
			U.ribTips[ k ].copy( pts[ pts.length - 1 ] );
			const sp = this._ribAt( UMB.stretchS, { x: 0, y: 0 } );
			writeTube( U.tubes[ 2 + nR + k ], [
				new THREE.Vector3( Math.sin( ph ) * 0.009, runnerY + 0.004, Math.cos( ph ) * 0.009 ),
				new THREE.Vector3( Math.sin( ph ) * ( sp.x - 0.003 ), sp.y - 0.005, Math.cos( ph ) * ( sp.x - 0.003 ) ) ] );
		}
		U.metal.geometry.attributes.position.needsUpdate = true;
		U.metal.geometry.computeVertexNormals();

		const tip = this._ribAt( 1, { x: 0, y: 0 } );
		U.rimR = tip.x; U.rimY = tip.y;

		// beads
		const sc = sstep( 0.86, 1.0, o );
		const n = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), q = new THREE.Quaternion(), m = new THREE.Matrix4(), scl = new THREE.Vector3();
		U.beads.forEach( ( bd, i ) => {
			this._canopyPoint( bd.k, bd.t, bd.s, o, v );
			this._canopyPoint( bd.k, bd.t + 0.02, bd.s, o, a ).sub( v );
			this._canopyPoint( bd.k, bd.t, bd.s + 0.02, o, b ).sub( v );
			n.crossVectors( b, a ).normalize();
			if ( n.y < 0 ) n.negate();
			v.addScaledVector( n, bd.rad * 0.4 );
			q.setFromUnitVectors( UP, n );
			const rr = bd.rad * sc + 1e-5;
			scl.set( rr, rr * 0.6, rr );
			m.compose( v, q, scl );
			U.bead.setMatrixAt( i, m );
		} );
		U.bead.instanceMatrix.needsUpdate = true;
		U.bead.visible = sc > 0.001;
	}

	// ─────────────────────────────────────────── hair strands (verlet / DFTL)
	_buildStrands() {
		const r = mulberry( 2024 );
		const defs = [];
		const NBACK = 56;
		for ( let i = 0; i < NBACK; i ++ ) {
			const layer = i % 2;
			const f = ( i + 0.5 ) / NBACK;
			const ph = 1.22 + f * ( TAU - 2.44 ) + ( r() - 0.5 ) * 0.05;
			const back = Math.cos( ph - Math.PI ) * 0.5 + 0.5; // 1 at back centre
			const th = layer ? lerp( 1.25, 1.6, r() ) : lerp( 0.45, 0.85, r() );
			defs.push( {
				ph, th, len: 0.52 + 0.1 * back + ( r() - 0.5 ) * 0.04 + ( layer ? - 0.03 : 0.04 ),
				width: 0.031 + r() * 0.007, margin: 0.003 + layer * 0.0045 + r() * 0.003, front: false, exit: lerp( 1.9, 2.15, back ),
			} );
		}
		for ( const s of [ - 1, 1 ] ) for ( let j = 0; j < 2; j ++ ) {
			defs.push( { ph: s * ( 1.08 + 0.2 * j ), th: 1.1 + 0.12 * j, len: 0.32 - 0.04 * j, width: 0.024, margin: 0.012 + 0.004 * j, front: true, exit: 1.75 } );
		}
		const NPT = 10;
		const S = this.hair = { defs, NPT, n: defs.length };
		const total = S.n * NPT;
		S.pos = new Float32Array( total * 3 );
		S.vel = new Float32Array( total * 3 );
		S.rest = new Float32Array( total * 3 ); // head-local rest
		S.corr = new Float32Array( total * 3 );
		S.anchorPrev = new Float32Array( S.n * 3 );
		S.segLen = new Float32Array( S.n );

		// build rest paths in head-local space
		const p = new THREE.Vector3(), q = new THREE.Vector3();
		defs.forEach( ( d, si ) => {
			const L = d.len / ( NPT - 1 );
			S.segLen[ si ] = L;
			const path = [];
			let th = d.th;
			const onCap = ( th, out ) => out.set(
				HC.x + ( CAP_R.x + d.margin ) * Math.sin( th ) * Math.sin( d.ph ),
				HC.y + ( CAP_R.y + d.margin ) * Math.cos( th ),
				HC.z + ( CAP_R.z + d.margin ) * Math.sin( th ) * Math.cos( d.ph ) );
			onCap( th, p ); path.push( p.clone() );
			while ( th < d.exit ) { th += 0.02; onCap( th, p ); path.push( p.clone() ); }
			const dir = new THREE.Vector3( Math.sin( d.ph ) * 0.1, - 1, Math.cos( d.ph ) * 0.1 - 0.25 - 0.3 * Math.abs( Math.sin( d.ph ) ) ).normalize();
			if ( d.front ) dir.set( Math.sin( d.ph ) * 0.15, - 1, 0.3 ).normalize();
			for ( let k = 0; k < 200; k ++ ) path.push( p.addScaledVector( dir, 0.01 ).clone() );
			// resample by arc length
			let acc = 0, pi = 0;
			const out = [ path[ 0 ].clone() ];
			for ( let k = 1; k < path.length && out.length < NPT; k ++ ) {
				const seg = path[ k ].distanceTo( path[ k - 1 ] );
				acc += seg;
				while ( acc >= L && out.length < NPT ) {
					const over = acc - L;
					q.copy( path[ k ] ).lerp( path[ k - 1 ], over / seg );
					out.push( q.clone() );
					acc = over;
				}
				pi = k;
			}
			while ( out.length < NPT ) out.push( out[ out.length - 1 ].clone().add( new THREE.Vector3( 0, - L, 0 ) ) );
			for ( let k = 0; k < NPT; k ++ ) {
				const o = ( si * NPT + k ) * 3;
				S.rest[ o ] = out[ k ].x; S.rest[ o + 1 ] = out[ k ].y; S.rest[ o + 2 ] = out[ k ].z;
			}
		} );

		// render mesh
		const M = NPT * 2 - 1;
		S.M = M;
		const vcount = S.n * M * 3;
		const pos = new Float32Array( vcount * 3 ), nor = new Float32Array( vcount * 3 ), uv = new Float32Array( vcount * 2 );
		const idx = [];
		for ( let si = 0; si < S.n; si ++ ) {
			for ( let k = 0; k < M; k ++ ) {
				const b = ( si * M + k ) * 3;
				const u = k / ( M - 1 );
				const vs = r() * 0.0;
				uv.set( [ u, si * 0.37 + vs, u, si * 0.37 + 0.5, u, si * 0.37 + 1 ], b * 2 );
				if ( k < M - 1 ) idx.push( b, b + 1, b + 3, b + 1, b + 4, b + 3, b + 1, b + 2, b + 4, b + 2, b + 5, b + 4 );
			}
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute( 'position', new THREE.BufferAttribute( pos, 3 ).setUsage( THREE.DynamicDrawUsage ) );
		g.setAttribute( 'normal', new THREE.BufferAttribute( nor, 3 ).setUsage( THREE.DynamicDrawUsage ) );
		g.setAttribute( 'uv', new THREE.BufferAttribute( uv, 2 ) );
		g.setIndex( idx );
		const mesh = new THREE.Mesh( g, this.mat.hair );
		mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
		this.root.add( mesh );
		S.mesh = mesh;
		S.render = new Float32Array( S.n * M * 3 );
		S.colliders = [];
		S.ready = false;
		this._resetHair();
	}

	_captureHairRest() {
		const S = this.hair;
		this.root.updateMatrixWorld( true );
		_m0.copy( this.B.head.matrixWorld ).invert();
		for ( let si = 0; si < S.n; si ++ ) for ( let k = 1; k < S.NPT; k ++ ) {
			const i = si * S.NPT + k;
			_v0.fromArray( S.pos, i * 3 ).applyMatrix4( _m0 ).toArray( S.rest, i * 3 );
		}
	}

	_resetHair() {
		const S = this.hair;
		this.root.updateMatrixWorld( true );
		const hm = this.B.head.matrixWorld;
		for ( let i = 0; i < S.n * S.NPT; i ++ ) {
			_v0.fromArray( S.rest, i * 3 ).applyMatrix4( hm );
			_v0.toArray( S.pos, i * 3 );
			S.vel[ i * 3 ] = S.vel[ i * 3 + 1 ] = S.vel[ i * 3 + 2 ] = 0;
		}
		for ( let si = 0; si < S.n; si ++ ) {
			_v0.fromArray( S.rest, si * S.NPT * 3 ).applyMatrix4( hm ).toArray( S.anchorPrev, si * 3 );
		}
		S.ready = true;
	}

	// ─────────────────────────────────────────── state
	_initState() {
		this._phase = 0;
		this._speed = 0;
		this._accel = 0;
		this._hipCorr = 0;
		this._turnLean = 0;
		this._uo = this.opts.umbrellaOpen ?? 1;
		this._time = 0;
		this._footsteps = [];
		this._stance = { L: true, R: true };
		this._glance = { yaw: 0, pitch: 0, tYaw: 0, tPitch: 0, timer: 2.5 };
		this._prevRootPos = new THREE.Vector3();
		this._firstUpdate = true;
		this._wet = - 1;
		// springs
		this._umbTop = new THREE.Vector3(); this._umbTopV = new THREE.Vector3(); this._umbTopInit = false;
		this._umbTip = new THREE.Vector3(); this._umbTipV = new THREE.Vector3(); this._umbTipInit = false;
		this._strings = { L: { ax: - 0.3, az: 0, vx: 0, vz: 0 }, R: { ax: - 0.3, az: 0, vx: 0, vz: 0 }, bag: { ax: 0, az: 0, vx: 0, vz: 0 } };
		this._chestPrevV = new THREE.Vector3(); this._chestPrevP = new THREE.Vector3(); this._chestAcc = new THREE.Vector3();
		this._hipsPrevP = new THREE.Vector3(); this._hipsPrevV = new THREE.Vector3(); this._hipsAcc = new THREE.Vector3();
		this._skirtS = new THREE.Vector3(); this._skirtV = new THREE.Vector3();
		this._headPrevP = new THREE.Vector3();
		this._umbMatrix = new THREE.Matrix4();
		this._umbOpen = 0;
		this._ankle = { L: new THREE.Vector3(), R: new THREE.Vector3() };
		this._footQ = { L: new THREE.Quaternion(), R: new THREE.Quaternion() };
		this._groundPt = { L: new THREE.Vector3(), R: new THREE.Vector3() };
		this._invRoot = new THREE.Matrix4();
		this._rootQ = new THREE.Quaternion();
		this._G_open = new THREE.Matrix4().makeBasis( new THREE.Vector3( 1, 0, 0 ), new THREE.Vector3( 0, 0, 1 ), new THREE.Vector3( 0, - 1, 0 ) ).setPosition( GRIP_C );
		this._G_closed = new THREE.Matrix4().makeBasis( new THREE.Vector3( 1, 0, 0 ), new THREE.Vector3( 0, - 1, 0 ), new THREE.Vector3( 0, 0, - 1 ) ).setPosition( GRIP_C.x, GRIP_C.y - 0.102, GRIP_C.z + 0.042 );
		this._Gq_open = new THREE.Quaternion().setFromRotationMatrix( this._G_open );
		this._Gq_closed = new THREE.Quaternion().setFromRotationMatrix( this._G_closed );
		this._Gp_open = new THREE.Vector3().setFromMatrixPosition( this._G_open );
		this._Gp_closed = new THREE.Vector3().setFromMatrixPosition( this._G_closed );
	}

	// ═════════════════════════════════════════ UPDATE
	update( dt, s = {} ) {
		dt = Number.isFinite( dt ) ? clamp( dt, 0, 0.05 ) : 0;
		this._footsteps.length = 0;
		const speedIn = Number.isFinite( s.speed ) ? Math.max( 0, s.speed ) : 0;
		const turnRate = Number.isFinite( s.turnRate ) ? s.turnRate : 0;
		const uoTarget = clamp( Number.isFinite( s.umbrellaOpen ) ? s.umbrellaOpen : ( s.umbrellaOpen ? 1 : 0 ), 0, 1 );
		this._time += dt;
		const T = this._time;
		const B = this.B;

		// wetness → materials
		const wet = clamp( Number.isFinite( s.wetness ) ? s.wetness : 0, 0, 1 );
		if ( Math.abs( wet - this._wet ) > 0.01 ) {
			this._wet = wet;
			this.mat.cloth.color.setScalar( 1 - 0.18 * wet );
			this.mat.cloth.roughness = 0.8 - 0.2 * wet;
			this.mat.skirt.color.copy( this._baseColors.skirt ).multiplyScalar( 1 - 0.2 * wet );
			this.mat.hair.roughness = 0.36 - 0.12 * wet;
			this.mat.hair.clearcoat = 0.35 + 0.5 * wet;
		}

		// teleport detection
		this.root.updateMatrixWorld( true );
		_v0.setFromMatrixPosition( this.root.matrixWorld );
		if ( this._firstUpdate || this._needsReset || _v0.distanceTo( this._prevRootPos ) > 2.0 ) {
			this._teleport = true;
			this._needsReset = false;
		} else this._teleport = false;
		this._prevRootPos.copy( _v0 );
		this._firstUpdate = false;

		// smoothed scalars
		const prevSpeed = this._speed;
		this._speed += ( speedIn - this._speed ) * ( 1 - Math.exp( - 12 * dt ) );
		const v = this._speed;
		const acc = dt > 0 ? ( v - prevSpeed ) / dt : 0;
		this._accel += ( acc - this._accel ) * ( 1 - Math.exp( - 6 * dt ) );
		const tl = clamp( turnRate * v * 0.055, - 0.32, 0.32 );
		this._turnLean += ( tl - this._turnLean ) * ( 1 - Math.exp( - 6 * dt ) );
		// umbrella state
		const step = dt / 0.6;
		this._uo += clamp( uoTarget - this._uo, - step, step );
		const uo = this._uo;
		const bArm = sstep( 0.0, 0.55, uo );
		const oCan = sstep( 0.45, 1.0, uo );
		this._umbOpen = oCan;

		// gait parameters
		const freq = gp( 'freq', v ), duty = gp( 'duty', v );
		const runB = sstep( 1.9, 3.3, v );
		const moveW = sstep( 0.04, 0.5, v );
		const idleW = 1 - sstep( 0.05, 0.7, v );
		const rate = freq * Math.min( 1, v / 0.15 );
		const S = rate > 1e-4 ? v / rate : 0;
		const prevPhase = this._phase;
		this._phase = ( this._phase + rate * dt ) % 1;
		const P = this._phase;

		const lift = gp( 'lift', v ), liftPeak = gp( 'liftPeak', v ), heel = gp( 'heel', v ), toe = gp( 'toe', v );
		const width = gp( 'width', v ), zc = gp( 'zc', v );

		// ── foot targets (model space)
		const legs = [ [ 'L', 1, P ], [ 'R', - 1, ( P + 0.5 ) % 1 ] ];
		const footPose = ( zg, x, phi, out ) => {
			const pivotZ = phi >= 0 ? HEEL_Z : BALL_Z;
			const b = - phi, cb = Math.cos( b ), sb = Math.sin( b );
			const vy = ANKLE_H, vz = - pivotZ;
			return out.set( x, vy * cb - vz * sb, zg + pivotZ + vy * sb + vz * cb );
		};
		const A0 = _v4, A1 = _v5;
		const stanceW = {};
		for ( const [ side, sx, p ] of legs ) {
			const x = sx * width;
			const zA = zc + S * duty * 0.5, zB = zc - S * duty * 0.5;
			const ank = this._ankle[ side ];
			let phi, inStance;
			if ( p < duty ) {
				const sp = p / duty;
				const zg = lerp( zA, zB, sp );
				const heelOff = lerp( 0.55, 0.3, runB );
				phi = heel * ( 1 - sstep( 0, 0.22, sp ) ) - toe * Math.pow( sstep( heelOff, 1, sp ), 1.3 );
				footPose( zg, x, phi, ank );
				inStance = true;
				this._groundPt[ side ].set( x, 0, zg + ( heel >= 0 && sp < 0.2 ? HEEL_Z * 0.5 : 0.04 ) );
			} else {
				const sw = ( p - duty ) / ( 1 - duty );
				footPose( zB, x, - toe, A0 );
				footPose( zA, x, heel, A1 );
				const d0 = 0.1 * runB, d1 = 0.06 * runB;
				const hz = lerp( sstep( 0, 1, sw ), sstep5( ( sw - d0 ) / ( 1 - d0 - d1 ) ), runB );
				const g = Math.log( 0.5 ) / Math.log( liftPeak );
				const bump = Math.sin( Math.PI * Math.pow( sw, g ) );
				ank.set( x * ( 1 - 0.1 * Math.sin( Math.PI * sw ) ), lerp( A0.y, A1.y, sstep( 0.1, 0.95, sw ) ) + lift * moveW * bump, lerp( A0.z, A1.z, hz ) );
				phi = lerp( - toe, heel, sstep( 0.3, 0.92, sw ) ) - runB * 0.35 * Math.sin( Math.PI * sw ) * ( 1 - sw );
				inStance = false;
			}
			// idle blend
			const idleZ = side === 'L' ? 0.03 : - 0.03, idleX = side === 'L' ? 0.088 : - 0.082;
			const wsh = Math.sin( T * TAU * 0.11 );
			if ( idleW > 0 ) {
				_v6.set( idleX, ANKLE_H, idleZ );
				ank.lerp( _v6, idleW );
				phi *= ( 1 - idleW );
			}
			const toeOut = lerp( 0.04 * sx, ( side === 'L' ? 0.14 : - 0.2 ), idleW );
			this._footQ[ side ].copy( eulerQ( _q0, - phi, toeOut, 0 ) );
			stanceW[ side ] = inStance ? 1 : 0;
			// footsteps
			if ( inStance && ! this._stance[ side ] && v > 0.3 && dt > 0 ) {
				const gpt = this._groundPt[ side ];
				const wpos = new THREE.Vector3( ank.x, 0, ank.z + ( heel > 0.1 ? - 0.02 : 0.05 ) ).applyMatrix4( this.root.matrixWorld );
				this._footsteps.push( { side, position: wpos, strength: clamp( 0.25 + 0.75 * v / 5.6, 0, 1 ) } );
				void gpt;
			}
			this._stance[ side ] = inStance;
		}

		// ── pelvis
		const bobA = gp( 'bob', v ), hipDrop = gp( 'hipDrop', v );
		const pc = lerp( 0.05, duty * 0.5, runB );
		const bob = - bobA * ( 0.5 + 0.5 * Math.cos( 2 * TAU * ( P - pc ) ) );
		const sway = gp( 'sway', v ) * Math.cos( TAU * ( P - duty * 0.5 ) );
		const pYaw = - gp( 'pYaw', v ) * Math.cos( TAU * P );
		const pRoll = gp( 'pRoll', v ) * Math.cos( TAU * ( P - duty * 0.5 ) );
		const lean = gp( 'lean', v );
		const breath = Math.sin( T * TAU * 0.26 );
		const wshift = Math.sin( T * TAU * 0.11 ) * idleW;
		const accLean = clamp( this._accel * 0.035, - 0.12, 0.16 );
		const tLean = this._turnLean;
		let hipY = 0.858 - hipDrop + bob - 0.004 * idleW * ( 0.5 + 0.5 * wshift * wshift );
		const hipX = sway + 0.02 * wshift + Math.sin( tLean ) * 0.8;
		const hipZ = - 0.01 * runB + accLean * 0.08;
		const hipRoll = pRoll + 0.03 * wshift - tLean;
		const hipPitch = lean * 0.22 + accLean * 0.25;
		eulerQ( B.hips.quaternion, hipPitch, pYaw, hipRoll );
		// reach constraint for planted feet (smoothed)
		let need = 0;
		for ( const [ side, sx ] of legs ) {
			const w = Math.max( stanceW[ side ], idleW );
			if ( w <= 0 ) continue;
			_v0.set( 0.085 * sx, - 0.06, 0 ).applyQuaternion( B.hips.quaternion );
			const jx = hipX + _v0.x, jz = hipZ + _v0.z;
			const a = this._ankle[ side ];
			const Lr = ( L_THIGH + L_SHIN ) * 0.997;
			const dxz2 = ( a.x - jx ) ** 2 + ( a.z - jz ) ** 2;
			const maxJY = a.y + Math.sqrt( Math.max( 0.01, Lr * Lr - dxz2 ) );
			const jy = hipY + _v0.y;
			if ( jy > maxJY ) need = Math.max( need, ( jy - maxJY ) * w );
		}
		if ( this._teleport ) this._hipCorr = need;
		this._hipCorr += ( need - this._hipCorr ) * ( 1 - Math.exp( - ( need > this._hipCorr ? 30 : 8 ) * dt ) );
		hipY -= this._hipCorr;
		B.hips.position.set( hipX, hipY, hipZ );

		// ── spine / chest / neck / head
		const yawSum0 = pYaw;
		eulerQ( B.spine.quaternion, lean * 0.4 + accLean * 0.4 + 0.012 * breath * idleW, - pYaw * 0.55, - pRoll * 0.6 - 0.02 * wshift + tLean * 0.25 );
		eulerQ( B.chest.quaternion, lean * 0.38 + accLean * 0.3 - 0.015 * breath, - pYaw * 0.75, - pRoll * 0.3 + tLean * 0.15 );
		const yawSum = yawSum0 * ( 1 - 0.55 - 0.75 );
		const pitchSum = hipPitch + lean * 0.78 + accLean * 0.7;
		// glance
		const G = this._glance;
		G.timer -= dt;
		if ( G.timer <= 0 ) {
			const r = this._rand();
			if ( idleW > 0.5 ) {
				if ( r < 0.35 ) { G.tYaw = 0; G.tPitch = - 0.38; } // look up at the rain
				else if ( r < 0.7 ) { G.tYaw = ( this._rand() - 0.5 ) * 1.1; G.tPitch = ( this._rand() - 0.6 ) * 0.25; }
				else { G.tYaw = 0; G.tPitch = 0.05; }
				G.timer = 2.2 + this._rand() * 3.5;
			} else { G.tYaw = ( this._rand() - 0.5 ) * 0.3; G.tPitch = 0.05; G.timer = 1.5 + this._rand() * 2; }
		}
		const gk = 1 - Math.exp( - 3.0 * dt );
		G.yaw += ( G.tYaw * ( idleW * 0.8 + 0.2 ) - G.yaw ) * gk;
		G.pitch += ( G.tPitch * ( idleW * 0.85 + 0.15 ) - G.pitch ) * gk;
		const lookDown = 0.06 + 0.06 * runB;
		eulerQ( B.neck.quaternion, - pitchSum * 0.35 + G.pitch * 0.35 + lookDown * 0.4, - yawSum * 0.4 + G.yaw * 0.35, ( pRoll * 0.1 + tLean * 0.6 ) * 0.4 );
		eulerQ( B.head.quaternion, - pitchSum * 0.5 + G.pitch * 0.65 + lookDown * 0.6, - yawSum * 0.6 + G.yaw * 0.65, ( - hipRoll * 0.3 + tLean * 0.4 ) * 0.5 );

		// ── shoulders
		const shRise = 0.02 * breath * idleW;
		eulerQ( B.shoulderL.quaternion, 0, 0, 0.02 + shRise );
		eulerQ( B.shoulderR.quaternion, 0, 0, - 0.02 - shRise - 0.18 * bArm );

		// ── left arm FK (free arm)
		const armSwing = gp( 'armSwing', v ), armBase = gp( 'armBase', v );
		const elbow = gp( 'elbow', v ), elbowVar = gp( 'elbowVar', v );
		const cyc = Math.cos( TAU * ( P - 0.04 ) );
		const flexL = armBase - armSwing * cyc - pitchSum * 0.6 * ( 1 - runB * 0.5 ) + 0.03 * idleW * Math.sin( T * 0.9 );
		const abdL = 0.16 + 0.05 * runB + 0.02 * breath * idleW;
		const crossL = Math.max( 0, flexL ) * 0.35 * runB;
		_q0.setFromAxisAngle( _v0.set( 1, 0, 0 ), - flexL );
		_q1.setFromAxisAngle( _v0.set( 0, 0, 1 ), abdL );
		_q2.setFromAxisAngle( _v0.set( 0, 1, 0 ), - crossL );
		B.upperArmL.quaternion.copy( _q2 ).multiply( _q1 ).multiply( _q0 );
		const elbowL = elbow + elbowVar * ( 0.5 - 0.5 * cyc );
		eulerQ( B.foreArmL.quaternion, - elbowL, 0.25 * runB, 0 );
		eulerQ( B.handL.quaternion, - 0.12 - 0.1 * runB, 0, - 0.05 );

		// ── right arm closed FK (carrying)
		const flexR = 0.6 * armSwing * cyc * 0.55 - pitchSum * 0.5 + 0.02;
		const qcU = new THREE.Quaternion(), qcF = new THREE.Quaternion(), qcH = new THREE.Quaternion();
		_q0.setFromAxisAngle( _v0.set( 1, 0, 0 ), - flexR );
		_q1.setFromAxisAngle( _v0.set( 0, 0, 1 ), - 0.2 - 0.04 * runB );
		qcU.copy( _q1 ).multiply( _q0 );
		eulerQ( qcF, - ( 0.55 + 0.4 * runB ), 0, 0 );
		eulerQ( qcH, 0.42 - 0.2 * runB, 0, 0.05 );
		B.upperArmR.quaternion.copy( qcU ); B.foreArmR.quaternion.copy( qcF ); B.handR.quaternion.copy( qcH );

		this.root.updateMatrixWorld( true );
		this._invRoot.copy( this.root.matrixWorld ).invert();
		worldQ( this.root, this._rootQ );
		const rootQ = this._rootQ;

		// ── legs IK
		for ( const [ side, sx ] of legs ) {
			const th = B[ 'thigh' + side ], sh = B[ 'shin' + side ], ft = B[ 'foot' + side ];
			worldP( th, _v0 );
			_v1.copy( this._ankle[ side ] ).applyMatrix4( this.root.matrixWorld );
			_v2.set( 0.12 * sx * ( 1 - idleW * 1.4 ), 0, 1 ).normalize().applyQuaternion( rootQ ); // knee pole
			const q1 = _q1, q2 = _q2;
			this._twoBone( _v0, _v1, L_THIGH, L_SHIN, _v2, 1, q1, q2 );
			worldQ( B.hips, _q0 );
			th.quaternion.copy( _q0 ).invert().multiply( q1 );
			sh.quaternion.copy( q1 ).invert().multiply( q2 );
			_q3.copy( rootQ ).multiply( this._footQ[ side ] );
			ft.quaternion.copy( q2 ).invert().multiply( _q3 );
		}

		// ── right arm open (IK to umbrella)
		B.hips.updateMatrixWorld( true );
		worldQ( B.chest, _q0 );
		const chestQ = _q0.clone();
		const grip = new THREE.Vector3( - 0.085, 0.05 + 0.01 * runB, 0.235 + 0.012 * v ).applyMatrix4( B.chest.matrixWorld );
		grip.addScaledVector( _v0.set( 0, 1, 0 ), - bob * 0.55 - 0.015 * breath * idleW );
		const tilt = - 0.1 + 0.07 * v + accLean * 0.6;
		const uDir = new THREE.Vector3( 0, 1, 0 );
		eulerQ( _q1, tilt, 0, - 0.07 - tLean * 0.4 );
		uDir.applyQuaternion( _q1 ).applyQuaternion( rootQ );
		// idle umbrella sway
		uDir.x += 0.02 * Math.sin( T * 0.7 ) * idleW; uDir.z += 0.015 * Math.sin( T * 0.53 + 1 ) * idleW; uDir.normalize();
		const topRest = _v3.copy( grip ).addScaledVector( uDir, UMB.apexY );
		if ( ! this._umbTopInit || this._teleport ) { this._umbTop.copy( topRest ); this._umbTopV.set( 0, 0, 0 ); this._umbTopInit = true; }
		if ( dt > 0 ) {
			const k = 110, c = 13;
			_v1.subVectors( topRest, this._umbTop ).multiplyScalar( k ).addScaledVector( this._umbTopV, - c );
			this._umbTopV.addScaledVector( _v1, dt );
			this._umbTop.addScaledVector( this._umbTopV, dt );
			_v1.subVectors( this._umbTop, grip ).setLength( UMB.apexY );
			this._umbTop.copy( grip ).add( _v1 );
		}
		const uFinal = _v1.subVectors( this._umbTop, grip ).normalize();
		const fwd = _v2.set( 0, 0, 1 ).applyQuaternion( rootQ );
		const zU = fwd.clone().addScaledVector( uFinal, - fwd.dot( uFinal ) ).normalize();
		const xU = new THREE.Vector3().crossVectors( uFinal, zU );
		const Uw = new THREE.Matrix4().makeBasis( xU, uFinal, zU ).setPosition( grip );
		const Hw = Uw.clone().multiply( _m1.copy( this._G_open ).invert() );
		const hq = new THREE.Quaternion().setFromRotationMatrix( Hw );
		const wrist = new THREE.Vector3().setFromMatrixPosition( Hw );
		worldP( B.upperArmR, _v3 );
		const pole = new THREE.Vector3( - 0.55, - 0.45, - 0.7 ).normalize().applyQuaternion( rootQ );
		const qoU = new THREE.Quaternion(), qoF = new THREE.Quaternion();
		this._twoBone( _v3, wrist, L_UARM, L_FARM, pole, - 1, qoU, qoF );
		worldQ( B.shoulderR, _q3 );
		const qoUl = _q3.clone().invert().multiply( qoU );
		const qoFl = qoU.clone().invert().multiply( qoF );
		const qoHl = qoF.clone().invert().multiply( hq );
		B.upperArmR.quaternion.copy( qcU ).slerp( qoUl, bArm );
		B.foreArmR.quaternion.copy( qcF ).slerp( qoFl, bArm );
		B.handR.quaternion.copy( qcH ).slerp( qoHl, bArm );
		B.shoulderR.updateMatrixWorld( true );

		// ── umbrella attach
		_q1.copy( this._Gq_closed ).slerp( this._Gq_open, bArm );
		_v0.copy( this._Gp_closed ).lerp( this._Gp_open, bArm );
		_m0.compose( _v0, _q1, _v6.set( 1, 1, 1 ) );
		const Um = this._umbMatrix.copy( B.handR.matrixWorld ).multiply( _m0 );
		// closed pendulum sway
		if ( bArm < 0.999 ) {
			const crookW = _v3.set( 0, - 0.102, 0.042 ).applyMatrix4( Um );
			const axis = _v4.set( 0, 1, 0 ).transformDirection( Um );
			const tipRest = _v5.copy( crookW ).addScaledVector( axis, 0.8 );
			if ( ! this._umbTipInit || this._teleport ) { this._umbTip.copy( tipRest ); this._umbTipV.set( 0, 0, 0 ); this._umbTipInit = true; }
			if ( dt > 0 ) {
				const k = 45, c = 4.5;
				_v6.subVectors( tipRest, this._umbTip ).multiplyScalar( k ).addScaledVector( this._umbTipV, - c );
				_v6.y -= 2.0;
				this._umbTipV.addScaledVector( _v6, dt );
				this._umbTip.addScaledVector( this._umbTipV, dt );
				_v6.subVectors( this._umbTip, crookW ).setLength( 0.8 );
				this._umbTip.copy( crookW ).add( _v6 );
			}
			_v6.subVectors( this._umbTip, crookW ).normalize();
			_q2.setFromUnitVectors( axis, _v6 );
			_q2.slerp( _q3.identity(), bArm );
			_m1.makeRotationFromQuaternion( _q2 );
			_m2.makeTranslation( crookW.x, crookW.y, crookW.z ).multiply( _m1 ).multiply( _m1.makeTranslation( - crookW.x, - crookW.y, - crookW.z ) );
			Um.premultiply( _m2 );
		} else this._umbTipInit = false;
		this.umbrella.matrix.copy( this._invRoot ).multiply( Um );
		this.umbrella.matrixWorldNeedsUpdate = true;
		this._updateCanopy( oCan );

		// ── strings & bag pendulums
		worldP( B.chest, _v0 );
		if ( dt > 0 ) {
			if ( this._teleport ) { this._chestPrevP.copy( _v0 ); this._chestPrevV.set( 0, 0, 0 ); }
			_v1.subVectors( _v0, this._chestPrevP ).divideScalar( dt );
			_v2.subVectors( _v1, this._chestPrevV ).divideScalar( dt );
			this._chestAcc.lerp( _v2, 1 - Math.exp( - 20 * dt ) );
			this._chestPrevV.copy( _v1 ); this._chestPrevP.copy( _v0 );
		}
		const pend = ( st, parentQ, maxAx, minAx, k, c ) => {
			_v3.set( 0, - 9.8, 0 ).sub( _v4.copy( this._chestAcc ).clampLength( 0, 30 ) );
			_v3.applyQuaternion( _q2.copy( parentQ ).invert() ).normalize();
			const tax = - Math.asin( clamp( _v3.z, - 1, 1 ) ), taz = Math.asin( clamp( _v3.x, - 1, 1 ) );
			if ( dt > 0 ) {
				st.vx += ( ( tax - st.ax ) * k - st.vx * c ) * dt; st.vz += ( ( taz - st.az ) * k - st.vz * c ) * dt;
				st.ax += st.vx * dt; st.az += st.vz * dt;
			}
			if ( st.ax > maxAx ) { st.ax = maxAx; st.vx = Math.min( 0, st.vx ); }
			if ( st.ax < minAx ) { st.ax = minAx; st.vx = Math.max( 0, st.vx ); }
			st.az = clamp( st.az, - 0.6, 0.6 );
		};
		for ( const S2 of [ 'L', 'R' ] ) {
			const st = this._strings[ S2 ];
			pend( st, chestQ, - 0.3, - 1.2, 70, 5 );
			eulerQ( B[ 'string' + S2 ].quaternion, st.ax, 0, st.az, 'XZY' );
		}
		{
			const st = this._strings.bag;
			worldQ( B.hips, _q1 );
			pend( st, _q1.clone(), 0.5, - 0.8, 40, 4 );
			st.az = clamp( st.az, 0.08, 0.6 );
			eulerQ( B.bag.quaternion, st.ax, 0.2, st.az, 'XZY' );
		}

		this.root.updateMatrixWorld( true );

		// ── hair & skirt
		this._updateHair( dt, T );
		this._updateSkirt( dt, T, v, runB );

		return { footsteps: this._footsteps };
	}

	// two-bone IK in world space. sgn=+1 legs (knee forward), -1 arms (elbow back).
	_twoBone( A, Tg, l1, l2, poleDir, sgn, outQ1, outQ2 ) {
		const dir = _v4.subVectors( Tg, A );
		let d = dir.length();
		if ( d < 1e-6 ) dir.set( 0, - 1, 0 ); else dir.divideScalar( d );
		d = clamp( d, Math.abs( l1 - l2 ) + 1e-3, ( l1 + l2 ) * 0.9995 );
		const a = ( l1 * l1 - l2 * l2 + d * d ) / ( 2 * d );
		const h = Math.sqrt( Math.max( 0, l1 * l1 - a * a ) );
		const bend = _v5.copy( poleDir ).addScaledVector( dir, - poleDir.dot( dir ) );
		if ( bend.lengthSq() < 1e-8 ) bend.set( 0, 0, 1 );
		bend.normalize();
		const J = _v6.copy( A ).addScaledVector( dir, a ).addScaledVector( bend, h );
		const E = new THREE.Vector3().copy( A ).addScaledVector( dir, d );
		const d1 = new THREE.Vector3().subVectors( J, A ).normalize();
		const d2 = new THREE.Vector3().subVectors( E, J ).normalize();
		const basis = ( dd, out ) => {
			const Y = new THREE.Vector3().copy( dd ).negate();
			const Z = new THREE.Vector3().copy( bend ).addScaledVector( dd, - bend.dot( dd ) );
			if ( Z.lengthSq() < 1e-8 ) Z.set( 0, 0, 1 );
			Z.normalize().multiplyScalar( sgn );
			const X = new THREE.Vector3().crossVectors( Y, Z ).normalize();
			Z.crossVectors( X, Y );
			_m1.makeBasis( X, Y, Z );
			out.setFromRotationMatrix( _m1 );
		};
		basis( d1, outQ1 );
		basis( d2, outQ2 );
	}

	// ─────────────────────────────────────────── hair simulation
	_updateHair( dt, T ) {
		const S = this.hair;
		const B = this.B;
		const hm = B.head.matrixWorld;
		if ( this._teleport || ! S.ready ) this._resetHair();

		// colliders (world)
		const C = this._colliders || ( this._colliders = {
			head: { M: new THREE.Matrix4(), Mi: new THREE.Matrix4(), r: 0.095 },
			torso: { M: new THREE.Matrix4(), Mi: new THREE.Matrix4(), r: 0.2 },
			hood: { M: new THREE.Matrix4(), Mi: new THREE.Matrix4(), r: 0.08 },
			caps: [ 0, 1, 2, 3, 4, 5, 6, 7 ].map( () => ( { a: new THREE.Vector3(), b: new THREE.Vector3(), r: 0.05 } ) ),
		} );
		C.head.M.copy( hm ).multiply( _m0.makeScale( CAP_R.x, CAP_R.y, CAP_R.z ).setPosition( HC ) ); C.head.Mi.copy( C.head.M ).invert();
		C.torso.M.copy( B.chest.matrixWorld ).multiply( _m0.makeScale( 0.178, 0.30, 0.158 ).setPosition( 0, - 0.12, - 0.016 ) ); C.torso.Mi.copy( C.torso.M ).invert();
				const caps = C.caps;
		worldP( B.neck, caps[ 0 ].a ); worldP( B.head, caps[ 0 ].b ); caps[ 0 ].r = 0.045;
		worldP( B.upperArmL, caps[ 1 ].a ); worldP( B.upperArmR, caps[ 1 ].b ); caps[ 1 ].r = 0.072;
		worldP( B.upperArmL, caps[ 2 ].a ); worldP( B.foreArmL, caps[ 2 ].b ); caps[ 2 ].r = 0.07;
		worldP( B.upperArmR, caps[ 3 ].a ); worldP( B.foreArmR, caps[ 3 ].b ); caps[ 3 ].r = 0.07;
		worldP( B.foreArmL, caps[ 4 ].a ); worldP( B.handL, caps[ 4 ].b ); caps[ 4 ].r = 0.062;
		worldP( B.foreArmR, caps[ 5 ].a ); worldP( B.handR, caps[ 5 ].b ); caps[ 5 ].r = 0.062;
		worldP( B.spine, caps[ 6 ].a ); worldP( B.hips, caps[ 6 ].b ); caps[ 6 ].r = 0.12;
		caps[ 7 ].a.set( - 0.075, 0.165, - 0.085 ).applyMatrix4( B.chest.matrixWorld ); caps[ 7 ].b.set( 0.075, 0.165, - 0.085 ).applyMatrix4( B.chest.matrixWorld ); caps[ 7 ].r = 0.05;

		const NPT = S.NPT;
		const pos = S.pos, vel = S.vel, rest = S.rest, corr = S.corr;
		// head velocity for internal damping
		worldP( B.head, _v0 );
		const hv = _v1.set( 0, 0, 0 );
		if ( dt > 0 && ! this._teleport ) hv.subVectors( _v0, this._headPrevP ).divideScalar( dt );
		this._headPrevP.copy( _v0 );

		const nSub = dt > 0 ? Math.min( 4, Math.max( 1, Math.ceil( dt / ( 1 / 110 ) ) ) ) : 0;
		const h = nSub ? dt / nSub : 0;
		const anchorsNow = this._anchorsNow || ( this._anchorsNow = new Float32Array( S.n * 3 ) );
		for ( let si = 0; si < S.n; si ++ ) _v2.fromArray( rest, si * NPT * 3 ).applyMatrix4( hm ).toArray( anchorsNow, si * 3 );
		const goalK = [ 1, 0.85, 0.32, 0.12, 0.05, 0.02, 0.008, 0, 0, 0 ];
		const wind = _v3.set( Math.sin( T * 0.9 ) * 0.5 + Math.sin( T * 2.3 ) * 0.25, 0, Math.sin( T * 0.7 + 1 ) * 0.3 );
		if ( this._comb ) wind.add( _v2.set( 0, 2, - 9 ).applyQuaternion( this._rootQ ) );
		const p = _v4, q = _v5, goal = _v6;

		const collide = ( i, margin ) => {
			p.fromArray( pos, i * 3 );
			// ellipsoids
			for ( const E of [ C.head, C.torso ] ) {
				q.copy( p ).applyMatrix4( E.Mi );
				const s = 1 + margin / ( E === C.head ? 0.095 : ( E === C.torso ? 0.2 : 0.09 ) );
				const l = q.length();
				if ( l < s && l > 1e-6 ) { q.multiplyScalar( s / l ).applyMatrix4( E.M ); p.copy( q ); }
			}
			for ( const c of caps ) {
				const ab = _v0.subVectors( c.b, c.a );
				const t = clamp( _v2.subVectors( p, c.a ).dot( ab ) / Math.max( 1e-8, ab.lengthSq() ), 0, 1 );
				_v2.copy( c.a ).addScaledVector( ab, t );
				q.subVectors( p, _v2 );
				const l = q.length(), R = c.r + margin;
				if ( l < R ) { if ( l > 1e-6 ) p.copy( _v2 ).addScaledVector( q, R / l ); }
			}
			p.toArray( pos, i * 3 );
		};

		for ( let sub = 0; sub < nSub; sub ++ ) {
			const f = ( sub + 1 ) / nSub;
			for ( let si = 0; si < S.n; si ++ ) {
				const d = S.defs[ si ];
				const base = si * NPT;
				const L = S.segLen[ si ];
				// root anchor
				_v2.fromArray( S.anchorPrev, si * 3 ).lerp( _v0.fromArray( anchorsNow, si * 3 ), f );
				const old = this._oldPos || ( this._oldPos = new Float32Array( NPT * 3 ) );
				for ( let k = 0; k < NPT; k ++ ) { old[ k * 3 ] = pos[ ( base + k ) * 3 ]; old[ k * 3 + 1 ] = pos[ ( base + k ) * 3 + 1 ]; old[ k * 3 + 2 ] = pos[ ( base + k ) * 3 + 2 ]; }
				pos[ base * 3 ] = _v2.x; pos[ base * 3 + 1 ] = _v2.y; pos[ base * 3 + 2 ] = _v2.z;
				// integrate
				for ( let k = 1; k < NPT; k ++ ) {
					const i3 = ( base + k ) * 3;
					let vx = vel[ i3 ], vy = vel[ i3 + 1 ], vz = vel[ i3 + 2 ];
					// air drag + internal damping relative to head
					const air = 0.9 * h, intD = 3.2 * h;
					vx -= vx * air + ( vx - hv.x ) * intD; vy -= vy * air + ( vy - hv.y ) * intD; vz -= vz * air + ( vz - hv.z ) * intD;
					vy -= 9.8 * h;
					vx += wind.x * h * ( k / NPT ); vz += wind.z * h * ( k / NPT );
					vel[ i3 ] = vx; vel[ i3 + 1 ] = vy; vel[ i3 + 2 ] = vz;
					pos[ i3 ] += vx * h; pos[ i3 + 1 ] += vy * h; pos[ i3 + 2 ] += vz * h;
					// shape goal
					const gk = goalK[ k ] * ( d.front ? 0.6 : 1 );
					if ( gk > 0 ) {
						goal.fromArray( rest, i3 ).applyMatrix4( hm );
						pos[ i3 ] += ( goal.x - pos[ i3 ] ) * gk; pos[ i3 + 1 ] += ( goal.y - pos[ i3 + 1 ] ) * gk; pos[ i3 + 2 ] += ( goal.z - pos[ i3 + 2 ] ) * gk;
					}
				}
				// FTL + collide (2 passes)
				for ( let pass = 0; pass < 2; pass ++ ) {
					for ( let k = 1; k < NPT; k ++ ) {
						const i3 = ( base + k ) * 3, j3 = ( base + k - 1 ) * 3;
						let dx = pos[ i3 ] - pos[ j3 ], dy = pos[ i3 + 1 ] - pos[ j3 + 1 ], dz = pos[ i3 + 2 ] - pos[ j3 + 2 ];
						const l = Math.sqrt( dx * dx + dy * dy + dz * dz ) || 1e-6;
						const s = L / l;
						const nx = pos[ j3 ] + dx * s, ny = pos[ j3 + 1 ] + dy * s, nz = pos[ j3 + 2 ] + dz * s;
						if ( pass === 1 ) { corr[ i3 ] = nx - pos[ i3 ]; corr[ i3 + 1 ] = ny - pos[ i3 + 1 ]; corr[ i3 + 2 ] = nz - pos[ i3 + 2 ]; }
						pos[ i3 ] = nx; pos[ i3 + 1 ] = ny; pos[ i3 + 2 ] = nz;
						if ( k >= 2 || pass === 1 ) collide( base + k, d.margin );
					}
				}
				// velocity update (DFTL)
				for ( let k = 1; k < NPT; k ++ ) {
					const i3 = ( base + k ) * 3;
					const n3 = k + 1 < NPT ? ( base + k + 1 ) * 3 : - 1;
					for ( let c = 0; c < 3; c ++ ) {
						let nv = ( pos[ i3 + c ] - old[ k * 3 + c ] ) / h;
						if ( n3 >= 0 ) nv -= 0.85 * corr[ n3 + c ] / h;
						vel[ i3 + c ] = Number.isFinite( nv ) ? clamp( nv, - 30, 30 ) : 0;
					}
				}
			}
		}
		S.anchorPrev.set( anchorsNow );

		// ── render ribbons
		const M = S.M;
		const R = S.render;
		const ip = this._invRoot;
		const out = S.mesh.geometry.attributes.position.array, nor = S.mesh.geometry.attributes.normal.array;
		worldP( B.head, _v0 ); _v0.add( _v1.copy( HC ).applyQuaternion( worldQ( B.head, _q0 ) ) );
		const axA = _v0.clone();
		const axB = worldP( B.hips, new THREE.Vector3() );
		const tan = new THREE.Vector3(), outV = new THREE.Vector3(), side = new THREE.Vector3(), cp = new THREE.Vector3();
		for ( let si = 0; si < S.n; si ++ ) {
			const d = S.defs[ si ];
			const base = si * NPT;
			// subdivide
			for ( let k = 0; k < M; k ++ ) {
				const r3 = ( si * M + k ) * 3;
				if ( k % 2 === 0 ) {
					const i3 = ( base + k / 2 ) * 3;
					R[ r3 ] = pos[ i3 ]; R[ r3 + 1 ] = pos[ i3 + 1 ]; R[ r3 + 2 ] = pos[ i3 + 2 ];
				} else {
					const j = ( k - 1 ) / 2;
					const i0 = base + Math.max( 0, j - 1 ), i1 = base + j, i2 = base + j + 1, i3b = base + Math.min( NPT - 1, j + 2 );
					for ( let c = 0; c < 3; c ++ ) R[ r3 + c ] = ( - pos[ i0 * 3 + c ] + 9 * pos[ i1 * 3 + c ] + 9 * pos[ i2 * 3 + c ] - pos[ i3b * 3 + c ] ) / 16;
				}
			}
			for ( let k = 0; k < M; k ++ ) {
				const r3 = ( si * M + k ) * 3;
				const a = Math.max( 0, k - 1 ), b = Math.min( M - 1, k + 1 );
				tan.set( R[ ( si * M + b ) * 3 ] - R[ ( si * M + a ) * 3 ], R[ ( si * M + b ) * 3 + 1 ] - R[ ( si * M + a ) * 3 + 1 ], R[ ( si * M + b ) * 3 + 2 ] - R[ ( si * M + a ) * 3 + 2 ] ).normalize();
				cp.set( R[ r3 ], R[ r3 + 1 ], R[ r3 + 2 ] );
				// out vector from body axis
				const ab = _v2.subVectors( axB, axA );
				const t = clamp( _v3.subVectors( cp, axA ).dot( ab ) / ab.lengthSq(), 0, 1 );
				outV.copy( cp ).sub( _v3.copy( axA ).addScaledVector( ab, t ) );
				if ( outV.lengthSq() < 1e-8 ) outV.set( 0, 0, - 1 );
				outV.normalize();
				side.crossVectors( tan, outV );
				if ( side.lengthSq() < 1e-8 ) side.set( 1, 0, 0 );
				side.normalize();
				outV.crossVectors( side, tan ).normalize();
				const u = k / ( M - 1 );
				const w = d.width * ( 1 - 0.82 * Math.pow( u, 2.2 ) ) * ( 0.85 + 0.15 * Math.sin( u * 4 + si ) ) * 0.5;
				const bul = w * 0.35;
				const vb = ( si * M + k ) * 9;
				for ( let c = 0; c < 3; c ++ ) {
					const sx = c === 0 ? - 1 : ( c === 2 ? 1 : 0 );
					_v4.copy( cp ).addScaledVector( side, sx * w );
					if ( c === 1 ) _v4.addScaledVector( outV, bul );
					_v4.applyMatrix4( ip );
					out[ vb + c * 3 ] = _v4.x; out[ vb + c * 3 + 1 ] = _v4.y; out[ vb + c * 3 + 2 ] = _v4.z;
					_v5.copy( outV ).addScaledVector( side, sx * 0.55 ).normalize().transformDirection( ip );
					nor[ vb + c * 3 ] = _v5.x; nor[ vb + c * 3 + 1 ] = _v5.y; nor[ vb + c * 3 + 2 ] = _v5.z;
				}
			}
		}
		S.mesh.geometry.attributes.position.needsUpdate = true;
		S.mesh.geometry.attributes.normal.needsUpdate = true;
	}

	// ─────────────────────────────────────────── skirt deformation
	_updateSkirt( dt, T, v, runB ) {
		const K = this.skirt, B = this.B;
		const { base, NC, NR, off, tmp } = K;
		const arr = K.mesh.geometry.attributes.position.array;
		// hips acceleration in hips space
		worldP( B.hips, _v0 );
		if ( dt > 0 ) {
			if ( this._teleport ) { this._hipsPrevP.copy( _v0 ); this._hipsPrevV.set( 0, 0, 0 ); }
			_v1.subVectors( _v0, this._hipsPrevP ).divideScalar( dt );
			_v2.subVectors( _v1, this._hipsPrevV ).divideScalar( dt );
			this._hipsAcc.lerp( _v2.clampLength( 0, 40 ), 1 - Math.exp( - 25 * dt ) );
			this._hipsPrevV.copy( _v1 ); this._hipsPrevP.copy( _v0 );
			worldQ( B.hips, _q0 );
			_v3.copy( this._hipsAcc ).applyQuaternion( _q0.invert() );
			const target = _v4.copy( _v3 ).multiplyScalar( - 0.0045 );
			target.z -= 0.012 * v;
			target.y += 0.004 * v;
			target.clampLength( 0, 0.09 );
			const k = 95, c = 8;
			_v5.subVectors( target, this._skirtS ).multiplyScalar( k ).addScaledVector( this._skirtV, - c );
			this._skirtV.addScaledVector( _v5, dt );
			this._skirtS.addScaledVector( this._skirtV, dt );
		}
		const Sx = this._skirtS.x, Sy = this._skirtS.y, Sz = this._skirtS.z;
		// legs in hips space
		const legs = [];
		for ( const side of [ 'L', 'R' ] ) {
			const th = B[ 'thigh' + side ];
			const a = th.position.clone();
			const b = new THREE.Vector3( 0, - L_THIGH, 0 ).applyQuaternion( th.quaternion ).add( a );
			legs.push( { a, b } );
		}
		const flare = 0.02 * runB + 0.004 * sstep( 0.2, 1.5, v );
		for ( let r = 0; r < NR; r ++ ) {
			const t = r / ( NR - 1 );
			const w = Math.pow( t, 1.5 );
			for ( let c = 0; c < NC; c ++ ) {
				const ph = c / NC * TAU;
				const nx = Math.sin( ph ), nz = Math.cos( ph );
				const front = nz;
				const fl = flare * ( 1 + 0.35 * Math.sin( 2 * ph + T * 5.0 ) ) * ( 1 - 0.6 * Math.max( 0, front ) );
				const flut = 0.004 * runB * Math.sin( T * 13 + ph * 3 );
				const k3 = ( r * NC + c ) * 3;
				off[ k3 ] = ( Sx + nx * ( fl + flut ) ) * w;
				off[ k3 + 1 ] = ( Sy * ( 0.4 - 0.6 * front ) + fl * 0.5 ) * w;
				off[ k3 + 2 ] = ( Sz * ( 1 - 0.5 * Math.max( 0, front ) ) + nz * ( fl + flut ) ) * w;
			}
		}
		// smooth across columns
		for ( let pass = 0; pass < 2; pass ++ ) {
			tmp.set( off );
			for ( let r = 0; r < NR; r ++ ) for ( let c = 0; c < NC; c ++ ) {
				const k3 = ( r * NC + c ) * 3, a3 = ( r * NC + ( c + NC - 1 ) % NC ) * 3, b3 = ( r * NC + ( c + 1 ) % NC ) * 3;
				for ( let e = 0; e < 3; e ++ ) off[ k3 + e ] = tmp[ a3 + e ] * 0.25 + tmp[ k3 + e ] * 0.5 + tmp[ b3 + e ] * 0.25;
			}
		}
		// collision with thighs, propagating push down the rows
		const carry = this._skirtCarry || ( this._skirtCarry = new Float32Array( NC * 3 ) );
		carry.fill( 0 );
		const p = _v0, cpt = _v1, dv = _v2;
		for ( let r = 0; r < NR; r ++ ) {
			const t = r / ( NR - 1 );
			for ( let c = 0; c < NC; c ++ ) {
				const k3 = ( r * NC + c ) * 3, c3 = c * 3;
				p.set( base[ k3 ] + off[ k3 ] + carry[ c3 ], base[ k3 + 1 ] + off[ k3 + 1 ] + carry[ c3 + 1 ] * 0.3, base[ k3 + 2 ] + off[ k3 + 2 ] + carry[ c3 + 2 ] );
				if ( t > 0.12 ) {
					for ( const L of legs ) {
						const ab = dv.subVectors( L.b, L.a );
						const tt = clamp( _v3.subVectors( p, L.a ).dot( ab ) / ab.lengthSq(), 0, 1 );
						cpt.copy( L.a ).addScaledVector( ab, tt );
						const R = lerp( 0.084, 0.062, tt ) + 0.006;
						_v3.subVectors( p, cpt );
						const l = _v3.length();
						if ( l < R && l > 1e-6 ) {
							_v4.copy( cpt ).addScaledVector( _v3, R / l );
							carry[ c3 ] += _v4.x - p.x; carry[ c3 + 1 ] += _v4.y - p.y; carry[ c3 + 2 ] += _v4.z - p.z;
							p.copy( _v4 );
						}
					}
				}
				arr[ k3 ] = p.x; arr[ k3 + 1 ] = p.y; arr[ k3 + 2 ] = p.z;
			}
		}
		K.mesh.geometry.attributes.position.needsUpdate = true;
		K.mesh.geometry.computeVertexNormals();
	}

	// ─────────────────────────────────────────── public helpers
	getUmbrellaDripPoints( out = [] ) {
		const o = this._umbOpen;
		if ( o < 0.5 ) { out.length = 0; return out; }
		const U = this.umb;
		const M = _m0.multiplyMatrices( this.root.matrixWorld, this.umbrella.matrix );
		for ( let k = 0; k < U.ribTips.length; k ++ ) {
			if ( ! out[ k ] ) out[ k ] = new THREE.Vector3();
			out[ k ].copy( U.ribTips[ k ] ).applyMatrix4( M );
		}
		out.length = U.ribTips.length;
		return out;
	}

	getUmbrellaCover() {
		const o = this._umbOpen, U = this.umb;
		const M = _m0.multiplyMatrices( this.root.matrixWorld, this.umbrella.matrix );
		const center = new THREE.Vector3( 0, ( UMB.apexY + U.rimY ) * 0.5, 0 ).applyMatrix4( M );
		return { center, radius: o > 0.01 ? U.rimR : 0, open: o };
	}
}
