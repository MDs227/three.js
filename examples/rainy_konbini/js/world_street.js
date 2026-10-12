// Street, sidewalks, markings, streetlight, utility poles & wires, curve mirror, bus stop, neighbours, far row.
import * as THREE from 'three';
import { M, quadGeo, rodGeo, tubeGeo, wireGeo, scaleUV, rng } from './world_util.js';

const V = ( x, y, z ) => new THREE.Vector3( x, y, z );

export function buildStreet( ctx, shadowSize ) {

	const { B, M: MAT, T, root, Q } = ctx;
	const { box, bx, cyl, quad, collide } = ctx;
	const D = T.D, E = T.E;
	const R = rng( 42 );

	// ================= ground =================
	B.add( new THREE.PlaneGeometry( 170, 140 ), MAT.far, M( 0, - 0.02, 25, - Math.PI / 2 ), 0x15171b );
	const plane = ( mat, x0, x1, z0, z1, y, tile, col ) => {

		const g = new THREE.PlaneGeometry( x1 - x0, z1 - z0 );
		scaleUV( g, ( x1 - x0 ) / tile, ( z1 - z0 ) / tile );
		B.add( g, mat, M( ( x0 + x1 ) / 2, y, ( z0 + z1 ) / 2, - Math.PI / 2 ), col );

	};

	plane( MAT.asphalt, - 60, 60, - 16, 8.7, 0, 5 );
	plane( MAT.asphalt, - 80, 80, 12.0, 22.0, 0, 5 );
	// sidewalks (top y=0.12) + ramp from apron
	plane( MAT.sidewalk, - 80, 80, 9.0, 11.85, 0.12, 2 );
	plane( MAT.sidewalk, - 80, 80, 22.15, 25.6, 0.12, 2 );
	{

		const g = new THREE.PlaneGeometry( 120, Math.hypot( 0.3, 0.12 ) );
		scaleUV( g, 60, 0.15 );
		B.add( g, MAT.sidewalk, M( 0, 0.06, 8.85, - Math.PI / 2 + Math.atan2( 0.12, 0.3 ), 0, 0 ) );

	}

	// curbs
	bx( MAT.concrete, 0x9c9d9a, - 80, 80, 0, 0.14, 11.85, 12.02 );
	bx( MAT.concrete, 0x9c9d9a, - 80, 80, 0, 0.14, 21.98, 22.15 );
	bx( MAT.concrete, 0x5a5c5e, - 80, 80, 0.0, 0.12, 25.6, 25.7 );
	// tactile paving line + warning blocks at crossing
	plane( MAT.tactile, - 80, 80, 9.6, 9.9, 0.124, 0.3 );
	plane( MAT.tactile, 1.2, 4.8, 11.25, 11.55, 0.124, 0.3 );
	plane( MAT.tactile, 1.2, 4.8, 22.45, 22.75, 0.124, 0.3 );
	plane( MAT.tactile, 2.85, 3.15, 9.9, 11.25, 0.124, 0.3 );
	// sidewalk ramp at crosswalk (lowered curb visual)
	bx( MAT.concrete, 0x8a8b88, 1.2, 4.8, 0, 0.125, 11.6, 11.86 );
	ctx.outdoorGround.push(
		{ minX: - 18, maxX: 20, minZ: 0, maxZ: 8.7, y: 0 },
		{ minX: 8, maxX: 20, minZ: - 12, maxZ: 0, y: 0 },
		{ minX: - 18, maxX: - 8, minZ: - 12, maxZ: 0, y: 0 },
		{ minX: - 45, maxX: 45, minZ: 9, maxZ: 11.85, y: 0.12 },
		{ minX: - 45, maxX: 45, minZ: 12, maxZ: 22, y: 0 },
		{ minX: - 45, maxX: 45, minZ: 22.15, maxZ: 25.5, y: 0.12 },
	);

	// ================= road markings =================
	const W = 0xe4e4dc;
	const P = ( x0, x1, z0, z1, col = W ) => bx( MAT.paint, col, x0, x1, 0.003, 0.005, z0, z1 );
	for ( const z of [ 12.3, 21.55 ] ) {

		P( - 80, 0.6, z, z + 0.15 );
		P( 5.4, 80, z, z + 0.15 );

	}

	for ( let x = - 80; x < 80; x += 9 ) {

		if ( x + 5 > - 2 && x < 8 ) continue;
		P( x, x + 5, 16.92, 17.08 );

	}

	for ( let z = 12.6; z < 21.5; z += 0.9 ) P( 1.0, 5.0, z, z + 0.45 );
	P( - 0.65, - 0.35, 12.45, 16.9 );
	P( 6.35, 6.65, 17.1, 21.55 );
	// 止まれ (both lanes)
	B.add( quadGeo( 1.7, 3.2, D.tomare ), MAT.paintDecal, M( - 3.2, 0.006, 14.65, - Math.PI / 2, 0, - Math.PI / 2 ) );
	B.add( quadGeo( 1.7, 3.2, D.tomare ), MAT.paintDecal, M( 10.2, 0.006, 19.35, - Math.PI / 2, 0, Math.PI / 2 ) );
	// diamonds (crossing ahead)
	const diamond = ( cx, cz ) => {

		const a = Math.atan2( 0.75, 1.5 ), L = Math.hypot( 1.5, 0.75 );
		for ( const [ sx, sz ] of [ [ 1, 1 ], [ 1, - 1 ], [ - 1, 1 ], [ - 1, - 1 ] ] ) {

			box( MAT.paint, W, L, 0.002, 0.15, cx + sx * 0.75, 0.004, cz + sz * 0.375, - sx * sz * a );

		}

	};

	diamond( - 15, 14.6 );
	diamond( 22, 19.4 );
	// manholes
	for ( const [ x, z ] of [ [ - 9, 15.2 ], [ 13, 18.9 ], [ 6.5, 6.6 ], [ - 22, 18.5 ] ] ) {

		cyl( MAT.metal, 0x2c2e31, 0.34, 0.34, 0.012, 24, x, 0.006, z );
		B.add( new THREE.TorusGeometry( 0.25, 0.012, 4, 24 ), MAT.metal, M( x, 0.012, z, Math.PI / 2 ), 0x44474b );
		B.add( new THREE.TorusGeometry( 0.14, 0.01, 4, 20 ), MAT.metal, M( x, 0.012, z, Math.PI / 2 ), 0x44474b );
		for ( let i = 0; i < 4; i ++ ) box( MAT.metal, 0x44474b, 0.5, 0.012, 0.02, x, 0.012, z, i * Math.PI / 4 );

	}

	// gutter grates
	const grate = ( x, z, w = 0.8, d = 0.32, ry = 0 ) => {

		box( MAT.metal, 0x1d1f22, w, 0.012, d, x, 0.004, z, ry );
		const n = Math.floor( w / 0.06 );
		for ( let i = 0; i < n; i ++ ) {

			const o = - w / 2 + ( i + 0.5 ) * w / n;
			box( MAT.metal, 0x4a4d52, 0.022, 0.016, d * 0.9, x + Math.cos( ry ) * o, 0.008, z - Math.sin( ry ) * o, ry );

		}

	};

	for ( const x of [ - 30, - 20, - 11, - 3, 8, 16, 26 ] ) {

		grate( x, 12.2 );
		grate( x + 3, 21.8 );

	}

	// apron trench drain across the lot front
	grate( 0.5, 8.55, 19, 0.2 );

	// ================= streetlight (shadow caster #1) =================
	{

		const sx = - 5, sz = 11.7;
		cyl( MAT.extPaint, 0x7d8288, 0.06, 0.085, 6.6, 10, sx, 0.12 + 3.3, sz );
		cyl( MAT.concrete, 0x77797c, 0.16, 0.18, 0.25, 10, sx, 0.24, sz );
		B.add( tubeGeo( [ V( sx, 6.6, sz ), V( sx, 6.95, sz - 0.2 ), V( sx, 7.05, sz - 0.8 ), V( sx, 7.0, sz - 1.15 ) ], 0.045, 16, 6 ), MAT.extPaint, null, 0x7d8288 );
		box( MAT.extPaint, 0x5f646a, 0.3, 0.1, 0.62, sx, 6.97, sz - 1.25 );
		box( MAT.emit, new THREE.Color( 5, 5.6, 6.5 ), 0.22, 0.01, 0.48, sx, 6.915, sz - 1.25 );
		box( MAT.extPaint, 0xdedede, 0.2, 0.3, 0.12, sx, 3.0, sz + 0.1 ); // numbered tag
		const sl = new THREE.SpotLight( 0xd6e4ff, 240, 22, 0.88, 0.65, 2 );
		sl.position.set( sx, 6.88, sz - 1.25 );
		sl.target.position.set( sx, 0, sz - 2.2 );
		sl.castShadow = true;
		sl.shadow.mapSize.set( shadowSize, shadowSize );
		sl.shadow.camera.near = 1; sl.shadow.camera.far = 16;
		sl.shadow.bias = - 0.0005; sl.shadow.normalBias = 0.025;
		root.add( sl, sl.target );
		ctx.lights.streetlight = sl;
		ctx.lightsInfo.push( { position: sl.position.clone(), color: new THREE.Color( 0xd6e4ff ), intensity: 1.0, radius: 9, cone: { target: sl.target.position.clone(), angle: 0.88 } } );
		collide( sx - 0.18, sx + 0.18, sz - 0.18, sz + 0.18, 7.1 );

	}

	// second streetlight across the road (emissive only)
	{

		const sx = 18, sz = 23.0;
		cyl( MAT.extPaint, 0x7d8288, 0.06, 0.085, 6.6, 10, sx, 3.42, sz );
		B.add( tubeGeo( [ V( sx, 6.6, sz ), V( sx, 6.95, sz + 0.2 ), V( sx, 7.05, sz + 0.8 ), V( sx, 7.0, sz + 1.15 ) ].map( v => v.setZ( 2 * sz - v.z ) ), 0.045, 16, 6 ), MAT.extPaint, null, 0x7d8288 );
		box( MAT.extPaint, 0x5f646a, 0.3, 0.1, 0.62, sx, 6.97, sz - 1.25 );
		box( MAT.emit, new THREE.Color( 5, 5.6, 6.5 ), 0.22, 0.01, 0.48, sx, 6.915, sz - 1.25 );

	}

	// ================= utility poles (電柱) & wires =================
	const poles = [];
	const pole = ( x, z, armAlongZ = true, transformer = false, ads = false ) => {

		const y0 = 0.12;
		cyl( MAT.concrete, 0x8e8e88, 0.13, 0.19, 11.6, 12, x, y0 + 5.8, z );
		for ( let i = 0; i < 9; i ++ ) cyl( MAT.extPaint, i % 2 ? 0x141414 : 0xe8b710, 0.195, 0.195, 0.2, 12, x, y0 + 0.2 + i * 0.2, z ); // guard sleeve
		const arm = ( y, len, n ) => {

			if ( armAlongZ ) box( MAT.metal, 0x55595e, 0.1, 0.1, len, x, y, z ); else box( MAT.metal, 0x55595e, len, 0.1, 0.1, x, y, z );
			const pts = [];
			for ( let i = 0; i < n; i ++ ) {

				const o = n === 1 ? 0 : - len / 2 + 0.1 + i * ( len - 0.2 ) / ( n - 1 );
				const px = armAlongZ ? x : x + o, pz = armAlongZ ? z + o : z;
				cyl( MAT.extPlastic, 0xe9e9e4, 0.035, 0.05, 0.16, 8, px, y + 0.13, pz );
				cyl( MAT.extPlastic, 0xe9e9e4, 0.06, 0.06, 0.02, 8, px, y + 0.1, pz );
				pts.push( V( px, y + 0.2, pz ) );

			}

			// diagonal braces
			B.add( rodGeo( V( x, y - 0.6, z ), V( armAlongZ ? x : x + len * 0.35, y, armAlongZ ? z + len * 0.35 : z ), 0.018, 4 ), MAT.metal, null, 0x55595e );
			B.add( rodGeo( V( x, y - 0.6, z ), V( armAlongZ ? x : x - len * 0.35, y, armAlongZ ? z - len * 0.35 : z ), 0.018, 4 ), MAT.metal, null, 0x55595e );
			return pts;

		};

		const top = arm( 11.2, 1.9, 3 );
		const mid = arm( 10.2, 1.4, 2 );
		// telecom cable clamps
		const tel = [ V( x, 7.2, z ), V( x, 6.6, z ) ];
		box( MAT.metal, 0x44474b, 0.3, 0.06, 0.3, x, 7.2, z );
		box( MAT.metal, 0x44474b, 0.3, 0.06, 0.3, x, 6.6, z );
		// step bolts
		for ( let i = 0; i < 12; i ++ ) {

			const y = 2.4 + i * 0.45, a = ( i % 2 ) * Math.PI + 0.6;
			B.add( rodGeo( V( x, y, z ), V( x + Math.cos( a ) * 0.32, y, z + Math.sin( a ) * 0.32 ), 0.012, 4 ), MAT.metal, null, 0x777b80 );

		}

		if ( transformer ) {

			const tx = x + 0.45;
			cyl( MAT.extPaint, 0x9ea5a8, 0.28, 0.28, 0.85, 14, tx, 8.6, z );
			cyl( MAT.extPaint, 0x9ea5a8, 0.3, 0.3, 0.06, 14, tx, 9.05, z );
			for ( const o of [ - 0.12, 0, 0.12 ] ) cyl( MAT.extPlastic, 0xe0e0da, 0.025, 0.035, 0.14, 6, tx + o * 0.4, 9.15, z + o );
			box( MAT.metal, 0x55595e, 0.5, 0.06, 0.08, x + 0.22, 8.35, z );
			box( MAT.metal, 0x55595e, 0.5, 0.06, 0.08, x + 0.22, 8.9, z );
			for ( const o of [ - 0.12, 0, 0.12 ] ) B.add( wireGeo( V( tx + o * 0.4, 9.2, z + o ), V( x, 10.4, z + o * 3 ), 0.1, 0.006, 8 ), MAT.rubber, null, 0x111111 );

		}

		if ( ads ) {

			for ( const s of [ - 1, 1 ] ) {

				const key = s < 0 ? 'denchu1' : 'denchu2';
				box( MAT.extPaint, 0xdddddd, 0.02, 1.3, 0.36, x + s * 0.2, 2.9, z );
				quad( MAT.decal, D[ key ], 0.34, 1.24, x + s * 0.212, 2.9, z, s * Math.PI / 2 );
				box( MAT.metal, 0x777b80, 0.42, 0.03, 0.03, x, 3.5, z );
				box( MAT.metal, 0x777b80, 0.42, 0.03, 0.03, x, 2.3, z );

			}

		}

		box( MAT.extPaint, 0xf0f0f0, 0.03, 0.16, 0.12, x + 0.19, 1.95 + 0.2, z, 0 ); // pole number plate
		collide( x - 0.24, x + 0.24, z - 0.24, z + 0.24, 11.7 );
		const p = { x, z, top, mid, tel };
		poles.push( p );
		return p;

	};

	const pA = pole( - 9.6, 11.55, true, true, true );
	const pB = pole( 12.6, 23.4, true, false, true );
	const pC = pole( 33, 11.55, true );
	const pD = pole( - 26, 23.4, true );
	const pE = pole( - 46, 11.55, true );
	const pF = pole( 50, 23.4, true );
	const wire = ( a, b, sag, r = 0.012, col = 0x0d0d0d ) => B.add( wireGeo( a, b, sag, r, 28 ), MAT.rubber, null, col );
	const span = ( p, q, sagTop = 0.55 ) => {

		for ( let i = 0; i < 3; i ++ ) wire( p.top[ i ], q.top[ i ], sagTop );
		for ( let i = 0; i < 2; i ++ ) wire( p.mid[ i ], q.mid[ i ], sagTop * 0.9 );
		wire( p.tel[ 0 ], q.tel[ 0 ], sagTop * 1.4, 0.028, 0x111111 );
		wire( p.tel[ 1 ], q.tel[ 1 ], sagTop * 1.6, 0.022, 0x161616 );

	};

	span( pA, pB, 0.75 );
	span( pA, pC, 0.95 );
	span( pE, pA, 0.95 );
	span( pD, pB, 0.95 );
	span( pB, pF, 0.95 );
	span( pD, pA, 0.8 );
	// service drop to store roof & to apartment
	wire( V( - 9.6, 7.2, 11.55 ), V( - 7.9, 4.5, - 0.4 ), 0.6, 0.01 );
	wire( V( - 9.6, 6.6, 11.55 ), V( - 7.9, 4.3, - 0.6 ), 0.7, 0.01 );
	wire( V( - 9.6, 6.6, 11.55 ), V( - 16.5, 5.6, - 0.5 ), 0.6, 0.01 );
	wire( V( 12.6, 7.2, 23.4 ), V( 8, 5.5, 25.6 ), 0.4, 0.01 );

	// ================= curve mirror (カーブミラー) =================
	{

		const mx = 10.9, mz = 11.55, ry = - Math.PI / 4;
		cyl( MAT.extPaint, 0xe8701e, 0.038, 0.038, 3.0, 8, mx, 0.12 + 1.5, mz );
		const mm = M( mx, 3.1, mz, 0.12, ry, 0 );
		const g1 = new THREE.CircleGeometry( 0.38, 28 ); g1.applyMatrix4( M( 0, 0, 0.03 ) ); g1.applyMatrix4( mm );
		B.add( g1, MAT.chrome, null, 0xe8eef4 );
		const g2 = new THREE.TorusGeometry( 0.39, 0.035, 6, 28 ); g2.applyMatrix4( M( 0, 0, 0.02 ) ); g2.applyMatrix4( mm );
		B.add( g2, MAT.extPaint, null, 0xe8701e );
		const g3 = new THREE.CylinderGeometry( 0.4, 0.4, 0.04, 28 ); g3.applyMatrix4( M( 0, 0, - 0.01, Math.PI / 2 ) ); g3.applyMatrix4( mm );
		B.add( g3, MAT.extPaint, null, 0xe8701e );
		box( MAT.extPaint, 0xe8701e, 0.08, 0.3, 0.08, mx, 2.95, mz );
		collide( mx - 0.1, mx + 0.1, mz - 0.1, mz + 0.1, 3.5 );

	}

	// ================= bus stop (far sidewalk) =================
	{

		const x = - 2.2, z = 23.0;
		cyl( MAT.concrete, 0x7a7c7e, 0.28, 0.3, 0.14, 16, x, 0.19, z );
		cyl( MAT.extPaint, 0xdedede, 0.035, 0.035, 2.4, 8, x, 1.4, z );
		B.add( quadGeo( 0.62, 0.62, D.busstop ), MAT.decal, M( x, 2.35, z - 0.012, 0, Math.PI, 0 ) );
		B.add( quadGeo( 0.62, 0.62, D.busstop ), MAT.decal, M( x, 2.35, z + 0.012 ) );
		cyl( MAT.extPaint, 0x1f6fb5, 0.32, 0.32, 0.02, 24, x, 2.35, z, Math.PI / 2 );
		box( MAT.extPaint, 0xf4f4f4, 0.45, 0.6, 0.04, x, 1.4, z - 0.03 );
		box( MAT.emit, new THREE.Color( 1.2, 1.25, 1.3 ), 0.38, 0.5, 0.01, x, 1.4, z - 0.055 );
		// bench
		bx( MAT.extPaint, 0x6a5038, x + 0.8, x + 2.2, 0.55, 0.6, z + 0.6, z + 1.0 );
		for ( const o of [ 0.95, 2.05 ] ) bx( MAT.metal, 0x55595e, x + o - 0.03, x + o + 0.03, 0.12, 0.55, z + 0.65, z + 0.95 );

	}

	// ================= neighbours: left closed shop (シャッター) =================
	const tint = c => new THREE.Color( c );
	{

		const x0 = - 15.6, x1 = - 9.2, z0 = - 9, z1 = 0, h = 6.4;
		bx( MAT.siding, tint( 0xb4aa98 ), x0, x1, 0, h, z0, z1 );
		const sg = new THREE.PlaneGeometry( 5.0, 2.7 );
		scaleUV( sg, 5.0, 2.7 );
		B.add( sg, MAT.shutter, M( - 12.4, 1.35, 0.03 ) );
		bx( MAT.metal, 0x7a8086, - 14.95, - 9.85, 2.7, 3.05, 0, 0.28 );
		for ( const x of [ - 14.95, - 9.85 ] ) bx( MAT.metal, 0x7a8086, x - 0.05, x + 0.05, 0, 2.7, 0, 0.08 );
		bx( MAT.metal, 0x5a6066, - 12.6, - 12.2, 0.15, 0.2, 0.05, 0.1 ); // handle
		box( MAT.extPaint, 0x3f3428, 5.2, 0.95, 0.12, - 12.4, 3.55, 0.06 );
		quad( MAT.decal, D.shopsign, 5.0, 0.9, - 12.4, 3.55, 0.125 );
		// 2nd floor windows (one faintly lit)
		for ( let i = 0; i < 3; i ++ ) {

			const wx = - 14.3 + i * 1.95;
			bx( MAT.metal, 0x55595e, wx - 0.6, wx + 0.6, 4.3, 5.55, 0.0, 0.06 );
			if ( i === 1 ) B.add( new THREE.PlaneGeometry( 1.1, 1.15 ), MAT.emit, M( wx, 4.925, 0.065 ), new THREE.Color( 1.4, 0.95, 0.55 ) );
			else B.add( new THREE.PlaneGeometry( 1.1, 1.15 ), MAT.glass, M( wx, 4.925, 0.065 ) );
			bx( MAT.metal, 0x55595e, wx - 0.01, wx + 0.01, 4.3, 5.55, 0.06, 0.08 );

		}

		bx( MAT.extMatte, 0x77736c, x0 - 0.05, x1 + 0.05, h, h + 0.12, z0, z1 + 0.05 );
		// AC unit on bracket + downpipe
		box( MAT.extPlastic, 0xd4d4ce, 0.8, 0.55, 0.3, - 10.2, 4.6, 0.2 );
		cyl( MAT.metal, 0x333333, 0.2, 0.2, 0.01, 16, - 10.25, 4.6, 0.355, Math.PI / 2 );
		B.add( rodGeo( V( - 9.35, 0, 0.1 ), V( - 9.35, h, 0.1 ), 0.04, 6 ), MAT.extPaint, null, 0x8a8e92 );
		// beer crates
		for ( let i = 0; i < 4; i ++ ) box( MAT.extPlastic, i % 2 ? 0xd6a314 : 0xb8261e, 0.45, 0.3, 0.35, - 9.8 - ( i > 1 ? 0.5 : 0 ), 0.15 + ( i % 2 ) * 0.3, 0.5 );
		collide( x0, x1 + 0.05, z0, z1 + 0.1, h );
		collide( - 10.35, - 9.55, 0.3, 0.7, 0.6 );
		ctx.rainBlockers.push( { minX: x0, maxX: x1, minZ: z0, maxZ: z1, y: h } );

	}

	// ================= neighbours: 2-storey apartment =================
	{

		const x0 = - 28, x1 = - 16.2, z0 = - 9, z1 = - 0.8, h = 6.2;
		bx( MAT.siding, tint( 0xd2c8b4 ), x0, x1, 0, h, z0, z1 );
		bx( MAT.extMatte, 0x7d7a74, x0 - 0.1, x1 + 0.1, h, h + 0.15, z0, z1 + 0.1 );
		const warmWin = [ true, false, false, true, false, true, false, false ];
		for ( let fl = 0; fl < 2; fl ++ ) for ( let u = 0; u < 4; u ++ ) {

			const cx = x0 + 1.5 + u * 2.95, y = 0.25 + fl * 3.0;
			const lit = warmWin[ fl * 4 + u ];
			bx( MAT.metal, 0x6a6e73, cx - 0.95, cx + 0.95, y, y + 2.0, z1, z1 + 0.05 );
			if ( lit ) B.add( new THREE.PlaneGeometry( 1.8, 1.9 ), MAT.emit, M( cx, y + 1.0, z1 + 0.055 ), new THREE.Color( 1.6, 1.0 + R() * 0.2, 0.55 ) );
			else B.add( new THREE.PlaneGeometry( 1.8, 1.9 ), MAT.extPlastic, M( cx, y + 1.0, z1 + 0.055 ), 0x1a2028 );
			bx( MAT.metal, 0x6a6e73, cx - 0.01, cx + 0.01, y, y + 2.0, z1 + 0.05, z1 + 0.07 );
			if ( fl === 1 ) {

				// balcony slab + railing
				bx( MAT.extMatte, 0xa29d92, cx - 1.4, cx + 1.4, y - 0.15, y, z1, z1 + 1.0 );
				bx( MAT.metal, 0x8c9096, cx - 1.4, cx + 1.4, y + 0.95, y + 1.0, z1 + 0.95, z1 + 1.0 );
				for ( let k = 0; k <= 14; k ++ ) bx( MAT.metal, 0x8c9096, cx - 1.4 + k * 0.2 - 0.01, cx - 1.4 + k * 0.2 + 0.01, y, y + 0.95, z1 + 0.96, z1 + 0.99 );
				box( MAT.extPlastic, 0xd8d8d2, 0.75, 0.55, 0.28, cx + 0.9, y + 0.28, z1 + 0.4 );
				cyl( MAT.metal, 0x333333, 0.18, 0.18, 0.01, 14, cx + 0.88, y + 0.28, z1 + 0.545, Math.PI / 2 );
				if ( u % 2 === 0 ) bx( MAT.metal, 0xbbbbbb, cx - 1.3, cx + 0.2, y + 1.85, y + 1.88, z1 + 0.5, z1 + 0.53 ); // laundry pole

			} else {

				box( MAT.extPlastic, 0xd8d8d2, 0.75, 0.55, 0.28, cx + 1.15, 0.3, z1 + 0.25 );
				bx( MAT.metal, 0x777b80, cx - 1.4, cx + 1.4, 0, 0.9, z1 + 1.5, z1 + 1.52 );

			}

		}

		quad( MAT.decal, D.apt, 1.6, 0.4, x1 - 1.0, 2.75, z1 + 0.06 );
		collide( x0, x1, z0, z1 + 1.6, h );
		ctx.rainBlockers.push( { minX: x0, maxX: x1, minZ: z0, maxZ: z1, y: h } );
		ctx.rainBlockers.push( { minX: x0, maxX: x1, minZ: z1, maxZ: z1 + 1.0, y: 3.1 } );

	}

	// ================= right: alley + 3-storey building =================
	{

		const x0 = 12.5, x1 = 27, z0 = - 13, z1 = 2.5, h = 9.6;
		bx( MAT.siding, tint( 0x9a9ea2 ), x0, x1, 0, h, z0, z1 );
		bx( MAT.extMatte, 0x6d7074, x0 - 0.05, x1, h, h + 0.2, z0, z1 + 0.05 );
		// ground floor clinic (closed): dark glass + sign
		bx( MAT.metal, 0x3b3f45, x0 + 0.5, x1 - 0.5, 0, 2.6, z1, z1 + 0.05 );
		B.add( new THREE.PlaneGeometry( 13, 2.4 ), MAT.extPlastic, M( ( x0 + x1 ) / 2, 1.3, z1 + 0.06 ), 0x0e1218 );
		box( MAT.extPaint, 0xeef3f6, 5.2, 0.9, 0.1, x0 + 4, 3.1, z1 + 0.06 );
		quad( MAT.decal, D.seikotsu, 5.0, 1.1, x0 + 4, 3.1, z1 + 0.115 );
		box( MAT.emit, new THREE.Color( 0.6, 0.7, 0.8 ), 0.6, 0.4, 0.02, x0 + 10, 1.6, z1 + 0.08 ); // vending-ish notice light
		// upper floors: window band
		const wg = new THREE.PlaneGeometry( x1 - x0, 6.0 );
		scaleUV( wg, ( x1 - x0 ) / 12.8, 6.0 / 24 );
		B.add( wg, MAT.farWin, M( ( x0 + x1 ) / 2, 6.6, z1 + 0.02 ), 0x8a8e92 );
		// alley wall details (gas meters, pipes)
		for ( let i = 0; i < 3; i ++ ) {

			const z = - 0.5 - i * 2.2;
			box( MAT.extPaint, 0xd8d8d0, 0.18, 0.32, 0.26, x0 - 0.09, 1.35, z );
			cyl( MAT.extPlastic, 0x111111, 0.06, 0.06, 0.01, 12, x0 - 0.185, 1.42, z, 0, 0, Math.PI / 2 );
			B.add( rodGeo( V( x0 - 0.06, 0.1, z + 0.1 ), V( x0 - 0.06, 1.2, z + 0.1 ), 0.02, 6 ), MAT.extPaint, null, 0xd9b31a );
			B.add( rodGeo( V( x0 - 0.06, 1.55, z ), V( x0 - 0.06, 2.4, z ), 0.02, 6 ), MAT.extPaint, null, 0xd9b31a );
			quad( MAT.decal, D.gas, 0.18, 0.09, x0 - 0.19, 1.6, z, - Math.PI / 2 );

		}

		B.add( rodGeo( V( x0 - 0.06, 2.4, - 5.5 ), V( x0 - 0.06, 2.4, 0.3 ), 0.025, 6 ), MAT.extPaint, null, 0xd9b31a );
		B.add( rodGeo( V( x0 - 0.12, 0, - 3 ), V( x0 - 0.12, h, - 3 ), 0.05, 6 ), MAT.extPaint, null, 0x8a8e92 );
		for ( let i = 0; i < 2; i ++ ) {

			box( MAT.extPlastic, 0xd4d4ce, 0.3, 0.6, 0.8, x0 - 0.2, 3.6 + i * 3, - 6 );

		}

		// dim alley bulb
		box( MAT.metal, 0x333333, 0.25, 0.06, 0.12, x0 - 0.15, 2.9, - 1.6 );
		cyl( MAT.emit, new THREE.Color( 2.4, 1.9, 1.2 ), 0.05, 0.05, 0.1, 8, x0 - 0.2, 2.82, - 1.6 );
		// plants in pots
		for ( let i = 0; i < 3; i ++ ) {

			cyl( MAT.extPlastic, 0x6b4a32, 0.16, 0.12, 0.3, 10, x0 - 0.35, 0.15, - 8.5 + i * 0.5 );
			B.add( new THREE.IcosahedronGeometry( 0.25, 1 ), MAT.extMatte, M( x0 - 0.35, 0.5, - 8.5 + i * 0.5 ), 0x2d4a28 );

		}

		collide( x0 - 0.3, x1, z0, z1 + 0.1, h );
		ctx.rainBlockers.push( { minX: x0, maxX: x1, minZ: z0, maxZ: z1, y: h } );

	}

	// near-side buildings beyond the neighbours (close the street)
	for ( const [ x0, x1, h, col ] of [ [ - 44, - 29, 8, 0x8e8a80 ], [ 28, 44, 12, 0x7d8288 ] ] ) {

		bx( MAT.far, col, x0, x1, 0, h, - 14, 6 );
		const g = new THREE.PlaneGeometry( x1 - x0, h - 3 );
		scaleUV( g, ( x1 - x0 ) / 12.8, ( h - 3 ) / 24 );
		B.add( g, MAT.farWin, M( ( x0 + x1 ) / 2, 3 + ( h - 3 ) / 2, 6.02 ), 0x777777 );

	}

	// ================= far side of the road (z > 25.6) =================
	const facade = ( x0, x1, h, col, opts = {} ) => {

		const z = 25.8;
		bx( MAT.far, col, x0, x1, 0, h, z, z + 9 );
		bx( MAT.far, 0x2a2c30, x0 - 0.05, x1 + 0.05, h, h + 0.25, z - 0.1, z + 9 );
		if ( opts.windows !== false && h > 4 ) {

			const g = new THREE.PlaneGeometry( x1 - x0 - 0.4, h - 3.4 );
			scaleUV( g, ( x1 - x0 ) / 12.8, ( h - 3.4 ) / 24 );
			const off = R();
			const uv = g.attributes.uv; for ( let i = 0; i < uv.count; i ++ ) uv.setX( i, uv.getX( i ) + off );
			B.add( g, MAT.farWin, M( ( x0 + x1 ) / 2, 3.2 + ( h - 3.4 ) / 2, z - 0.02, 0, Math.PI, 0 ), new THREE.Color( col ).multiplyScalar( 1.2 ) );

		}

		ctx.rainBlockers.push( { minX: x0, maxX: x1, minZ: z, maxZ: z + 9, y: h } );
		return z;

	};

	const farZ = 25.8;
	const signFace = ( key, w, h, x, y, z, ry, bright = 1.6 ) => B.add( quadGeo( w, h, E[ key ] ), MAT.emitTex, M( x, y, z, 0, ry, 0 ), new THREE.Color( bright, bright, bright ) );
	// ramen shop (closed, lantern glowing)
	{

		const x0 = - 6.5, x1 = - 0.8;
		facade( x0, x1, 6.4, 0x5a4a3c );
		bx( MAT.far, 0x3a2a1e, x0 + 0.2, x1 - 0.2, 0, 2.5, farZ - 0.12, farZ );
		B.add( new THREE.PlaneGeometry( 2.6, 2.1 ), MAT.emit, M( - 3.65, 1.05, farZ - 0.13, 0, Math.PI, 0 ), new THREE.Color( 0.12, 0.08, 0.05 ) );
		for ( let i = 0; i < 5; i ++ ) bx( MAT.far, 0x2a1c12, - 4.95 + i * 0.65 - 0.02, - 4.95 + i * 0.65 + 0.02, 0, 2.1, farZ - 0.16, farZ - 0.13 );
		B.add( quadGeo( 2.2, 1.2, D.noren ), MAT.decal, M( - 3.65, 1.95, farZ - 0.3, 0.06, Math.PI, 0 ) );
		bx( MAT.far, 0x2a1c12, - 4.9, - 2.4, 2.55, 2.6, farZ - 0.35, farZ );
		box( MAT.far, 0x2a1c12, 4.6, 0.9, 0.15, - 3.65, 3.1, farZ - 0.1 );
		signFace( 'ramensign', 4.4, 0.8, - 3.65, 3.1, farZ - 0.18, Math.PI, 0.9 );
		// lanterns
		for ( const lx of [ - 5.3, - 2.0 ] ) {

			const g = new THREE.SphereGeometry( 0.22, 16, 10 );
			const uv = g.attributes.uv, r = E.lan_ramen;
			for ( let i = 0; i < uv.count; i ++ ) uv.setXY( i, r.u0 + ( ( uv.getX( i ) * 2 ) % 1 ) * ( r.u1 - r.u0 ), r.v0 + uv.getY( i ) * ( r.v1 - r.v0 ) );
			B.add( g, MAT.emitTex, M( lx, 2.0, farZ - 0.45, 0, Math.PI, 0, 1, 1.45, 1 ), new THREE.Color( 2.6, 2.6, 2.6 ) );
			cyl( MAT.far, 0x111111, 0.12, 0.12, 0.05, 10, lx, 2.34, farZ - 0.45 );
			cyl( MAT.far, 0x111111, 0.12, 0.12, 0.05, 10, lx, 1.67, farZ - 0.45 );
			bx( MAT.far, 0x222222, lx - 0.01, lx + 0.01, 2.36, 2.6, farZ - 0.46, farZ - 0.44 );

		}

		const ll = new THREE.PointLight( 0xff4a2a, 3.5, 7, 2 );
		ll.position.set( - 3.65, 2.0, farZ - 0.9 );
		root.add( ll );
		ctx.lights.lantern = ll;
		ctx.lightsInfo.push( { position: new THREE.Vector3( - 5.3, 2.0, farZ - 0.45 ), color: new THREE.Color( 0xff4a2a ), intensity: 0.55, radius: 2.4 } );
		ctx.lightsInfo.push( { position: new THREE.Vector3( - 2.0, 2.0, farZ - 0.45 ), color: new THREE.Color( 0xff4a2a ), intensity: 0.55, radius: 2.4 } );

	}

	// izakaya (open, warm shoji)
	{

		const x0 = 0.6, x1 = 7.4;
		facade( x0, x1, 7.2, 0x4a4038 );
		bx( MAT.far, 0x2a1e16, x0 + 0.2, x1 - 0.2, 0, 2.7, farZ - 0.1, farZ );
		B.add( new THREE.PlaneGeometry( 5.6, 2.0 ), MAT.emit, M( 4.0, 1.25, farZ - 0.11, 0, Math.PI, 0 ), new THREE.Color( 2.2, 1.45, 0.75 ) );
		for ( let i = 0; i <= 8; i ++ ) bx( MAT.far, 0x2a1a10, 1.2 + i * 0.7 - 0.02, 1.2 + i * 0.7 + 0.02, 0.25, 2.25, farZ - 0.14, farZ - 0.11 );
		for ( let j = 0; j <= 4; j ++ ) bx( MAT.far, 0x2a1a10, 1.2, 6.8, 0.25 + j * 0.5 - 0.015, 0.25 + j * 0.5 + 0.015, farZ - 0.14, farZ - 0.11 );
		box( MAT.far, 0x2a1c12, 5.6, 1.0, 0.15, 4.0, 3.3, farZ - 0.1 );
		signFace( 'izakaya', 5.4, 0.9, 4.0, 3.3, farZ - 0.18, Math.PI, 1.5 );
		for ( const lx of [ 1.0, 7.0 ] ) {

			const g = new THREE.SphereGeometry( 0.24, 16, 10 );
			const uv = g.attributes.uv, r = E.lan_sake;
			for ( let i = 0; i < uv.count; i ++ ) uv.setXY( i, r.u0 + ( ( uv.getX( i ) * 2 ) % 1 ) * ( r.u1 - r.u0 ), r.v0 + uv.getY( i ) * ( r.v1 - r.v0 ) );
			B.add( g, MAT.emitTex, M( lx, 2.3, farZ - 0.45, 0, Math.PI, 0, 1, 1.5, 1 ), new THREE.Color( 2.6, 2.6, 2.6 ) );
			bx( MAT.far, 0x222222, lx - 0.01, lx + 0.01, 2.6, 2.9, farZ - 0.46, farZ - 0.44 );

		}

		ctx.lightsInfo.push( { position: new THREE.Vector3( 4.0, 1.3, farZ - 0.4 ), color: new THREE.Color( 0xffb070 ), intensity: 0.5, radius: 3.5 } );
		ctx.lightsInfo.push( { position: new THREE.Vector3( 1.0, 2.3, farZ - 0.45 ), color: new THREE.Color( 0xff4a2a ), intensity: 0.45, radius: 2.2 } );

	}

	// cleaning shop (half shutter, lit sign)
	{

		const x0 = 7.8, x1 = 13.5;
		facade( x0, x1, 5.8, 0x6a6e72 );
		B.add( new THREE.PlaneGeometry( 4.8, 1.4 ), MAT.emit, M( 10.65, 1.9, farZ - 0.05, 0, Math.PI, 0 ), new THREE.Color( 1.1, 1.25, 1.4 ) );
		const sg = new THREE.PlaneGeometry( 4.8, 1.2 ); scaleUV( sg, 4.8, 1.2 );
		B.add( sg, MAT.shutter, M( 10.65, 0.6, farZ - 0.06, 0, Math.PI, 0 ) );
		box( MAT.far, 0x1f2c3c, 5.0, 0.8, 0.15, 10.65, 3.0, farZ - 0.1 );
		signFace( 'cleaning', 4.8, 0.7, 10.65, 3.0, farZ - 0.18, Math.PI, 1.4 );

	}

	// rest of the far row
	const palette = [ 0x5d6168, 0x6e6a62, 0x4f555c, 0x72675a, 0x5a5f55, 0x666a70 ];
	const rows = [ [ - 46, - 38, 10 ], [ - 37.6, - 30, 14 ], [ - 29.6, - 22, 8 ], [ - 21.6, - 14.5, 12 ], [ - 14, - 7, 9 ], [ 14, 19.5, 11 ], [ 20, 27, 16 ], [ 27.5, 34, 9 ], [ 34.5, 46, 13 ] ];
	rows.forEach( ( [ x0, x1, h ], i ) => {

		facade( x0, x1, h, palette[ i % palette.length ] );
		// ground-floor shopfront: dark or dim
		B.add( new THREE.PlaneGeometry( x1 - x0 - 1, 2.2 ), MAT.emit, M( ( x0 + x1 ) / 2, 1.3, farZ - 0.05, 0, Math.PI, 0 ), i % 3 === 0 ? new THREE.Color( 0.8, 0.85, 0.9 ) : new THREE.Color( 0.05, 0.06, 0.07 ) );

	} );
	// projecting vertical signs (double sided)
	for ( const [ key, x, y, w, h ] of [ [ 'karaoke', - 15, 6.5, 0.7, 2.8 ], [ 'shika', 19.8, 5.5, 0.7, 1.7 ], [ 'bar', - 22.2, 5.8, 0.7, 2.8 ], [ 'pachi', 27.2, 6.0, 0.7, 1.55 ] ] ) {

		box( MAT.far, 0x222222, 0.12, h + 0.1, w + 0.1, x, y, farZ - w / 2 - 0.1 );
		signFace( key, w, h, x - 0.065, y, farZ - w / 2 - 0.1, - Math.PI / 2, 1.8 );
		signFace( key, w, h, x + 0.065, y, farZ - w / 2 - 0.1, Math.PI / 2, 1.8 );

	}

	// background skyline (fog-faded)
	for ( let i = 0; i < 16; i ++ ) {

		const x = - 60 + i * 8 + R() * 3, w = 6 + R() * 6, h = 12 + R() * 22, z = 44 + R() * 18;
		bx( MAT.far, 0x2a2f38, x, x + w, 0, h, z, z + 8 );
		const g = new THREE.PlaneGeometry( w, h - 2 );
		scaleUV( g, w / 12.8, ( h - 2 ) / 24 );
		B.add( g, MAT.farWin, M( x + w / 2, 1 + h / 2, z - 0.02, 0, Math.PI, 0 ), 0x99a0aa );
		if ( R() < 0.5 ) cyl( MAT.emit, new THREE.Color( 3, 0.2, 0.15 ), 0.15, 0.15, 0.15, 6, x + w / 2, h + 0.4, z + 4 ); // aviation light

	}

	for ( let i = 0; i < 8; i ++ ) {

		const z = - 30 - R() * 10, x = - 50 + i * 13, w = 8, h = 8 + R() * 14;
		bx( MAT.far, 0x262a32, x, x + w, 0, h, z, z + 8 );

	}

	// ambient night fill (cold)
	const hemi = new THREE.HemisphereLight( 0x5a7fb0, 0x14161c, 0.55 );
	root.add( hemi );
	ctx.lights.ambient = hemi;

}
