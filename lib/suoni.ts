/**
 * Suoni dell'interfaccia generati con la Web Audio API: nessun file audio da
 * scaricare, funzionano anche offline.
 *
 * `suonaPenna()` riproduce il suono di una penna che scrive su un foglio:
 * una breve serie di "scritch" (pennellate) che iniziano e finiscono, poi
 * silenzio. Va chiamata DOPO un gesto dell'utente (il tap su "Attacca"),
 * altrimenti il browser blocca l'audio.
 */
export function suonaPenna(durataMs = 1300): void {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const ora = ctx.currentTime;
    const durata = durataMs / 1000;

    // 1) "Base" di carta: rumore bianco (un soffio continuo) filtrato a banda
    //    alta, il timbro sottile della punta che gratta il foglio.
    const campioni = Math.max(1, Math.floor(ctx.sampleRate * durata));
    const buffer = ctx.createBuffer(1, campioni, ctx.sampleRate);
    const dati = buffer.getChannelData(0);
    for (let i = 0; i < campioni; i++) dati[i] = Math.random() * 2 - 1;

    const sorgente = ctx.createBufferSource();
    sorgente.buffer = buffer;

    const filtro = ctx.createBiquadFilter();
    filtro.type = "bandpass";
    filtro.frequency.value = 3200;
    filtro.Q.value = 0.7;

    // 2) Il volume non e' costante: e' fatto di pennellate. Questo gain viene
    //    "disegnato" tratto per tratto (attacco rapido, rilascio rapido) con
    //    micro-pause in mezzo, come quando la penna stacca dal foglio.
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;

    const uscita = ctx.createGain();
    uscita.gain.value = 0.1; // volume garbato

    sorgente.connect(filtro);
    filtro.connect(gain);
    gain.connect(uscita);
    uscita.connect(ctx.destination);

    let t = 0;
    while (t < durata) {
      const tratto = 0.05 + Math.random() * 0.12; // durata di una pennellata
      const pausa = 0.02 + Math.random() * 0.05; // micro-pausa fra i tratti
      const picco = 0.45 + Math.random() * 0.55; // forza della pennellata
      const inizio = ora + t;
      const fine = inizio + tratto;

      gain.gain.setValueAtTime(0.0001, inizio);
      gain.gain.exponentialRampToValueAtTime(picco, inizio + tratto * 0.35);
      gain.gain.exponentialRampToValueAtTime(0.0001, fine);
      // Ogni tratto "cambia timbro": piccola variazione della banda.
      filtro.frequency.setValueAtTime(2600 + Math.random() * 2200, inizio);

      t += tratto + pausa;
    }

    sorgente.start(ora);
    sorgente.stop(ora + durata + 0.05);

    // Chiude il contesto audio quando ha finito (risparmia risorse).
    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, durataMs + 250);
  } catch {
    // Nessun audio disponibile: non è un problema, si ignora in silenzio.
  }
}
