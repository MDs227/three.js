// DOM overlay: title, objectives, shopping list, prompts, subtitles, ATM / register modals, results.

const $ = ( sel, root = document ) => root.querySelector( sel );
const h = ( tag, cls, html ) => {

	const e = document.createElement( tag );
	if ( cls ) e.className = cls;
	if ( html !== undefined ) e.innerHTML = html;
	return e;

};

const ITEM_NAMES = {
	onigiri: [ '鮭おにぎり', '鮭魚飯糰' ],
	tea: [ '冷たい緑茶', '冰綠茶' ],
	pudding: [ 'とろけるプリン', '焦糖布丁' ]
};

export class Hud {

	constructor( cb ) {

		this.cb = cb;
		this.root = $( '#hud' );
		this.onTouchButton = null;
		this._build();

	}

	_build() {

		const r = this.root;
		r.innerHTML = `
		<div class="title" id="title">
			<div class="title-inner">
				<div class="kicker">RAINY NIGHT · KONBINI</div>
				<h1>雨夜の<span>コンビニ</span></h1>
				<p class="tag">傘をさして、夜のコンビニまで。<br><small>撐著透明傘，跑向雨夜裡亮著燈的便利商店。</small></p>
				<button class="start" id="startBtn" disabled>読み込み中… Loading</button>
				<div class="keys">
					<span><b>WASD</b> 移動</span><span><b>Shift</b> ダッシュ</span><span><b>E</b> 調べる</span>
					<span><b>Q</b> 傘</span><span><b>ドラッグ</b> カメラ</span><span><b>P</b> 写真モード</span>
				</div>
				<div class="quality">画質 <button data-q="low">低</button><button data-q="medium">中</button><button data-q="high">高</button></div>
			</div>
		</div>
		<div class="top-left panel" id="objPanel">
			<div class="obj-label">MISSION</div>
			<div class="obj" id="obj">—</div>
			<div class="obj-sub" id="objSub"></div>
			<ul class="list" id="list"></ul>
		</div>
		<div class="top-right panel" id="stats">
			<div class="stat"><span class="k">所持金</span><span class="v" id="money">¥0</span></div>
			<div class="stat"><span class="k">TIME</span><span class="v" id="time">0:00</span></div>
			<div class="stat"><span class="k">濡れ</span><span class="bar"><i id="wet"></i></span></div>
			<div class="fps" id="fps"></div>
		</div>
		<div class="prompt" id="prompt"></div>
		<div class="subtitle" id="subtitle"></div>
		<div class="toast" id="toast"></div>
		<div class="help panel" id="help">
			<b>操作</b>　WASD / 方向鍵 移動　·　Shift 衝刺　·　Z 走路切換　·　E 互動　·　Q 開/收傘　·　滑鼠拖曳 轉鏡頭　·　滾輪 遠近　·　P 寫真模式　·　M 靜音　·　H 說明
		</div>
		<div class="modal-wrap" id="modalWrap"><div class="modal" id="modal"></div></div>
		<div class="end" id="end"></div>
		<div class="photo-hint" id="photoHint">写真モード　拖曳旋轉・滾輪縮放・P 返回</div>
		<div class="joy" id="joy"><i></i></div>
		<div class="touch" id="touch">
			<button data-b="act">E<br><small>調べる</small></button>
			<button data-b="sprint">走<br><small>ダッシュ</small></button>
			<button data-b="umb">傘</button>
			<button data-b="photo">📷</button>
		</div>`;

		$( '#startBtn' ).addEventListener( 'click', () => this.cb.onStart() );
		r.querySelectorAll( '.quality button' ).forEach( b => {

			if ( b.dataset.q === this.cb.quality ) b.classList.add( 'on' );
			b.addEventListener( 'click', () => this.cb.onQuality( b.dataset.q ) );

		} );
		r.querySelectorAll( '#touch button' ).forEach( b => {

			const id = b.dataset.b;
			b.addEventListener( 'pointerdown', e => {

				e.preventDefault(); b.classList.add( 'down' ); this.onTouchButton?.( id, true );

			} );
			const up = () => {

				b.classList.remove( 'down' ); this.onTouchButton?.( id, false );

			};

			b.addEventListener( 'pointerup', up );
			b.addEventListener( 'pointerleave', up );

		} );
		if ( matchMedia( '(pointer: coarse)' ).matches ) document.body.classList.add( 'touch-ui' );

	}

