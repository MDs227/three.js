import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { buildWorld } from './world.js';
import { Girl } from './character.js';
import { Rain, makeLightCone } from './rain.js';
import { WetGround } from './wetground.js';
import { createPost } from './post.js';
import { SoundScape } from './audio.js';
import { Taxi } from './car.js';
import { createSky, createEnvironment } from './sky.js';
import { Hud } from './hud.js';

const params = new URLSearchParams( location.search );
const isTouch = matchMedia( '(pointer: coarse)' ).matches;
let quality = params.get( 'q' ) || safeGet( 'konbini.q' ) || ( isTouch ? 'medium' : 'high' );

function safeGet( k ) {

	try {

		return localStorage.getItem( k );

	} catch ( e ) {

		return null;

	}

}

function safeSet( k, v ) {

	try {

		localStorage.setItem( k, v );

	} catch ( e ) { /* private mode */ }

}

// ---------------------------------------------------------------- renderer / scene

const renderer = new THREE.WebGLRenderer( { antialias: false, powerPreference: 'high-performance' } );
const basePR = Math.min( window.devicePixelRatio, quality === 'high' ? 1.5 : quality === 'medium' ? 1.25 : 1 );
let dynPR = basePR;
renderer.setPixelRatio( dynPR );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = quality !== 'low';
renderer.shadowMap.type = THREE.PCFShadowMap;
document.getElementById( 'app' ).appendChild( renderer.domElement );
RectAreaLightUniformsLib.init();

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x070d18 );
scene.fog = new THREE.FogExp2( 0x0b1626, 0.028 );
scene.environment = createEnvironment( renderer );
scene.environmentIntensity = 0.7;
const sky = createSky( scene );

const camera = new THREE.PerspectiveCamera( 55, window.innerWidth / window.innerHeight, 0.05, 420 );

// cold night ambience
const hemi = new THREE.HemisphereLight( 0x46679e, 0x0a0d14, 0.12 ); // world.js owns the main ambient; this one carries lightning flashes
scene.add( hemi );
const moon = new THREE.DirectionalLight( 0x7d9cd6, 0.35 );
moon.position.set( - 20, 30, 25 );
scene.add( moon );

// ---------------------------------------------------------------- world, actors, fx

const world = buildWorld( scene, { renderer, quality } );
const girl = new Girl( { quality } );
scene.add( girl.root );

const sound = new SoundScape();
const rain = new Rain( scene, { quality } );
const wet = new WetGround( scene, world.outdoorGround || [ { minX: - 40, maxX: 40, minZ: 0, maxZ: 40, y: 0 } ], { quality, renderer } );
rain.onRipple = ( x, z, s ) => wet.addRipple( x, z, s );
rain.eave = { minX: - 8, maxX: 8, z: 1.2, y: 3.0 };
rain.setBlockers( world.rainBlockers || [] );
if ( world.groundHeight ) rain.groundY = ( x, z ) => world.groundHeight( x, z );

const taxi = new Taxi( scene, sound );

const staticLights = ( world.lightsInfo || [] ).map( l => ( { ...l, color: l.color && l.color.isColor ? l.color : new THREE.Color( l.color ?? 0xffffff ) } ) );
for ( const l of staticLights ) {

	if ( l.cone ) scene.add( makeLightCone( { position: l.position, target: l.cone.target, angle: l.cone.angle, color: l.color, strength: 0.085 * ( l.intensity ?? 1 ) } ) );

}

const post = createPost( renderer, scene, camera, { quality } );

// objective marker: ground ring + soft beam
const marker = new THREE.Group();
{

	const ringMat = new THREE.MeshBasicMaterial( { color: 0x6fffd0, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false } );
	const ring = new THREE.Mesh( new THREE.RingGeometry( 0.42, 0.5, 48 ), ringMat );
	ring.rotation.x = - Math.PI / 2;
	ring.position.y = 0.02;
	marker.add( ring );
	marker.ring = ring;
	const beamMat = new THREE.ShaderMaterial( {
		uniforms: { uTime: { value: 0 } },
		vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
		fragmentShader: 'uniform float uTime; varying vec2 vUv; void main(){ float a = (1.0 - vUv.y) * (0.6 + 0.4*sin(uTime*3.0 + vUv.y*12.0)); gl_FragColor = vec4(vec3(0.35,1.0,0.8) * a * 0.35, 1.0); }',
		transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
	} );
	const beam = new THREE.Mesh( new THREE.CylinderGeometry( 0.42, 0.46, 2.6, 32, 1, true ), beamMat );
	beam.position.y = 1.3;
	marker.add( beam );
	marker.beam = beam;
	scene.add( marker );

}

