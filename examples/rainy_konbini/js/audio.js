// Fully procedural WebAudio soundscape — no audio files.
export class SoundScape {

	constructor() {

		this.ctx = null;
		this.enabled = true;

	}

	start() {

		if ( this.ctx ) {

			this.ctx.resume();
			return;

		}

		const AC = window.AudioContext || window.webkitAudioContext;
		if ( ! AC ) return;
		const ctx = this.ctx = new AC();
		this.master = ctx.createGain();
		this.master.gain.value = 0.8;
		this.master.connect( ctx.destination );

		// shared noise buffer
		const len = ctx.sampleRate * 2;
		this.noise = ctx.createBuffer( 1, len, ctx.sampleRate );
		const d = this.noise.getChannelData( 0 );
		let b = 0;
		for ( let i = 0; i < len; i ++ ) {

			const w = Math.random() * 2 - 1;
			b = 0.97 * b + 0.03 * w; // a touch of brown for body
			d[ i ] = w * 0.6 + b * 2.0;

		}

		// outdoor rain bus -> lowpass (muffled when inside)
		this.rainBus = ctx.createGain();
		this.rainLP = ctx.createBiquadFilter();
		this.rainLP.type = 'lowpass';
		this.rainLP.frequency.value = 16000;
		this.rainBus.connect( this.rainLP ).connect( this.master );

		const layer = ( type, freq, q, gain ) => {

			const src = ctx.createBufferSource();
			src.buffer = this.noise; src.loop = true;
			src.playbackRate.value = 0.9 + Math.random() * 0.2;
			const f = ctx.createBiquadFilter();
			f.type = type; f.frequency.value = freq; f.Q.value = q;
			const g = ctx.createGain(); g.gain.value = gain;
			src.connect( f ).connect( g ).connect( this.rainBus );
			src.start( 0, Math.random() * 2 );
			return g;

		};

		layer( 'highpass', 3500, 0.5, 0.10 ); // hiss
		layer( 'bandpass', 1200, 0.6, 0.22 ); // body
		this.rumble = layer( 'lowpass', 300, 0.7, 0.35 ); // distant roar

		// gutter / pipe trickle: random dripping blips
		this.dripTimer = 0;

		// umbrella patter bus
		this.umbBus = ctx.createGain();
		this.umbBus.gain.value = 0;
		this.umbBus.connect( this.master );

		// in-store bus: fridge hum + music box
		this.storeBus = ctx.createGain();
		this.storeBus.gain.value = 0;
		this.storeBus.connect( this.master );
		const hum = ctx.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 60;
		const humF = ctx.createBiquadFilter(); humF.type = 'lowpass'; humF.frequency.value = 180;
		const humG = ctx.createGain(); humG.gain.value = 0.03;
		hum.connect( humF ).connect( humG ).connect( this.storeBus ); hum.start();
		this.musicStep = 0;
		this.musicTime = 0;

		this.umbTimer = 0;

	}

	_noiseBurst( { t = 0, dur = 0.08, freq = 2000, q = 1, gain = 0.3, type = 'bandpass', dest, pan = 0, rate = 1 } ) {

		const ctx = this.ctx;
		const s = ctx.createBufferSource();
		s.buffer = this.noise;
		s.playbackRate.value = rate;
		const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
		const g = ctx.createGain();
		const now = ctx.currentTime + t;
		g.gain.setValueAtTime( 0, now );
		g.gain.linearRampToValueAtTime( gain, now + 0.004 );
		g.gain.exponentialRampToValueAtTime( 0.0001, now + dur );
		let node = s.connect( f ).connect( g );
		if ( ctx.createStereoPanner ) {

			const p = ctx.createStereoPanner(); p.pan.value = pan; node = node.connect( p );

		}

		node.connect( dest || this.master );
		s.start( now, Math.random() * 1.5, dur + 0.05 );

	}

