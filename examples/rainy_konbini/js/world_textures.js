// Procedural canvas textures for the konbini world (all text drawn at runtime, no external assets).
import * as THREE from 'three';
import { Atlas, canvasTex, fitText, vText, roundRect, font, rng } from './world_util.js';

const BLUE = '#1b4fa0', GREEN = '#2fb37a', ORANGE = '#f39a2b';

function moonLogo( c, x, y, r, bg = '#f6f8f4' ) {

	c.save();
	c.beginPath(); c.arc( x, y, r, 0, Math.PI * 2 ); c.clip();
	c.fillStyle = ORANGE;
	c.beginPath(); c.arc( x, y, r, 0, Math.PI * 2 ); c.fill();
	c.fillStyle = bg;
	c.beginPath(); c.arc( x + r * 0.45, y - r * 0.3, r * 0.85, 0, Math.PI * 2 ); c.fill();
	c.restore();

}

function noise( c, w, h, n, a, r, col = '0,0,0' ) {

	for ( let i = 0; i < n; i ++ ) {

		c.fillStyle = `rgba(${col},${a * r()})`;
		const s = 1 + r() * 2.5;
		c.fillRect( r() * w, r() * h, s, s );

	}

}

export function makeTextures( renderer, Q ) {

	const aniso = Math.min( 8, renderer?.capabilities?.getMaxAnisotropy?.() || 4 );
	const T = {};
	const R = rng( 7 );

	// ---------------- main sign logo (lit, opaque) ----------------
	T.signBand = canvasTex( 1024, 128, ( c, w, h ) => {

		c.fillStyle = '#f6f8f4'; c.fillRect( 0, 0, w, h );
		c.fillStyle = BLUE; c.fillRect( 0, 0, w, 30 );
		c.fillStyle = GREEN; c.fillRect( 0, 30, w, 16 );
		c.fillStyle = '#fff'; c.fillRect( 0, 46, w, 4 );
		c.fillStyle = ORANGE; c.fillRect( 0, h - 14, w, 14 );
		c.fillStyle = GREEN; c.fillRect( 0, h - 22, w, 8 );

	}, { aniso } );

	T.signLogo = canvasTex( 1024, 192, ( c, w, h ) => {

		c.fillStyle = '#f6f8f4'; c.fillRect( 0, 0, w, h );
		moonLogo( c, 96, 96, 66 );
		c.fillStyle = BLUE;
		fitText( c, 'ツキマート', 470, 92, 600, 150, 900 );
		c.fillStyle = GREEN;
		fitText( c, 'TSUKI MART', 880, 66, 230, 54, 900 );
		c.fillStyle = ORANGE;
		fitText( c, 'since 1987', 880, 124, 200, 30, 700 );

	}, { aniso } );

	T.sign24 = canvasTex( 512, 192, ( c, w, h ) => {

		c.fillStyle = '#f6f8f4'; c.fillRect( 0, 0, w, h );
		c.fillStyle = ORANGE; roundRect( c, 20, 30, 150, 132, 18 ); c.fill();
		c.fillStyle = '#fff'; fitText( c, '24', 95, 82, 130, 84, 900 ); fitText( c, 'HOURS', 95, 140, 130, 30, 800 );
		c.fillStyle = BLUE; fitText( c, '24時間営業', 340, 96, 300, 76, 900 );

	}, { aniso } );

	// ---------------- pylon sign face ----------------
	T.pylon = canvasTex( 512, 768, ( c, w, h ) => {

		c.fillStyle = '#f4f6f2'; c.fillRect( 0, 0, w, h );
		c.fillStyle = BLUE; c.fillRect( 0, 0, w, 300 );
		moonLogo( c, w / 2, 110, 70, BLUE );
		c.fillStyle = '#fff'; fitText( c, 'ツキマート', w / 2, 230, 460, 96, 900 );
		c.fillStyle = GREEN; c.fillRect( 0, 300, w, 34 );
		c.fillStyle = ORANGE; c.fillRect( 0, 334, w, 14 );
		c.fillStyle = BLUE; fitText( c, 'TSUKI MART', w / 2, 400, 440, 64, 900 );
		c.fillStyle = ORANGE; roundRect( c, 40, 450, 200, 130, 16 ); c.fill();
		c.fillStyle = '#fff'; fitText( c, '24H', 140, 515, 180, 92, 900 );
		c.fillStyle = BLUE; roundRect( c, 270, 450, 200, 130, 16 ); c.fill();
		c.fillStyle = '#fff'; fitText( c, 'P', 320, 515, 80, 110, 900 ); fitText( c, '4台', 410, 515, 100, 54, 900 );
		c.fillStyle = '#333'; fitText( c, 'ATM・公共料金・宅配便', w / 2, 630, 460, 40, 800 );
		c.fillStyle = GREEN; c.fillRect( 0, 690, w, 78 );
		c.fillStyle = '#fff'; fitText( c, 'この先 入口 →', w / 2, 729, 440, 44, 800 );

	}, { aniso } );

	// ---------------- decal atlas (posters, stickers, labels; with alpha) ----------------
	const D = new Atlas( 1024, null, 0.74 );
	const poster = ( key, w, h, bg, fn ) => D.draw( key, w, h, ( c ) => {

		c.fillStyle = bg; roundRect( c, 2, 2, w - 4, h - 4, 10 ); c.fill();
		fn( c, w, h );

	} );

	poster( 'onigiri', 240, 340, '#fffaf0', ( c, w, h ) => {

		c.fillStyle = '#d7262e'; c.fillRect( 2, 2, w - 4, 70 );
		c.fillStyle = '#fff'; fitText( c, 'おにぎり', w / 2, 38, 210, 48, 900 );
		// onigiri drawing
		for ( const [ ox, s ] of [ [ 80, 1 ], [ 160, 1 ] ] ) {

			c.fillStyle = '#fff'; c.strokeStyle = '#ccc'; c.lineWidth = 2;
			c.beginPath(); c.moveTo( ox, 92 ); c.quadraticCurveTo( ox + 52 * s, 170, ox + 46, 182 ); c.lineTo( ox - 46, 182 ); c.quadraticCurveTo( ox - 52, 170, ox, 92 ); c.fill(); c.stroke();
			c.fillStyle = '#1f2a1c'; c.fillRect( ox - 20, 140, 40, 42 );

		}

		c.fillStyle = '#222'; fitText( c, '2個で', w / 2, 220, 200, 44, 900 );
		c.fillStyle = '#d7262e'; fitText( c, '200円', w / 2, 278, 220, 76, 900 );
		c.fillStyle = '#555'; fitText( c, '(税込) 対象商品に限ります', w / 2, 318, 220, 16, 700 );

	} );
	poster( 'coffee', 240, 340, '#3b2416', ( c, w, h ) => {

		c.fillStyle = '#f3e3c8'; fitText( c, 'ホットコーヒー', w / 2, 40, 220, 34, 900 );
		c.fillStyle = '#fff'; roundRect( c, 80, 80, 80, 100, 8 ); c.fill();
		c.fillStyle = BLUE; c.fillRect( 80, 115, 80, 26 );
		c.strokeStyle = '#fff'; c.lineWidth = 3;
		for ( let i = 0; i < 3; i ++ ) {

			c.beginPath(); c.moveTo( 100 + i * 20, 72 ); c.bezierCurveTo( 90 + i * 20, 60, 112 + i * 20, 50, 100 + i * 20, 36 + 30 ); c.stroke();

		}

		c.fillStyle = ORANGE; fitText( c, '¥120', w / 2, 236, 220, 84, 900 );
		c.fillStyle = '#f3e3c8'; fitText( c, 'SELF COFFEE  R サイズ', w / 2, 296, 220, 20, 700 );

	} );
	poster( 'karaage', 240, 240, '#ffd23a', ( c, w, h ) => {

		c.fillStyle = '#c0392b'; fitText( c, 'からあげ棒', w / 2, 40, 220, 46, 900 );
		c.strokeStyle = '#8a6a3a'; c.lineWidth = 5; c.beginPath(); c.moveTo( 40, 150 ); c.lineTo( 200, 110 ); c.stroke();
		for ( let i = 0; i < 3; i ++ ) {

			c.fillStyle = '#b5651d'; c.beginPath(); c.arc( 80 + i * 42, 140 - i * 10, 22, 0, 7 ); c.fill();
			c.fillStyle = '#d98b3a'; c.beginPath(); c.arc( 74 + i * 42, 134 - i * 10, 8, 0, 7 ); c.fill();

		}

		c.fillStyle = '#c0392b'; fitText( c, '1本 ¥150', w / 2, 205, 220, 40, 900 );

	} );
	poster( 'nikuman', 240, 340, '#c8232c', ( c, w, h ) => {

		c.fillStyle = '#fff'; fitText( c, '肉まん・あんまん', w / 2, 44, 220, 34, 900 );
		for ( const [ x, y ] of [ [ 80, 150 ], [ 160, 150 ], [ 120, 205 ] ] ) {

			c.fillStyle = '#fbf3e4'; c.beginPath(); c.ellipse( x, y, 40, 30, 0, 0, 7 ); c.fill();
			c.strokeStyle = '#e0cfb2'; c.lineWidth = 2; c.beginPath(); c.arc( x, y - 18, 8, 0, 7 ); c.stroke();

		}

		c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 3;
		for ( let i = 0; i < 4; i ++ ) {

			c.beginPath(); c.moveTo( 70 + i * 30, 110 ); c.bezierCurveTo( 60 + i * 30, 95, 85 + i * 30, 85, 70 + i * 30, 70 ); c.stroke();

		}

		c.fillStyle = '#ffe14a'; fitText( c, '始めました', w / 2, 278, 220, 46, 900 );
		c.fillStyle = '#fff'; fitText( c, 'レジにてお申し付けください', w / 2, 318, 220, 16, 700 );

	} );
	poster( 'atm24', 220, 150, BLUE, ( c, w, h ) => {

		c.fillStyle = '#fff'; fitText( c, 'ATM', 80, 60, 120, 64, 900 );
		c.fillStyle = ORANGE; roundRect( c, 140, 26, 66, 66, 10 ); c.fill();
		c.fillStyle = '#fff'; fitText( c, '24h', 173, 60, 60, 32, 900 );
		fitText( c, 'ご利用いただけます', w / 2, 120, 200, 22, 700 );

	} );
	poster( 'koukyou', 240, 160, GREEN, ( c, w, h ) => {

		c.fillStyle = '#fff'; fitText( c, '公共料金', w / 2, 48, 220, 46, 900 );
		fitText( c, 'お支払いできます', w / 2, 100, 220, 30, 800 );
		fitText( c, '電気・ガス・水道・電話', w / 2, 138, 220, 16, 700 );

	} );
	D.draw( 'wifi', 160, 160, ( c, w, h ) => {

		c.fillStyle = '#fff'; c.beginPath(); c.arc( 80, 80, 78, 0, 7 ); c.fill();
		c.strokeStyle = BLUE; c.lineWidth = 9; c.lineCap = 'round';
		for ( let i = 1; i <= 3; i ++ ) {

			c.beginPath(); c.arc( 80, 100, i * 17, - Math.PI * 0.78, - Math.PI * 0.22 ); c.stroke();

		}

		c.fillStyle = BLUE; c.beginPath(); c.arc( 80, 100, 6, 0, 7 ); c.fill();
		fitText( c, 'Free Wi-Fi', 80, 128, 120, 22, 900 );

	} );
	poster( 'eigyo', 220, 100, '#fff', ( c, w, h ) => {

		c.strokeStyle = '#d7262e'; c.lineWidth = 6; roundRect( c, 8, 8, w - 16, h - 16, 8 ); c.stroke();
		c.fillStyle = '#d7262e'; fitText( c, '営業中', w / 2, 44, 190, 46, 900 );
		fitText( c, 'OPEN', w / 2, 80, 190, 20, 900 );

	} );
	poster( 'hours', 240, 160, '#fdfdfd', ( c, w, h ) => {

		c.fillStyle = BLUE; c.fillRect( 2, 2, w - 4, 40 );
		c.fillStyle = '#fff'; fitText( c, '営業時間', w / 2, 23, 200, 28, 900 );
		c.fillStyle = '#222'; fitText( c, '24時間 年中無休', w / 2, 82, 220, 32, 900 );
		c.fillStyle = GREEN; fitText( c, 'OPEN 24 HOURS', w / 2, 126, 220, 22, 900 );

	} );
	D.draw( 'jidou', 420, 70, ( c, w, h ) => {

		c.fillStyle = 'rgba(47,179,122,0.92)'; c.fillRect( 0, 10, w, 50 );
		c.fillStyle = '#fff'; fitText( c, '自動ドア  AUTOMATIC DOOR', w / 2, 36, 400, 30, 900 );

	} );
	D.draw( 'irasshai', 420, 60, ( c, w, h ) => {

		c.fillStyle = '#fff'; fitText( c, 'いらっしゃいませ', w / 2, 30, 400, 44, 900 );

	} );
	const binLabel = ( key, txt, sub, col ) => poster( key, 220, 110, col, ( c, w, h ) => {

		c.fillStyle = '#fff'; fitText( c, txt, w / 2, 44, 200, 40, 900 );
		fitText( c, sub, w / 2, 86, 200, 18, 700 );

	} );
	binLabel( 'bin_moeru', 'もえるゴミ', 'BURNABLE', '#c0392b' );
	binLabel( 'bin_kan', 'かん・びん', 'CANS & BOTTLES', '#1f6fb5' );
	binLabel( 'bin_pet', 'ペットボトル', 'PET BOTTLES', '#1e9b5a' );
	poster( 'parking', 220, 300, BLUE, ( c, w, h ) => {

		c.fillStyle = '#fff'; roundRect( c, 30, 20, 160, 150, 14 ); c.fill();
		c.fillStyle = BLUE; fitText( c, 'P', w / 2, 98, 140, 150, 900 );
		c.fillStyle = '#fff'; fitText( c, '駐車場', w / 2, 204, 200, 46, 900 );
		fitText( c, 'ツキマートお客様専用', w / 2, 248, 200, 18, 800 );
		c.fillStyle = ORANGE; fitText( c, '30分まで', w / 2, 278, 200, 20, 800 );

	} );
	poster( 'kitsuen', 200, 100, '#3a3a3a', ( c, w, h ) => {

		c.fillStyle = '#fff'; fitText( c, '喫煙所', w / 2, 40, 180, 40, 900 );
		fitText( c, 'SMOKING AREA', w / 2, 78, 180, 18, 800 );

	} );
	D.draw( 'denchu1', 110, 400, ( c, w, h ) => {

		c.fillStyle = '#f2e9c8'; c.fillRect( 0, 0, w, h );
		c.fillStyle = BLUE; c.fillRect( 0, 0, w, 60 );
		moonLogo( c, w / 2, 30, 20, BLUE );
		c.fillStyle = BLUE; vText( c, 'ツキマート', w / 2, 100, 44, 1.05, 900 );
		c.fillStyle = '#c0392b'; vText( c, 'この先', w / 2, 330, 18, 1.1, 800 );
		c.fillStyle = '#222'; fitText( c, '30m →', w / 2, 388, 100, 20, 800 );

	} );
	D.draw( 'denchu2', 110, 400, ( c, w, h ) => {

		c.fillStyle = '#fff'; c.fillRect( 0, 0, w, h );
		c.fillStyle = '#2b7a3d'; c.fillRect( 0, 0, w, 14 ); c.fillRect( 0, h - 14, w, 14 );
		c.fillStyle = '#2b7a3d'; vText( c, 'みどり内科', w / 2, 60, 46, 1.05, 900 );
		c.fillStyle = '#333'; vText( c, '月見台二丁目', w / 2, 300, 14, 1.1, 700 );

	} );
	D.draw( 'tomare', 300, 520, ( c, w, h ) => {

		c.fillStyle = 'rgba(240,240,232,0.95)';
		c.save(); c.scale( 1, 1.9 );
		c.font = font( 120, 900 ); c.textAlign = 'center'; c.textBaseline = 'middle';
		c.fillText( '止', w / 2, 55 ); c.fillText( 'ま', w / 2, 150 ); c.fillText( 'れ', w / 2, 225 );
		c.restore();

	} );
	poster( 'ice', 260, 90, '#1e88d0', ( c, w, h ) => {

		c.fillStyle = '#fff'; fitText( c, 'ICE', 70, 46, 110, 60, 900 );
		fitText( c, 'アイスクリーム', 180, 46, 140, 24, 900 );

	} );
	poster( 'recycle', 200, 90, '#1e9b5a', ( c, w, h ) => {

		c.fillStyle = '#fff'; fitText( c, 'リサイクル', w / 2, 32, 180, 30, 900 );
		fitText( c, '空き缶・ペットボトル', w / 2, 66, 180, 18, 800 );

	} );
	D.draw( 'kasa', 200, 56, ( c, w, h ) => {

		c.fillStyle = '#fff'; roundRect( c, 0, 0, w, h, 6 ); c.fill();
		c.fillStyle = BLUE; fitText( c, '傘立て  UMBRELLA', w / 2, 29, 190, 26, 900 );

	} );
	D.draw( 'shopsign', 500, 90, ( c, w, h ) => {

		c.fillStyle = '#4b3d2c'; c.fillRect( 0, 0, w, h );
		c.strokeStyle = '#8c7a5a'; c.lineWidth = 4; c.strokeRect( 6, 6, w - 12, h - 12 );
		c.fillStyle = '#e8dcc0'; fitText( c, '丸山酒店', w / 2 - 60, 46, 280, 56, 900 );
		fitText( c, 'たばこ・酒', w / 2 + 160, 46, 140, 24, 800 );
		noise( c, w, h, 900, 0.35, R, '20,15,10' );

	} );
	D.draw( 'noren', 400, 220, ( c, w, h ) => {

		c.fillStyle = '#1d2740'; c.fillRect( 0, 0, w, h );
		c.fillStyle = '#f2efe6';
		const chars = [ 'ラ', 'ー', 'メ', 'ン' ];
		chars.forEach( ( ch, i ) => {

			c.save(); c.translate( 50 + i * 100, 110 ); if ( ch === 'ー' ) c.rotate( 0 );
			c.font = font( 96, 900 ); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText( ch, 0, 0 ); c.restore();

		} );
		c.fillStyle = 'rgba(0,0,0,0.25)';
		for ( let i = 1; i < 4; i ++ ) c.fillRect( i * 100 - 2, 30, 4, h - 30 );

	} );
	D.draw( 'toilet', 140, 180, ( c, w, h ) => {

		c.fillStyle = '#fff'; roundRect( c, 0, 0, w, h, 10 ); c.fill();
		c.fillStyle = '#1f6fb5'; c.beginPath(); c.arc( 42, 40, 14, 0, 7 ); c.fill(); c.fillRect( 30, 58, 24, 60 );
		c.fillStyle = '#d7262e'; c.beginPath(); c.arc( 98, 40, 14, 0, 7 ); c.fill();
		c.beginPath(); c.moveTo( 98, 56 ); c.lineTo( 120, 118 ); c.lineTo( 76, 118 ); c.fill();
		c.fillStyle = '#333'; fitText( c, 'トイレ', w / 2, 150, 120, 30, 900 );

	} );
	D.draw( 'staff', 200, 70, ( c, w, h ) => {

		c.fillStyle = '#e8e8e8'; roundRect( c, 0, 0, w, h, 6 ); c.fill();
		c.fillStyle = '#c0392b'; fitText( c, 'STAFF ONLY', w / 2, 26, 180, 30, 900 );
		c.fillStyle = '#333'; fitText( c, '関係者以外立入禁止', w / 2, 54, 180, 16, 800 );

	} );
	D.draw( 'busstop', 180, 180, ( c, w, h ) => {

		c.fillStyle = '#fff'; c.beginPath(); c.arc( 90, 90, 88, 0, 7 ); c.fill();
		c.strokeStyle = '#1f6fb5'; c.lineWidth = 10; c.beginPath(); c.arc( 90, 90, 80, 0, 7 ); c.stroke();
		c.fillStyle = '#1f6fb5'; fitText( c, 'バス停', 90, 66, 140, 34, 900 );
		c.fillStyle = '#222'; fitText( c, '月見台二丁目', 90, 108, 130, 20, 800 );
		fitText( c, '市営バス', 90, 136, 100, 16, 700 );

	} );
	D.draw( 'camera', 200, 80, ( c, w, h ) => {

		c.fillStyle = '#ffd400'; roundRect( c, 0, 0, w, h, 6 ); c.fill();
		c.fillStyle = '#111'; fitText( c, '防犯カメラ作動中', w / 2, 30, 190, 24, 900 );
		fitText( c, 'SECURITY CAMERA', w / 2, 60, 190, 14, 800 );

	} );
	D.draw( 'clock', 128, 128, ( c, w, h ) => {

		c.fillStyle = '#fafafa'; c.beginPath(); c.arc( 64, 64, 62, 0, 7 ); c.fill();
		c.strokeStyle = '#333'; c.lineWidth = 4; c.beginPath(); c.arc( 64, 64, 60, 0, 7 ); c.stroke();
		c.fillStyle = '#222';
		for ( let i = 0; i < 12; i ++ ) {

			const a = i / 12 * Math.PI * 2; c.fillRect( 64 + Math.sin( a ) * 50 - 2, 64 - Math.cos( a ) * 50 - 2, 4, 4 );

		}

	} );
	D.draw( 'apt', 240, 60, ( c, w, h ) => {

		c.fillStyle = '#d9d2c3'; c.fillRect( 0, 0, w, h );
		c.fillStyle = '#4a3b2a'; fitText( c, 'コーポ月見', w / 2, 30, 220, 36, 900 );

	} );
	D.draw( 'seikotsu', 360, 80, ( c, w, h ) => {

		c.fillStyle = '#eef3f6'; c.fillRect( 0, 0, w, h );
		c.fillStyle = '#226'; fitText( c, 'さくら整骨院  本日休診', w / 2, 40, 340, 34, 900 );

	} );
	D.draw( 'gas', 120, 60, ( c, w, h ) => {

		c.fillStyle = '#eee'; c.fillRect( 0, 0, w, h );
		c.fillStyle = '#d33'; fitText( c, 'ガス', w / 2, 30, 100, 34, 900 );

	} );
	D.draw( 'newspaper', 200, 60, ( c, w, h ) => {

		c.fillStyle = '#222'; c.fillRect( 0, 0, w, h );
		c.fillStyle = '#fff'; fitText( c, '新聞  NEWS', w / 2, 30, 180, 30, 900 );

	} );
	D.draw( 'pricecard', 64, 32, ( c, w, h ) => {

		c.fillStyle = '#fff'; c.fillRect( 0, 0, w, h ); c.fillStyle = '#d7262e'; c.fillRect( 0, 0, w, 8 );
		c.fillStyle = '#111'; fitText( c, '¥128', w / 2, 21, 60, 16, 900 );

	} );
	D.draw( 'kanban', 220, 140, ( c, w, h ) => {

		c.fillStyle = '#fff'; c.fillRect( 0, 0, w, h );
		c.fillStyle = '#d7262e'; fitText( c, 'からあげ', w / 2, 46, 200, 48, 900 );
		c.fillStyle = '#222'; fitText( c, '揚げたて！', w / 2, 102, 200, 36, 900 );

	} );
	T.decal = D.texture( aniso );
	T.D = D.rects;

	// ---------------- emissive atlas (lit signage, screens) ----------------
	const E = new Atlas( 1024, '#000', 0.8 );
	const aisle = ( key, txt, sub, col ) => E.draw( key, 320, 96, ( c, w, h ) => {

		c.fillStyle = col; c.fillRect( 0, 0, w, h );
		c.fillStyle = '#fff'; c.fillRect( 0, h - 10, w, 4 );
		fitText( c, txt, w / 2, 40, 290, 48, 900 );
		c.font = font( 16, 700 ); fitText( c, sub, w / 2, 76, 280, 16, 700 );

	} );
	aisle( 'a_drink', '飲料', 'DRINKS', BLUE );
	aisle( 'a_bento', 'お弁当・おにぎり', 'BENTO / ONIGIRI', '#c0392b' );
	aisle( 'a_sweets', 'スイーツ', 'SWEETS', '#d4527e' );
	aisle( 'a_daily', '日用品', 'DAILY GOODS', GREEN );
	aisle( 'a_mag', '雑誌', 'MAGAZINES', '#6b4fa0' );
	aisle( 'a_snack', 'お菓子', 'SNACKS', ORANGE );
	E.draw( 'atmhead', 300, 100, ( c, w, h ) => {

		c.fillStyle = BLUE; c.fillRect( 0, 0, w, h ); c.fillStyle = ORANGE; c.fillRect( 0, h - 14, w, 14 );
		c.fillStyle = '#fff'; fitText( c, 'ATM', 110, 44, 180, 66, 900 ); fitText( c, '24H', 240, 44, 90, 34, 900 );

	} );
	E.draw( 'atmscreen', 320, 240, ( c, w, h ) => {

		const g = c.createLinearGradient( 0, 0, 0, h ); g.addColorStop( 0, '#2f7fd6' ); g.addColorStop( 1, '#0f3d86' );
		c.fillStyle = g; c.fillRect( 0, 0, w, h );
		c.fillStyle = '#fff'; fitText( c, 'いらっしゃいませ', w / 2, 30, 290, 30, 900 );
		const bt = [ 'お引出し', 'お預入れ', '残高照会', 'お振込' ];
		bt.forEach( ( t, i ) => {

			const x = 14 + ( i % 2 ) * 150, y = 64 + Math.floor( i / 2 ) * 74;
			c.fillStyle = i === 0 ? ORANGE : '#e9f2ff'; roundRect( c, x, y, 140, 62, 10 ); c.fill();
			c.fillStyle = i === 0 ? '#fff' : '#0f3d86'; fitText( c, t, x + 70, y + 31, 124, 28, 900 );

		} );
		c.fillStyle = '#cfe2ff'; fitText( c, 'カードまたは通帳をお入れください', w / 2, 222, 300, 15, 700 );

	} );
	E.draw( 'copyscreen', 240, 160, ( c, w, h ) => {

		c.fillStyle = '#eaf6ff'; c.fillRect( 0, 0, w, h );
		c.fillStyle = GREEN; c.fillRect( 0, 0, w, 36 );
		c.fillStyle = '#fff'; fitText( c, 'マルチコピー機', w / 2, 18, 220, 22, 900 );
		[ 'コピー', 'プリント', 'チケット', '行政' ].forEach( ( t, i ) => {

			const x = 10 + ( i % 2 ) * 115, y = 46 + Math.floor( i / 2 ) * 56;
			c.fillStyle = [ BLUE, ORANGE, '#d4527e', '#555' ][ i ]; roundRect( c, x, y, 105, 48, 8 ); c.fill();
			c.fillStyle = '#fff'; fitText( c, t, x + 52, y + 24, 95, 22, 900 );

		} );

	} );
	E.draw( 'pos', 160, 96, ( c, w, h ) => {

		c.fillStyle = '#062a1a'; c.fillRect( 0, 0, w, h );
		c.fillStyle = '#7dffb5'; fitText( c, 'ありがとう', w / 2, 30, 150, 22, 800 ); fitText( c, 'ございました', w / 2, 56, 150, 20, 800 );
		c.fillStyle = '#c8ffe0'; fitText( c, '合計 ¥0', w / 2, 82, 150, 16, 800 );

	} );
	E.draw( 'posclerk', 160, 110, ( c, w, h ) => {

		c.fillStyle = '#e6eef6'; c.fillRect( 0, 0, w, h );
		for ( let i = 0; i < 12; i ++ ) {

			c.fillStyle = [ BLUE, GREEN, ORANGE, '#c0392b' ][ i % 4 ]; c.fillRect( 6 + ( i % 4 ) * 38, 8 + Math.floor( i / 4 ) * 32, 34, 28 );

		}

	} );
	E.draw( 'hotsnack', 420, 80, ( c, w, h ) => {

		c.fillStyle = '#d7262e'; c.fillRect( 0, 0, w, h );
		c.fillStyle = '#ffe14a'; fitText( c, 'ホットスナック', w / 2, 34, 380, 46, 900 );
		c.fillStyle = '#fff'; fitText( c, '揚げたて HOT SNACK', w / 2, 66, 380, 16, 800 );

	} );
	E.draw( 'coffee', 200, 260, ( c, w, h ) => {

		c.fillStyle = '#1b1b1b'; c.fillRect( 0, 0, w, h );
		c.fillStyle = '#fff'; fitText( c, 'SELF', w / 2, 30, 180, 30, 900 ); fitText( c, 'COFFEE', w / 2, 62, 180, 30, 900 );
		const b = [ [ 'ホット R', '#c0392b' ], [ 'ホット L', '#c0392b' ], [ 'アイス R', '#1f6fb5' ], [ 'カフェラテ', '#8a5a2b' ] ];
		b.forEach( ( [ t, col ], i ) => {

			const x = 12 + ( i % 2 ) * 92, y = 96 + Math.floor( i / 2 ) * 60;
			c.fillStyle = col; roundRect( c, x, y, 84, 50, 8 ); c.fill();
			c.fillStyle = '#fff'; fitText( c, t, x + 42, y + 25, 76, 18, 900 );

		} );
		c.fillStyle = '#aaa'; fitText( c, 'カップをセットしてください', w / 2, 236, 190, 14, 700 );

	} );
	E.draw( 'fridgehead', 900, 70, ( c, w, h ) => {

		c.fillStyle = BLUE; c.fillRect( 0, 0, w, h );
		c.fillStyle = '#fff'; fitText( c, '冷たいお飲み物  COLD DRINKS', w / 2 - 80, 36, 640, 44, 900 );
		c.fillStyle = ORANGE; fitText( c, '2本で10円引き', w - 110, 36, 200, 30, 900 );

	} );
	const chillLabel = ( key, txt, col ) => E.draw( key, 300, 60, ( c, w, h ) => {

		c.fillStyle = col; c.fillRect( 0, 0, w, h ); c.fillStyle = '#fff'; fitText( c, txt, w / 2, 30, 280, 38, 900 );

	} );
	chillLabel( 'c_sand', 'サンドイッチ', GREEN );
	chillLabel( 'c_onigiri', 'おにぎり', '#c0392b' );
	chillLabel( 'c_bento', 'お弁当', ORANGE );
	chillLabel( 'c_sweets', 'スイーツ', '#d4527e' );
	const lantern = ( key, txt ) => E.draw( key, 128, 200, ( c, w, h ) => {

		const g = c.createRadialGradient( w / 2, h / 2, 10, w / 2, h / 2, 110 ); g.addColorStop( 0, '#ff5a3a' ); g.addColorStop( 1, '#8a0d0d' );
		c.fillStyle = g; c.fillRect( 0, 0, w, h );
		c.strokeStyle = 'rgba(60,0,0,0.35)'; c.lineWidth = 2;
		for ( let y = 12; y < h; y += 14 ) {

			c.beginPath(); c.moveTo( 0, y ); c.lineTo( w, y ); c.stroke();

		}

		c.fillStyle = '#1a0a05'; vText( c, txt, w / 2, 40 + ( 4 - txt.length ) * 18, 40, 1.0, 900 );

	} );
	lantern( 'lan_ramen', 'ラーメン' );
	lantern( 'lan_sake', 'やきとり' );
	const farSign = ( key, txt, bg, fg, w = 400, h = 100 ) => E.draw( key, w, h, ( c ) => {

		c.fillStyle = bg; c.fillRect( 0, 0, w, h ); c.fillStyle = fg;
		if ( h > w ) vText( c, txt, w / 2, 50, Math.min( w * 0.8, ( h - 60 ) / txt.length ), 1.05, 900 );
		else fitText( c, txt, w / 2, h / 2, w - 30, h * 0.66, 900 );

	} );
	farSign( 'izakaya', '居酒屋 月あかり', '#f6efe0', '#7a1010' );
	farSign( 'cleaning', 'クリーニング', '#eaf6ff', '#1f6fb5' );
	farSign( 'ramensign', '中華そば 龍月', '#c8232c', '#fff2c0' );
	farSign( 'karaoke', 'カラオケ', '#ff3ea5', '#fff', 90, 360 );
	farSign( 'shika', '歯科', '#f0f6ff', '#1f6fb5', 90, 220 );
	farSign( 'bar', 'スナック 夜桜', '#3a0f4a', '#ffb7e3', 90, 360 );
	farSign( 'pachi', '麻雀', '#11331a', '#9cff9c', 90, 200 );
	E.draw( 'exit', 160, 80, ( c, w, h ) => {

		c.fillStyle = '#16a34a'; c.fillRect( 0, 0, w, h );
		c.fillStyle = '#fff'; c.fillRect( 96, 10, 54, 60 );
		c.fillStyle = '#16a34a'; c.fillRect( 104, 16, 38, 54 );
		c.fillStyle = '#fff'; c.beginPath(); c.arc( 50, 22, 9, 0, 7 ); c.fill();
		c.lineWidth = 8; c.strokeStyle = '#fff'; c.lineCap = 'round';
		c.beginPath(); c.moveTo( 48, 34 ); c.lineTo( 40, 54 ); c.lineTo( 26, 70 ); c.moveTo( 40, 54 ); c.lineTo( 58, 66 ); c.moveTo( 46, 40 ); c.lineTo( 66, 46 ); c.moveTo( 46, 40 ); c.lineTo( 28, 44 ); c.stroke();
		c.font = font( 14, 900 ); c.fillText( '', 0, 0 );

	} );
	E.draw( 'reji', 200, 80, ( c, w, h ) => {

		c.fillStyle = GREEN; c.fillRect( 0, 0, w, h ); c.fillStyle = '#fff'; fitText( c, 'レジ', w / 2, 34, 180, 48, 900 ); fitText( c, 'REGISTER', w / 2, 66, 180, 14, 800 );

	} );
	E.draw( 'tabako', 260, 60, ( c, w, h ) => {

		c.fillStyle = '#222'; c.fillRect( 0, 0, w, h ); c.fillStyle = '#fff'; fitText( c, 'たばこ  番号でお伝えください', w / 2, 30, 240, 24, 900 );

	} );
	E.draw( 'vendled', 64, 32, ( c, w, h ) => {

		c.fillStyle = '#100'; c.fillRect( 0, 0, w, h ); c.fillStyle = '#ff3a2a'; fitText( c, '0120', w / 2, 16, 60, 20, 800 );

	} );
	E.draw( 'white', 16, 16, ( c, w, h ) => {

		c.fillStyle = '#fff'; c.fillRect( 0, 0, w, h );

	} );
	E.draw( 'oden', 300, 70, ( c, w, h ) => {

		c.fillStyle = '#f6efe0'; c.fillRect( 0, 0, w, h ); c.fillStyle = '#7a1010'; fitText( c, 'おでん 全品70円', w / 2, 36, 280, 36, 900 );

	} );
	E.draw( 'donut', 220, 50, ( c, w, h ) => {

		c.fillStyle = '#f7d9e3'; c.fillRect( 0, 0, w, h ); c.fillStyle = '#a0305a'; fitText( c, 'ドーナツ DONUT', w / 2, 26, 200, 28, 900 );

	} );
	T.emis = E.texture( aniso );
	T.E = E.rects;

	// ---------------- vending machine fronts (2 designs side by side) ----------------
	T.vend = canvasTex( 1024, 1024, ( c ) => {

		const designs = [ { base: '#e7e9ee', accent: BLUE, name: 'TSUKI DRINK' }, { base: '#c8202a', accent: '#fff', name: 'つきの水' } ];
		designs.forEach( ( d, k ) => {

			c.save(); c.translate( k * 512, 0 );
			const W = 512, H = 1024;
			c.fillStyle = d.base; c.fillRect( 0, 0, W, H );
			// brand header
			c.fillStyle = d.accent; c.fillRect( 0, 0, W, 70 );
			c.fillStyle = k ? '#c8202a' : '#fff'; fitText( c, d.name, W / 2, 36, 440, 46, 900 );
			// display window (bright back) top 70..560 (samples are geometry in front)
			c.fillStyle = '#f8fbff'; c.fillRect( 24, 80, 380, 470 );
			// rows: price strips + buttons
			for ( let row = 0; row < 3; row ++ ) {

				const y = 80 + ( row + 1 ) * 156 - 34;
				c.fillStyle = '#20242c'; c.fillRect( 24, y, 380, 34 );
				for ( let i = 0; i < 6; i ++ ) {

					const x = 24 + i * 63.3;
					const hot = row === 2 && i >= 3;
					c.fillStyle = hot ? '#e53935' : '#1e88e5'; c.fillRect( x + 4, y + 3, 56, 12 );
					c.fillStyle = '#fff'; fitText( c, hot ? 'あったか〜い' : 'つめた〜い', x + 32, y + 9, 54, 10, 900 );
					c.fillStyle = '#fff'; fitText( c, [ '¥130', '¥160', '¥110', '¥150', '¥140', '¥180' ][ ( i + row ) % 6 ], x + 22, y + 25, 34, 13, 900 );
					c.fillStyle = '#7dff7d'; c.beginPath(); c.arc( x + 50, y + 25, 5, 0, 7 ); c.fill();

				}

			}

			// right control column
			c.fillStyle = '#2a2d33'; c.fillRect( 414, 80, 84, 470 );
			c.fillStyle = '#111'; c.fillRect( 424, 100, 64, 40 );
			c.fillStyle = '#ff3a2a'; fitText( c, '0000', 456, 120, 58, 26, 800 );
			c.fillStyle = '#c9a227'; c.fillRect( 446, 170, 20, 46 ); c.fillStyle = '#000'; c.fillRect( 453, 176, 6, 34 );
			c.fillStyle = '#fff'; fitText( c, '硬貨', 456, 230, 70, 16, 800 );
			c.fillStyle = '#ccc'; c.fillRect( 424, 260, 64, 30 ); c.fillStyle = '#000'; c.fillRect( 430, 272, 52, 6 );
			c.fillStyle = '#fff'; fitText( c, '千円札', 456, 304, 70, 16, 800 );
			c.fillStyle = '#e53935'; c.beginPath(); c.arc( 456, 350, 14, 0, 7 ); c.fill();
			c.fillStyle = '#fff'; fitText( c, '返却', 456, 380, 70, 14, 800 );
			c.fillStyle = '#4a4f58'; c.fillRect( 430, 410, 52, 46 );
			c.fillStyle = '#fff'; fitText( c, 'IC', 456, 433, 40, 22, 900 );
			// lower brand panel
			const g = c.createLinearGradient( 0, 570, 0, 820 );
			g.addColorStop( 0, k ? '#ff6b5a' : '#7fc6ff' ); g.addColorStop( 1, k ? '#8a0f16' : '#1b4fa0' );
			c.fillStyle = g; c.fillRect( 24, 570, 464, 250 );
			c.fillStyle = '#fff'; fitText( c, k ? '冷たい天然水' : 'つめた〜い', W / 2, 650, 420, 64, 900 );
			fitText( c, k ? 'NATURAL WATER' : 'あったか〜いも あります', W / 2, 730, 420, 30, 800 );
			for ( let i = 0; i < 8; i ++ ) {

				c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.arc( 60 + i * 56, 790, 10 + ( i % 3 ) * 4, 0, 7 ); c.fill();

			}

			// retrieval flap
			c.fillStyle = '#111'; c.fillRect( 60, 850, 300, 120 );
			c.fillStyle = '#2a2d33'; c.fillRect( 66, 856, 288, 108 );
			c.fillStyle = '#9aa'; fitText( c, '取出口', 210, 910, 200, 28, 800 );
			c.fillStyle = '#111'; c.fillRect( 400, 860, 70, 50 );
			c.fillStyle = '#aaa'; fitText( c, 'つり銭', 435, 930, 70, 14, 700 );
			c.restore();

		} );

	}, { aniso } );

	// ---------------- repeating surfaces ----------------
	T.floor = canvasTex( 512, 512, ( c, w, h ) => {

		const r = rng( 3 );
		for ( let y = 0; y < 4; y ++ ) for ( let x = 0; x < 4; x ++ ) {

			const v = 228 + Math.floor( r() * 14 );
			c.fillStyle = `rgb(${v},${v - 2},${v - 6})`; c.fillRect( x * 128, y * 128, 128, 128 );
			noise( c, 128, 128, 0, 0, r );
			for ( let i = 0; i < 40; i ++ ) {

				c.fillStyle = `rgba(120,110,100,${0.08 * r()})`; c.fillRect( x * 128 + r() * 128, y * 128 + r() * 128, 3, 3 );

			}

		}

		c.strokeStyle = '#a9a39a'; c.lineWidth = 3;
		for ( let i = 0; i <= 4; i ++ ) {

			c.beginPath(); c.moveTo( i * 128, 0 ); c.lineTo( i * 128, h ); c.stroke();
			c.beginPath(); c.moveTo( 0, i * 128 ); c.lineTo( w, i * 128 ); c.stroke();

		}

	}, { repeat: true, aniso } );

	T.sidewalk = canvasTex( 512, 512, ( c, w, h ) => {

		const r = rng( 11 );
		c.fillStyle = '#6e6f70'; c.fillRect( 0, 0, w, h );
		for ( let y = 0; y < 4; y ++ ) for ( let x = 0; x < 4; x ++ ) {

			const v = 96 + Math.floor( r() * 26 );
			c.fillStyle = `rgb(${v},${v + 2},${v + 6})`; c.fillRect( x * 128 + 3, y * 128 + 3, 122, 122 );

		}

		noise( c, w, h, 5000, 0.25, r );
		noise( c, w, h, 1500, 0.12, r, '255,255,255' );

	}, { repeat: true, aniso } );

	T.tactile = canvasTex( 128, 128, ( c, w, h ) => {

		c.fillStyle = '#d9a514'; c.fillRect( 0, 0, w, h );
		c.strokeStyle = '#8a6a08'; c.lineWidth = 2; c.strokeRect( 1, 1, w - 2, h - 2 );
		for ( let i = 0; i < 4; i ++ ) {

			c.fillStyle = '#f2c22a'; c.fillRect( 14 + i * 28, 10, 12, 108 );
			c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect( 26 + i * 28, 10, 2, 108 );

		}

	}, { repeat: true, aniso } );

	T.asphalt = canvasTex( 512, 512, ( c, w, h ) => {

		const r = rng( 5 );
		c.fillStyle = '#3b3d40'; c.fillRect( 0, 0, w, h );
		noise( c, w, h, 22000, 0.35, r );
		noise( c, w, h, 6000, 0.12, r, '220,220,230' );
		for ( let i = 0; i < 14; i ++ ) {

			c.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.1})`;
			c.beginPath(); c.ellipse( r() * w, r() * h, 20 + r() * 60, 10 + r() * 30, r() * 3, 0, 7 ); c.fill();

		}

	}, { repeat: true, aniso } );

	T.shutter = canvasTex( 64, 256, ( c, w, h ) => {

		for ( let y = 0; y < h; y += 16 ) {

			const g = c.createLinearGradient( 0, y, 0, y + 16 );
			g.addColorStop( 0, '#9da3a8' ); g.addColorStop( 0.45, '#c9cdd0' ); g.addColorStop( 0.55, '#7d8388' ); g.addColorStop( 1, '#5d6266' );
			c.fillStyle = g; c.fillRect( 0, y, w, 16 );

		}

	}, { repeat: true, aniso } );

	T.farWin = canvasTex( 512, 512, ( c, w, h ) => {

		const r = rng( 21 );
		c.fillStyle = '#000'; c.fillRect( 0, 0, w, h );
		for ( let y = 0; y < 8; y ++ ) for ( let x = 0; x < 8; x ++ ) {

			const on = r() < 0.28;
			const warm = r() < 0.75;
			if ( on ) {

				const k = 0.5 + r() * 0.5;
				c.fillStyle = warm ? `rgba(255,${180 + r() * 40 | 0},${110 + r() * 40 | 0},${k})` : `rgba(190,220,255,${k})`;
				c.fillRect( x * 64 + 10, y * 64 + 14, 44, 34 );
				c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect( x * 64 + 31, y * 64 + 14, 2, 34 );
				if ( r() < 0.5 ) {

					c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect( x * 64 + 10, y * 64 + 14, 44, 10 + r() * 14 );

				}

			} else {

				c.fillStyle = 'rgba(30,40,55,1)'; c.fillRect( x * 64 + 10, y * 64 + 14, 44, 34 );

			}

		}

	}, { repeat: true, aniso } );

	T.frost = canvasTex( 64, 256, ( c, w, h ) => {

		const g = c.createLinearGradient( 0, h, 0, 0 );
		g.addColorStop( 0, 'rgba(235,245,255,0.55)' ); g.addColorStop( 0.25, 'rgba(235,245,255,0.18)' ); g.addColorStop( 1, 'rgba(235,245,255,0.06)' );
		c.fillStyle = g; c.fillRect( 0, 0, w, h );
		const r = rng( 9 );
		for ( let i = 0; i < 260; i ++ ) {

			c.fillStyle = `rgba(255,255,255,${0.15 * r()})`; c.beginPath(); c.arc( r() * w, h - Math.pow( r(), 2 ) * h, 0.6 + r() * 1.6, 0, 7 ); c.fill();

		}

	}, { aniso } );

	T.soft = canvasTex( 64, 64, ( c, w, h ) => {

		const g = c.createRadialGradient( 32, 32, 0, 32, 32, 32 ); g.addColorStop( 0, 'rgba(255,255,255,1)' ); g.addColorStop( 1, 'rgba(255,255,255,0)' );
		c.fillStyle = g; c.fillRect( 0, 0, w, h );

	} );

	// magazines 4x4 covers
	T.mags = canvasTex( 512, 512, ( c ) => {

		const r = rng( 13 );
		const titles = [ '週刊ツキ', 'NIGHT', 'まんが王', 'クルマ', '料理の友', 'GAME!', '旅と雨', 'ファッション', '少年ムーン', 'Tokyo Walk', '釣り', 'パズル', 'スポーツ', '女性セブン星', 'カメラ', 'ねこ日和' ];
		for ( let i = 0; i < 16; i ++ ) {

			const x = ( i % 4 ) * 128, y = Math.floor( i / 4 ) * 128;
			const hue = Math.floor( r() * 360 );
			c.fillStyle = `hsl(${hue},70%,${45 + r() * 25}%)`; c.fillRect( x + 2, y + 2, 124, 124 );
			c.fillStyle = `hsl(${( hue + 180 ) % 360},60%,${60 + r() * 20}%)`;
			c.beginPath(); c.ellipse( x + 64, y + 80, 34, 40, 0, 0, 7 ); c.fill();
			c.fillStyle = '#fff'; fitText( c, titles[ i ], x + 64, y + 22, 116, 24, 900 );
			c.fillStyle = '#ffeb3b'; fitText( c, '特集', x + 24, y + 110, 40, 14, 900 );
			c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect( x + 70, y + 104, 48, 4 ); c.fillRect( x + 70, y + 112, 40, 4 );

		}

	}, { aniso } );

	// cigarette shelf
	T.cig = canvasTex( 512, 256, ( c, w, h ) => {

		const r = rng( 17 );
		c.fillStyle = '#222'; c.fillRect( 0, 0, w, h );
		for ( let row = 0; row < 6; row ++ ) for ( let i = 0; i < 16; i ++ ) {

			const x = 4 + i * 31.7, y = 4 + row * 42;
			const col = [ '#fff', '#1f6fb5', '#c0392b', '#d4af37', '#2fb37a', '#444', '#8e44ad', '#e67e22' ][ Math.floor( r() * 8 ) ];
			c.fillStyle = col; c.fillRect( x, y, 27, 30 );
			c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect( x, y + 18, 27, 4 );
			c.fillStyle = '#ffeb3b'; c.fillRect( x, y + 32, 27, 7 );
			c.fillStyle = '#000'; c.font = font( 7, 900 ); c.textAlign = 'center'; c.fillText( String( row * 16 + i + 1 ), x + 13, y + 38 );

		}

	}, { aniso } );

	// のぼり flags 3 side by side (each 160x512 in a 512x512 canvas)
	T.flags = canvasTex( 512, 512, ( c ) => {

		const fl = [ [ 'おでん', '#f6efe0', '#7a1010', '#c8232c' ], [ '肉まん', '#c8232c', '#fff', '#ffe14a' ], [ 'からあげ', '#ffd23a', '#c0392b', '#c0392b' ] ];
		fl.forEach( ( [ t, bg, fg, band ], i ) => {

			const x = i * 170 + 4;
			c.fillStyle = bg; c.fillRect( x, 0, 162, 512 );
			c.fillStyle = band; c.fillRect( x, 0, 162, 26 ); c.fillRect( x, 486, 162, 26 );
			c.fillStyle = fg; vText( c, t, x + 81, 110 + ( 4 - [ ...t ].length ) * 50, 96, 1.04, 900 );
			c.fillStyle = band; fitText( c, 'ツキマート', x + 81, 462, 150, 26, 900 );

		} );

	}, { aniso } );

	// apartment / neighbour walls (tile siding)
	T.siding = canvasTex( 256, 256, ( c, w, h ) => {

		const r = rng( 23 );
		c.fillStyle = '#8c857a'; c.fillRect( 0, 0, w, h );
		for ( let y = 0; y < h; y += 16 ) {

			c.fillStyle = `rgba(0,0,0,${0.15 + r() * 0.08})`; c.fillRect( 0, y, w, 2 );

		}

		for ( let y = 0; y < h; y += 16 ) for ( let x = ( y / 16 ) % 2 * 24; x < w; x += 48 ) {

			c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect( x, y, 2, 16 );

		}

		noise( c, w, h, 3000, 0.15, r );

	}, { repeat: true, aniso } );

	// product atlas (white-ish so instanceColor tints)
	const P = new Atlas( 512 );
	P.draw( 'box', 128, 128, ( c, w, h ) => {

		c.fillStyle = '#f0f0f0'; c.fillRect( 0, 0, w, h );
		c.fillStyle = '#fff'; roundRect( c, 16, 36, 96, 52, 10 ); c.fill();
		c.fillStyle = '#444'; c.fillRect( 26, 52, 76, 8 ); c.fillRect( 34, 66, 60, 6 );
		c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect( 0, 108, w, 20 );

	} );
	P.draw( 'bag', 128, 128, ( c, w, h ) => {

		c.fillStyle = '#e8e8e8'; c.fillRect( 0, 0, w, h );
		c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect( 0, 0, w, 10 ); c.fillRect( 0, h - 10, w, 10 );
		c.fillStyle = '#fff'; c.beginPath(); c.ellipse( 64, 50, 46, 24, - 0.2, 0, 7 ); c.fill();
		c.fillStyle = '#c33'; c.font = font( 22, 900 ); c.textAlign = 'center'; c.fillText( 'ポテト', 64, 58 );
		c.fillStyle = '#e8b04a'; for ( let i = 0; i < 5; i ++ ) c.fillRect( 30 + i * 15, 82, 10, 26 );

	} );
	P.draw( 'cup', 128, 128, ( c, w, h ) => {

		c.fillStyle = '#f4f4f4'; c.fillRect( 0, 0, w, h );
		c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect( 0, 30, w, 50 );
		c.fillStyle = '#fff'; c.font = font( 26, 900 ); c.textAlign = 'center'; c.fillText( 'ヌードル', 64, 64 );
		c.fillStyle = '#d33'; c.fillRect( 0, 96, w, 10 );

	} );
	P.draw( 'bottle', 128, 128, ( c, w, h ) => {

		c.fillStyle = '#dfe9ee'; c.fillRect( 0, 0, w, h );
		c.fillStyle = '#ffffff'; c.fillRect( 0, 40, w, 50 );
		c.fillStyle = 'rgba(0,0,0,0.35)'; c.font = font( 22, 900 ); c.textAlign = 'center'; c.fillText( 'お茶', 64, 72 );
		c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect( 0, 0, w, 14 );

	} );
	P.draw( 'can', 128, 128, ( c, w, h ) => {

		c.fillStyle = '#ededed'; c.fillRect( 0, 0, w, h );
		c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillRect( 0, 50, w, 26 );
		c.fillStyle = 'rgba(0,0,0,0.35)'; c.font = font( 18, 900 ); c.textAlign = 'center'; c.fillText( 'COFFEE', 64, 70 );
		c.fillStyle = '#bbb'; c.fillRect( 0, 0, w, 8 ); c.fillRect( 0, h - 8, w, 8 );

	} );
	P.draw( 'onigiri', 128, 128, ( c, w, h ) => {

		c.fillStyle = '#f7f7f2'; c.fillRect( 0, 0, w, h );
		c.fillStyle = 'rgba(0,0,0,0.06)'; for ( let i = 0; i < 60; i ++ ) c.fillRect( ( i * 37 ) % w, ( i * 53 ) % h, 3, 2 );
		c.fillStyle = '#16201a'; c.fillRect( 30, 62, 68, 66 );
		c.fillStyle = '#e53935'; c.fillRect( 0, 52, w, 9 );
		c.fillStyle = '#fff'; c.fillRect( 40, 78, 48, 26 );
		c.fillStyle = '#c62828'; c.font = font( 18, 900 ); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText( '鮭', 64, 92 );

	} );
	P.draw( 'bento', 128, 128, ( c, w, h ) => {

		c.fillStyle = '#111'; c.fillRect( 0, 0, w, h );
		c.fillStyle = '#fbfbf6'; c.fillRect( 8, 8, 60, 112 );
		c.fillStyle = '#c0392b'; c.beginPath(); c.arc( 38, 64, 8, 0, 7 ); c.fill();
		c.fillStyle = '#b5651d'; c.fillRect( 74, 8, 46, 50 );
		c.fillStyle = '#5fa83a'; c.fillRect( 74, 64, 22, 56 );
		c.fillStyle = '#f2c94c'; c.fillRect( 98, 64, 22, 56 );

	} );
	P.draw( 'pudding', 128, 128, ( c, w, h ) => {

		c.fillStyle = '#f7d77a'; c.fillRect( 0, 0, w, h );
		c.fillStyle = '#6b3a12'; c.fillRect( 0, 0, w, 26 );
		c.fillStyle = '#fff'; c.fillRect( 0, 70, w, 22 );
		c.fillStyle = '#c33'; c.font = font( 16, 900 ); c.textAlign = 'center'; c.fillText( 'プリン', 64, 87 );

	} );
	P.draw( 'sand', 128, 128, ( c, w, h ) => {

		c.fillStyle = '#c8955a'; c.fillRect( 0, 0, w, h );
		c.fillStyle = '#f6ecd2'; c.beginPath(); c.moveTo( 10, 118 ); c.lineTo( 118, 118 ); c.lineTo( 10, 10 ); c.fill();
		c.fillStyle = '#f2c94c'; c.beginPath(); c.moveTo( 40, 118 ); c.lineTo( 62, 118 ); c.lineTo( 40, 96 ); c.fill();
		c.fillStyle = '#5fa83a'; c.fillRect( 44, 30, 10, 88 );
		c.fillStyle = '#e57373'; c.fillRect( 56, 50, 12, 68 );
		c.fillStyle = '#f2c94c'; c.fillRect( 30, 20, 12, 98 );

	} );
	T.prod = P.texture( aniso );
	T.P = P.rects;

	return T;

}