// wet footprints left on the shop floor
const prints = [];
{

	const g = new THREE.PlaneGeometry( 0.11, 0.26 );
	g.rotateX( - Math.PI / 2 );
	for ( let i = 0; i < 48; i ++ ) {

		const m = new THREE.Mesh( g, new THREE.MeshStandardMaterial( { color: 0x222831, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0, depthWrite: false } ) );
		m.visible = false;
		m.renderOrder = 2;
		scene.add( m );
		prints.push( { mesh: m, life: 0 } );

	}

}

let printIdx = 0;
function addPrint( p, heading, side, wetness ) {

	const fp = prints[ printIdx ];
	printIdx = ( printIdx + 1 ) % prints.length;
	fp.mesh.position.set( p.x, 0.004, p.z );
	fp.mesh.rotation.y = heading;
	fp.mesh.visible = true;
	fp.life = 1;
	fp.strength = 0.25 + 0.5 * wetness;

}

// ---------------------------------------------------------------- game state

const PRICES = { onigiri: 150, tea: 140, pudding: 230, nikuman: 180 };
const START = new THREE.Vector3( 3.6, 0.12, 23.6 );
const GOAL = { minX: - 3, maxX: 10, minZ: 22.6, maxZ: 25 };

const state = {
	phase: 'title', // title | play | end
	items: { onigiri: false, tea: false, pudding: false },
	money: 320,
	withdrawn: false,
	paid: false,
	nikuman: false,
	time: 0,
	wet: 0,
	enteredOnce: false,
	modal: null,
	photo: false,
	umbrellaManual: true
};

const player = {
	pos: START.clone(),
	heading: Math.PI,
	speed: 0,
	turnRate: 0,
	moveDir: new THREE.Vector3(),
	walk: false
};

const hud = new Hud( {
	onStart: startGame,
	onQuality: q => {

		safeSet( 'konbini.q', q );
		location.search = '?q=' + q;

	},
	onRestart: () => location.reload(),
	onPhoto: () => togglePhoto( true ),
	onAtm: amount => doWithdraw( amount ),
	onRegister: ( withNikuman ) => doPay( withNikuman ),
	onCloseModal: () => closeModal(),
	quality
} );
hud.setMoney( state.money );
hud.setList( state.items, PRICES );

// ---------------------------------------------------------------- input

const keys = {};
addEventListener( 'keydown', e => {

	if ( e.repeat ) return;
	keys[ e.code ] = true;
	if ( state.phase === 'title' && ( e.code === 'Enter' || e.code === 'Space' ) ) startGame();
	if ( state.modal ) {

		if ( e.code === 'Escape' ) closeModal();
		hud.modalKey( e.code );
		return;

	}

	if ( e.code === 'KeyE' || e.code === 'Enter' ) interact();
	if ( e.code === 'KeyQ' ) toggleUmbrella();
	if ( e.code === 'KeyZ' ) player.walk = ! player.walk;
	if ( e.code === 'KeyP' ) togglePhoto();
	if ( e.code === 'KeyH' ) hud.toggleHelp();
	if ( e.code === 'KeyM' ) sound.master && ( sound.master.gain.value = sound.master.gain.value > 0 ? 0 : 0.8 );

} );
addEventListener( 'keyup', e => {

	keys[ e.code ] = false;

} );
addEventListener( 'blur', () => {

	for ( const k in keys ) keys[ k ] = false;

} );

const cam = { yaw: 0, pitch: 0.22, dist: 4.4, tYaw: 0, tPitch: 0.22, tDist: 4.4, lastDrag: - 10, pos: new THREE.Vector3(), target: new THREE.Vector3() };
const joy = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
let drag = null;