	_tone( { t = 0, freq = 440, dur = 0.5, gain = 0.2, type = 'sine', dest } ) {

		const ctx = this.ctx;
		const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
		const g = ctx.createGain();
		const now = ctx.currentTime + t;
		g.gain.setValueAtTime( 0, now );
		g.gain.linearRampToValueAtTime( gain, now + 0.01 );
		g.gain.exponentialRampToValueAtTime( 0.0001, now + dur );
		o.connect( g ).connect( dest || this.master );
		o.start( now ); o.stop( now + dur + 0.05 );

	}

	footstep( { inside, wet, strength = 1 } ) {

		if ( ! this.ctx ) return;
		if ( inside ) {

			this._noiseBurst( { freq: 900, q: 1.2, dur: 0.06, gain: 0.12 * strength } );
			this._noiseBurst( { freq: 3800, q: 2, dur: 0.03, gain: 0.04 * strength } ); // sneaker squeak-ish

		} else {

			this._noiseBurst( { freq: 1600 + Math.random() * 800, q: 0.8, dur: 0.16, gain: 0.22 * strength } );
			if ( wet ) this._noiseBurst( { t: 0.02, freq: 600, q: 1.5, dur: 0.12, gain: 0.12 * strength, type: 'lowpass' } );

		}

	}

	chime() {

		if ( ! this.ctx ) return;
		this._tone( { freq: 784, dur: 1.2, gain: 0.12 } );
		this._tone( { freq: 1568, dur: 0.6, gain: 0.02 } );
		this._tone( { t: 0.42, freq: 622, dur: 1.6, gain: 0.12 } );
		this._tone( { t: 0.42, freq: 1244, dur: 0.8, gain: 0.02 } );

	}

	beep( n = 1 ) {

		if ( ! this.ctx ) return;
		for ( let i = 0; i < n; i ++ ) this._tone( { t: i * 0.14, freq: 1850, dur: 0.09, gain: 0.08, type: 'square' } );

	}

	cash() {

		if ( ! this.ctx ) return;
		this.beep( 1 );
		for ( let i = 0; i < 5; i ++ ) this._noiseBurst( { t: 0.25 + i * 0.05, freq: 4500, q: 4, dur: 0.05, gain: 0.05 } );
		this._tone( { t: 0.6, freq: 1320, dur: 0.5, gain: 0.07, type: 'triangle' } );

	}

	pickup() {

		if ( ! this.ctx ) return;
		this._noiseBurst( { freq: 2500, q: 0.7, dur: 0.12, gain: 0.08 } ); // plastic rustle
		this._tone( { t: 0.05, freq: 1046, dur: 0.25, gain: 0.05, type: 'triangle' } );
		this._tone( { t: 0.12, freq: 1568, dur: 0.35, gain: 0.04, type: 'triangle' } );

	}

	umbrella( open ) {

		if ( ! this.ctx ) return;
		this._noiseBurst( { freq: open ? 1400 : 900, q: 0.6, dur: 0.35, gain: 0.12 } );
		this._noiseBurst( { t: 0.25, freq: 3000, q: 3, dur: 0.05, gain: 0.08 } ); // click of the runner

	}

	thunder( delay = 2 ) {

		if ( ! this.ctx ) return;
		const ctx = this.ctx;
		const s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; s.playbackRate.value = 0.5;
		const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160; f.Q.value = 0.8;
		const g = ctx.createGain();
		const now = ctx.currentTime + delay;
		g.gain.setValueAtTime( 0, now );
		g.gain.linearRampToValueAtTime( 0.9, now + 0.25 );
		g.gain.setTargetAtTime( 0.35, now + 0.4, 0.4 );
		g.gain.linearRampToValueAtTime( 0.6, now + 1.3 );
		g.gain.exponentialRampToValueAtTime( 0.0001, now + 5.5 );
		f.frequency.setValueAtTime( 320, now );
		f.frequency.exponentialRampToValueAtTime( 90, now + 5 );
		s.connect( f ).connect( g ).connect( this.rainBus );
		s.start( now ); s.stop( now + 6 );

	}

