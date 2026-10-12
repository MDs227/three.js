// Shared materials. Most use vertexColors so many parts share one material (= one merged draw call).
import * as THREE from 'three';

export function makeMaterials( T ) {

	const std = ( name, p, ud = {} ) => {

		const m = new THREE.MeshStandardMaterial( { vertexColors: true, ...p } );
		m.name = name; Object.assign( m.userData, ud );
		return m;

	};

	const M = {};
	// ---- exterior (wet) ----
	M.extPaint = std( 'extPaint', { roughness: 0.2, metalness: 0.35 }, { cast: true } ); // painted metal, glossy wet
	M.extMatte = std( 'extMatte', { roughness: 0.42, metalness: 0.0 } ); // walls, concrete (wet)
	M.extPlastic = std( 'extPlastic', { roughness: 0.25, metalness: 0.0 }, { cast: true } );
	M.metal = std( 'metal', { roughness: 0.28, metalness: 0.9 }, { cast: true } );
	M.chrome = std( 'chrome', { roughness: 0.12, metalness: 1.0 }, { cast: true } );
	M.rubber = std( 'rubber', { roughness: 0.38, metalness: 0.0 }, { cast: true } );
	M.concrete = std( 'concrete', { roughness: 0.35, metalness: 0.0 }, { cast: true } );
	M.paint = std( 'roadPaint', { roughness: 0.3, metalness: 0.0, polygonOffset: true, polygonOffsetFactor: - 2, polygonOffsetUnits: - 2 } );
	M.asphalt = new THREE.MeshStandardMaterial( { name: 'asphalt', map: T.asphalt, color: 0x9a9ca0, roughness: 0.32, metalness: 0 } );
	M.sidewalk = new THREE.MeshStandardMaterial( { name: 'sidewalk', map: T.sidewalk, color: 0xa6a8ab, roughness: 0.3, metalness: 0 } );
	M.tactile = new THREE.MeshStandardMaterial( { name: 'tactile', map: T.tactile, color: 0xb8b0a0, roughness: 0.3, metalness: 0, polygonOffset: true, polygonOffsetFactor: - 1 } );
	M.siding = new THREE.MeshStandardMaterial( { name: 'siding', map: T.siding, roughness: 0.45, metalness: 0, vertexColors: true } );
	M.shutter = new THREE.MeshStandardMaterial( { name: 'shutter', map: T.shutter, bumpMap: T.shutter, bumpScale: 2, color: 0x8a9098, roughness: 0.25, metalness: 0.7 } );
	M.far = new THREE.MeshLambertMaterial( { name: 'far', vertexColors: true } );
	M.farWin = new THREE.MeshLambertMaterial( { name: 'farWin', map: T.farWin, emissiveMap: T.farWin, emissive: 0xffffff, emissiveIntensity: 1.1, vertexColors: true } );

	// ---- emissive (MeshBasic: values >1 in vertex colour / colour drive bloom) ----
	M.emit = new THREE.MeshBasicMaterial( { name: 'emit', vertexColors: true } );
	M.emitTex = new THREE.MeshBasicMaterial( { name: 'emitTex', map: T.emis, color: new THREE.Color( 1.6, 1.6, 1.6 ), vertexColors: true } );
	M.decal = new THREE.MeshStandardMaterial( { name: 'decal', map: T.decal, transparent: true, alphaTest: 0.05, roughness: 0.35, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: - 2, polygonOffsetUnits: - 2 } );
	M.decalLit = new THREE.MeshBasicMaterial( { name: 'decalLit', map: T.decal, transparent: true, alphaTest: 0.05, color: new THREE.Color( 1.25, 1.25, 1.25 ), depthWrite: false, polygonOffset: true, polygonOffsetFactor: - 2, polygonOffsetUnits: - 2 } );
	M.paintDecal = new THREE.MeshStandardMaterial( { name: 'paintDecal', map: T.decal, transparent: true, alphaTest: 0.1, roughness: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: - 3, polygonOffsetUnits: - 3 } );
	M.signBand = new THREE.MeshBasicMaterial( { name: 'signBand', map: T.signBand, color: new THREE.Color( 2.4, 2.4, 2.4 ) } );
	M.signLogo = new THREE.MeshBasicMaterial( { name: 'signLogo', map: T.signLogo, color: new THREE.Color( 2.6, 2.6, 2.6 ) } );
	M.sign24 = new THREE.MeshBasicMaterial( { name: 'sign24', map: T.sign24, color: new THREE.Color( 2.4, 2.4, 2.4 ) } );
	M.pylon = new THREE.MeshBasicMaterial( { name: 'pylon', map: T.pylon, color: new THREE.Color( 2.2, 2.2, 2.2 ) } );
	M.vend = new THREE.MeshBasicMaterial( { name: 'vend', map: T.vend, color: new THREE.Color( 1.7, 1.75, 1.85 ) } );
	M.flags = new THREE.MeshStandardMaterial( { name: 'flags', map: T.flags, roughness: 0.55, side: THREE.DoubleSide } );
	M.flags.userData.cast = true;

	// ---- glass ----
	M.glass = new THREE.MeshStandardMaterial( { name: 'glass', color: 0x9fb7c8, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false, envMapIntensity: 1.4 } );
	M.glassInt = new THREE.MeshStandardMaterial( { name: 'glassInt', color: 0xd8eaf5, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.12, depthWrite: false } );
	M.frost = new THREE.MeshStandardMaterial( { name: 'frost', map: T.frost, color: 0xffffff, roughness: 0.1, transparent: true, depthWrite: false } );

	// ---- interior ----
	M.intMatte = std( 'intMatte', { roughness: 0.75, metalness: 0 } );
	M.intGloss = std( 'intGloss', { roughness: 0.35, metalness: 0.05 } );
	M.intMetal = std( 'intMetal', { roughness: 0.35, metalness: 0.75 } );
	M.floor = new THREE.MeshStandardMaterial( { name: 'floor', map: T.floor, roughness: 0.16, metalness: 0 } );
	M.mags = new THREE.MeshStandardMaterial( { name: 'mags', map: T.mags, roughness: 0.4 } );
	M.cig = new THREE.MeshStandardMaterial( { name: 'cig', map: T.cig, emissiveMap: T.cig, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.4 } );
	M.prod = new THREE.MeshStandardMaterial( { name: 'prod', map: T.prod, roughness: 0.38, metalness: 0 } );
	M.prodLit = new THREE.MeshStandardMaterial( { name: 'prodLit', map: T.prod, emissiveMap: T.prod, emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0 } );
	M.skin = new THREE.MeshStandardMaterial( { name: 'skin', color: 0xf0c8a8, roughness: 0.6 } );

	return M;

}