renderer.domElement.addEventListener( 'pointerdown', e => {

	if ( state.modal ) return;
	if ( e.pointerType === 'touch' && e.clientX < window.innerWidth * 0.45 && state.phase === 'play' ) {

		joy.active = true; joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = 0; joy.y = 0;
		hud.showJoystick( e.clientX, e.clientY, 0, 0 );

	} else {

		drag = { id: e.pointerId, x: e.clientX, y: e.clientY };

	}

	renderer.domElement.setPointerCapture( e.pointerId );

} );
renderer.domElement.addEventListener( 'pointermove', e => {

	if ( joy.active && e.pointerId === joy.id ) {

		const dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
		const r = Math.min( 1, Math.hypot( dx, dy ) / 60 );
		const a = Math.atan2( dy, dx );
		joy.x = Math.cos( a ) * r; joy.y = - Math.sin( a ) * r;
		hud.showJoystick( joy.ox, joy.oy, joy.x * 50, - joy.y * 50 );

	} else if ( drag && e.pointerId === drag.id ) {

		const k = e.pointerType === 'touch' ? 0.006 : 0.0045;
		cam.tYaw -= ( e.clientX - drag.x ) * k;
		cam.tPitch = THREE.MathUtils.clamp( cam.tPitch + ( e.clientY - drag.y ) * k, - 0.15, state.photo ? 1.35 : 1.0 );
		drag.x = e.clientX; drag.y = e.clientY;
		cam.lastDrag = clock.getElapsed();

	}

} );
const endPointer = e => {

	if ( joy.active && e.pointerId === joy.id ) {

		joy.active = false; joy.x = joy.y = 0; hud.hideJoystick();

	}

	if ( drag && e.pointerId === drag.id ) drag = null;

};

renderer.domElement.addEventListener( 'pointerup', endPointer );
renderer.domElement.addEventListener( 'pointercancel', endPointer );
renderer.domElement.addEventListener( 'wheel', e => {

	cam.tDist = THREE.MathUtils.clamp( cam.tDist * ( 1 + Math.sign( e.deltaY ) * 0.1 ), 1.6, state.photo ? 14 : 8 );

}, { passive: true } );

hud.onTouchButton = ( id, down ) => {

	if ( id === 'sprint' ) keys.TouchSprint = down;
	if ( ! down ) return;
	if ( id === 'act' ) interact();
	if ( id === 'umb' ) toggleUmbrella();
	if ( id === 'photo' ) togglePhoto();

};

function toggleUmbrella() {

	if ( state.phase !== 'play' ) return;
	state.umbrellaManual = ! state.umbrellaManual;
	sound.umbrella( state.umbrellaManual );
	hud.toast( state.umbrellaManual ? '傘をさした　撐起傘' : '傘をたたんだ　收起傘（會淋濕喔）' );

}

function togglePhoto( force ) {

	if ( state.phase === 'title' ) return;
	state.photo = force ?? ! state.photo;
	hud.setPhoto( state.photo );
	if ( ! state.photo ) cam.tDist = Math.min( cam.tDist, 8 );

}

// ---------------------------------------------------------------- objectives & interactions

function currentObjective() {

	const it = state.items;
	if ( state.paid ) return { text: '家に帰ろう — 横断歩道を渡って向かいの歩道へ', sub: '回家吧：走過斑馬線到對面人行道', target: new THREE.Vector3( 3.6, 0.12, 23.6 ) };
	const inside = world.isInside( player.pos.x, player.pos.z );
	if ( ! inside && ! state.enteredOnce ) return { text: 'コンビニに入ろう', sub: '走進便利商店', target: new THREE.Vector3( 3.5, 0, 1.6 ) };
	const need = [ 'onigiri', 'tea', 'pudding' ].filter( k => ! it[ k ] );
	const total = PRICES.onigiri + PRICES.tea + PRICES.pudding;
	if ( need.length ) {

		// nearest missing item
		let best = null, bd = 1e9;
		for ( const id of need ) {

			const o = interactable( id );
			if ( ! o ) continue;
			const d = o.position.distanceTo( player.pos );
			if ( d < bd ) {

				bd = d; best = o;

			}

		}

		return { text: 'リストの商品を集めよう', sub: '收集購物清單上的商品', target: best ? best.position : null, highlight: need };

	}

	if ( state.money < total && ! state.withdrawn ) return { text: 'お金が足りない… ATMでおろそう', sub: '錢不夠…去 ATM 領錢', target: interactable( 'atm' )?.position, highlight: [ 'atm' ] };
	return { text: 'レジでお会計しよう', sub: '到櫃台結帳', target: interactable( 'register' )?.position, highlight: [ 'register' ] };

}

function interactable( id ) {

	return ( world.interactables || [] ).find( o => o.id === id );

}

let nearest = null;
function findNearest() {

	nearest = null;
	let bd = 1e9;
	for ( const o of world.interactables || [] ) {

		const d = Math.hypot( o.position.x - player.pos.x, o.position.z - player.pos.z );
		if ( d < ( o.radius || 1.2 ) && d < bd ) {

			bd = d; nearest = o;

		}

	}

	return nearest;

}

