// Shared helpers for world.js: geometry batching (merge by material), atlas canvases, text helpers.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const JP = '"Hiragino Kaku Gothic ProN","Noto Sans JP","Noto Sans CJK JP","Yu Gothic","Meiryo",sans-serif';
export const font = ( px, w = 700 ) => `${w} ${Math.round( px )}px ${JP}`;

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
const UP = new THREE.Vector3( 0, 1, 0 );

/** Compose a matrix: position, euler rotation (rx,ry,rz), scale. */
export function M( x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 ) {
	return new THREE.Matrix4().compose( _p.set( x, y, z ), _q.setFromEuler( _e.set( rx, ry, rz ) ), _s.set( sx, sy, sz ) );
}

/** Merge-by-material geometry accumulator. Every geometry is converted to non-indexed {position, normal, uv[, color]}. */
export class Batcher {

	constructor() {

		this.groups = new Map();

	}

	add( geo, mat, matrix = null, color = null, opts = {} ) {

		const cast = opts.cast ?? mat.userData.cast ?? false;
		const key = mat.uuid + ( cast ? '|c' : '' );
		let g = this.groups.get( key );
		if ( ! g ) {

			g = { mat, cast, geos: [] };
			this.groups.set( key, g );

		}

		const gg = geo.index ? geo.toNonIndexed() : geo.clone();
		for ( const name of Object.keys( gg.attributes ) ) if ( name !== 'position' && name !== 'normal' && name !== 'uv' ) gg.deleteAttribute( name );
		const n = gg.attributes.position.count;
		if ( ! gg.attributes.uv ) gg.setAttribute( 'uv', new THREE.Float32BufferAttribute( new Float32Array( n * 2 ), 2 ) );
		if ( ! gg.attributes.normal ) gg.computeVertexNormals();
		if ( matrix ) gg.applyMatrix4( matrix );
		if ( mat.vertexColors ) {

			const c = color instanceof THREE.Color ? color : new THREE.Color( color ?? 0xffffff );
			const a = new Float32Array( n * 3 );
			for ( let i = 0; i < n; i ++ ) {

				a[ i * 3 ] = c.r; a[ i * 3 + 1 ] = c.g; a[ i * 3 + 2 ] = c.b;

			}

			gg.setAttribute( 'color', new THREE.BufferAttribute( a, 3 ) );

		}

		gg.morphAttributes = {};
		gg.clearGroups();
		g.geos.push( gg );
		return this;

	}

	build( parent, name = 'batch' ) {

		const meshes = [];
		for ( const g of this.groups.values() ) {

			if ( ! g.geos.length ) continue;
			const merged = mergeGeometries( g.geos, false );
			if ( ! merged ) {

				console.warn( 'merge failed', g.mat.name );
				continue;

			}

			merged.computeBoundingSphere();
			const mesh = new THREE.Mesh( merged, g.mat );
			mesh.name = name + ':' + ( g.mat.name || 'mat' );
			mesh.castShadow = g.cast;
			mesh.receiveShadow = g.mat.userData.receive ?? true;
			mesh.matrixAutoUpdate = false;
			mesh.updateMatrix();
			parent.add( mesh );
			meshes.push( mesh );
			g.geos.length = 0;

		}

		this.groups.clear();
		return meshes;

	}

}

/** Cylinder rod between two points. */
export function rodGeo( a, b, r, seg = 6, open = true ) {

	const d = new THREE.Vector3().subVectors( b, a );
	const len = d.length();
	const g = new THREE.CylinderGeometry( r, r, len, seg, 1, open );
	_q.setFromUnitVectors( UP, d.normalize() );
	_m.compose( _p.addVectors( a, b ).multiplyScalar( 0.5 ), _q, _s.set( 1, 1, 1 ) );
	g.applyMatrix4( _m );
	return g;

}

export function tubeGeo( pts, r, segs = 24, radial = 6, closed = false ) {

	const curve = new THREE.CatmullRomCurve3( pts.map( p => p.isVector3 ? p : new THREE.Vector3( ...p ) ), closed );
	return new THREE.TubeGeometry( curve, segs, r, radial, closed );

}

/** Catenary-ish sagging wire between a and b. */
export function wireGeo( a, b, sag, r = 0.012, segs = 24 ) {

	const pts = [];
	for ( let i = 0; i <= 8; i ++ ) {

		const t = i / 8;
		const p = new THREE.Vector3().lerpVectors( a, b, t );
		p.y -= sag * 4 * t * ( 1 - t );
		pts.push( p );

	}

	return tubeGeo( pts, r, segs, 4 );

}

/** Plane w×h whose uvs map to an atlas rect ({u0,v0,u1,v1}). */
export function quadGeo( w, h, rect ) {

	const g = new THREE.PlaneGeometry( w, h );
	if ( rect ) remapUV( g, rect );
	return g;

}

export function remapUV( g, rect ) {

	const uv = g.attributes.uv;
	for ( let i = 0; i < uv.count; i ++ ) uv.setXY( i, rect.u0 + uv.getX( i ) * ( rect.u1 - rect.u0 ), rect.v0 + uv.getY( i ) * ( rect.v1 - rect.v0 ) );
	uv.needsUpdate = true;
	return g;

}