	ready() {

		const b = $( '#startBtn' );
		b.disabled = false;
		b.innerHTML = 'クリックしてスタート <small>點擊開始</small>';

	}

	hideTitle() {

		$( '#title' ).classList.add( 'gone' );
		document.body.classList.add( 'playing' );

	}

	showHelp( sec = 8 ) {

		const e = $( '#help' );
		e.classList.add( 'show' );
		clearTimeout( this._helpT );
		this._helpT = setTimeout( () => e.classList.remove( 'show' ), sec * 1000 );

	}

	toggleHelp() {

		const e = $( '#help' );
		e.classList.toggle( 'show' );

	}

	setObjective( text, sub ) {

		if ( text !== this._obj ) {

			this._obj = text;
			$( '#obj' ).textContent = text;
			$( '#objSub' ).textContent = sub || '';
			$( '#objPanel' ).classList.remove( 'pulse' );
			void $( '#objPanel' ).offsetWidth;
			$( '#objPanel' ).classList.add( 'pulse' );

		}

	}

	setList( items, prices ) {

		const ul = $( '#list' );
		ul.innerHTML = '';
		for ( const id of Object.keys( items ) ) {

			const li = h( 'li', items[ id ] ? 'done' : '', `<i></i><span>${ITEM_NAMES[ id ][ 0 ]}<small>${ITEM_NAMES[ id ][ 1 ]}</small></span><em>¥${prices[ id ]}</em>` );
			ul.appendChild( li );

		}

	}

	setMoney( v, flash ) {

		const e = $( '#money' );
		e.textContent = '¥' + v.toLocaleString();
		if ( flash ) {

			e.classList.remove( 'flash' ); void e.offsetWidth; e.classList.add( 'flash' );

		}

	}

	setTime( t ) {

		const s = Math.floor( t );
		const txt = `${Math.floor( s / 60 )}:${String( s % 60 ).padStart( 2, '0' )}`;
		if ( txt !== this._time ) {

			this._time = txt; $( '#time' ).textContent = txt;

		}

	}

	setWet( w ) {

		$( '#wet' ).style.width = Math.round( w * 100 ) + '%';

	}

	setFps( f ) {

		if ( new URLSearchParams( location.search ).has( 'debug' ) ) $( '#fps' ).textContent = f.toFixed( 0 ) + ' fps';

	}

	setPrompt( p, touch ) {

		const e = $( '#prompt' );
		const key = p ? p.join( '|' ) : '';
		if ( key === this._prompt ) return;
		this._prompt = key;
		if ( ! p ) {

			e.classList.remove( 'show' ); return;

		}

		e.innerHTML = `<kbd>${touch ? 'E' : 'E'}</kbd><span>${p[ 0 ]}<small>${p[ 1 ] || ''}</small></span>`;
		e.classList.add( 'show' );

	}

	subtitle( who, jp, zh ) {

		const e = $( '#subtitle' );
		e.innerHTML = `<b>${who}</b>「${jp}」<small>${zh || ''}</small>`;
		e.classList.add( 'show' );
		clearTimeout( this._subT );
		this._subT = setTimeout( () => e.classList.remove( 'show' ), 3800 );

	}

	toast( msg ) {

		const e = $( '#toast' );
		e.textContent = msg;
		e.classList.add( 'show' );
		clearTimeout( this._toastT );
		this._toastT = setTimeout( () => e.classList.remove( 'show' ), 2600 );

	}