const LABELS = {
	onigiri: [ '鮭おにぎりを取る', '拿鮭魚飯糰 ¥150' ],
	tea: [ '冷たいお茶を取る', '拿冰綠茶 ¥140' ],
	pudding: [ 'とろけるプリンを取る', '拿焦糖布丁 ¥230' ],
	atm: [ 'ATMを使う', '使用 ATM' ],
	register: [ 'レジでお会計', '櫃台結帳' ],
	umbrella_stand: [ '傘立てを見る', '看看傘架' ]
};

function promptFor( o ) {

	if ( ! o ) return null;
	if ( state.items[ o.id ] ) return [ '（もう持っている）', '已經拿了' ];
	if ( o.id === 'atm' && state.withdrawn ) return [ 'ATM（お取引済み）', '已完成交易' ];
	if ( o.id === 'register' && state.paid ) return [ '「ありがとうございました〜」', '店員：謝謝光臨' ];
	return LABELS[ o.id ] || [ o.label || o.id, '' ];

}

function interact() {

	if ( state.phase !== 'play' || state.modal ) return;
	const o = findNearest();
	if ( ! o ) return;
	const id = o.id;
	if ( id in state.items ) {

		if ( state.items[ id ] ) return;
		state.items[ id ] = true;
		sound.pickup();
		hud.setList( state.items, PRICES );
		hud.toast( `${LABELS[ id ][ 0 ].replace( 'を取る', '' )} をカゴに入れた` );
		world.highlight?.( id, false );
		return;

	}

	if ( id === 'atm' ) {

		if ( state.withdrawn ) {

			hud.toast( 'もうお金はおろした　已經領過錢了' );
			return;

		}

		sound.beep( 1 );
		openModal( 'atm' );
		return;

	}

	if ( id === 'register' ) {

		if ( state.paid ) {

			hud.subtitle( '店員', 'またお越しくださいませ〜', '歡迎再度光臨～' );
			return;

		}

		const have = Object.values( state.items ).filter( Boolean ).length;
		if ( have < 3 ) {

			hud.subtitle( '店員', have ? 'ごゆっくりどうぞ〜' : 'いらっしゃいませ〜', 'リストの商品をそろえてから来よう（還有商品沒拿）' );
			return;

		}

		sound.beep( 3 );
		openModal( 'register' );
		return;

	}

	if ( id === 'umbrella_stand' ) {

		hud.toast( '忘れ物のビニール傘がいっぱい…　傘架裡全是被遺忘的透明傘…' );

	}

}

function openModal( kind ) {

	state.modal = kind;
	const total = PRICES.onigiri + PRICES.tea + PRICES.pudding;
	hud.openModal( kind, { money: state.money, total, prices: PRICES } );

}

function closeModal() {

	state.modal = null;
	hud.closeModal();

}

function doWithdraw( amount ) {

	sound.beep( 2 );
	setTimeout( () => {

		sound.cash();
		state.money += amount;
		state.withdrawn = true;
		hud.setMoney( state.money, true );

	}, 1600 );

}

function doPay( withNikuman ) {

	let total = PRICES.onigiri + PRICES.tea + PRICES.pudding;
	if ( withNikuman ) total += PRICES.nikuman;
	if ( state.money < total ) {

		closeModal();
		hud.subtitle( '店員', `お会計 ${total.toLocaleString()} 円です……`, 'お金が足りない！ATMでおろそう（錢不夠！去 ATM）' );
		return false;

	}

	state.money -= total;
	state.nikuman = withNikuman;
	state.paid = true;
	hud.setMoney( state.money, true );
	sound.cash();
	setTimeout( () => {

		closeModal();
		hud.subtitle( '店員', 'ありがとうございました〜！　お気をつけて〜', '謝謝光臨！雨天路滑請小心～' );
		hud.toast( withNikuman ? 'ほかほかの肉まんも買った！' : 'お会計完了！' );

	}, 1400 );
	return true;

}

function startGame( gesture = true ) {

	if ( state.phase !== 'title' ) return;
	state.phase = 'play';
	if ( gesture ) sound.start();
	hud.hideTitle();
	hud.showHelp( 9 );
	// fly from the establishing orbit into the follow boom
	const d = camera.position.clone().sub( cam.target );
	cam.dist = d.length();
	cam.yaw = Math.atan2( d.x, d.z );
	cam.pitch = Math.asin( THREE.MathUtils.clamp( d.y / cam.dist, - 1, 1 ) );
	cam.tYaw = player.heading + Math.PI;
	cam.tDist = 4.4;
	cam.tPitch = 0.2;
	cam.introStart = clock.getElapsed();

}

