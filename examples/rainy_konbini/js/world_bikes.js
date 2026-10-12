// Detailed ママチャリ (city bicycle) built from merged primitives. Local frame: front wheel toward +X, Y up, lateral Z.
import * as THREE from 'three';
import { M, rodGeo, tubeGeo } from './world_util.js';

const V = ( x, y, z = 0 ) => new THREE.Vector3( x, y, z );

export function addBike( B, MAT, matrix, paint, Q = 1, seed = 0 ) {

	const add = ( g, mat, col, m = null ) => {

		if ( m ) g.applyMatrix4( m );
		g.applyMatrix4( matrix );
		B.add( g, mat, null, col );

	};

	const R = 0.33; // wheel radius (26")
	const rear = V( - 0.55, R ), front = V( 0.53, R );
	const black = 0x151515, silver = 0xb8bcc2, dark = 0x2a2a2a;
	const spokes = Q >= 2 ? 36 : Q >= 1 ? 28 : 16;

	// ---- wheels ----
	for ( const c of [ rear, front ] ) {

		add( new THREE.TorusGeometry( R - 0.018, 0.021, 6, 40 ), MAT.rubber, 0x101010, M( c.x, c.y, 0 ) );
		add( new THREE.TorusGeometry( R - 0.04, 0.008, 4, 40 ), MAT.chrome, silver, M( c.x, c.y, 0 ) );
		add( new THREE.CylinderGeometry( 0.028, 0.028, 0.11, 10 ), MAT.chrome, silver, M( c.x, c.y, 0, Math.PI / 2 ) );
		add( new THREE.CylinderGeometry( 0.006, 0.006, 0.16, 6 ), MAT.chrome, silver, M( c.x, c.y, 0, Math.PI / 2 ) ); // axle
		for ( let i = 0; i < spokes; i ++ ) {

			const a = i / spokes * Math.PI * 2;
			const side = i % 2 ? 0.035 : - 0.035;
			const a0 = a + ( i % 4 < 2 ? 0.35 : - 0.35 );
			const hub = V( c.x + Math.cos( a0 ) * 0.025, c.y + Math.sin( a0 ) * 0.025, side );
			const rim = V( c.x + Math.cos( a ) * ( R - 0.045 ), c.y + Math.sin( a ) * ( R - 0.045 ), 0 );
			add( rodGeo( hub, rim, 0.0022, 3 ), MAT.chrome, silver );

		}

		// mudguard (open cylinder arc), front covers top-front, rear covers top-rear
		const isRear = c === rear;
		const g = new THREE.CylinderGeometry( R + 0.035, R + 0.035, 0.065, 20, 1, true, isRear ? Math.PI * 0.05 : - Math.PI * 0.35, Math.PI * ( isRear ? 0.95 : 0.85 ) );
		add( g, MAT.extPaint, isRear ? paint : paint, M( c.x, c.y, 0, Math.PI / 2, 0, 0 ) );

	}

	// ---- frame (step-through) ----
	const head0 = V( 0.36, 0.98 ), head1 = V( 0.41, 0.74 );
	const bb = V( - 0.06, 0.27 );
	const seatTop = V( - 0.24, 0.86 );
	const fr = 0.019;
	add( rodGeo( head0, head1, 0.024, 10, false ), MAT.extPaint, paint );
	add( tubeGeo( [ V( 0.39, 0.86 ), V( 0.26, 0.6 ), V( 0.08, 0.36 ), bb ], fr, 20, 8 ), MAT.extPaint, paint );
	add( tubeGeo( [ V( 0.40, 0.79 ), V( 0.30, 0.66 ), V( 0.12, 0.43 ), V( - 0.04, 0.31 ) ], fr * 0.8, 20, 8 ), MAT.extPaint, paint );
	add( rodGeo( bb, seatTop, fr, 8, false ), MAT.extPaint, paint );
	for ( const s of [ - 1, 1 ] ) {

		add( rodGeo( V( bb.x, bb.y, s * 0.03 ), V( rear.x, rear.y, s * 0.055 ), 0.012, 6 ), MAT.extPaint, paint ); // chainstay
		add( rodGeo( V( - 0.2, 0.74, s * 0.02 ), V( rear.x, rear.y, s * 0.055 ), 0.012, 6 ), MAT.extPaint, paint ); // seatstay
		add( rodGeo( V( 0.42, 0.72, s * 0.045 ), V( front.x, front.y, s * 0.05 ), 0.013, 6 ), MAT.chrome, silver ); // fork blade

	}

	add( new THREE.CylinderGeometry( 0.04, 0.04, 0.09, 12 ), MAT.extPaint, paint, M( bb.x, bb.y, 0, Math.PI / 2 ) ); // bottom bracket shell
	add( new THREE.BoxGeometry( 0.05, 0.03, 0.11 ), MAT.chrome, silver, M( 0.42, 0.72, 0 ) ); // fork crown

	// ---- handlebar ----
	const stemTop = V( 0.34, 1.07 );
	add( rodGeo( head0, stemTop, 0.012, 6 ), MAT.chrome, silver );
	const bar = [ V( 0.20, 1.06, - 0.29 ), V( 0.31, 1.07, - 0.2 ), V( 0.35, 1.07, 0 ), V( 0.31, 1.07, 0.2 ), V( 0.20, 1.06, 0.29 ) ];
	add( tubeGeo( bar, 0.011, 24, 6 ), MAT.chrome, silver );
	for ( const s of [ - 1, 1 ] ) {

		add( new THREE.CylinderGeometry( 0.017, 0.017, 0.12, 8 ), MAT.rubber, dark, M( 0.15, 1.058, s * 0.3, 0, 0, Math.PI / 2 ) ); // grips
		add( rodGeo( V( 0.27, 1.07, s * 0.24 ), V( 0.17, 1.03, s * 0.25 ), 0.006, 4 ), MAT.chrome, silver ); // brake lever
		add( rodGeo( V( 0.28, 1.06, s * 0.22 ), V( 0.40, 0.75, s * 0.06 ), 0.004, 3 ), MAT.rubber, black ); // cable

	}

	add( new THREE.SphereGeometry( 0.024, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2 ), MAT.chrome, 0xd0d4da, M( 0.25, 1.08, - 0.2 ) ); // bell
	add( new THREE.CylinderGeometry( 0.024, 0.024, 0.01, 10 ), MAT.chrome, 0xd0d4da, M( 0.25, 1.078, - 0.2 ) );

	// ---- front basket (wire grid) ----
	const bx = 0.66, by = 0.92, bw = 0.3, bh = 0.24, bd = 0.36; // x depth, height, z width
	const wire = 0.0035;
	const bcol = 0x1c1c1c;
	for ( let k = 0; k <= 3; k ++ ) {

		const y = by - bh / 2 + k * bh / 3;
		const x0 = bx - bw / 2, x1 = bx + bw / 2, z0 = - bd / 2, z1 = bd / 2;
		const r = k === 3 ? wire * 1.8 : wire;
		add( rodGeo( V( x0, y, z0 ), V( x1, y, z0 ), r, 3 ), MAT.metal, bcol );
		add( rodGeo( V( x0, y, z1 ), V( x1, y, z1 ), r, 3 ), MAT.metal, bcol );
		add( rodGeo( V( x0, y, z0 ), V( x0, y, z1 ), r, 3 ), MAT.metal, bcol );
		add( rodGeo( V( x1, y, z0 ), V( x1, y, z1 ), r, 3 ), MAT.metal, bcol );

	}

	const nv = Q >= 1 ? 7 : 4;
	for ( let i = 0; i <= nv; i ++ ) {

		const t = i / nv;
		const z = - bd / 2 + t * bd, x = bx - bw / 2 + t * bw;
		add( rodGeo( V( bx - bw / 2, by - bh / 2, z ), V( bx - bw / 2, by + bh / 2, z ), wire, 3 ), MAT.metal, bcol );
		add( rodGeo( V( bx + bw / 2, by - bh / 2, z ), V( bx + bw / 2, by + bh / 2, z ), wire, 3 ), MAT.metal, bcol );
		add( rodGeo( V( x, by - bh / 2, - bd / 2 ), V( x, by + bh / 2, - bd / 2 ), wire, 3 ), MAT.metal, bcol );
		add( rodGeo( V( x, by - bh / 2, bd / 2 ), V( x, by + bh / 2, bd / 2 ), wire, 3 ), MAT.metal, bcol );
		add( rodGeo( V( bx - bw / 2, by - bh / 2, z ), V( bx + bw / 2, by - bh / 2, z ), wire, 3 ), MAT.metal, bcol );

	}

	add( rodGeo( V( bx - 0.1, by - bh / 2, 0 ), V( front.x, front.y + 0.02, 0.04 ), 0.006, 4 ), MAT.metal, bcol ); // basket stays
	add( rodGeo( V( bx - 0.1, by - bh / 2, 0 ), V( front.x, front.y + 0.02, - 0.04 ), 0.006, 4 ), MAT.metal, bcol );
	add( rodGeo( V( bx - bw / 2, by, 0 ), V( 0.36, 0.95, 0 ), 0.008, 4 ), MAT.metal, bcol );

	// front lamp (dynamo LED) + small lens
	add( new THREE.CylinderGeometry( 0.03, 0.034, 0.07, 10 ), MAT.extPlastic, 0x202020, M( 0.56, 0.62, 0, 0, 0, Math.PI / 2 ) );
	add( new THREE.CircleGeometry( 0.026, 10 ), MAT.emit, new THREE.Color( 1.6, 1.5, 1.2 ), M( 0.596, 0.62, 0, 0, Math.PI / 2 ) );

	// ---- saddle + seatpost ----
	add( rodGeo( seatTop, V( - 0.27, 0.96 ), 0.013, 6 ), MAT.chrome, silver );
	add( new THREE.SphereGeometry( 1, 16, 8 ), MAT.rubber, 0x2b1d14, M( - 0.29, 0.99, 0, 0, 0, 0.05, 0.15, 0.045, 0.11 ) );
	add( new THREE.SphereGeometry( 1, 10, 6 ), MAT.rubber, 0x2b1d14, M( - 0.17, 0.985, 0, 0, 0, 0.05, 0.07, 0.03, 0.045 ) );
	for ( const s of [ - 1, 1 ] ) add( new THREE.TorusGeometry( 0.018, 0.005, 4, 10 ), MAT.chrome, silver, M( - 0.36, 0.95, s * 0.06, 0, Math.PI / 2 ) );

	// ---- drivetrain ----
	add( new THREE.CylinderGeometry( 0.1, 0.1, 0.006, 24 ), MAT.chrome, silver, M( bb.x, bb.y, 0.06, Math.PI / 2 ) );
	add( new THREE.CylinderGeometry( 0.038, 0.038, 0.006, 12 ), MAT.chrome, silver, M( rear.x, rear.y, 0.06, Math.PI / 2 ) );
	const crankA = 0.6;
	for ( const s of [ - 1, 1 ] ) {

		const a = s > 0 ? crankA : crankA + Math.PI;
		const end = V( bb.x + Math.cos( a ) * 0.16, bb.y + Math.sin( a ) * 0.16, s * 0.085 );
		add( rodGeo( V( bb.x, bb.y, s * 0.075 ), end, 0.011, 6, false ), MAT.chrome, silver );
		add( new THREE.BoxGeometry( 0.09, 0.022, 0.08 ), MAT.rubber, black, M( end.x, end.y, s * 0.13 ) );
		add( new THREE.BoxGeometry( 0.012, 0.008, 0.03 ), MAT.emit, new THREE.Color( 1.4, 0.6, 0.1 ), M( end.x + 0.046, end.y, s * 0.13 ) ); // pedal reflectors

	}

	// chain case (full chain guard)
	const cs = new THREE.Shape();
	cs.moveTo( bb.x + 0.13, bb.y + 0.0 );
	cs.absarc( bb.x, bb.y, 0.13, 0, Math.PI * 0.5, false );
	cs.lineTo( rear.x, rear.y + 0.06 );
	cs.absarc( rear.x, rear.y, 0.06, Math.PI * 0.5, Math.PI * 1.5, false );
	cs.lineTo( bb.x, bb.y - 0.13 );
	cs.absarc( bb.x, bb.y, 0.13, Math.PI * 1.5, Math.PI * 2, false );
	const ce = new THREE.ExtrudeGeometry( cs, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 1, curveSegments: 8 } );
	add( ce, MAT.extPaint, 0xc7cbd0, M( 0, 0, 0.07 ) );

	// ---- rear carrier ----
	const cy = 0.74;
	for ( const s of [ - 1, 1 ] ) {

		add( rodGeo( V( - 0.26, cy, s * 0.09 ), V( - 0.84, cy, s * 0.09 ), 0.007, 4 ), MAT.chrome, silver );
		add( rodGeo( V( - 0.8, cy, s * 0.09 ), V( rear.x, rear.y, s * 0.06 ), 0.007, 4 ), MAT.chrome, silver );
		add( rodGeo( V( - 0.5, cy, s * 0.09 ), V( rear.x + 0.02, rear.y + 0.02, s * 0.06 ), 0.006, 4 ), MAT.chrome, silver );

	}

	for ( let i = 0; i < 5; i ++ ) add( rodGeo( V( - 0.3 - i * 0.13, cy, - 0.09 ), V( - 0.3 - i * 0.13, cy, 0.09 ), 0.006, 4 ), MAT.chrome, silver );
	add( rodGeo( V( - 0.24, cy, 0 ), V( - 0.22, 0.78, 0 ), 0.008, 4 ), MAT.chrome, silver );

	// rear reflector + tail
	add( new THREE.BoxGeometry( 0.012, 0.05, 0.07 ), MAT.emit, new THREE.Color( 1.5, 0.08, 0.05 ), M( - 0.86, 0.69, 0 ) );
	add( new THREE.BoxGeometry( 0.01, 0.035, 0.05 ), MAT.emit, new THREE.Color( 0.9, 0.05, 0.03 ), M( rear.x - R - 0.05, 0.43, 0, 0, 0, - 0.4 ) );

	// rear wheel ring lock (on seat stays, around the tyre)
	add( new THREE.TorusGeometry( 0.06, 0.012, 6, 16, Math.PI * 1.2 ), MAT.extPlastic, 0x1a1a1a, M( rear.x + 0.16, rear.y + 0.17, 0, Math.PI / 2, 0, 0, 1, 1, 0.7 ) );
	add( new THREE.BoxGeometry( 0.08, 0.05, 0.06 ), MAT.metal, 0x2a2d33, M( rear.x + 0.2, rear.y + 0.24, 0 ) );
	add( new THREE.BoxGeometry( 0.02, 0.012, 0.01 ), MAT.chrome, 0xd8c070, M( rear.x + 0.2, rear.y + 0.24, 0.035 ) ); // key

	// rear centre stand (両立スタンド)
	for ( const s of [ - 1, 1 ] ) add( rodGeo( V( rear.x, rear.y, s * 0.07 ), V( rear.x - 0.12, 0.01, s * 0.11 ), 0.008, 5 ), MAT.chrome, silver );
	add( rodGeo( V( rear.x - 0.12, 0.012, - 0.11 ), V( rear.x - 0.12, 0.012, 0.11 ), 0.008, 5 ), MAT.chrome, silver );

	// dress guard on rear wheel
	add( new THREE.CylinderGeometry( R + 0.01, R + 0.01, 0.002, 20, 1, false, Math.PI * 0.55, Math.PI * 0.5 ), MAT.extPlastic, 0x6a7a88, M( rear.x, rear.y, 0.1, Math.PI / 2 ) );

}