	setPhoto( on ) {

		document.body.classList.toggle( 'photo', on );

	}

	showJoystick( x, y, dx, dy ) {

		const j = $( '#joy' );
		j.style.display = 'block';
		j.style.left = x + 'px'; j.style.top = y + 'px';
		j.firstElementChild.style.transform = `translate(${dx}px, ${dy}px)`;

	}

	hideJoystick() {

		$( '#joy' ).style.display = 'none';

	}

	// ------------------------------------------------ modals

	openModal( kind, data ) {

		this.kind = kind;
		this.data = data;
		$( '#modalWrap' ).classList.add( 'show' );
		if ( kind === 'atm' ) this._atm( 'home' );
		if ( kind === 'register' ) this._register();

	}

	closeModal() {

		$( '#modalWrap' ).classList.remove( 'show' );
		this.kind = null;

	}

	modalKey( code ) {

		const btns = [ ...$( '#modal' ).querySelectorAll( 'button[data-k]' ) ];
		const map = { Digit1: '1', Digit2: '2', Digit3: '3', Numpad1: '1', Numpad2: '2', Numpad3: '3', Enter: '1' };
		const b = btns.find( x => x.dataset.k === map[ code ] );
		if ( b ) b.click();

	}

	_atm( step ) {

		const m = $( '#modal' );
		m.className = 'modal atm';
		const head = `<div class="atm-head"><span>ATM</span><em>ツキマート銀行　24h</em></div>`;
		if ( step === 'home' ) {

			m.innerHTML = `${head}<div class="atm-screen"><div class="atm-hello">いらっしゃいませ</div><div class="atm-sub">ご希望のお取引を選んでください</div>
				<div class="atm-grid">
					<button data-k="1" data-a="out">お引出し<small>領款</small></button>
					<button data-k="2" data-a="in" class="dim">お預入れ<small>存款</small></button>
					<button data-k="3" data-a="bal">残高照会<small>查詢餘額</small></button>
					<button data-a="cancel" class="cancel">取消<small>取消</small></button>
				</div></div>`;

		} else if ( step === 'amount' ) {

			m.innerHTML = `${head}<div class="atm-screen"><div class="atm-hello">金額を選んでください</div><div class="atm-sub">手数料 ¥110（時間外）</div>
				<div class="atm-grid">
					<button data-k="1" data-v="1000">1,000円</button>
					<button data-k="2" data-v="5000">5,000円</button>
					<button data-k="3" data-v="10000">10,000円</button>
					<button data-a="cancel" class="cancel">取消</button>
				</div></div>`;

		} else if ( step === 'bal' ) {

			m.innerHTML = `${head}<div class="atm-screen"><div class="atm-hello">残高　¥ 23,481</div><div class="atm-sub">（一人暮らしの現実…）</div>
				<div class="atm-grid"><button data-k="1" data-a="home">戻る<small>返回</small></button><button data-a="cancel" class="cancel">取消</button></div></div>`;

		} else if ( step === 'busy' ) {

			m.innerHTML = `${head}<div class="atm-screen busy"><div class="spinner"></div><div class="atm-hello">お取引中です</div><div class="atm-sub">しばらくお待ちください…</div></div>`;

		} else if ( step === 'done' ) {

			m.innerHTML = `${head}<div class="atm-screen"><div class="atm-hello">お札をお取りください</div><div class="atm-sub">ご利用ありがとうございました</div>
				<div class="cash"></div><div class="atm-grid"><button data-k="1" data-a="cancel">終了<small>完成</small></button></div></div>`;

		}

		m.querySelectorAll( 'button' ).forEach( b => b.addEventListener( 'click', () => {

			const a = b.dataset.a;
			if ( a === 'cancel' ) return this.cb.onCloseModal();
			if ( a === 'out' ) return this._atm( 'amount' );
			if ( a === 'bal' ) return this._atm( 'bal' );
			if ( a === 'home' ) return this._atm( 'home' );
			if ( a === 'in' ) return;
			if ( b.dataset.v ) {

				const v = Number( b.dataset.v ) - 110;
				this._atm( 'busy' );
				this.cb.onAtm( v );
				setTimeout( () => this.kind === 'atm' && this._atm( 'done' ), 1700 );

			}

		} ) );

	}