function endGame() {

	state.phase = 'end';
	const t = state.time;
	const wetPct = Math.round( state.wet * 100 );
	let rank = 'C';
	if ( t < 150 ) rank = 'B';
	if ( t < 110 && wetPct < 40 ) rank = 'A';
	if ( t < 85 && wetPct < 15 ) rank = 'S';
	hud.showEnd( { time: t, wet: wetPct, rank, nikuman: state.nikuman, change: state.money } );

}

// ---------------------------------------------------------------- simulation

const tmpV = new THREE.Vector3();
const ray = new THREE.Ray();
const box = new THREE.Box3();
const R = 0.28;

function collide( p ) {

	const list = world.colliders || [];
	for ( let pass = 0; pass < 2; pass ++ ) {

		for ( const c of list ) resolveBox( p, c );
		const d = world.door;
		if ( d && d.open < 0.8 ) resolveBox( p, d );

	}

}

function resolveBox( p, c ) {

	const cx = THREE.MathUtils.clamp( p.x, c.minX, c.maxX );
	const cz = THREE.MathUtils.clamp( p.z, c.minZ, c.maxZ );
	let dx = p.x - cx, dz = p.z - cz;
	const d2 = dx * dx + dz * dz;
	if ( d2 >= R * R ) return;
	if ( d2 > 1e-8 ) {

		const d = Math.sqrt( d2 );
		p.x = cx + dx / d * R;
		p.z = cz + dz / d * R;

	} else {

		// centre inside the box: push out along the shallowest axis
		const l = p.x - c.minX, r = c.maxX - p.x, b = p.z - c.minZ, f = c.maxZ - p.z;
		const m = Math.min( l, r, b, f );
		if ( m === l ) p.x = c.minX - R; else if ( m === r ) p.x = c.maxX + R; else if ( m === b ) p.z = c.minZ - R; else p.z = c.maxZ + R;

	}

}

function updatePlayer( dt ) {

	let ix = 0, iy = 0;
	if ( state.phase === 'play' && ! state.modal && ! state.photo ) {

		if ( keys.KeyW || keys.ArrowUp ) iy += 1;
		if ( keys.KeyS || keys.ArrowDown ) iy -= 1;
		if ( keys.KeyA || keys.ArrowLeft ) ix -= 1;
		if ( keys.KeyD || keys.ArrowRight ) ix += 1;
		ix += joy.x; iy += joy.y;

	}

	const mag = Math.min( 1, Math.hypot( ix, iy ) );
	const inside = world.isInside( player.pos.x, player.pos.z );
	const sprint = keys.ShiftLeft || keys.ShiftRight || keys.TouchSprint;
	let vmax = sprint ? 5.6 : player.walk ? 1.5 : 3.4;
	if ( inside && ! sprint ) vmax = Math.min( vmax, 2.0 ); // no running in the shop
	let targetSpeed = mag * vmax;

	if ( mag > 0.05 ) {

		const fx = - Math.sin( cam.yaw ), fz = - Math.cos( cam.yaw );
		const rx = Math.cos( cam.yaw ), rz = - Math.sin( cam.yaw );
		const mx = fx * iy + rx * ix, mz = fz * iy + rz * ix;
		const targetH = Math.atan2( mx, mz );
		let dh = targetH - player.heading;
		dh = Math.atan2( Math.sin( dh ), Math.cos( dh ) );
		const turnSpeed = THREE.MathUtils.lerp( 11, 5.5, Math.min( 1, player.speed / 5.6 ) );
		const step = THREE.MathUtils.clamp( dh, - turnSpeed * dt, turnSpeed * dt );
		player.heading += step;
		player.turnRate = THREE.MathUtils.lerp( player.turnRate, step / Math.max( dt, 1e-4 ), 1 - Math.exp( - dt * 10 ) );
		// sharp reversals: slow down first
		if ( Math.abs( dh ) > 2.2 ) targetSpeed *= 0.3;

	} else {

		player.turnRate = THREE.MathUtils.lerp( player.turnRate, 0, 1 - Math.exp( - dt * 8 ) );

	}

	const acc = targetSpeed > player.speed ? 6.5 : 11;
	player.speed += THREE.MathUtils.clamp( targetSpeed - player.speed, - acc * dt, acc * dt );

	const prev = player.pos.clone();
	player.pos.x += Math.sin( player.heading ) * player.speed * dt;
	player.pos.z += Math.cos( player.heading ) * player.speed * dt;
	collide( player.pos );
	// actual speed after collisions (sliding along walls)
	const moved = Math.hypot( player.pos.x - prev.x, player.pos.z - prev.z ) / Math.max( dt, 1e-4 );
	if ( moved < player.speed * 0.5 && player.speed > 0.5 ) player.speed = THREE.MathUtils.lerp( player.speed, moved, 0.25 );

	const gy = world.groundHeight( player.pos.x, player.pos.z );
	player.pos.y = THREE.MathUtils.lerp( player.pos.y, gy, 1 - Math.exp( - dt * 18 ) );

	girl.root.position.copy( player.pos );
	girl.root.rotation.y = player.heading;
	return { inside, sprint };

}

