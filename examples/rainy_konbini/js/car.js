import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// A Japanese-style taxi that periodically drives past on the wet road.
// Brakes (and honks) when the player stands in its lane.

function canvasTex( w, h, draw ) {

	const c = document.createElement( 'canvas' );
	c.width = w; c.height = h;
	draw( c.getContext( '2d' ), w, h );
	const t = new THREE.CanvasTexture( c );
	t.colorSpace = THREE.SRGBColorSpace;
	t.anisotropy = 4;
	return t;

}

const JP = '"Hiragino Kaku Gothic ProN","Noto Sans JP","Noto Sans CJK JP","Yu Gothic","Meiryo",sans-serif';

function buildTaxi() {

	const g = new THREE.Group();

	// body profile (side view, x = length, y = height), extruded across width
	const L = 4.4, W = 1.7;
	const s = new THREE.Shape();
	s.moveTo( - L / 2, 0.32 );
	s.lineTo( - L / 2, 0.78 );
	s.quadraticCurveTo( - L / 2 + 0.05, 0.92, - L / 2 + 0.35, 0.94 );
	s.lineTo( - 1.25, 0.98 );
	s.lineTo( - 0.95, 1.42 );
	s.quadraticCurveTo( - 0.9, 1.47, - 0.75, 1.47 );
	s.lineTo( 0.55, 1.47 );
	s.quadraticCurveTo( 0.68, 1.47, 0.75, 1.40 );
	s.lineTo( 1.15, 0.98 );
	s.lineTo( L / 2 - 0.3, 0.92 );
	s.quadraticCurveTo( L / 2, 0.9, L / 2, 0.72 );
	s.lineTo( L / 2, 0.32 );
	s.lineTo( - L / 2, 0.32 );
	const bodyGeo = new THREE.ExtrudeGeometry( s, { depth: W, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3, curveSegments: 8 } );
	bodyGeo.translate( 0, 0, - W / 2 );

	const paint = new THREE.MeshPhysicalMaterial( { color: 0x1a1d24, metalness: 0.6, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 } );
	const body = new THREE.Mesh( bodyGeo, paint );
	body.castShadow = true;
	g.add( body );

	// yellow lower band (classic two-tone taxi)
	const band = new THREE.Mesh( new THREE.BoxGeometry( L + 0.1, 0.16, W + 0.13 ), new THREE.MeshPhysicalMaterial( { color: 0xd9a51c, roughness: 0.3, clearcoat: 1 } ) );
	band.position.y = 0.62;
	g.add( band );

	// glass
	const glass = new THREE.MeshPhysicalMaterial( { color: 0x0c1118, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.82 } );
	const cabin = new THREE.Shape();
	cabin.moveTo( - 1.18, 1.0 ); cabin.lineTo( - 0.92, 1.38 ); cabin.lineTo( 0.6, 1.38 ); cabin.lineTo( 1.06, 1.0 ); cabin.lineTo( - 1.18, 1.0 );
	const cabGeo = new THREE.ExtrudeGeometry( cabin, { depth: W + 0.1, bevelEnabled: false } );
	cabGeo.translate( 0, 0, - ( W + 0.1 ) / 2 );
	g.add( new THREE.Mesh( cabGeo, glass ) );
	// pillars
	const pil = new THREE.Mesh( new THREE.BoxGeometry( 0.08, 0.42, W + 0.14 ), paint );
	pil.position.set( - 0.15, 1.19, 0 );
	g.add( pil );

	// roof lamp (andon)
	const andonTex = canvasTex( 256, 96, ( c, w, h ) => {

		const gr = c.createLinearGradient( 0, 0, 0, h ); gr.addColorStop( 0, '#fff3c4' ); gr.addColorStop( 1, '#ffc94a' );
		c.fillStyle = gr; c.fillRect( 0, 0, w, h );
		c.fillStyle = '#7a1d10'; c.font = `bold 56px ${JP}`; c.textAlign = 'center'; c.textBaseline = 'middle';
		c.fillText( '個人タクシー', w / 2, h / 2 + 2 );

	} );
	const andon = new THREE.Mesh( new THREE.BoxGeometry( 0.62, 0.16, 0.22 ), [
		new THREE.MeshStandardMaterial( { color: 0xffd36a, emissive: 0xffb43a, emissiveIntensity: 1.5 } ),
		new THREE.MeshStandardMaterial( { color: 0xffd36a, emissive: 0xffb43a, emissiveIntensity: 1.5 } ),
		new THREE.MeshStandardMaterial( { color: 0xffd36a, emissive: 0xffb43a, emissiveIntensity: 1.5 } ),
		new THREE.MeshStandardMaterial( { color: 0xffd36a, emissive: 0xffb43a, emissiveIntensity: 1.5 } ),
		new THREE.MeshStandardMaterial( { map: andonTex, emissiveMap: andonTex, emissive: 0xffffff, emissiveIntensity: 2.2 } ),
		new THREE.MeshStandardMaterial( { map: andonTex, emissiveMap: andonTex, emissive: 0xffffff, emissiveIntensity: 2.2 } )
	] );
	andon.rotation.y = Math.PI / 2;
	andon.position.set( - 0.15, 1.6, 0 );
	g.add( andon );

	// 空車 sign in windscreen (red, glowing)
	const kusha = canvasTex( 128, 64, ( c, w, h ) => {

		c.fillStyle = '#100'; c.fillRect( 0, 0, w, h );
		c.fillStyle = '#ff3b2f'; c.font = `bold 44px ${JP}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText( '空車', w / 2, h / 2 );

	} );
	const sign = new THREE.Mesh( new THREE.PlaneGeometry( 0.28, 0.14 ), new THREE.MeshBasicMaterial( { map: kusha, toneMapped: false } ) );
	sign.position.set( 0.92, 1.08, 0.45 );
	sign.rotation.y = Math.PI / 2;
	sign.rotation.x = - 0.2;
	g.add( sign );

	// wheels
	const tyreGeo = new THREE.CylinderGeometry( 0.31, 0.31, 0.2, 24 );
	tyreGeo.rotateX( Math.PI / 2 );
	const hubGeo = new THREE.CylinderGeometry( 0.19, 0.19, 0.21, 16 );
	hubGeo.rotateX( Math.PI / 2 );
	const tyreMat = new THREE.MeshStandardMaterial( { color: 0x0c0c0d, roughness: 0.6 } );
	const hubMat = new THREE.MeshStandardMaterial( { color: 0xb8bcc4, metalness: 1, roughness: 0.3 } );
	g.wheels = [];
	for ( const [ x, z ] of [ [ - 1.35, 0.78 ], [ - 1.35, - 0.78 ], [ 1.4, 0.78 ], [ 1.4, - 0.78 ] ] ) {

		const w = new THREE.Group();
		w.add( new THREE.Mesh( tyreGeo, tyreMat ), new THREE.Mesh( hubGeo, hubMat ) );
		w.position.set( x, 0.31, z );
		g.add( w );
		g.wheels.push( w );

	}

	// lights
	const headMat = new THREE.MeshStandardMaterial( { color: 0xffffff, emissive: 0xfff1d6, emissiveIntensity: 9 } );
	const tailMat = new THREE.MeshStandardMaterial( { color: 0x550000, emissive: 0xff1a12, emissiveIntensity: 3 } );
	g.tailMat = tailMat;
	const headGeo = mergeGeometries( [ - 0.6, 0.6 ].map( z => new THREE.BoxGeometry( 0.06, 0.12, 0.32 ).translate( L / 2 + 0.03, 0.78, z ) ) );
	const tailGeo = mergeGeometries( [ - 0.66, 0.66 ].map( z => new THREE.BoxGeometry( 0.06, 0.1, 0.26 ).translate( - L / 2 - 0.03, 0.8, z ) ) );
	g.add( new THREE.Mesh( headGeo, headMat ), new THREE.Mesh( tailGeo, tailMat ) );

	// front grille + bumpers + plates
	const dark = new THREE.MeshStandardMaterial( { color: 0x0a0a0c, roughness: 0.5, metalness: 0.4 } );
	const chrome = new THREE.MeshStandardMaterial( { color: 0xcfd3da, metalness: 1, roughness: 0.18 } );
	const grille = new THREE.Mesh( new THREE.BoxGeometry( 0.05, 0.2, 0.75 ), chrome );
	grille.position.set( L / 2 + 0.04, 0.6, 0 );
	g.add( grille );
	for ( const x of [ L / 2 + 0.05, - L / 2 - 0.05 ] ) {

		const bump = new THREE.Mesh( new THREE.BoxGeometry( 0.12, 0.14, W + 0.05 ), dark );
		bump.position.set( x, 0.4, 0 );
		g.add( bump );
		const plate = new THREE.Mesh( new THREE.BoxGeometry( 0.02, 0.17, 0.33 ), new THREE.MeshStandardMaterial( { color: 0xeef2e8, roughness: 0.5 } ) );
		plate.position.set( x + Math.sign( x ) * 0.07, 0.42, 0 );
		g.add( plate );

	}

	// mirrors (fender mirrors, very JP-taxi)
	for ( const z of [ - 0.72, 0.72 ] ) {

		const m = new THREE.Mesh( new THREE.BoxGeometry( 0.06, 0.1, 0.1 ), dark );
		m.position.set( 1.75, 1.02, z );
		g.add( m );

	}

	return g;

}

export class Taxi {

	constructor( scene, sound ) {

		this.mesh = buildTaxi();
		this.mesh.visible = false;
		scene.add( this.mesh );
		this.sound = sound;

		this.spot = new THREE.SpotLight( 0xfff0d8, 220, 40, 0.42, 0.45, 1.5 );
		this.spot.position.set( 2.1, 0.8, 0 );
		this.spot.target.position.set( 14, - 0.5, 0 );
		this.mesh.add( this.spot, this.spot.target );

		this.tailGlow = new THREE.PointLight( 0xff2010, 3, 6, 2 );
		this.tailGlow.position.set( - 2.5, 0.8, 0 );
		this.mesh.add( this.tailGlow );

		this.timer = 6;
		this.active = false;
		this.dir = 1;
		this.x = 0;
		this.v = 0;
		this.cruise = 11;
		this.honked = false;

	}

	get position() {

		return this.mesh.position;

	}

	lightInfo() {

		if ( ! this.active ) return null;
		const p = this.mesh.position;
		return { position: new THREE.Vector3( p.x + this.dir * 4, 1.0, p.z ), color: new THREE.Color( 1, 0.94, 0.82 ), intensity: 1.4, radius: 7 };

	}

	update( dt, playerPos, camera, rain ) {

		if ( ! this.active ) {

			this.timer -= dt;
			if ( this.timer <= 0 ) {

				this.active = true;
				this.dir = Math.random() < 0.5 ? 1 : - 1;
				this.z = this.dir > 0 ? 14.6 : 19.4; // keep-left traffic (Japan): heading +x, the left side is -z
				this.x = - 60 * this.dir;
				this.v = this.cruise;
				this.honked = false;
				this.mesh.visible = true;
				this.mesh.rotation.y = this.dir > 0 ? 0 : Math.PI;

			}

			if ( this.sound ) this.sound.carPass( 0, 1e3, 0 );
			return;

		}

		// player in our lane ahead?
		const ahead = ( playerPos.x - this.x ) * this.dir;
		const inLane = Math.abs( playerPos.z - this.z ) < 1.8 && playerPos.y < 0.5;
		let target = this.cruise;
		if ( inLane && ahead > 0 && ahead < 16 ) {

			target = ahead < 6 ? 0 : this.cruise * ( ahead - 6 ) / 10;
			if ( ! this.honked && ahead < 11 ) {

				this.honked = true;
				if ( this.sound ) this.sound.horn();

			}

		}

		const accel = target < this.v ? 9 : 3;
		this.v += Math.sign( target - this.v ) * Math.min( Math.abs( target - this.v ), accel * dt );
		this.x += this.v * this.dir * dt;
		this.mesh.position.set( this.x, 0, this.z );
		const braking = target < this.v - 0.5 || this.v < 0.5;
		this.mesh.tailMat.emissiveIntensity = braking ? 7 : 2.5;
		this.tailGlow.intensity = braking ? 8 : 2.5;
		for ( const w of this.mesh.wheels ) w.rotation.z -= this.v * dt / 0.31;

		// tyre spray
		if ( rain && this.v > 3 ) {

			for ( const side of [ - 0.8, 0.8 ] ) {

				const bx = this.x - this.dir * 1.4, bz = this.z + side;
				rain.spray( bx, 0.1, bz, - this.dir * this.v * 0.25, side * 1.2, Math.round( this.v * 0.25 ) );

			}

		}

		if ( this.sound && camera ) {

			const dx = this.x - camera.position.x, dz = this.z - camera.position.z;
			const d = Math.hypot( dx, dz );
			const right = new THREE.Vector3( 1, 0, 0 ).applyQuaternion( camera.quaternion );
			const pan = ( dx * right.x + dz * right.z ) / Math.max( 1, d );
			this.sound.carPass( pan, d, this.v );

		}

		if ( Math.abs( this.x ) > 62 ) {

			this.active = false;
			this.mesh.visible = false;
			this.timer = 14 + Math.random() * 14;

		}

	}

}
