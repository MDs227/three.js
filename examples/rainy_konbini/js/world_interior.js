// Store interior: floor/ceiling/lights, magazine rack, gondolas (instanced products), drinks fridge,
// multideck chiller, counter (POS, hot snacks, oden, coffee), clerk, cigarette shelf, ATM, copier, doors, signs.
import * as THREE from 'three';
import { M, quadGeo, remapUV, rodGeo, scaleUV, rng } from './world_util.js';

const V = ( x, y, z ) => new THREE.Vector3( x, y, z );

export function buildInterior( ctx ) {

	const { B, M: MAT, T, root, Q } = ctx;
	const { box, bx, cyl, quad, collide } = ctx;
	const D = T.D, E = T.E, PR = T.P;
	const R = rng( 99 );
	const WHITE = 0xf3f3ef, GREY = 0x9aa0a6, DARK = 0x2b2f35;
	const BLUE = 0x1b4fa0, GREEN = 0x2fb37a, ORANGE = 0xf39a2b;
	const glow = ( r, g, b ) => new THREE.Color( r, g, b );

	// ---------- instanced product buckets ----------
	const buckets = {};
	const mkGeo = ( g, cell ) => remapUV( g, PR[ cell ] );
	const bottleG = () => {

		const pts = [ [ 0, 0 ], [ 0.03, 0 ], [ 0.033, 0.01 ], [ 0.033, 0.12 ], [ 0.026, 0.15 ], [ 0.013, 0.175 ], [ 0.013, 0.195 ], [ 0, 0.195 ] ].map( p => new THREE.Vector2( p[ 0 ], p[ 1 ] ) );
		return new THREE.LatheGeometry( pts, 10 );

	};

	const bagG = () => {

		const g = new THREE.BoxGeometry( 1, 1, 1, 1, 4, 2 );
		const p = g.attributes.position;
		for ( let i = 0; i < p.count; i ++ ) {

			const y = p.getY( i ), z = p.getZ( i );
			p.setZ( i, z * ( 1 - 4 * y * y * 0.0 ) * ( 0.35 + 0.65 * Math.cos( y * Math.PI ) ) );

		}

		g.computeVertexNormals();
		return g;

	};

	const prismG = () => new THREE.CylinderGeometry( 1, 1, 1, 3 ).rotateZ( Math.PI / 2 ).rotateX( Math.PI / 2 ); // triangle faces ±X, apex up
	const defs = {
		box: [ mkGeo( new THREE.BoxGeometry( 1, 1, 1 ), 'box' ), MAT.prod ],
		bag: [ mkGeo( bagG(), 'bag' ), MAT.prod ],
		cup: [ mkGeo( new THREE.CylinderGeometry( 0.55, 0.42, 1, 14 ), 'cup' ), MAT.prod ],
		bottle: [ mkGeo( bottleG(), 'bottle' ), MAT.prod ],
		can: [ mkGeo( new THREE.CylinderGeometry( 0.033, 0.033, 0.12, 10 ).translate( 0, 0.06, 0 ), 'can' ), MAT.prod ],
		onigiri: [ mkGeo( prismG(), 'onigiri' ), MAT.prod ],
		sand: [ mkGeo( prismG(), 'sand' ), MAT.prod ],
		bento: [ mkGeo( new THREE.BoxGeometry( 1, 1, 1 ), 'bento' ), MAT.prod ],
		pudding: [ mkGeo( new THREE.CylinderGeometry( 0.042, 0.034, 0.06, 12 ).translate( 0, 0.03, 0 ), 'pudding' ), MAT.prod ],
	};
	const put = ( type, m, color = 0xffffff ) => {

		( buckets[ type ] ??= [] ).push( [ m, color instanceof THREE.Color ? color : new THREE.Color( color ) ] );

	};

	const HUES = [ 0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0x8e24aa, 0xfb8c00, 0x00acc1, 0xf06292, 0x6d4c41, 0xffffff, 0x3949ab, 0xc0ca33 ];
	const hue = () => HUES[ Math.floor( R() * HUES.length ) ];

	// ================= floor, ceiling, walls =================
	{

		const g = new THREE.PlaneGeometry( 15.8, 11.85 );
		scaleUV( g, 15.8 / 1.6, 11.85 / 1.6 );
		B.add( g, MAT.floor, M( 0, 0.003, - 5.975, - Math.PI / 2 ) );

	}

	B.add( new THREE.PlaneGeometry( 15.8, 11.85 ), MAT.intMatte, M( 0, 3.0, - 5.975, Math.PI / 2 ), 0xe9e9e4 );
	bx( MAT.intMatte, WHITE, - 7.9, - 7.8, 0, 3.0, - 11.9, - 0.05 );
	bx( MAT.intMatte, WHITE, 7.8, 7.9, 0, 3.0, - 11.9, - 0.05 );
	bx( MAT.intMatte, WHITE, - 7.9, 7.9, 0, 3.0, - 11.9, - 11.8 );
	// baseboards
	bx( MAT.intGloss, DARK, - 7.8, - 7.78, 0, 0.1, - 11.8, - 0.1 );
	bx( MAT.intGloss, DARK, 7.78, 7.8, 0, 0.1, - 11.8, - 0.1 );
	// ceiling light strips (recessed linear panels)
	for ( const x of [ - 6.3, - 3.85, - 0.95, 2.6 ] ) for ( const z of [ - 1.6, - 4.4, - 7.2, - 10.0 ] ) {

		bx( MAT.intMatte, 0xcfcfca, x - 0.14, x + 0.14, 2.985, 2.99, z - 1.25, z + 1.25 );
		B.add( new THREE.PlaneGeometry( 0.2, 2.4 ), MAT.emit, M( x, 2.982, z, Math.PI / 2 ), glow( 2.5, 2.4, 2.2 ) );

	}

	for ( const z of [ - 5.3, - 8.2 ] ) B.add( new THREE.PlaneGeometry( 1.6, 0.2 ), MAT.emit, M( 6.4, 2.982, z, Math.PI / 2 ), glow( 2.5, 2.4, 2.2 ) );
	// smoke detectors / vents
	for ( const [ x, z ] of [ [ - 5, - 3 ], [ 1.5, - 6 ], [ 5, - 10 ] ] ) cyl( MAT.intMatte, 0xf8f8f8, 0.07, 0.07, 0.03, 12, x, 2.985, z );
	for ( const [ x, z ] of [ [ - 2.4, - 6 ], [ 4.2, - 2.5 ] ] ) {

		bx( MAT.intMatte, 0xd8d8d4, x - 0.3, x + 0.3, 2.975, 2.99, z - 0.3, z + 0.3 );
		for ( let i = 0; i < 5; i ++ ) bx( MAT.intMatte, 0x9a9a96, x - 0.25, x + 0.25, 2.97, 2.975, z - 0.24 + i * 0.12, z - 0.22 + i * 0.12 );

	}

	// convex security mirror (back-left corner)
	B.add( new THREE.SphereGeometry( 0.28, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2 ), MAT.chrome, M( - 7.4, 2.75, - 11.4, Math.PI * 0.75, Math.PI / 4, 0 ), 0xe8eef4 );

	// ================= interior lights =================
	const pl = [];
	for ( const [ x, z, i ] of [ [ - 4.6, - 4.0, 14 ], [ - 1.5, - 8.6, 14 ], [ 4.4, - 4.2, 12 ] ] ) {

		const l = new THREE.PointLight( 0xffe2bf, i, 13, 2 );
		l.position.set( x, 2.75, z );
		root.add( l );
		pl.push( l );

	}

	ctx.lights.interior = pl;
	// warm spill through the front glass onto the wet apron
	const rect = new THREE.RectAreaLight( 0xffd2a0, 1.4, 15.4, 2.6 );
	rect.position.set( 0, 1.45, - 0.12 );
	rect.lookAt( 0, 1.45, 10 );
	root.add( rect );
	ctx.lights.frontGlass = rect;

	// ================= magazine rack (inside front window) =================
	{

		const x0 = - 7.5, x1 = 1.5, zb = - 0.4, zf = - 0.85;
		bx( MAT.intGloss, WHITE, x0, x1, 0, 0.42, zf, zb );
		bx( MAT.intGloss, DARK, x0, x1, 0, 0.08, zf - 0.01, zb );
		bx( MAT.intGloss, WHITE, x0, x1, 0.42, 1.0, zb - 0.06, zb );
		for ( const x of [ x0, x1 ] ) bx( MAT.intGloss, WHITE, x - 0.02, x + 0.02, 0, 1.0, zf, zb );
		const covers = [];
		for ( let tier = 0; tier < 3; tier ++ ) {

			const y = 0.48 + tier * 0.19, z = zf + 0.08 + tier * 0.12;
			bx( MAT.intGloss, 0xdcdcd8, x0, x1, y - 0.02, y, z - 0.08, z + 0.1 );
			bx( MAT.intMetal, 0xb0b5ba, x0, x1, y, y + 0.04, z - 0.085, z - 0.075 );
			for ( let x = x0 + 0.14; x < x1 - 0.1; x += 0.235 ) {

				const k = Math.floor( R() * 16 ), r = { u0: ( k % 4 ) / 4, u1: ( k % 4 + 1 ) / 4, v1: 1 - Math.floor( k / 4 ) / 4, v0: 1 - ( Math.floor( k / 4 ) + 1 ) / 4 };
				const g = quadGeo( 0.21, 0.28, r );
				B.add( g, MAT.mags, M( x + ( R() - 0.5 ) * 0.02, y + 0.15, z, - 0.32, Math.PI, 0 ) );

			}

		}

		quad( MAT.emitTex, E.a_mag, 0.9, 0.27, - 3.0, 2.45, - 1.4, 0, glow( 1.6, 1.6, 1.6 ) );
		quad( MAT.emitTex, E.a_mag, 0.9, 0.27, - 3.0, 2.45, - 1.41, Math.PI, glow( 1.6, 1.6, 1.6 ) );
		for ( const s of [ - 1, 1 ] ) B.add( rodGeo( V( - 3.0 + s * 0.35, 2.58, - 1.405 ), V( - 3.0 + s * 0.35, 3.0, - 1.405 ), 0.004, 3 ), MAT.intMetal, null, 0x888888 );
		collide( x0 - 0.05, x1 + 0.05, zf - 0.02, - 0.2, 1.0 );

	}

	// ================= gondolas =================
	const gondolaX = [ - 5.3, - 2.4, 0.5 ];
	const sideTypes = [ [ 'bag', 'cup' ], [ 'box', 'bottle' ], [ 'bag', 'box' ] ];
	const z0 = - 8.6, z1 = - 3.0;
	gondolaX.forEach( ( cx, gi ) => {

		bx( MAT.intGloss, DARK, cx - 0.45, cx + 0.45, 0, 0.12, z0, z1 );
		bx( MAT.intGloss, 0xe6e6e2, cx - 0.03, cx + 0.03, 0.12, 1.5, z0, z1 );
		bx( MAT.intGloss, WHITE, cx - 0.47, cx + 0.47, 1.5, 1.54, z0 - 0.02, z1 + 0.02 );
		for ( const z of [ z0, z1 ] ) bx( MAT.intGloss, WHITE, cx - 0.47, cx + 0.47, 0, 1.54, z - 0.02, z + 0.02 );
		[ - 1, 1 ].forEach( ( s, si ) => {

			const type = sideTypes[ gi ][ si ];
			const levels = [ 0.12, 0.5, 0.88, 1.26 ];
			levels.forEach( ( y, li ) => {

				const xa = cx + s * 0.03, xb = cx + s * 0.45;
				bx( MAT.intGloss, WHITE, Math.min( xa, xb ), Math.max( xa, xb ), y, y + 0.025, z0 + 0.02, z1 - 0.02 );
				// red price rail
				bx( MAT.intGloss, 0xd7262e, Math.min( xb, xb + s * 0.015 ), Math.max( xb, xb + s * 0.015 ), y - 0.03, y + 0.03, z0 + 0.02, z1 - 0.02 );
				for ( let z = z0 + 0.3; z < z1 - 0.2; z += 0.62 ) quad( MAT.decal, D.pricecard, 0.075, 0.037, xb + s * 0.017, y, z + R() * 0.1, s * Math.PI / 2 );
				// products
				const t = li === 3 && type === 'bottle' ? 'box' : ( li === 0 && type === 'cup' ? 'box' : type );
				const dims = { bag: [ 0.2, 0.25, 0.09 ], cup: [ 0.11, 0.1, 0.11 ], box: [ 0.13, 0.17, 0.1 ], bottle: [ 0.07, 1.0, 0.07 ] }[ t ];
				let col = hue(), run = 0;
				for ( let z = z0 + 0.06 + dims[ 0 ] / 2; z < z1 - 0.06 - dims[ 0 ] / 2; z += dims[ 0 ] + 0.015 ) {

					if ( run -- <= 0 ) {

						col = hue(); run = 2 + Math.floor( R() * 4 );

					}

					const rows = t === 'bottle' ? 4 : 3;
					for ( let r = 0; r < rows; r ++ ) {

						const x = cx + s * ( 0.41 - dims[ 2 ] / 2 - r * ( dims[ 2 ] + 0.01 ) );
						if ( Math.abs( x - cx ) < 0.06 ) continue;
						const yb = y + 0.025;
						if ( t === 'bottle' ) put( 'bottle', M( x, yb, z, 0, R() * 6, 0, 1.15, 1.15, 1.15 ), col );
						else if ( t === 'cup' ) {

							put( 'cup', M( x, yb + 0.05, z, 0, R() * 6, 0, 0.11, 0.1, 0.11 ), col );
							put( 'cup', M( x, yb + 0.152, z, 0, R() * 6, 0, 0.11, 0.1, 0.11 ), col );

						} else put( t, M( x, yb + dims[ 1 ] / 2, z, 0, s > 0 ? Math.PI / 2 : - Math.PI / 2, 0, dims[ 0 ], dims[ 1 ] * ( 0.9 + R() * 0.15 ), dims[ 2 ] ), col );

					}

				}

			} );

		} );
		// end caps (promo) facing +Z (toward entrance) and -Z
		for ( const [ ze, s ] of [ [ z1, 1 ], [ z0, - 1 ] ] ) {

			for ( let li = 0; li < 4; li ++ ) {

				const y = 0.12 + li * 0.36;
				bx( MAT.intGloss, WHITE, cx - 0.45, cx + 0.45, y, y + 0.025, Math.min( ze, ze + s * 0.35 ), Math.max( ze, ze + s * 0.35 ) );
				bx( MAT.intGloss, 0xd7262e, cx - 0.45, cx + 0.45, y - 0.03, y + 0.03, Math.min( ze + s * 0.35, ze + s * 0.365 ), Math.max( ze + s * 0.35, ze + s * 0.365 ) );
				const col = hue();
				for ( let x = cx - 0.38; x < cx + 0.4; x += 0.078 ) for ( let r = 0; r < 3; r ++ ) put( 'can', M( x, y + 0.025, ze + s * ( 0.07 + r * 0.1 ), 0, R() * 6, 0, 1.15, 1.15, 1.15 ), li % 2 ? col : hue() );

			}

			bx( MAT.intGloss, WHITE, cx - 0.47, cx + 0.47, 1.5, 1.54, Math.min( ze, ze + s * 0.37 ), Math.max( ze, ze + s * 0.37 ) );
			quad( MAT.decal, D.kanban, 0.5, 0.32, cx, 1.75, ze + s * 0.2, s > 0 ? 0 : Math.PI );
			box( MAT.intMetal, 0x999999, 0.02, 0.2, 0.02, cx, 1.6, ze + s * 0.2 );

		}

		collide( cx - 0.5, cx + 0.5, z0 - 0.4, z1 + 0.4, 1.55 );

	} );

	// hanging aisle signs (double-sided, lit)
	const hang = ( key, x, y, z, ry = 0 ) => {

		quad( MAT.emitTex, E[ key ], 1.2, 0.36, x, y, z + 0.006 * Math.cos( ry ), ry, glow( 1.7, 1.7, 1.7 ) );
		quad( MAT.emitTex, E[ key ], 1.2, 0.36, x, y, z - 0.006 * Math.cos( ry ), ry + Math.PI, glow( 1.7, 1.7, 1.7 ) );
		for ( const s of [ - 1, 1 ] ) B.add( rodGeo( V( x + s * 0.5 * Math.cos( ry ), y + 0.18, z ), V( x + s * 0.5 * Math.cos( ry ), 3.0, z ), 0.004, 3 ), MAT.intMetal, null, 0x888888 );

	};

	hang( 'a_bento', - 6.3, 2.45, - 2.6 );
	hang( 'a_snack', - 3.85, 2.45, - 2.6 );
	hang( 'a_daily', - 0.95, 2.45, - 2.6 );
	hang( 'a_drink', - 2.6, 2.45, - 9.8 );
	hang( 'a_sweets', - 6.3, 2.45, - 9.0 );
	hang( 'reji', 3.9, 2.45, - 6.7, Math.PI / 2 );

	// ================= walk-in drinks fridge (back wall) =================
	{

		const x0 = - 5.8, nd = 8, dw = 0.75, zf = - 10.9, zb = - 11.8;
		const x1 = x0 + nd * dw;
		bx( MAT.intGloss, DARK, x0 - 0.1, x1 + 0.1, 0, 0.16, zf - 0.02, zb );
		bx( MAT.intGloss, 0x1b2a44, x0 - 0.1, x1 + 0.1, 2.16, 2.55, zf - 0.04, zb );
		quad( MAT.emitTex, E.fridgehead, x1 - x0, 0.32, ( x0 + x1 ) / 2, 2.355, zf - 0.045, 0, glow( 1.8, 1.8, 1.8 ) );
		bx( MAT.intGloss, 0x8a96a6, x0 - 0.12, x0 - 0.02, 0, 2.55, zf - 0.04, zb );
		bx( MAT.intGloss, 0x8a96a6, x1 + 0.02, x1 + 0.12, 0, 2.55, zf - 0.04, zb );
		// interior box
		B.add( new THREE.PlaneGeometry( x1 - x0, 2.0 ), MAT.emit, M( ( x0 + x1 ) / 2, 1.16, zb + 0.02 ), glow( 0.95, 1.0, 1.08 ) );
		for ( let i = 0; i < 5; i ++ ) {

			const y = 0.28 + i * 0.37;
			bx( MAT.intMetal, 0xd0d4da, x0, x1, y - 0.015, y, zb + 0.05, zf - 0.08 );
			bx( MAT.intGloss, 0xf5f5f5, x0, x1, y - 0.04, y, zf - 0.1, zf - 0.08 );
			// drinks
			for ( let d = 0; d < nd; d ++ ) {

				const dx0 = x0 + d * dw + 0.06;
				const type = ( d + i ) % 3 === 0 ? 'can' : 'bottle';
				const step = type === 'can' ? 0.075 : 0.085;
				let col = hue();
				for ( let x = dx0 + 0.04, k = 0; x < dx0 + dw - 0.1; x += step, k ++ ) {

					if ( k % 3 === 0 ) col = hue();
					for ( let r = 0; r < 3; r ++ ) put( type, M( x, y, zf - 0.16 - r * 0.15, 0, 0, 0, type === 'can' ? 1.15 : 1.25, type === 'can' ? 1.15 : 1.25, type === 'can' ? 1.15 : 1.25 ), col );

				}

			}

		}

		for ( let d = 0; d <= nd; d ++ ) {

			const x = x0 + d * dw;
			bx( MAT.intGloss, 0x2a2f36, x - 0.03, x + 0.03, 0.16, 2.16, zf - 0.04, zf );
			B.add( new THREE.PlaneGeometry( 0.025, 1.95 ), MAT.emit, M( x, 1.16, zf - 0.045 ), glow( 2.6, 2.8, 3.2 ) );

		}

		for ( let d = 0; d < nd; d ++ ) {

			const cx = x0 + ( d + 0.5 ) * dw;
			bx( MAT.intGloss, 0x2a2f36, cx - dw / 2 + 0.03, cx + dw / 2 - 0.03, 0.16, 0.24, zf - 0.07, zf - 0.04 );
			bx( MAT.intGloss, 0x2a2f36, cx - dw / 2 + 0.03, cx + dw / 2 - 0.03, 2.08, 2.16, zf - 0.07, zf - 0.04 );
			B.add( new THREE.PlaneGeometry( dw - 0.06, 1.84 ), MAT.frost, M( cx, 1.16, zf - 0.06 ) );
			const hx = cx + ( d % 2 ? - 1 : 1 ) * ( dw / 2 - 0.09 );
			box( MAT.intMetal, 0xd8dce2, 0.025, 1.1, 0.03, hx, 1.15, zf - 0.11 );
			box( MAT.intMetal, 0xd8dce2, 0.02, 0.02, 0.05, hx, 1.65, zf - 0.08 );
			box( MAT.intMetal, 0xd8dce2, 0.02, 0.02, 0.05, hx, 0.65, zf - 0.08 );

		}

		collide( x0 - 0.15, x1 + 0.15, zb, zf + 0.02, 2.55 );
		const tx = x0 + 4.5 * dw;
		ctx.interactables.push( { id: 'tea', label: 'お茶', position: V( tx, 1.2, zf + 0.45 ), radius: 1.1 } );
		ctx.addHighlight( 'tea', dw, 1.95, 0.25, tx, 1.16, zf - 0.02 );

	}

	// ================= left wall open chiller (multideck) =================
	{

		const xb = - 7.78, xf = - 6.85, za = - 10.4, zc = - 2.0;
		bx( MAT.intGloss, DARK, xb, xf, 0, 0.38, za, zc );
		bx( MAT.intGloss, 0x2f3540, xb, xb + 0.1, 0, 2.1, za, zc );
		B.add( new THREE.PlaneGeometry( zc - za, 1.55 ), MAT.emit, M( xb + 0.105, 1.15, ( za + zc ) / 2, 0, Math.PI / 2, 0 ), glow( 1.0, 1.0, 0.97 ) );
		bx( MAT.intGloss, 0x2f3540, xb, xf - 0.05, 1.92, 2.15, za, zc );
		for ( const z of [ za, zc ] ) bx( MAT.intGloss, 0x2f3540, xb, xf, 0, 2.15, z - 0.03, z + 0.03 );
		// lit label strip on canopy front
		const secs = [ [ 'c_sweets', - 10.4, - 8.6 ], [ 'c_bento', - 8.6, - 6.8 ], [ 'c_onigiri', - 6.8, - 4.4 ], [ 'c_sand', - 4.4, - 2.0 ] ];
		for ( const [ key, a, b ] of secs ) quad( MAT.emitTex, E[ key ], b - a - 0.1, 0.2, xf - 0.051, 2.03, ( a + b ) / 2, - Math.PI / 2, glow( 1.7, 1.7, 1.7 ) );
		// shelves (stepped)
		const shelves = [ [ 0.4, 0.9 ], [ 0.82, 0.62 ], [ 1.18, 0.52 ], [ 1.52, 0.42 ] ];
		shelves.forEach( ( [ y, d ] ) => {

			const xs = xb + 0.1 + d;
			bx( MAT.intMetal, 0xdfe3e8, xb + 0.1, xs, y - 0.02, y, za + 0.03, zc - 0.03 );
			bx( MAT.intGloss, 0xd7262e, xs - 0.01, xs + 0.01, y - 0.04, y + 0.03, za + 0.03, zc - 0.03 );
			if ( y > 0.5 ) B.add( new THREE.PlaneGeometry( zc - za - 0.06, 0.03 ), MAT.emit, M( xs - 0.05, y - 0.025, ( za + zc ) / 2, Math.PI / 2, 0, Math.PI / 2 ), glow( 3, 3, 2.8 ) );
			for ( let z = za + 0.3; z < zc - 0.2; z += 0.55 ) quad( MAT.decal, D.pricecard, 0.075, 0.037, xs + 0.012, y, z, Math.PI / 2 );
			for ( const [ key, a, b ] of secs ) {

				for ( let z = a + 0.1; z < b - 0.1; ) {

					const rows = Math.floor( d / 0.16 );
					if ( key === 'c_onigiri' ) {

						for ( let r = 0; r < rows; r ++ ) put( 'onigiri', M( xs - 0.07 - r * 0.15, y + 0.055, z + 0.05, 0, 0, 0.12, 0.035, 0.065, 0.062 ), [ 0xffffff, 0xffe6e0, 0xfff7d8, 0xe9ffe0 ][ Math.floor( z * 7 ) & 3 ] );
						z += 0.105;

					} else if ( key === 'c_sand' ) {

						for ( let r = 0; r < rows; r ++ ) put( 'sand', M( xs - 0.08 - r * 0.16, y + 0.075, z + 0.06, 0, 0, 0.1, 0.05, 0.09, 0.085 ), 0xffffff );
						z += 0.13;

					} else if ( key === 'c_bento' ) {

						for ( let r = 0; r < Math.max( 1, rows - 1 ); r ++ ) put( 'bento', M( xs - 0.12 - r * 0.24, y + 0.03, z + 0.1, 0, Math.PI / 2, 0.15, 0.2, 0.05, 0.22 ), 0xffffff );
						z += 0.21;

					} else {

						for ( let r = 0; r < rows; r ++ ) put( 'pudding', M( xs - 0.06 - r * 0.11, y, z + 0.05, 0, 0, 0, 1, 1, 1 ), [ 0xffffff, 0xffd0d8, 0xd8f0ff ][ Math.floor( z * 9 ) % 3 & 3 ] || 0xffffff );
						z += 0.1;

					}

				}

			}

		} );
		collide( xb, xf + 0.05, za - 0.05, zc + 0.05, 2.15 );
		ctx.interactables.push( { id: 'onigiri', label: 'おにぎり', position: V( - 6.25, 1.0, - 5.6 ), radius: 1.2 } );
		ctx.addHighlight( 'onigiri', 0.95, 1.3, 2.3, - 7.3, 1.0, - 5.6 );
		ctx.interactables.push( { id: 'pudding', label: 'プリン', position: V( - 6.25, 1.0, - 9.5 ), radius: 1.1 } );
		ctx.addHighlight( 'pudding', 0.95, 1.3, 1.7, - 7.3, 1.0, - 9.5 );

	}

	// ================= counter (レジ) =================
	{

		const xf = 4.8, xb = 5.6, za = - 9.2, zc = - 4.2, top = 1.0;
		bx( MAT.intGloss, WHITE, xf, xb, 0.08, top - 0.05, za, zc );
		bx( MAT.intGloss, DARK, xf + 0.04, xb, 0, 0.08, za, zc );
		bx( MAT.intGloss, BLUE, xf - 0.005, xf, 0.62, 0.78, za, zc );
		bx( MAT.intGloss, GREEN, xf - 0.005, xf, 0.56, 0.62, za, zc );
		bx( MAT.intGloss, ORANGE, xf - 0.005, xf, 0.52, 0.56, za, zc );
		bx( MAT.intGloss, 0x3a3530, xf - 0.1, xb + 0.05, top - 0.05, top, za - 0.05, zc + 0.05 );
		// clerk-side back counter + microwaves
		bx( MAT.intGloss, 0xe0e0dc, 7.15, 7.8, 0, 0.9, - 9.2, - 4.4 );
		bx( MAT.intGloss, 0x3a3530, 7.1, 7.8, 0.9, 0.94, - 9.25, - 4.35 );
		for ( const z of [ - 8.7, - 8.05 ] ) {

			box( MAT.intGloss, 0xf0f0f0, 0.42, 0.3, 0.55, 7.45, 1.09, z );
			box( MAT.intGloss, 0x15171a, 0.01, 0.2, 0.34, 7.235, 1.1, z - 0.05 );
			box( MAT.emit, glow( 0.2, 1.8, 0.6 ), 0.005, 0.03, 0.06, 7.233, 1.18, z + 0.2 );

		}

		// --- self coffee machine (customer side, near entrance end)
		{

			const z = - 4.78, x = 5.1;
			box( MAT.intGloss, 0x1b1b1b, 0.45, 0.68, 0.42, x, top + 0.34, z );
			quad( MAT.emitTex, E.coffee, 0.26, 0.34, x - 0.226, top + 0.48, z, - Math.PI / 2, glow( 1.5, 1.5, 1.5 ) );
			box( MAT.intMetal, 0x8a8f96, 0.16, 0.02, 0.18, x - 0.15, top + 0.05, z );
			box( MAT.intMetal, 0x8a8f96, 0.06, 0.06, 0.06, x - 0.17, top + 0.26, z );
			cyl( MAT.intGloss, 0xffffff, 0.04, 0.032, 0.1, 10, x - 0.17, top + 0.11, z );
			for ( let i = 0; i < 2; i ++ ) cyl( MAT.intGloss, 0xffffff, 0.045, 0.035, 0.32, 10, x - 0.12, top + 0.16, z + 0.3 + i * 0.1 );
			quad( MAT.decal, D.coffee, 0.2, 0.28, x - 0.226, top + 0.84, z, - Math.PI / 2 );

		}

		// --- registers
		const register = ( z ) => {

			box( MAT.intGloss, 0x2a2d33, 0.38, 0.1, 0.42, 5.25, top + 0.05, z );
			// clerk screen (faces +X, tilted)
			box( MAT.intGloss, 0x1a1c20, 0.05, 0.3, 0.38, 5.42, top + 0.28, z, 0 );
			quad( MAT.emitTex, E.posclerk, 0.34, 0.26, 5.448, top + 0.28, z, Math.PI / 2, glow( 1.3, 1.3, 1.3 ) );
			// customer display on pole (faces -X)
			cyl( MAT.intMetal, 0x777b80, 0.015, 0.015, 0.3, 6, 5.05, top + 0.25, z + 0.12 );
			box( MAT.intGloss, 0x1a1c20, 0.04, 0.12, 0.2, 5.05, top + 0.42, z + 0.12 );
			quad( MAT.emitTex, E.pos, 0.18, 0.105, 5.028, top + 0.42, z + 0.12, - Math.PI / 2, glow( 1.6, 1.6, 1.6 ) );
			// card terminal
			box( MAT.intGloss, 0x15171a, 0.12, 0.04, 0.08, 4.95, top + 0.02, z - 0.16, 0.2 );
			box( MAT.emit, glow( 0.4, 0.9, 1.6 ), 0.06, 0.002, 0.045, 4.95, top + 0.042, z - 0.165, 0.2 );
			// scanner + cash tray
			box( MAT.intGloss, 0x15171a, 0.12, 0.14, 0.1, 5.3, top + 0.17, z - 0.18 );
			box( MAT.emit, glow( 2.5, 0.1, 0.1 ), 0.005, 0.01, 0.06, 5.24, top + 0.18, z - 0.18 );
			box( MAT.intGloss, 0x3a3e46, 0.25, 0.015, 0.3, 4.92, top + 0.008, z + 0.08 );

		};

		register( - 5.3 );
		register( - 7.75 );
		// charity box
		box( MAT.glassInt, 0xffffff, 0.12, 0.14, 0.12, 4.95, top + 0.07, - 5.75 );
		box( MAT.intGloss, 0xd7262e, 0.125, 0.03, 0.125, 4.95, top + 0.155, - 5.75 );
		for ( let i = 0; i < 6; i ++ ) cyl( MAT.intMetal, 0xd4af37, 0.01, 0.01, 0.003, 8, 4.93 + R() * 0.05, top + 0.01 + i * 0.004, - 5.77 + R() * 0.04 );
		// --- donut case
		{

			const z = - 6.2, x = 5.15;
			box( MAT.intGloss, 0xf3e0e8, 0.42, 0.06, 0.5, x, top + 0.03, z );
			B.add( new THREE.BoxGeometry( 0.4, 0.34, 0.48 ), MAT.glassInt, M( x, top + 0.23, z ) );
			for ( let r = 0; r < 2; r ++ ) for ( let i = 0; i < 4; i ++ ) B.add( new THREE.TorusGeometry( 0.04, 0.018, 6, 12 ), MAT.intGloss, M( x - 0.08 + r * 0.14, top + 0.08 + r * 0.14, z - 0.16 + i * 0.105, Math.PI / 2 ), [ 0xc68642, 0x6b3a1e, 0xf3a6c0, 0xf5e6c8 ][ ( i + r ) % 4 ] );
			box( MAT.intGloss, 0xffffff, 0.3, 0.005, 0.46, x + 0.05, top + 0.2, z );
			quad( MAT.emitTex, E.donut, 0.4, 0.09, x - 0.205, top + 0.43, z, - Math.PI / 2, glow( 1.4, 1.4, 1.4 ) );

		}

		// --- hot snack warmer
		{

			const z = - 6.95, x = 5.15;
			box( MAT.intGloss, 0x2a2d33, 0.46, 0.08, 0.7, x, top + 0.04, z );
			B.add( new THREE.BoxGeometry( 0.44, 0.42, 0.68 ), MAT.glassInt, M( x, top + 0.29, z ) );
			B.add( new THREE.PlaneGeometry( 0.66, 0.4 ), MAT.emit, M( x + 0.21, top + 0.29, z, 0, - Math.PI / 2, 0 ), glow( 2.4, 1.3, 0.5 ) );
			box( MAT.intGloss, 0x2a2d33, 0.46, 0.06, 0.7, x, top + 0.53, z );
			quad( MAT.emitTex, E.hotsnack, 0.66, 0.12, x - 0.232, top + 0.53, z, - Math.PI / 2, glow( 1.8, 1.8, 1.8 ) );
			box( MAT.emit, glow( 3, 1.8, 0.8 ), 0.36, 0.005, 0.6, x, top + 0.495, z );
			for ( const y of [ 0.1, 0.3 ] ) {

				box( MAT.intMetal, 0xc0c4c8, 0.4, 0.01, 0.64, x, top + y, z );
				for ( let i = 0; i < 10; i ++ ) B.add( new THREE.IcosahedronGeometry( 0.035, 0 ), MAT.intGloss, M( x - 0.12 + ( i % 2 ) * 0.1, top + y + 0.03, z - 0.27 + Math.floor( i / 2 ) * 0.13, R(), R(), R(), 1.2, 0.8, 1 ), [ 0xa8641e, 0xc27a2c, 0xe0b060 ][ i % 3 ] );

			}

		}

		// --- oden pot with steam
		{

			const z = - 8.7, x = 5.15, y = top;
			box( MAT.intMetal, 0xc8ccd0, 0.5, 0.2, 0.62, x, y + 0.1, z );
			B.add( new THREE.PlaneGeometry( 0.46, 0.58 ), MAT.intGloss, M( x, y + 0.185, z, - Math.PI / 2 ), 0x8a5a1c );
			for ( let i = 1; i < 3; i ++ ) box( MAT.intMetal, 0xd8dce0, 0.46, 0.04, 0.01, x, y + 0.18, z - 0.29 + i * 0.193 );
			box( MAT.intMetal, 0xd8dce0, 0.01, 0.04, 0.58, x, y + 0.18, z );
			for ( let i = 0; i < 18; i ++ ) {

				const ox = x - 0.17 + ( i % 3 ) * 0.17 * 0.66 + R() * 0.03, oz = z - 0.25 + Math.floor( i / 3 ) * 0.1;
				const k = i % 4;
				if ( k === 0 ) cyl( MAT.intGloss, 0xd9b77a, 0.04, 0.04, 0.04, 10, ox, y + 0.19, oz );
				else if ( k === 1 ) B.add( new THREE.SphereGeometry( 0.03, 10, 6 ), MAT.intGloss, M( ox, y + 0.19, oz, 0, 0, 0, 1, 0.8, 1.25 ), 0xd9a64a );
				else if ( k === 2 ) box( MAT.intGloss, 0x5a5650, 0.06, 0.03, 0.05, ox, y + 0.19, oz, R() );
				else cyl( MAT.intGloss, 0xb27a3a, 0.018, 0.018, 0.09, 8, ox, y + 0.195, oz, Math.PI / 2, R(), 0 );

			}

			quad( MAT.emitTex, E.oden, 0.5, 0.11, x - 0.252, y + 0.1, z, - Math.PI / 2, glow( 1.3, 1.3, 1.3 ) );
			// steam particles
			const n = 14;
			const sg = new THREE.BufferGeometry();
			const sp = new Float32Array( n * 3 );
			sg.setAttribute( 'position', new THREE.BufferAttribute( sp, 3 ) );
			const sm = new THREE.PointsMaterial( { map: T.soft, size: 0.22, transparent: true, opacity: 0.16, depthWrite: false, color: 0xffffff, sizeAttenuation: true } );
			const steam = new THREE.Points( sg, sm );
			steam.frustumCulled = false;
			root.add( steam );
			const seeds = Array.from( { length: n }, () => [ R(), R(), R() ] );
			ctx.updaters.push( ( dt, t ) => {

				for ( let i = 0; i < n; i ++ ) {

					const [ a, b, c ] = seeds[ i ];
					const ph = ( t * 0.25 + a ) % 1;
					sp[ i * 3 ] = x - 0.15 + b * 0.3 + Math.sin( t + c * 6 ) * 0.03 * ph;
					sp[ i * 3 + 1 ] = y + 0.2 + ph * 0.55;
					sp[ i * 3 + 2 ] = z - 0.25 + c * 0.5;

				}

				sg.attributes.position.needsUpdate = true;
				sm.opacity = 0.14;

			} );

		}

		// counter flap gates (block walking behind counter)
		collide( xf - 0.1, xb + 0.05, za - 0.05, zc + 0.05, 1.05 );
		collide( xb, 7.85, zc, zc + 0.12, 1.05 );
		collide( xb, 7.85, za - 0.25, za, 1.05 );
		collide( 7.1, 7.85, - 9.25, - 4.35, 1.2 );
		ctx.interactables.push( { id: 'register', label: 'レジ', position: V( 4.35, 1.0, - 5.3 ), radius: 1.1 } );
		ctx.addHighlight( 'register', 0.9, 0.55, 0.65, 5.2, 1.2, - 5.3 );

	}

	// ================= cigarette shelf (right wall behind counter) =================
	bx( MAT.intGloss, 0x222428, 7.6, 7.8, 1.25, 2.5, - 8.9, - 4.6 );
	B.add( new THREE.PlaneGeometry( 4.2, 1.0 ), MAT.cig, M( 7.595, 1.8, - 6.75, 0, - Math.PI / 2, 0 ) );
	quad( MAT.emitTex, E.tabako, 1.6, 0.22, 7.59, 2.4, - 6.75, - Math.PI / 2, glow( 1.5, 1.5, 1.5 ) );
	for ( let i = 0; i < 6; i ++ ) bx( MAT.glassInt, 0xffffff, 7.55, 7.56, 1.32 + i * 0.165, 1.33 + i * 0.165, - 8.85, - 4.65 );

	// wall clock (hands animated)
	{

		quad( MAT.decal, D.clock, 0.4, 0.4, 7.78, 2.72, - 9.6, - Math.PI / 2 );
		const hm = new THREE.MeshBasicMaterial( { color: 0x111111 } );
		const hg = new THREE.BoxGeometry( 0.006, 1, 0.012 ).translate( 0, 0.5, 0 );
		const hh = new THREE.Mesh( hg, hm ), mh = new THREE.Mesh( hg, hm );
		hh.scale.y = 0.1; mh.scale.y = 0.16;
		const cg = new THREE.Group();
		cg.position.set( 7.77, 2.72, - 9.6 );
		cg.rotation.y = - Math.PI / 2;
		cg.add( hh, mh );
		root.add( cg );
		ctx.updaters.push( () => {

			const d = new Date();
			const m = d.getMinutes() + d.getSeconds() / 60, h = ( d.getHours() % 12 ) + m / 60;
			hh.rotation.z = - h / 12 * Math.PI * 2;
			mh.rotation.z = - m / 60 * Math.PI * 2;

		} );

	}

	// ================= ATM =================
	{

		const xf = 7.05, xb = 7.8, za = - 2.1, zc = - 1.1, zm = ( za + zc ) / 2;
		bx( MAT.intGloss, 0xc9ced4, xf, xb, 0, 0.88, za, zc );
		bx( MAT.intGloss, 0xb4bac2, xf + 0.18, xb, 0.88, 1.58, za, zc );
		bx( MAT.intGloss, BLUE, xf, xb, 1.58, 1.82, za, zc );
		quad( MAT.emitTex, E.atmhead, 0.95, 0.22, xf - 0.005, 1.7, zm, - Math.PI / 2, glow( 2.0, 2.0, 2.0 ) );
		// sloped console with screen
		const cm = M( xf + 0.12, 0.98, zm - 0.08, 0, - Math.PI / 2, 0 );
		const g1 = new THREE.BoxGeometry( 0.62, 0.04, 0.3 ); g1.applyMatrix4( M( 0, 0, 0, 0.55, 0, 0 ) ); g1.applyMatrix4( cm ); B.add( g1, MAT.intGloss, null, 0x2b2f35 );
		const sg = quadGeo( 0.36, 0.27, E.atmscreen ); sg.applyMatrix4( M( - 0.1, 0.01, 0, - Math.PI / 2 + 0.55, 0, 0 ) ); sg.applyMatrix4( M( 0, 0.012, 0 ) ); sg.applyMatrix4( cm );
		B.add( sg, MAT.emitTex, null, glow( 1.4, 1.4, 1.4 ) );
		// keypad (3x4) at right of screen
		for ( let r = 0; r < 4; r ++ ) for ( let c = 0; c < 3; c ++ ) {

			const kg = new THREE.BoxGeometry( 0.032, 0.012, 0.028 );
			kg.applyMatrix4( M( 0.16 + c * 0.04, 0.02, - 0.06 + r * 0.035, 0.55, 0, 0 ) ); kg.applyMatrix4( cm );
			B.add( kg, MAT.intGloss, null, r === 3 && c !== 1 ? ( c === 0 ? 0xd7262e : 0x2fb37a ) : 0xe8e8e8 );

		}

		// card slot, passbook slot, cash slot, receipt
		box( MAT.intGloss, 0x15171a, 0.01, 0.025, 0.12, xf + 0.175, 1.3, zm + 0.28 );
		box( MAT.emit, glow( 0.2, 2.2, 0.6 ), 0.005, 0.008, 0.11, xf + 0.17, 1.33, zm + 0.28 );
		box( MAT.intGloss, 0x15171a, 0.01, 0.025, 0.2, xf + 0.175, 1.18, zm + 0.28 );
		box( MAT.emit, glow( 2.2, 1.3, 0.2 ), 0.005, 0.008, 0.18, xf + 0.17, 1.21, zm + 0.28 );
		box( MAT.intGloss, 0x2b2f35, 0.2, 0.05, 0.42, xf + 0.08, 0.86, zm - 0.06 );
		box( MAT.intMetal, 0x8a8f96, 0.16, 0.012, 0.36, xf + 0.09, 0.89, zm - 0.06 );
		box( MAT.intGloss, 0x15171a, 0.01, 0.015, 0.1, xf + 0.175, 1.45, zm + 0.28 );
		// privacy side panels
		for ( const z of [ za - 0.02, zc + 0.02 ] ) bx( MAT.intGloss, 0x8a96a6, xf - 0.32, xf + 0.02, 0.85, 1.75, z - 0.012, z + 0.012 );
		// little convex mirror on top
		B.add( new THREE.SphereGeometry( 0.06, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2 ), MAT.chrome, M( xf - 0.02, 1.58, zm, 0, 0, Math.PI / 2 + 0.4 ), 0xe8eef4 );
		box( MAT.intGloss, 0xffd400, 0.005, 0.06, 0.2, xf - 0.003, 0.7, zm );
		collide( xf - 0.05, xb, za - 0.05, zc + 0.05, 1.82 );
		ctx.interactables.push( { id: 'atm', label: 'ATM', position: V( 6.6, 1.1, zm ), radius: 1.0 } );
		ctx.addHighlight( 'atm', 0.85, 1.9, 1.1, 7.42, 0.95, zm );

	}

	// ================= multi-copy machine =================
	{

		const xf = 7.08, xb = 7.8, za = - 3.6, zc = - 2.45, zm = ( za + zc ) / 2;
		bx( MAT.intGloss, 0xeef0f2, xf, xb, 0, 1.0, za, zc );
		bx( MAT.intGloss, 0x8a96a6, xf, xb, 1.0, 1.08, za, zc );
		bx( MAT.intGloss, 0x55595e, xf + 0.05, xb - 0.05, 1.08, 1.1, za + 0.05, zc - 0.05 );
		for ( let i = 0; i < 3; i ++ ) bx( MAT.intGloss, 0xc8ccd0, xf - 0.005, xf, 0.12 + i * 0.22, 0.13 + i * 0.22, za + 0.05, zc - 0.05 );
		const sg = quadGeo( 0.3, 0.2, E.copyscreen ); sg.applyMatrix4( M( xf - 0.05, 1.18, zm + 0.25, 0, - Math.PI / 2, 0 ) );
		B.add( sg, MAT.emitTex, null, glow( 1.4, 1.4, 1.4 ) );
		box( MAT.intGloss, 0x2b2f35, 0.06, 0.24, 0.34, xf - 0.02, 1.18, zm + 0.25 );
		bx( MAT.intGloss, 0xd8dce0, xf - 0.25, xf, 0.7, 0.72, za + 0.1, za + 0.5 );
		collide( xf - 0.28, xb, za - 0.05, zc + 0.05, 1.15 );

	}

	// ================= back doors: toilet & staff =================
	for ( const [ x, key, col ] of [ [ 1.55, 'toilet', 0xd8cbb4 ], [ 6.45, 'staff', 0xb8bec6 ] ] ) {

		bx( MAT.intGloss, 0x6a6e73, x - 0.5, x + 0.5, 0, 2.15, - 11.8, - 11.76 );
		bx( MAT.intGloss, col, x - 0.45, x + 0.45, 0, 2.1, - 11.77, - 11.74 );
		box( MAT.intMetal, 0xd8dce2, 0.12, 0.025, 0.04, x + 0.33, 1.0, - 11.72 );
		const r = D[ key ];
		quad( MAT.decal, r, key === 'toilet' ? 0.28 : 0.4, key === 'toilet' ? 0.36 : 0.14, x, 1.55, - 11.735 );

	}

	quad( MAT.emitTex, E.exit, 0.4, 0.2, 1.55, 2.4, - 11.75, 0, glow( 1.8, 1.8, 1.8 ) );
	box( MAT.intGloss, 0xf0f0f0, 0.44, 0.24, 0.05, 1.55, 2.4, - 11.78 );
	collide( 0.9, 7.8, - 11.85, - 11.7, 2.2 );

	// ================= clerk (stylised) =================
	{

		const g = new THREE.Group();
		const uni = new THREE.MeshStandardMaterial( { color: 0x2f7fc4, roughness: 0.6 } );
		const stripe = new THREE.MeshStandardMaterial( { color: 0x2fb37a, roughness: 0.6 } );
		const pants = new THREE.MeshStandardMaterial( { color: 0x23262c, roughness: 0.7 } );
		const hair = new THREE.MeshStandardMaterial( { color: 0x1a1412, roughness: 0.5 } );
		const lb = new THREE.Group();
		for ( const s of [ - 1, 1 ] ) {

			const leg = new THREE.Mesh( new THREE.CapsuleGeometry( 0.065, 0.7, 4, 8 ), pants );
			leg.position.set( 0, 0.43, s * 0.09 );
			lb.add( leg );

		}

		g.add( lb );
		const torso = new THREE.Group();
		torso.position.y = 0.86;
		const body = new THREE.Mesh( new THREE.CapsuleGeometry( 0.17, 0.42, 6, 12 ), uni );
		body.scale.set( 0.75, 1, 1.1 );
		body.position.y = 0.3;
		torso.add( body );
		const band = new THREE.Mesh( new THREE.CylinderGeometry( 0.175, 0.175, 0.07, 14 ), stripe );
		band.scale.set( 0.76, 1, 1.12 );
		band.position.y = 0.34;
		torso.add( band );
		const tag = new THREE.Mesh( new THREE.BoxGeometry( 0.01, 0.04, 0.07 ), new THREE.MeshStandardMaterial( { color: 0xffffff } ) );
		tag.position.set( - 0.13, 0.5, - 0.08 );
		torso.add( tag );
		const head = new THREE.Group();
		head.position.y = 0.78;
		const face = new THREE.Mesh( new THREE.SphereGeometry( 0.11, 16, 12 ), MAT.skin );
		face.scale.set( 1, 1.12, 0.95 );
		head.add( face );
		const hr = new THREE.Mesh( new THREE.SphereGeometry( 0.118, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.58 ), hair );
		hr.position.set( 0.012, 0.02, 0 );
		hr.rotation.z = - 0.25;
		head.add( hr );
		const neck = new THREE.Mesh( new THREE.CylinderGeometry( 0.045, 0.05, 0.1, 8 ), MAT.skin );
		neck.position.y = - 0.13;
		head.add( neck );
		torso.add( head );
		const arms = [];
		for ( const s of [ - 1, 1 ] ) {

			const a = new THREE.Group();
			a.position.set( 0, 0.56, s * 0.2 );
			const up = new THREE.Mesh( new THREE.CapsuleGeometry( 0.05, 0.26, 4, 8 ), uni );
			up.position.y = - 0.17;
			a.add( up );
			const fore = new THREE.Mesh( new THREE.CapsuleGeometry( 0.04, 0.24, 4, 8 ), MAT.skin );
			fore.position.set( - 0.1, - 0.38, 0 );
			fore.rotation.z = - 0.8;
			a.add( fore );
			torso.add( a );
			arms.push( a );

		}

		g.add( torso );
		g.position.set( 6.2, 0, - 6.55 );
		g.rotation.y = Math.PI; // local +X faces -X (toward customers)
		g.traverse( o => {

			if ( o.isMesh ) o.castShadow = false;

		} );
		root.add( g );
		ctx.clerkPosition = g.position;
		let look = 0, lookT = 0;
		ctx.updaters.push( ( dt, t, p ) => {

			torso.scale.y = 1 + Math.sin( t * 1.6 ) * 0.008;
			torso.rotation.x = Math.sin( t * 0.4 ) * 0.02;
			lookT -= dt;
			if ( lookT < 0 ) {

				lookT = 2 + Math.random() * 4;
				look = ( Math.random() - 0.5 ) * 0.9;

			}

			if ( p && p.x > - 1 && p.x < 7.8 && p.z < - 0.5 && p.z > - 11 ) {

				// glance at player when inside near the counter
				const ang = Math.atan2( - ( p.z - g.position.z ), - ( p.x - g.position.x ) );
				look = THREE.MathUtils.clamp( - ang, - 0.9, 0.9 );

			}

			head.rotation.y += ( look - head.rotation.y ) * Math.min( 1, dt * 3 );
			arms[ 0 ].rotation.z = Math.sin( t * 0.9 ) * 0.04;
			arms[ 1 ].rotation.z = Math.sin( t * 0.9 + 1 ) * 0.04;

		} );

	}

	// ================= build instanced products =================
	for ( const type in buckets ) {

		const list = buckets[ type ];
		const [ geo, mat ] = defs[ type ];
		const im = new THREE.InstancedMesh( geo, mat, list.length );
		list.forEach( ( [ m, c ], i ) => {

			im.setMatrixAt( i, m ); im.setColorAt( i, c );

		} );
		im.instanceMatrix.needsUpdate = true;
		im.computeBoundingSphere();
		im.name = 'products:' + type;
		root.add( im );

	}

	// fridge hum: subtle flicker of interior lights
	ctx.updaters.push( ( dt, t ) => {

		const f = 1 + Math.sin( t * 50 ) * 0.004 + ( Math.sin( t * 0.37 ) > 0.995 ? - 0.08 : 0 );
		pl[ 1 ].intensity = 14 * f;

	} );

}