function updateCamera( dt, t ) {

	const p = player.pos;
	const inside = world.isInside( p.x, p.z );
	if ( state.phase === 'title' ) {

		// slow establishing orbit
		const a = t * 0.05;
		cam.target.set( 2, 1.6, 9 );
		camera.position.set( 2 + Math.sin( a ) * 15, 3.4 + Math.sin( t * 0.13 ) * 0.4, 9 + Math.cos( a ) * 15 );
		camera.lookAt( cam.target );
		return;

	}

	// auto-follow behind the runner unless the user recently dragged
	if ( ! state.photo && t - cam.lastDrag > 1.6 && player.speed > 0.6 ) {

		const behind = player.heading + Math.PI;
		let d = behind - cam.tYaw;
		d = Math.atan2( Math.sin( d ), Math.cos( d ) );
		cam.tYaw += d * Math.min( 1, dt * 0.9 * Math.min( 1, player.speed / 3 ) );

	}

	const maxD = state.photo ? 14 : inside ? 3.4 : 8;
	const dist = Math.min( cam.tDist, maxD );
	const intro = THREE.MathUtils.clamp( ( t - ( cam.introStart ?? - 10 ) ) / 2.5, 0, 1 );
	const k = 1 - Math.exp( - dt * THREE.MathUtils.lerp( 1.6, 8, intro ) );
	let dy = cam.tYaw - cam.yaw;
	cam.yaw += Math.atan2( Math.sin( dy ), Math.cos( dy ) ) * k;
	cam.pitch += ( cam.tPitch - cam.pitch ) * k;
	cam.dist += ( dist - cam.dist ) * ( 1 - Math.exp( - dt * THREE.MathUtils.lerp( 1.2, 4, intro ) ) );

	const tgt = tmpV.set( p.x, p.y + ( inside ? 1.32 : 1.42 ), p.z );
	cam.target.lerp( tgt, 1 - Math.exp( - dt * THREE.MathUtils.lerp( 1.5, 12, intro ) ) );
	const pitch = inside ? Math.max( cam.pitch, 0.12 ) : cam.pitch;
	const dir = new THREE.Vector3( Math.sin( cam.yaw ) * Math.cos( pitch ), Math.sin( pitch ), Math.cos( cam.yaw ) * Math.cos( pitch ) );

	// occlusion: shorten the boom when walls / tall props are in the way
	let maxDist = cam.dist;
	ray.set( cam.target, dir );
	for ( const c of world.colliders || [] ) {

		const top = c.maxY ?? 12;
		box.min.set( c.minX - 0.12, - 1, c.minZ - 0.12 );
		box.max.set( c.maxX + 0.12, top + 0.1, c.maxZ + 0.12 );
		if ( box.containsPoint( cam.target ) ) continue;
		const hit = ray.intersectBox( box, tmpV );
		if ( hit ) {

			const d = hit.distanceTo( cam.target );
			if ( d < maxDist ) maxDist = d;

		}

	}

	maxDist = Math.max( 0.7, maxDist - 0.15 );
	const camPos = cam.target.clone().addScaledVector( dir, maxDist );
	if ( world.isInside( p.x, p.z ) || world.isInside( camPos.x, camPos.z ) ) camPos.y = Math.min( camPos.y, 2.75 );
	camPos.y = Math.max( camPos.y, world.groundHeight( camPos.x, camPos.z ) + 0.25 );
	camera.position.copy( camPos );
	camera.lookAt( cam.target );

}

// ---------------------------------------------------------------- loop

const clock = new THREE.Timer();
clock.connect?.( document );
let prevDoor = 0;
let fpsAcc = 0, fpsFrames = 0, lowTime = 0;
let wasInside = false;
const dripPts = [];

