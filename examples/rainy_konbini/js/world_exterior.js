// Store exterior: shell, facade, doors, eave & sign band, posters, vending machines, bins, umbrella stand,
// flags, parking, pylon sign, streetlight + exterior lights.  Street / neighbours live in world_street.js.
import * as THREE from 'three';
import { Batcher, M, quadGeo, rodGeo, tubeGeo } from './world_util.js';
import { addBike } from './world_bikes.js';
import { buildStreet } from './world_street.js';

export function buildExterior( ctx ) {

	const { B, M: MAT, T, root, Q } = ctx;
	const { box, bx, cyl, quad, collide } = ctx;
	const D = T.D, E = T.E;

	const WALL_EXT = 0xc4c6c4, METAL = 0x3b3f45, ALU = 0x8d9298;
	const warm = new THREE.Color( 0xffc58a );

	// ================= building shell =================
	// side & rear walls: exterior skin (wet) + interior skin
	bx( MAT.extMatte, WALL_EXT, - 8.0, - 7.9, 0, 4.6, - 12, 0 );
	bx( MAT.extMatte, WALL_EXT, 7.9, 8.0, 0, 4.6, - 12, 0 );
	bx( MAT.extMatte, WALL_EXT, - 8.0, 8.0, 0, 4.6, - 12.0, - 11.9 );
	// panel joints on side walls
	for ( let z = - 11; z < 0; z += 1.5 ) {

		bx( MAT.extMatte, 0x9a9d9e, - 8.02, - 8.0, 0.2, 4.4, z - 0.01, z + 0.01 );
		bx( MAT.extMatte, 0x9a9d9e, 8.0, 8.02, 0.2, 4.4, z - 0.01, z + 0.01 );

	}

	// base skirting (dark, wet)
	bx( MAT.concrete, 0x45484c, - 8.03, - 7.98, 0, 0.35, - 12, 0 );
	bx( MAT.concrete, 0x45484c, 7.98, 8.03, 0, 0.35, - 12, 0 );
	// wall above facade (behind eave) + parapet
	bx( MAT.extMatte, 0xe2e3e0, - 8.0, 8.0, 3.0, 4.6, - 0.2, 0 );
	// roof slab and parapet coping
	bx( MAT.extMatte, 0x6c6f72, - 7.9, 7.9, 4.3, 4.4, - 11.9, - 0.2 );
	bx( MAT.metal, 0x9aa0a6, - 8.05, 8.05, 4.6, 4.66, - 0.25, 0.05 );
	bx( MAT.metal, 0x9aa0a6, - 8.05, - 7.85, 4.6, 4.66, - 12.05, 0 );
	bx( MAT.metal, 0x9aa0a6, 7.85, 8.05, 4.6, 4.66, - 12.05, 0 );
	bx( MAT.metal, 0x9aa0a6, - 8.05, 8.05, 4.6, 4.66, - 12.05, - 11.85 );
	// roof equipment silhouettes: AC condensers, water tank, vent
	for ( const [ x, z ] of [ [ - 5, - 4 ], [ - 3.6, - 4 ], [ - 2.2, - 4 ], [ 3, - 7 ] ] ) {

		box( MAT.extMatte, 0xb8bab6, 1.1, 0.85, 0.75, x, 4.4 + 0.425, z );
		cyl( MAT.metal, 0x222428, 0.3, 0.3, 0.02, 20, x, 4.4 + 0.45, z + 0.38, Math.PI / 2 );
		box( MAT.metal, 0x55595e, 1.0, 0.06, 0.6, x, 4.43, z );

	}

	for ( const [ x, z ] of [ [ 5.4, - 9.6 ], [ 6.6, - 9.6 ], [ 5.4, - 10.8 ], [ 6.6, - 10.8 ] ] ) box( MAT.metal, 0x4a4e53, 0.08, 0.9, 0.08, x, 4.85, z );
	cyl( MAT.extMatte, 0xa9b0b4, 0.85, 0.85, 1.6, 20, 6.0, 5.3 + 0.8, - 10.2 );
	cyl( MAT.metal, 0x777c80, 0.88, 0.88, 0.06, 20, 6.0, 6.95, - 10.2 );
	cyl( MAT.metal, 0x55595e, 0.12, 0.12, 0.8, 8, - 6, 4.8, - 9 );
	cyl( MAT.metal, 0x55595e, 0.22, 0.22, 0.1, 8, - 6, 5.2, - 9 );
	// pipes running on roof
	B.add( rodGeo( new THREE.Vector3( - 5, 4.5, - 4.4 ), new THREE.Vector3( - 5, 4.5, - 11.5 ), 0.04, 6 ), MAT.metal, null, 0x777b80 );

	collide( - 8.1, - 7.85, - 12.1, 0.1, 4.6 );
	collide( 7.85, 8.1, - 12.1, 0.1, 4.6 );
	collide( - 8.1, 8.1, - 12.1, - 11.85, 4.6 );

	// ================= front facade (glass curtain wall) =================
	const mullX = [ - 7.85, - 6.15, - 4.45, - 2.75, - 1.05, 0.65, 2.35, 4.65, 6.25, 7.85 ];
	for ( const x of mullX ) bx( MAT.metal, METAL, x - 0.04, x + 0.04, 0, 3.0, - 0.13, 0.02 );
	// kick plates, transom, header
	bx( MAT.metal, METAL, - 7.9, 2.35, 0, 0.3, - 0.1, 0.0 );
	bx( MAT.metal, METAL, 4.65, 7.9, 0, 0.3, - 0.1, 0.0 );
	bx( MAT.metal, METAL, - 7.9, 7.9, 2.52, 2.6, - 0.12, 0.01 );
	bx( MAT.metal, METAL, - 7.9, 7.9, 2.93, 3.02, - 0.14, 0.02 );
	// glass panes (one quad per span, slightly inside)
	for ( let i = 0; i < mullX.length - 1; i ++ ) {

		const x0 = mullX[ i ] + 0.04, x1 = mullX[ i + 1 ] - 0.04;
		if ( x0 > 2.3 && x1 < 4.7 ) {

			B.add( new THREE.PlaneGeometry( x1 - x0, 0.33 ), MAT.glass, M( ( x0 + x1 ) / 2, 2.77, - 0.05 ) );
			continue;

		}

		B.add( new THREE.PlaneGeometry( x1 - x0, 2.22 ), MAT.glass, M( ( x0 + x1 ) / 2, 0.3 + 1.11, - 0.05 ) );
		B.add( new THREE.PlaneGeometry( x1 - x0, 0.33 ), MAT.glass, M( ( x0 + x1 ) / 2, 2.77, - 0.05 ) );

	}

	collide( - 8.1, 2.4, - 0.2, 0.08, 4.6 );
	collide( 4.6, 8.1, - 0.2, 0.08, 4.6 );

	// ---- window posters (backlit, on inner face of glass, facing out) ----
	const P = ( key, w, x, y ) => {

		const r = D[ key ];
		quad( MAT.decalLit, r, w, w / r.aspect, x, y, - 0.06 );

	};

	P( 'hours', 0.66, - 7.0, 2.25 );
	P( 'koukyou', 0.66, - 5.3, 2.25 );
	P( 'onigiri', 0.62, - 3.6, 1.62 );
	P( 'atm24', 0.5, - 3.6, 2.25 );
	P( 'coffee', 0.62, - 1.9, 1.62 );
	P( 'nikuman', 0.62, - 0.2, 1.62 );
	P( 'karaage', 0.6, 1.5, 1.5 );
	P( 'wifi', 0.34, 1.9, 2.22 );
	P( 'eigyo', 0.5, 1.2, 2.22 );
	P( 'atm24', 0.62, 5.45, 1.65 );
	P( 'camera', 0.4, 5.45, 1.1 );
	P( 'koukyou', 0.62, 7.05, 1.65 );
	P( 'eigyo', 0.55, 7.05, 2.25 );
	P( 'wifi', 0.3, 5.45, 2.28 );

	// ================= automatic sliding doors =================
	// header (operator box) + sensor
	bx( MAT.metal, METAL, 2.3, 4.7, 2.3, 2.52, - 0.12, 0.13 );
	box( MAT.extPlastic, 0x111111, 0.28, 0.06, 0.1, 3.5, 2.27, 0.1 );
	box( MAT.emit, new THREE.Color( 2.5, 0.1, 0.05 ), 0.02, 0.012, 0.012, 3.6, 2.24, 0.15 );
	box( MAT.extPlastic, 0x111111, 0.2, 0.05, 0.08, 3.5, 2.27, - 0.12 );
	quad( MAT.decalLit, D.irasshai, 1.6, 1.6 / D.irasshai.aspect, 3.5, 2.77, - 0.06 );
	// floor track
	bx( MAT.metal, ALU, 1.2, 5.8, 0.0, 0.015, 0.0, 0.12 );
	// fixed side jamb glass behind sliding leaves is the regular panes; build moving leaves
	const leaves = [];
	for ( const s of [ - 1, 1 ] ) {

		const g = new THREE.Group();
		const lb = new Batcher();
		const w = 1.14, h = 2.28;
		lb.add( new THREE.BoxGeometry( 0.05, h, 0.045 ), MAT.metal, M( - w / 2 + 0.025, h / 2, 0 ), ALU );
		lb.add( new THREE.BoxGeometry( 0.05, h, 0.045 ), MAT.metal, M( w / 2 - 0.025, h / 2, 0 ), ALU );
		lb.add( new THREE.BoxGeometry( w, 0.07, 0.045 ), MAT.metal, M( 0, h - 0.035, 0 ), ALU );
		lb.add( new THREE.BoxGeometry( w, 0.12, 0.045 ), MAT.metal, M( 0, 0.06, 0 ), ALU );
		lb.add( new THREE.PlaneGeometry( w - 0.1, h - 0.19 ), MAT.glass, M( 0, 0.12 + ( h - 0.19 ) / 2, 0 ) );
		for ( const side of [ 1, - 1 ] ) {

			const ry = side > 0 ? 0 : Math.PI;
			lb.add( quadGeo( 0.95, 0.95 / D.jidou.aspect, D.jidou ), MAT.decalLit, M( 0, 1.05, side * 0.026, 0, ry, 0 ) );

		}

		lb.add( quadGeo( 0.36, 0.36, D.wifi ), MAT.decalLit, M( 0, 1.55, 0.026 ) );
		lb.build( g, 'doorLeaf' );
		g.position.set( 3.5 + s * 0.565, 0.015, 0.07 + ( s > 0 ? 0.05 : 0 ) );
		root.add( g );
		leaves.push( { g, s } );

	}

	ctx.door = { minX: 2.4, maxX: 4.6, minZ: - 0.15, maxZ: 0.15, open: 0 };
	let doorTarget = 0, doorV = 0;
	ctx.updaters.push( ( dt, t, p ) => {

		if ( p ) {

			const dx = p.x - 3.5, dz = p.z - 0;
			doorTarget = Math.hypot( dx, dz ) < 2.2 ? 1 : 0;

		}

		const speed = doorTarget > doorV ? 1.7 : 1.1;
		doorV += Math.sign( doorTarget - doorV ) * Math.min( Math.abs( doorTarget - doorV ), dt * speed );
		const e = doorV * doorV * ( 3 - 2 * doorV );
		ctx.door.open = e;
		for ( const l of leaves ) l.g.position.x = 3.5 + l.s * ( 0.565 + e * 1.08 );

	} );

	// entrance mats (outside + inside)
	bx( MAT.rubber, 0x2a2c30, 2.5, 4.5, 0, 0.018, 0.2, 1.15 );
	bx( MAT.intMatte, 0x3a3f4a, 2.5, 4.5, 0, 0.012, - 1.6, - 0.2 );
	quad( MAT.decal, D.irasshai, 1.5, 0.2, 3.5, 0.02, 0.68, 0, 0x888888, - Math.PI / 2 );

	// ================= eave / sign band =================
	bx( MAT.extPaint, 0xe9ebe8, - 8.2, 8.2, 3.0, 4.3, 0.0, 1.2 );
	B.add( new THREE.PlaneGeometry( 16.4, 1.3 ), MAT.signBand, M( 0, 3.65, 1.202 ) );
	B.add( new THREE.PlaneGeometry( 6.6, 1.24 ), MAT.signLogo, M( - 2.2, 3.62, 1.21 ) );
	B.add( new THREE.PlaneGeometry( 3.3, 1.24 ), MAT.sign24, M( 5.4, 3.62, 1.21 ) );
	// side faces of sign box
	for ( const s of [ - 1, 1 ] ) B.add( new THREE.PlaneGeometry( 1.2, 1.3 ), MAT.signBand, M( s * 8.202, 3.65, 0.6, 0, s * Math.PI / 2, 0 ) );
	// edge trims
	bx( MAT.metal, 0x9aa0a6, - 8.22, 8.22, 4.28, 4.34, 0.0, 1.24 );
	bx( MAT.metal, 0x9aa0a6, - 8.22, 8.22, 2.96, 3.0, 1.16, 1.24 );
	// underside soffit + downlights
	bx( MAT.extMatte, 0xd8d8d2, - 8.18, 8.18, 2.985, 3.0, 0.0, 1.18 );
	for ( let x = - 7; x <= 7.01; x += 1.75 ) cyl( MAT.emit, new THREE.Color( 4, 3.1, 2.1 ), 0.09, 0.09, 0.01, 14, x, 2.98, 0.6 );
	// security camera under eave
	box( MAT.extPlastic, 0xe8e8e8, 0.12, 0.1, 0.22, 7.2, 2.88, 0.4, 0.5 );
	box( MAT.extPlastic, 0x111111, 0.07, 0.07, 0.02, 7.15, 2.86, 0.52, 0.5 );
	box( MAT.metal, 0x777777, 0.03, 0.12, 0.03, 7.2, 2.95, 0.36 );
	ctx.rainBlockers.push( { minX: - 8.2, maxX: 8.2, minZ: 0, maxZ: 1.2, y: 3.0 } );
	ctx.rainBlockers.push( { minX: - 8.05, maxX: 8.05, minZ: - 12.05, maxZ: 0, y: 3.0 } );
	// gutter downpipes at corners
	for ( const x of [ - 8.12, 8.12 ] ) {

		B.add( rodGeo( new THREE.Vector3( x, 0.05, 1.1 ), new THREE.Vector3( x, 3.0, 1.1 ), 0.045, 8 ), MAT.extPaint, null, 0x8a8e92 );
		bx( MAT.metal, 0x55595e, x - 0.12, x + 0.12, 0, 0.04, 0.95, 1.25 );

	}

	// ================= vending machines =================
	const vendCols = [ 0xe7e9ee, 0xc8202a ];
	const vendX = [ - 6.9, - 5.62 ];
	const sampleCan = new THREE.CylinderGeometry( 0.032, 0.032, 0.12, 12 );
	const pr = T.P;
	const canUV = sampleCan.clone();
	{

		const uv = canUV.attributes.uv; for ( let i = 0; i < uv.count; i ++ ) uv.setXY( i, pr.can.u0 + uv.getX( i ) * ( pr.can.u1 - pr.can.u0 ), pr.can.v0 + uv.getY( i ) * ( pr.can.v1 - pr.can.v0 ) );

	}

	const btlPts = [ [ 0, 0 ], [ 0.03, 0 ], [ 0.033, 0.01 ], [ 0.033, 0.12 ], [ 0.026, 0.15 ], [ 0.013, 0.175 ], [ 0.013, 0.19 ], [ 0, 0.19 ] ].map( p => new THREE.Vector2( p[ 0 ], p[ 1 ] ) );
	const bottleG = new THREE.LatheGeometry( btlPts, 12 );
	{

		const uv = bottleG.attributes.uv; for ( let i = 0; i < uv.count; i ++ ) uv.setXY( i, pr.bottle.u0 + uv.getX( i ) * ( pr.bottle.u1 - pr.bottle.u0 ), pr.bottle.v0 + uv.getY( i ) * ( pr.bottle.v1 - pr.bottle.v0 ) );

	}

	const sampleMats = [], sampleCols = [];
	const palette = [ 0x2e7d32, 0xc62828, 0x1565c0, 0xf9a825, 0x6d4c41, 0xffffff, 0x00838f, 0xef6c00, 0x8e24aa, 0x9e9d24 ];
	let ci = 0;
	vendX.forEach( ( x0, k ) => {

		const zF = 0.8;
		box( MAT.extPaint, vendCols[ k ], 1.0, 1.83, 0.72, x0, 0.915 + 0.05, 0.44 );
		bx( MAT.metal, 0x222428, x0 - 0.5, x0 + 0.5, 0, 0.05, 0.1, 0.78 );
		// front face texture (half of atlas)
		const g = new THREE.PlaneGeometry( 1.0, 1.83 );
		const uv = g.attributes.uv; for ( let i = 0; i < uv.count; i ++ ) uv.setX( i, k * 0.5 + uv.getX( i ) * 0.5 );
		B.add( g, MAT.vend, M( x0, 0.05 + 0.915, zF + 0.002 ) );
		// display window frame + glass
		const px2x = px => x0 - 0.5 + px / 512, py2y = py => 0.05 + ( 1 - py / 1024 ) * 1.83;
		const wx0 = px2x( 24 ), wx1 = px2x( 404 ), wy0 = py2y( 550 ), wy1 = py2y( 80 );
		bx( MAT.extPaint, vendCols[ k ], wx0 - 0.02, wx1 + 0.02, wy1, wy1 + 0.03, zF, zF + 0.1 );
		bx( MAT.extPaint, vendCols[ k ], wx0 - 0.02, wx0, wy0, wy1, zF, zF + 0.1 );
		bx( MAT.extPaint, vendCols[ k ], wx1, wx1 + 0.02, wy0, wy1, zF, zF + 0.1 );
		B.add( new THREE.PlaneGeometry( wx1 - wx0, wy1 - wy0 ), MAT.glass, M( ( wx0 + wx1 ) / 2, ( wy0 + wy1 ) / 2, zF + 0.1 ) );
		for ( let row = 0; row < 3; row ++ ) {

			const stripTop = 80 + ( row + 1 ) * 156 - 34;
			const yb = py2y( stripTop );
			bx( MAT.extPlastic, 0xdfe3ea, wx0, wx1, yb - 0.005, yb, zF, zF + 0.08 ); // shelf
			for ( let i = 0; i < 6; i ++ ) {

				const sx = px2x( 24 + ( i + 0.5 ) * 63.3 );
				const isCan = ( i + row + k ) % 3 !== 0;
				sampleMats.push( { isCan, m: M( sx, yb, zF + 0.05 ) } );
				sampleCols.push( new THREE.Color( palette[ ( ci ++ ) % palette.length ] ) );
				// selection button below sample (on the strip)
				box( MAT.extPlastic, 0xf2f2f2, 0.036, 0.014, 0.012, sx + 0.035, py2y( stripTop + 25 ), zF + 0.008 );

			}

		}

		// coin unit protrusions, retrieval flap, side detail
		box( MAT.metal, 0x8a8f96, 0.07, 0.11, 0.025, px2x( 456 ), py2y( 193 ), zF + 0.012 );
		box( MAT.metal, 0x8a8f96, 0.08, 0.04, 0.03, px2x( 456 ), py2y( 275 ), zF + 0.015 );
		box( MAT.extPlastic, 0x15171a, 0.29, 0.11, 0.03, px2x( 210 ), py2y( 910 ), zF + 0.01 );
		B.add( new THREE.PlaneGeometry( 0.28, 0.1 ), MAT.extPlastic, M( px2x( 210 ), py2y( 905 ), zF + 0.03, - 0.25, 0, 0 ), 0x3a3e46 );
		B.add( new THREE.PlaneGeometry( 0.72, 1.7 ), MAT.extPaint, M( x0 - 0.501, 0.97, 0.44, 0, - Math.PI / 2, 0 ), vendCols[ k ] );

	} );
	const nCan = sampleMats.filter( s => s.isCan ).length;
	const canIM = new THREE.InstancedMesh( canUV, MAT.prodLit, nCan );
	const btlIM = new THREE.InstancedMesh( bottleG, MAT.prodLit, sampleMats.length - nCan );
	let ic = 0, ib = 0;
	const tmp = new THREE.Matrix4();
	sampleMats.forEach( ( s, i ) => {

		if ( s.isCan ) {

			tmp.copy( s.m ).multiply( M( 0, 0.06, 0 ) );
			canIM.setMatrixAt( ic, tmp ); canIM.setColorAt( ic ++, sampleCols[ i ] );

		} else {

			btlIM.setMatrixAt( ib, s.m ); btlIM.setColorAt( ib ++, sampleCols[ i ] );

		}

	} );
	root.add( canIM, btlIM );
	// recycling bin
	box( MAT.extPlastic, 0x1e7a4a, 0.46, 0.8, 0.42, - 4.75, 0.4, 0.4 );
	box( MAT.extPlastic, 0xeeeeee, 0.48, 0.04, 0.44, - 4.75, 0.82, 0.4 );
	cyl( MAT.extPlastic, 0x111111, 0.07, 0.07, 0.01, 14, - 4.86, 0.845, 0.4 );
	cyl( MAT.extPlastic, 0x111111, 0.07, 0.07, 0.01, 14, - 4.64, 0.845, 0.4 );
	quad( MAT.decal, D.recycle, 0.42, 0.19, - 4.75, 0.55, 0.615 );
	collide( - 7.45, - 4.5, 0.05, 0.85, 1.9 );
	// vending light
	const vl = new THREE.PointLight( 0xe8f1ff, 5, 7, 2 );
	vl.position.set( - 6.25, 1.35, 1.5 );
	root.add( vl );
	ctx.lights.vending = vl;
	ctx.lightsInfo.push( { position: new THREE.Vector3( - 6.25, 1.3, 1.1 ), color: new THREE.Color( 0xe8f1ff ), intensity: 0.75, radius: 3.5 } );

	// ================= trash station (3 bins in cabinet) =================
	bx( MAT.extPaint, 0x3d4652, 4.85, 6.4, 0, 1.0, 0.08, 0.62 );
	bx( MAT.metal, 0x9aa0a6, 4.83, 6.42, 1.0, 1.03, 0.06, 0.65 );
	[ 'bin_moeru', 'bin_kan', 'bin_pet' ].forEach( ( key, i ) => {

		const x = 5.12 + i * 0.505;
		box( MAT.extPlastic, 0x0b0c0e, 0.3, 0.16, 0.02, x, 0.78, 0.625 );
		if ( key === 'bin_kan' || key === 'bin_pet' ) cyl( MAT.extPlastic, 0x0b0c0e, 0.06, 0.06, 0.02, 14, x, 0.78, 0.63, Math.PI / 2 );
		quad( MAT.decal, D[ key ], 0.4, 0.2, x, 0.5, 0.632 );
		box( MAT.metal, 0x9aa0a6, 0.12, 0.02, 0.03, x, 0.25, 0.64 );

	} );
	quad( MAT.decal, D.camera, 0.3, 0.12, 5.62, 0.93, 0.632 );
	collide( 4.8, 6.45, 0.05, 0.66, 1.05 );

	// ================= ice freezer =================
	bx( MAT.extPlastic, 0xf2f4f6, 6.55, 7.7, 0, 0.82, 0.1, 0.8 );
	bx( MAT.metal, 0xb0b5ba, 6.53, 7.72, 0.82, 0.86, 0.08, 0.82 );
	B.add( new THREE.PlaneGeometry( 1.05, 0.6 ), MAT.emit, M( 7.125, 0.79, 0.45, - Math.PI / 2, 0, 0 ), new THREE.Color( 1.2, 1.5, 1.9 ) );
	for ( let i = 0; i < 10; i ++ ) box( MAT.extPlastic, [ 0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0x8e24aa ][ i % 5 ], 0.14, 0.05, 0.1, 6.7 + ( i % 5 ) * 0.2, 0.81, 0.3 + Math.floor( i / 5 ) * 0.28 );
	B.add( new THREE.PlaneGeometry( 1.1, 0.68 ), MAT.glass, M( 7.125, 0.865, 0.45, - Math.PI / 2, 0, 0 ) );
	quad( MAT.decal, D.ice, 0.6, 0.21, 7.12, 0.55, 0.805 );
	collide( 6.5, 7.75, 0.05, 0.85, 0.9 );

	// ================= umbrella stand (傘立て) =================
	{

		const ux = 1.75, uz = 0.62;
		bx( MAT.metal, 0x8d9298, ux - 0.42, ux + 0.42, 0, 0.03, uz - 0.16, uz + 0.16 );
		for ( const sx of [ - 1, 1 ] ) for ( const sz of [ - 1, 1 ] ) box( MAT.chrome, 0xc0c4c8, 0.025, 0.62, 0.025, ux + sx * 0.4, 0.31, uz + sz * 0.14 );
		for ( const y of [ 0.6, 0.25 ] ) {

			box( MAT.chrome, 0xc0c4c8, 0.82, 0.02, 0.02, ux, y, uz - 0.14 );
			box( MAT.chrome, 0xc0c4c8, 0.82, 0.02, 0.02, ux, y, uz + 0.14 );

		}

		for ( let i = 0; i < 5; i ++ ) B.add( new THREE.TorusGeometry( 0.06, 0.007, 4, 14 ), MAT.chrome, M( ux - 0.32 + i * 0.16, 0.6, uz, Math.PI / 2 ), 0xc0c4c8 );
		quad( MAT.decal, D.kasa, 0.5, 0.14, ux, 0.45, uz + 0.155 );
		const vinyl = new THREE.MeshStandardMaterial( { name: 'vinyl', color: 0xf4f8ff, roughness: 0.08, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide } );
		const umb = ( i, col, mat, tilt ) => {

			const x = ux - 0.32 + i * 0.16;
			const m = M( x, 0, uz, tilt, 0, tilt * 0.6 );
			const add = ( g, mm, c ) => {

				g.applyMatrix4( m ); B.add( g, mm, null, c );

			};

			add( new THREE.ConeGeometry( 0.055, 0.6, 10, 1, true ).rotateX( Math.PI ).translate( 0, 0.36, 0 ), mat, col );
			add( new THREE.CylinderGeometry( 0.006, 0.006, 0.9, 5 ).translate( 0, 0.45, 0 ), MAT.chrome, 0xbbbbbb );
			add( new THREE.CylinderGeometry( 0.012, 0.012, 0.12, 6 ).translate( 0, 0.94, 0 ), MAT.extPlastic, 0x2a1d14 );
			add( new THREE.TorusGeometry( 0.045, 0.012, 5, 10, Math.PI ).rotateZ( Math.PI ).translate( 0.045, 1.0, 0 ), MAT.extPlastic, 0x2a1d14 );
			add( new THREE.TorusGeometry( 0.02, 0.004, 4, 8 ).rotateX( Math.PI / 2 ).translate( 0, 0.68, 0 ), MAT.extPlastic, col );

		};

		umb( 0, 0xffffff, vinyl, 0.06 );
		umb( 2, 0x1d2a4a, MAT.extPlastic, - 0.04 );
		umb( 3, 0x2f4a32, MAT.extPlastic, 0.08 );
		ctx.interactables.push( { id: 'umbrella_stand', label: '傘立て', position: new THREE.Vector3( ux, 0.6, uz + 0.35 ), radius: 1.1 } );
		ctx.addHighlight( 'umbrella_stand', 1.0, 1.15, 0.5, ux, 0.58, uz );
		collide( ux - 0.45, ux + 0.45, uz - 0.2, uz + 0.2, 1.0 );

	}

	// ================= のぼり flags =================
	{

		const fx = [ 5.05, 6.25, 7.45 ], fz = 1.62;
		const W = 0.56, H = 1.75, segX = 6, segY = 14;
		const geos = [];
		fx.forEach( ( x, i ) => {

			const g = new THREE.PlaneGeometry( W, H, segX, segY );
			g.translate( x + 0.05 + W / 2, 0.75 + H / 2, fz );
			const uv = g.attributes.uv;
			for ( let k = 0; k < uv.count; k ++ ) uv.setX( k, ( i * 170 + 4 + uv.getX( k ) * 162 ) / 512 );
			geos.push( g );
			// pole + arm + base
			cyl( MAT.extPlastic, 0xf2f2f2, 0.016, 0.016, 2.75, 6, x, 1.375, fz );
			B.add( rodGeo( new THREE.Vector3( x, 2.52, fz ), new THREE.Vector3( x + W + 0.08, 2.52, fz ), 0.01, 5 ), MAT.extPlastic, null, 0xf2f2f2 );
			cyl( MAT.extPlastic, 0x1a1a1a, 0.16, 0.2, 0.22, 14, x, 0.11, fz );
			cyl( MAT.extPlastic, 0xe0e0e0, 0.05, 0.08, 0.06, 10, x, 0.25, fz );
			collide( x - 0.2, x + 0.2, fz - 0.2, fz + 0.2, 2.75 );

		} );
		// one draw call: merge manually (indexed planes share topology)
		const pos = [], uvs = [], idx = [], u01 = [], fid = [];
		let base = 0;
		geos.forEach( ( g, i ) => {

			const p = g.attributes.position, uv = g.attributes.uv;
			for ( let k = 0; k < p.count; k ++ ) {

				pos.push( p.getX( k ), p.getY( k ), p.getZ( k ) ); uvs.push( uv.getX( k ), uv.getY( k ) );
				u01.push( ( p.getX( k ) - ( fx[ i ] + 0.05 ) ) / W ); fid.push( i );

			}

			for ( let k = 0; k < g.index.count; k ++ ) idx.push( g.index.getX( k ) + base );
			base += p.count;

		} );
		const fg = new THREE.BufferGeometry();
		fg.setAttribute( 'position', new THREE.Float32BufferAttribute( pos, 3 ) );
		fg.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );
		fg.setIndex( idx );
		fg.computeVertexNormals();
		const flags = new THREE.Mesh( fg, MAT.flags );
		flags.castShadow = true; flags.receiveShadow = true; flags.frustumCulled = false;
		root.add( flags );
		const basePos = Float32Array.from( pos );
		let acc = 0;
		ctx.updaters.push( ( dt, t ) => {

			acc += dt;
			if ( acc < 1 / 40 ) return;
			acc = 0;
			const p = fg.attributes.position;
			for ( let k = 0; k < p.count; k ++ ) {

				const u = u01[ k ], ph = fid[ k ] * 1.7;
				const y = basePos[ k * 3 + 1 ];
				const gust = 0.6 + 0.4 * Math.sin( t * 0.7 + ph );
				const w = Math.sin( t * 3.1 + u * 4.0 - y * 1.3 + ph ) * 0.07 + Math.sin( t * 5.3 + u * 7 + y * 2 + ph ) * 0.025;
				p.setXYZ( k, basePos[ k * 3 ] - u * u * 0.03 * gust, y, basePos[ k * 3 + 2 ] + w * u * gust );

			}

			p.needsUpdate = true;
			fg.computeVertexNormals();

		} );

	}

	// ================= bollards & parking =================
	for ( const x of [ 1.95, 5.05 ] ) {

		for ( let i = 0; i < 4; i ++ ) cyl( MAT.extPaint, i % 2 ? 0x111111 : 0xf2c014, 0.06, 0.06, 0.2, 12, x, 0.1 + i * 0.2, 3.2 );
		cyl( MAT.extPaint, 0xf2c014, 0.065, 0.065, 0.03, 12, x, 0.815, 3.2 );
		collide( x - 0.1, x + 0.1, 3.1, 3.3, 0.85 );

	}

	const lineX = [ - 8.3, - 5.8, - 3.3, - 0.8, 1.7 ];
	for ( const x of lineX ) {

		bx( MAT.paint, 0xd8d8d0, x - 0.06, x + 0.06, 0.004, 0.006, 3.9, 8.4 );

	}

	bx( MAT.paint, 0xd8d8d0, - 8.36, 1.76, 0.004, 0.006, 3.84, 3.96 );
	for ( let i = 0; i < 4; i ++ ) {

		const cx = ( lineX[ i ] + lineX[ i + 1 ] ) / 2;
		for ( const s of [ - 1, 1 ] ) {

			box( MAT.concrete, 0xa8a8a2, 0.55, 0.11, 0.14, cx + s * 0.62, 0.055, 4.4 );
			box( MAT.paint, 0xf2c014, 0.1, 0.112, 0.142, cx + s * 0.62 - 0.15, 0.056, 4.4 );
			box( MAT.paint, 0xf2c014, 0.1, 0.112, 0.142, cx + s * 0.62 + 0.15, 0.056, 4.4 );

		}

	}

	// 駐車場 sign
	{

		const sx = - 8.75, sz = 8.4;
		cyl( MAT.extPaint, 0x9aa0a6, 0.035, 0.035, 2.4, 8, sx, 1.2, sz );
		box( MAT.extPaint, 0xeeeeee, 0.6, 0.8, 0.03, sx, 2.0, sz );
		quad( MAT.decal, D.parking, 0.56, 0.76, sx, 2.0, sz + 0.016 );
		quad( MAT.decal, D.parking, 0.56, 0.76, sx, 2.0, sz - 0.016, Math.PI );
		collide( sx - 0.1, sx + 0.1, sz - 0.1, sz + 0.1, 2.4 );

	}

	// 喫煙所 (ashtray stand) at right corner
	{

		const ax = 8.75, az = 0.9;
		cyl( MAT.metal, 0x55595e, 0.16, 0.16, 0.8, 16, ax, 0.4, az );
		cyl( MAT.metal, 0x2a2c30, 0.2, 0.2, 0.04, 16, ax, 0.82, az );
		cyl( MAT.metal, 0x222222, 0.14, 0.14, 0.01, 16, ax, 0.845, az );
		box( MAT.extPaint, 0x3a3a3a, 0.03, 0.42, 0.6, 8.03, 1.8, 0.9 );
		quad( MAT.decal, D.kitsuen, 0.56, 0.28, 8.05, 1.8, 0.9, Math.PI / 2 );
		collide( ax - 0.22, ax + 0.22, az - 0.22, az + 0.22, 0.9 );

	}

	// ================= pylon sign =================
	{

		const px = 9.5, pz = 8.0, ry = - 0.55;
		const pm = M( px, 0, pz, 0, ry, 0 );
		const add = ( g, mat, col, m ) => {

			if ( m ) g.applyMatrix4( m ); g.applyMatrix4( pm ); B.add( g, mat, null, col );

		};

		add( new THREE.BoxGeometry( 1.4, 0.3, 0.9 ), MAT.concrete, 0x77797c, M( 0, 0.15, 0 ) );
		add( new THREE.BoxGeometry( 0.32, 3.4, 0.32 ), MAT.extPaint, 0x6a7078, M( 0, 1.85, 0 ) );
		add( new THREE.BoxGeometry( 2.1, 3.1, 0.42 ), MAT.extPaint, 0x2b3038, M( 0, 3.55 + 1.55, 0 ) );
		add( new THREE.PlaneGeometry( 1.96, 2.94 ), MAT.pylon, null, M( 0, 5.1, 0.212 ) );
		add( new THREE.PlaneGeometry( 1.96, 2.94 ), MAT.pylon, null, M( 0, 5.1, - 0.212, 0, Math.PI, 0 ) );
		add( new THREE.BoxGeometry( 2.2, 0.08, 0.5 ), MAT.metal, 0x9aa0a6, M( 0, 6.68, 0 ) );
		ctx.collide( px - 0.35, px + 0.35, pz - 0.35, pz + 0.35, 6.7 );
		ctx.lightsInfo.push( { position: new THREE.Vector3( px, 5.1, pz ), color: new THREE.Color( 0xdde8ff ), intensity: 0.6, radius: 3.8 } );

	}

	// ================= bicycles =================
	{

		const paints = [ 0x9fd8c8, 0xf3e3c3, 0xf0b9c4, 0xa9c8ea ];
		const bikes = [ [ - 4.05, 1.9, 0.05 ], [ - 2.75, 1.95, - 0.08 ], [ - 1.45, 1.85, 0.12 ] ];
		bikes.forEach( ( [ x, z, yaw ], i ) => {

			// front wheel toward the store (-Z): local +X → world -Z  => ry = +PI/2
			addBike( B, MAT, M( x, 0, z, 0, Math.PI / 2 + yaw, 0 ), new THREE.Color( paints[ i ] ), Q, i );
			collide( x - 0.32, x + 0.32, z - 0.95, z + 0.95, 1.15 );

		} );
		// one by the right side wall, parallel to wall
		addBike( B, MAT, M( 8.42, 0, - 2.6, 0, 0.03, 0 ), new THREE.Color( paints[ 3 ] ), Q, 3 );
		collide( 8.1, 8.75, - 3.6, - 1.6, 1.15 );

	}

	// ================= exterior lights =================
	// entrance warm downlight under eave (shadow caster #2)
	const shadowSize = Q >= 2 ? 2048 : Q >= 1 ? 1024 : 512;
	const ent = new THREE.SpotLight( 0xffc890, 28, 11, 1.05, 0.85, 2 );
	ent.position.set( 3.5, 2.95, 0.85 );
	ent.target.position.set( 3.5, 0, 2.7 );
	ent.castShadow = Q >= 1;
	ent.shadow.mapSize.set( shadowSize / 2, shadowSize / 2 );
	ent.shadow.camera.near = 0.3; ent.shadow.camera.far = 11;
	ent.shadow.bias = - 0.0004; ent.shadow.normalBias = 0.02;
	root.add( ent, ent.target );
	ctx.lights.entrance = ent;
	ctx.lightsInfo.push( { position: ent.position.clone(), color: new THREE.Color( 0xffc890 ), intensity: 0.65, radius: 4.5, cone: { target: ent.target.position.clone(), angle: 1.05 } } );
	ctx.lightsInfo.push( { position: new THREE.Vector3( - 2, 1.6, 0.4 ), color: warm.clone(), intensity: 0.9, radius: 7 } );
	ctx.lightsInfo.push( { position: new THREE.Vector3( 0, 3.65, 1.5 ), color: new THREE.Color( 0xf4f6ff ), intensity: 0.6, radius: 5 } );

	buildStreet( ctx, shadowSize );

}
