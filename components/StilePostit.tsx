"use client";

/**
 * Stili grafici del post-it.
 *
 * Ogni variante (1..16) e' una classe CSS `.stile-N` applicata al post-it.
 * Il "foglio" e' reso da <span className="stile-sheet"> (sfondo + bordo
 * strappato tramite clip-path); le decorazioni (nastro, graffette, buchi,
 * righe margine...) sono figli che possono SPORGERE fuori dal bordo del
 * foglio. Le decorazioni hanno nomi prefissati con "st-" per non collidere
 * con altre classi dell'app.
 *
 * Lo stile si puo' applicare a: la card del muro (PostIt.tsx), l'editor
 * (anteprima dal vivo) e le anteprime del selettore (ScegliStile.tsx).
 */

/** Quante varianti esistono. */
export const N_STILI = 16;

/**
 * Restituisce la classe della variante (o "" se lo stile non e' valido).
 * Aggiunge anche "stile-attivo", che spegne ombra/angoli del post-it
 * classico e accende l'ombra sagomata del foglio.
 */
export function classiStile(stile?: number | null): string {
  if (stile == null) return "";
  const n = Math.round(Number(stile));
  if (!Number.isFinite(n) || n < 1 || n > N_STILI) return "";
  return `stile-${n} stile-attivo`;
}

/** Numero di stile valido (1..16) oppure null. */
export function numeroStile(stile?: number | null): number | null {
  if (stile == null) return null;
  const n = Math.round(Number(stile));
  return Number.isFinite(n) && n >= 1 && n <= N_STILI ? n : null;
}

function fori(quanti: number) {
  return (
    <span className="st-holes" aria-hidden>
      {Array.from({ length: quanti }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}

/**
 * Decorazioni della variante scelta (da renderizzare dentro il post-it,
 * dopo <span className="stile-sheet">). Ritorna null per le varianti che
 * non hanno decorazioni extra.
 */
export function DecorazioniStile({ stile }: { stile: number }) {
  switch (stile) {
    case 1:
      return (
        <>
          {fori(7)}
          <span className="st-tape t1" aria-hidden />
        </>
      );
    case 2:
      return <span className="st-tape t1" aria-hidden />;
    case 3:
      return <span className="st-tape t1" aria-hidden />;
    case 4:
      return (
        <>
          <span className="st-clip" aria-hidden />
          <span className="st-star a" aria-hidden />
          <span className="st-star b" aria-hidden />
          <span className="st-star c" aria-hidden />
        </>
      );
    case 5:
      return <span className="st-fold" aria-hidden />;
    case 6:
      return (
        <span className="st-paint" aria-hidden>
          <span className="st-titlebar">
            <b>untitled - Paint</b>
          </span>
          <span className="st-menu">
            <i>File</i>
            <i>Edit</i>
            <i>View</i>
            <i>Image</i>
            <i>Help</i>
          </span>
        </span>
      );
    case 7:
      return <span className="st-bleed" aria-hidden />;
    case 8:
      return <span className="st-paperclip" aria-hidden />;
    case 9:
      return <span className="st-tape t1" aria-hidden />;
    case 10:
      return (
        <>
          <span className="st-margin" aria-hidden />
          <span className="st-notehd" aria-hidden>
            note :
          </span>
        </>
      );
    case 11:
      return (
        <>
          <span className="st-hd" aria-hidden>
            REMINDER
          </span>
          <span className="st-lines" aria-hidden />
        </>
      );
    case 12:
      return null;
    case 13:
      return null;
    case 14:
      return (
        <>
          <span className="st-tape t1" aria-hidden />
          <span className="st-tape t2" aria-hidden />
        </>
      );
    case 15:
      return (
        <>
          <span className="st-tape t1" aria-hidden />
          <span className="st-tape t2" aria-hidden />
        </>
      );
    case 16:
      return (
        <>
          {fori(7)}
          <span className="st-tape t1" aria-hidden />
          <span className="st-tape t2" aria-hidden />
          <span className="st-tape t3" aria-hidden />
        </>
      );
    default:
      return null;
  }
}