function frame() {

	clock.update();
	const dt = Math.min( clock.getDelta(), 1 / 20 );
	const t = clock.getElapsed();

	const { inside, sprint } = updatePlayer( dt );
	if ( state.phase === 'play' ) state.time += dt;

	// umbrella: closes under the eave when heading for the door, and indoors
	const underEave = player.pos.z < 1.25 && player.pos.z > - 0.1 && Math.abs( player.pos.x ) < 8;
	const nearDoor = Math.abs( player.pos.x - 3.5 ) < 2.0 && player.pos.z < 2.2;
	const headingIn = Math.cos( player.heading ) < - 0.2;
	let umbTarget = state.umbrellaManual ? 1 : 0;
	if ( inside || ( nearDoor && player.pos.z < 1.1 && headingIn ) ) umbTarget = 0;

	// wetness
	const exposed = ! inside && ! underEave;
	if ( exposed && umbTarget < 0.5 ) state.wet = Math.min( 1, state.wet + dt * 0.07 );
	else if ( exposed ) state.wet = Math.min( 1, state.wet + dt * 0.0025 * player.speed );
	else if ( inside ) state.wet = Math.max( 0, state.wet - dt * 0.004 );

	const res = girl.update( dt, {
		speed: player.speed, sprint, turnRate: player.turnRate, umbrellaOpen: umbTarget,
		inside, time: t, wetness: state.wet
	} ) || {};
	for ( const f of res.footsteps || [] ) {

		if ( ! inside ) rain.footSplash( f.position, f.strength ?? 1, true );
		else if ( state.wet > 0.05 || t - lastOutside < 25 ) addPrint( f.position, player.heading, f.side, Math.max( state.wet, 1 - ( t - lastOutside ) / 25 ) );
		sound.footstep( { inside, wet: ! inside, strength: 0.5 + 0.5 * Math.min( 1, player.speed / 4 ) } );

	}

	if ( ! inside ) lastOutside = t;
	if ( inside && ! wasInside && state.phase === 'play' ) {

		if ( ! state.enteredOnce ) {

			state.enteredOnce = true;
			setTimeout( () => hud.subtitle( '店員', 'いらっしゃいませ〜！', '歡迎光臨～！' ), 400 );

		}

	}

	wasInside = inside;

	world.update( dt, t, player.pos );
	const door = world.door ? world.door.open : 0;
	if ( door > 0.08 && prevDoor <= 0.08 ) sound.chime();
	prevDoor = door;

	taxi.update( dt, player.pos, camera, rain );

	// rain lighting from the nearest light sources
	const ls = staticLights.slice();
	const tl = taxi.lightInfo();
	if ( tl ) ls.push( tl );
	const ref = camera.position;
	ls.sort( ( a, b ) => a.position.distanceToSquared( ref ) / ( a.radius * a.radius ) - b.position.distanceToSquared( ref ) / ( b.radius * b.radius ) );
	rain.setLights( ls );

	const cover = girl.getUmbrellaCover ? girl.getUmbrellaCover() : null;
	rain.setUmbrella( cover );
	dripPts.length = 0;
	if ( girl.getUmbrellaDripPoints && ! inside && ! underEave ) girl.getUmbrellaDripPoints( dripPts );
	rain.update( dt, t, camera, { dripPoints: dripPts, focus: camera.position } );
	wet.update( t );
	sky.material.uniforms.uTime.value = t;
	updateWeather( dt, t );

	// objective & HUD
	if ( state.phase === 'play' ) {

		const obj = currentObjective();
		hud.setObjective( obj.text, obj.sub );
		const near = findNearest();
		hud.setPrompt( promptFor( near ), isTouch );
		hud.setTime( state.time );
		hud.setWet( state.wet );
		for ( const o of world.interactables || [] ) world.highlight?.( o.id, !! ( obj.highlight && obj.highlight.includes( o.id ) ) );
		if ( obj.target ) {

			marker.visible = ! state.photo;
			marker.position.set( obj.target.x, world.groundHeight( obj.target.x, obj.target.z ), obj.target.z );
			const s = 1 + Math.sin( t * 3 ) * 0.06;
			marker.ring.scale.set( s, s, s );
			marker.beam.material.uniforms.uTime.value = t;
			// hide when standing on it
			const dm = Math.hypot( obj.target.x - player.pos.x, obj.target.z - player.pos.z );
			marker.beam.visible = dm > 1.4;

		} else marker.visible = false;

		if ( state.paid && player.pos.x > GOAL.minX && player.pos.x < GOAL.maxX && player.pos.z > GOAL.minZ ) endGame();

	} else marker.visible = false;

	// footprints fade
	for ( const fp of prints ) {

		if ( fp.life <= 0 ) continue;
		fp.life -= dt / 30;
		fp.mesh.material.opacity = Math.max( 0, fp.life ) * fp.strength;
		if ( fp.life <= 0 ) fp.mesh.visible = false;

	}

	sound.update( dt, { inside, umbrellaOpen: umbTarget, underCover: underEave } );

	updateCamera( dt, t );
	const camInside = world.isInside( camera.position.x, camera.position.z );
	post.grade.uniforms.uLens.value = THREE.MathUtils.lerp( post.grade.uniforms.uLens.value, camInside || state.photo ? 0 : 0.3, 1 - Math.exp( - dt * 2 ) );
	post.render( t );

	// dynamic resolution
	fpsAcc += dt; fpsFrames ++;
	if ( fpsAcc > 1 ) {

		const fps = fpsFrames / fpsAcc;
		hud.setFps( fps );
		if ( fps < 38 && state.phase !== 'title' ) lowTime ++; else lowTime = 0;
		if ( lowTime >= 3 && dynPR > 0.7 ) {

			dynPR = Math.max( 0.7, dynPR - 0.15 );
			applySize();
			lowTime = 0;

		}

		fpsAcc = 0; fpsFrames = 0;

	}

}