	horn( pan = 0 ) {

		if ( ! this.ctx ) return;
		this._tone( { freq: 415, dur: 0.45, gain: 0.07, type: 'sawtooth' } );
		this._tone( { freq: 523, dur: 0.45, gain: 0.05, type: 'sawtooth' } );

	}

	carPass( pan, dist, speed ) {

		// called every frame by car: continuous wet-tyre swish handled via gain
		if ( ! this.ctx ) return;
		if ( ! this.carG ) {

			const ctx = this.ctx;
			const s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true;
			this.carF = ctx.createBiquadFilter(); this.carF.type = 'bandpass'; this.carF.Q.value = 0.6;
			this.carG = ctx.createGain(); this.carG.gain.value = 0;
			this.carP = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
			let n = s.connect( this.carF ).connect( this.carG );
			if ( this.carP ) n = n.connect( this.carP );
			n.connect( this.master );
			s.start();

		}

		const now = this.ctx.currentTime;
		const g = Math.min( 0.5, 5 / ( 1 + dist * dist * 0.08 ) ) * Math.min( 1, speed / 8 );
		this.carG.gain.setTargetAtTime( g * 0.35, now, 0.05 );
		this.carF.frequency.setTargetAtTime( 500 + speed * 60, now, 0.1 );
		if ( this.carP ) this.carP.pan.setTargetAtTime( Math.max( - 1, Math.min( 1, pan ) ), now, 0.05 );

	}

	update( dt, { inside, umbrellaOpen, underCover } ) {

		if ( ! this.ctx ) return;
		const now = this.ctx.currentTime;
		this.rainLP.frequency.setTargetAtTime( inside ? 520 : 16000, now, 0.25 );
		this.rainBus.gain.setTargetAtTime( inside ? 0.45 : 1.0, now, 0.25 );
		this.storeBus.gain.setTargetAtTime( inside ? 1 : 0.06, now, 0.3 );
		const umb = ! inside && ! underCover && umbrellaOpen > 0.7;
		this.umbBus.gain.setTargetAtTime( umb ? 1 : 0, now, 0.15 );

		// rain on the vinyl umbrella: dense random taps
		if ( umb ) {

			this.umbTimer += dt;
			while ( this.umbTimer > 0.018 ) {

				this.umbTimer -= 0.018;
				if ( Math.random() < 0.7 ) this._noiseBurst( { freq: 2500 + Math.random() * 3500, q: 3 + Math.random() * 4, dur: 0.03 + Math.random() * 0.03, gain: 0.03 + Math.random() * 0.05, dest: this.umbBus, pan: ( Math.random() - 0.5 ) * 0.8, rate: 1.5 } );

			}

		}

		// gutter drips
		this.dripTimer -= dt;
		if ( this.dripTimer < 0 ) {

			this.dripTimer = 0.15 + Math.random() * 0.6;
			if ( ! inside ) this._tone( { freq: 900 + Math.random() * 900, dur: 0.06, gain: 0.015, type: 'sine', dest: this.rainBus } );

		}

		// gentle in-store music box loop (pentatonic)
		this.musicTime += dt;
		const beat = 0.32;
		while ( this.musicTime > beat ) {

			this.musicTime -= beat;
			const seq = [ 0, 4, 7, 9, 12, 9, 7, 4, 2, 5, 9, 12, 14, 12, 9, 5, 0, 4, 7, 11, 12, 11, 7, 4, - 1, 2, 7, 11, 14, 11, 7, 2 ];
			const note = seq[ this.musicStep % seq.length ];
			const f = 523.25 * Math.pow( 2, note / 12 );
			this._tone( { freq: f, dur: 0.9, gain: 0.025, type: 'sine', dest: this.storeBus } );
			this._tone( { freq: f * 2, dur: 0.4, gain: 0.006, type: 'sine', dest: this.storeBus } );
			if ( this.musicStep % 8 === 0 ) this._tone( { freq: f / 2, dur: 2.2, gain: 0.02, type: 'triangle', dest: this.storeBus } );
			this.musicStep ++;

		}

	}

}