	_register() {

		const m = $( '#modal' );
		const p = this.data.prices;
		m.className = 'modal reg';
		const render = ( nik ) => {

			const total = this.data.total + ( nik ? p.nikuman : 0 );
			m.innerHTML = `<div class="reg-head">ツキマート　お会計</div>
				<div class="receipt">
					<div><span>鮭おにぎり</span><span>¥${p.onigiri}</span></div>
					<div><span>冷たい緑茶 500ml</span><span>¥${p.tea}</span></div>
					<div><span>とろけるプリン</span><span>¥${p.pudding}</span></div>
					${nik ? `<div class="new"><span>ほかほか肉まん</span><span>¥${p.nikuman}</span></div>` : ''}
					<hr><div class="tot"><span>合計</span><span>¥${total.toLocaleString()}</span></div>
					<div class="have"><span>所持金</span><span>¥${this.data.money.toLocaleString()}</span></div>
				</div>
				<div class="clerk">店員「${nik ? 'ありがとうございます！温めておきますね〜' : 'ご一緒に肉まんはいかがですか？'}」</div>
				<div class="reg-btns">
					${nik ? '' : `<button data-k="2" data-a="nik">肉まんも！ +¥${p.nikuman}<small>加購肉包</small></button>`}
					<button data-k="1" data-a="pay" class="primary">支払う<small>付款</small></button>
					<button data-a="cancel" class="cancel">やめる</button>
				</div>`;
			m.querySelectorAll( 'button' ).forEach( b => b.addEventListener( 'click', () => {

				const a = b.dataset.a;
				if ( a === 'cancel' ) return this.cb.onCloseModal();
				if ( a === 'nik' ) return render( true );
				if ( a === 'pay' ) {

					const ok = this.cb.onRegister( nik );
					if ( ok ) m.innerHTML = `<div class="reg-head">ツキマート</div><div class="paid">お支払い完了<small>付款完成</small></div><div class="clerk">「レシートはご利用ですか？」</div>`;

				}

			} ) );

		};

		render( false );

	}

	showEnd( { time, wet, rank, nikuman, change } ) {

		const e = $( '#end' );
		const s = Math.floor( time );
		e.innerHTML = `<div class="end-card">
			<div class="kicker">MISSION COMPLETE</div>
			<h2>おつかい完了</h2>
			<div class="rank r-${rank}">${rank}</div>
			<div class="res"><span>タイム</span><b>${Math.floor( s / 60 )}:${String( s % 60 ).padStart( 2, '0' )}</b></div>
			<div class="res"><span>濡れ度</span><b>${wet}%</b></div>
			<div class="res"><span>おつり</span><b>¥${change.toLocaleString()}</b></div>
			<p>${nikuman ? '雨の帰り道、ほかほかの肉まんが手の中であたたかい。' : '雨音を聞きながら、家路につく。'}<br><small>${nikuman ? '回家的雨路上，手裡的肉包暖呼呼的。' : '聽著雨聲，踏上回家的路。'}</small></p>
			<div class="end-btns"><button id="again">もう一度<small>再玩一次</small></button><button id="photo">写真モード<small>繼續拍照</small></button></div>
		</div>`;
		e.classList.add( 'show' );
		$( '#again' ).onclick = () => this.cb.onRestart();
		$( '#photo' ).onclick = () => {

			e.classList.remove( 'show' ); this.cb.onPhoto();

		};

	}

}