let lastOutside = 0;

// weather: wind gusts and distant lightning
const weather = { nextFlash: 25 + Math.random() * 30, flash: 0, flashT: - 10 };
function updateWeather( dt, t ) {

	const w = rain.streaks.material.uniforms.uWind.value;
	const gust = Math.max( 0, Math.sin( t * 0.21 ) * Math.sin( t * 0.067 + 1.3 ) );
	w.set( 0.9 + Math.sin( t * 0.13 ) * 0.5 + gust * 2.2, 0, 0.4 + Math.sin( t * 0.09 ) * 0.4 );
	if ( t > weather.nextFlash && state.phase !== 'title' ) {

		weather.flashT = t;
		weather.nextFlash = t + 40 + Math.random() * 50;
		sound.thunder( 1.5 + Math.random() * 2.5 );

	}

	const ft = t - weather.flashT;
	// double flicker
	const f = ft < 0 || ft > 0.9 ? 0 : Math.max( 0, 1 - ft * 3 ) + ( ft > 0.18 ? Math.max( 0, 0.7 - ( ft - 0.18 ) * 1.6 ) : 0 );
	sky.material.uniforms.uFlash.value = f;
	hemi.intensity = 0.12 + f * 1.8;
	post.grade.uniforms.uFlash.value = f * 0.012;

}

function applySize() {

	const w = window.innerWidth, h = window.innerHeight;
	camera.aspect = w / h;
	camera.updateProjectionMatrix();
	renderer.setPixelRatio( dynPR );
	renderer.setSize( w, h );
	post.composer.setPixelRatio( dynPR );
	post.setSize( w, h );
	wet.setSize( w, h, dynPR );

}

addEventListener( 'resize', applySize );
applySize();

// test / screenshot hooks
if ( params.has( 'pos' ) ) {

	const [ x, z, h ] = params.get( 'pos' ).split( ',' ).map( Number );
	player.pos.set( x, world.groundHeight( x, z ), z );
	if ( ! isNaN( h ) ) player.heading = h;

}

if ( params.has( 'autostart' ) ) startGame( false );
addEventListener( 'pointerdown', () => state.phase !== 'title' && sound.start(), { once: false } );
if ( params.has( 'yaw' ) ) cam.yaw = cam.tYaw = player.heading + Math.PI + Number( params.get( 'yaw' ) );
if ( params.has( 'pitch' ) ) cam.pitch = cam.tPitch = Number( params.get( 'pitch' ) );
if ( params.has( 'dist' ) ) cam.dist = cam.tDist = Number( params.get( 'dist' ) );
if ( params.has( 'run' ) ) keys.KeyW = true;
if ( params.has( 'norain' ) ) rain.streaks.visible = rain.splashes.visible = rain.drops.mesh.visible = false;
if ( params.has( 'nowet' ) ) wet.reflector.visible = false;
if ( params.has( 'nobloom' ) ) post.bloom.enabled = false;
if ( params.has( 'nograde' ) ) post.grade.enabled = false;
window.game = { state, player, cam, world, girl, keys, renderer, camera, scene, interact, hud };

renderer.setAnimationLoop( frame );
// pre-compile every material so the first gameplay frames don't hitch
( renderer.compileAsync ? renderer.compileAsync( scene, camera ) : Promise.resolve() ).catch( () => {} ).then( () => hud.ready() );