/** Scale uvs (for tiling textures by world size). */
export function scaleUV( g, su, sv ) {

	const uv = g.attributes.uv;
	for ( let i = 0; i < uv.count; i ++ ) uv.setXY( i, uv.getX( i ) * su, uv.getY( i ) * sv );
	uv.needsUpdate = true;
	return g;

}

/** Simple shelf-packing canvas atlas. */
export class Atlas {

	constructor( size = 1024, bg = null, scale = 1 ) {

		this.size = size;
		this.scale = scale;
		this.canvas = document.createElement( 'canvas' );
		this.canvas.width = this.canvas.height = size;
		this.ctx = this.canvas.getContext( '2d' );
		if ( bg ) {

			this.ctx.fillStyle = bg;
			this.ctx.fillRect( 0, 0, size, size );

		}

		this.x = 0; this.y = 0; this.rowH = 0; this.pad = 6;
		this.rects = {};
		this.items = [];
		this.packed = false;

	}

	draw( key, w0, h0, fn ) {

		const r = { aspect: w0 / h0 };
		this.items.push( { key, w0, h0, fn, r } );
		this.rects[ key ] = r;
		return r;

	}

	pack() {

		if ( this.packed ) return;
		this.packed = true;
		const S = this.size, k = this.scale, c = this.ctx;
		const items = this.items.slice().sort( ( a, b ) => b.h0 - a.h0 );
		for ( const it of items ) {

			const w = Math.ceil( it.w0 * k ), h = Math.ceil( it.h0 * k );
			if ( this.x + w > S ) {

				this.x = 0; this.y += this.rowH + this.pad; this.rowH = 0;

			}

			if ( this.y + h > S ) console.warn( 'atlas overflow', it.key );
			const x = this.x, y = this.y;
			this.x += w + this.pad;
			this.rowH = Math.max( this.rowH, h );
			c.save();
			c.translate( x, y );
			c.beginPath(); c.rect( 0, 0, w, h ); c.clip();
			c.scale( k, k );
			it.fn( c, it.w0, it.h0 );
			c.restore();
			Object.assign( it.r, { x, y, w, h, u0: ( x + 0.5 ) / S, u1: ( x + w - 0.5 ) / S, v0: 1 - ( y + h - 0.5 ) / S, v1: 1 - ( y + 0.5 ) / S } );

		}

	}

	texture( aniso = 4 ) {

		this.pack();
		const t = new THREE.CanvasTexture( this.canvas );
		t.colorSpace = THREE.SRGBColorSpace;
		t.anisotropy = aniso;
		return t;

	}

}

export function canvasTex( w, h, draw, { repeat = false, aniso = 4, srgb = true } = {} ) {

	const cv = document.createElement( 'canvas' );
	cv.width = w; cv.height = h;
	const c = cv.getContext( '2d' );
	draw( c, w, h );
	const t = new THREE.CanvasTexture( cv );
	if ( srgb ) t.colorSpace = THREE.SRGBColorSpace;
	t.anisotropy = aniso;
	if ( repeat ) t.wrapS = t.wrapT = THREE.RepeatWrapping;
	return t;

}

/** Draw text centred at (x,y) shrinking to fit maxW. */
export function fitText( c, text, x, y, maxW, px, weight = 700, align = 'center' ) {

	c.font = font( px, weight );
	const m = c.measureText( text ).width;
	if ( m > maxW ) c.font = font( px * maxW / m, weight );
	c.textAlign = align;
	c.textBaseline = 'middle';
	c.fillText( text, x, y );

}

/** Vertical (tategaki) text: one glyph per row. */
export function vText( c, text, x, y, px, step = 1.08, weight = 800 ) {

	c.font = font( px, weight );
	c.textAlign = 'center';
	c.textBaseline = 'middle';
	const chars = [ ...text ];
	chars.forEach( ( ch, i ) => {

		if ( ch === 'ー' || ch === '〜' || ch === '・' ) {

			c.save(); c.translate( x, y + i * px * step ); c.rotate( ch === '・' ? 0 : Math.PI / 2 ); c.fillText( ch, 0, 0 ); c.restore();

		} else c.fillText( ch, x, y + i * px * step );

	} );

}

export function roundRect( c, x, y, w, h, r ) {

	c.beginPath();
	c.moveTo( x + r, y );
	c.arcTo( x + w, y, x + w, y + h, r );
	c.arcTo( x + w, y + h, x, y + h, r );
	c.arcTo( x, y + h, x, y, r );
	c.arcTo( x, y, x + w, y, r );
	c.closePath();

}

/** Deterministic PRNG */
export function rng( seed = 1 ) {

	let s = seed >>> 0;
	return () => {

		s = ( s + 0x6D2B79F5 ) >>> 0;
		let t = s;
		t = Math.imul( t ^ ( t >>> 15 ), t | 1 );
		t ^= t + Math.imul( t ^ ( t >>> 7 ), t | 61 );
		return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296;

	};

}
