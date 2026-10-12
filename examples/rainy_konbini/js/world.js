// 雨夜コンビニ — world module: building, street, neighbours, interior, colliders & data.
// buildWorld(scene, {renderer, quality}) → World (see SPEC.md)
import * as THREE from 'three';
import { Batcher, M as Mx, quadGeo, remapUV } from './world_util.js';
import { makeTextures } from './world_textures.js';
import { makeMaterials } from './world_mats.js';
import { buildExterior } from './world_exterior.js';
import { buildInterior } from './world_interior.js';

export function buildWorld( scene, { renderer = null, quality = 'high' } = {} ) {

	const Q = typeof quality === 'number' ? quality : ( { low: 0, medium: 1, high: 2, ultra: 2 }[ quality ] ?? 1 );
	const root = new THREE.Group();
	root.name = 'world';
	scene.add( root );

	const T = makeTextures( renderer, Q );
	const MAT = makeMaterials( T );
	const B = new Batcher();

	const ctx = {
		THREE, root, scene, renderer, Q, T, M: MAT, B,
		colliders: [], interactables: [], rainBlockers: [], outdoorGround: [], updaters: [],
		lights: {}, lightsInfo: [], highlights: {}, door: null,
	};

	// ---------- helper shorthands ----------
	ctx.box = ( mat, col, w, h, d, x, y, z, ry = 0, opts ) => B.add( new THREE.BoxGeometry( w, h, d ), mat, Mx( x, y, z, 0, ry, 0 ), col, opts );
	ctx.bx = ( mat, col, x0, x1, y0, y1, z0, z1, opts ) => B.add( new THREE.BoxGeometry( x1 - x0, y1 - y0, z1 - z0 ), mat, Mx( ( x0 + x1 ) / 2, ( y0 + y1 ) / 2, ( z0 + z1 ) / 2 ), col, opts );
	ctx.cyl = ( mat, col, rt, rb, h, seg, x, y, z, rx = 0, ry = 0, rz = 0, opts ) => B.add( new THREE.CylinderGeometry( rt, rb, h, seg ), mat, Mx( x, y, z, rx, ry, rz ), col, opts );
	// atlas quad facing +Z (rotated by ry around Y; rx tilts)
	ctx.quad = ( mat, rect, w, h, x, y, z, ry = 0, col = 0xffffff, rx = 0 ) => B.add( quadGeo( w, h, rect ), mat, Mx( x, y, z, rx, ry, 0 ), col );
	ctx.collide = ( minX, maxX, minZ, maxZ, maxY ) => {

		const c = { minX: Math.min( minX, maxX ), maxX: Math.max( minX, maxX ), minZ: Math.min( minZ, maxZ ), maxZ: Math.max( minZ, maxZ ) };
		if ( maxY !== undefined ) c.maxY = maxY;
		ctx.colliders.push( c );
		return c;

	};

	ctx.addHighlight = ( id, w, h, d, x, y, z ) => {

		const mat = new THREE.MeshBasicMaterial( { color: new THREE.Color( 1.0, 0.75, 0.35 ), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false } );
		const mesh = new THREE.Mesh( new THREE.BoxGeometry( w, h, d ), mat );
		mesh.position.set( x, y, z );
		mesh.visible = false;
		mesh.renderOrder = 5;
		mesh.name = 'highlight:' + id;
		root.add( mesh );
		ctx.highlights[ id ] = { mesh, v: 0, target: 0 };

	};

	buildExterior( ctx );
	buildInterior( ctx );

	B.build( root, 'static' );

	// shadows: only casting meshes flagged by material; keep receivers
	root.traverse( o => {

		if ( o.isMesh && o.material && o.material.transparent ) o.receiveShadow = false;

	} );

	// ---------- play bounds ----------
	ctx.collide( - 19, - 18, - 13, 26, 99 );
	ctx.collide( 20, 21, - 13, 26, 99 );
	ctx.collide( - 19, 21, 24, 25, 99 );
	ctx.collide( - 19, 21, - 12.6, - 11.6, 99 );

	// ---------- API ----------
	const groundHeight = ( x, z ) => {

		const ramp = ( v, a, b ) => Math.min( 1, Math.max( 0, ( v - a ) / ( b - a ) ) );
		if ( z >= 8.7 && z <= 12.05 ) return 0.12 * ramp( z, 8.7, 9.0 );
		if ( z > 12.05 && z < 12.2 ) return 0.12 * ( 1 - ramp( z, 12.05, 12.2 ) );
		if ( z > 21.8 && z <= 25.5 ) return 0.12 * ramp( z, 21.8, 21.95 );
		return 0;

	};

	const isInside = ( x, z ) => x > - 8 && x < 8 && z > - 12 && z < 0;

	const _hl = ctx.highlights;
	const world = {
		root,
		colliders: ctx.colliders,
		door: ctx.door,
		interactables: ctx.interactables,
		rainBlockers: ctx.rainBlockers,
		outdoorGround: ctx.outdoorGround,
		lights: ctx.lights,
		lightsInfo: ctx.lightsInfo,
		materials: MAT,
		textures: T,
		groundHeight,
		isInside,
		highlight( id, on ) {

			const h = _hl[ id ];
			if ( h ) h.target = on ? 1 : 0;

		},
		update( dt, t, playerPos ) {

			for ( const u of ctx.updaters ) u( dt, t, playerPos );
			for ( const id in _hl ) {

				const h = _hl[ id ];
				h.v += ( h.target - h.v ) * Math.min( 1, dt * 6 );
				h.mesh.visible = h.v > 0.01;
				if ( h.mesh.visible ) h.mesh.material.opacity = h.v * ( 0.22 + 0.12 * Math.sin( t * 4 ) );

			}

		},
	};

	return world;

}

export { quadGeo, remapUV };
