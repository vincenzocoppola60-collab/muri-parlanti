"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useLingua } from "@/lib/i18n";
import { caricaMioProfilo, urlAvatar, type Profilo } from "@/lib/profili";
import { eAmministratore } from "@/lib/admin";
import { CreditiCompatto } from "@/components/Crediti";

/**
 * Menu a tendina laterale (hamburger in alto a sinistra).
 * Pensato per smartphone: pannello che scorre da sinistra, voci grandi
 * e toccabili, si chiude toccando il velo, il pulsante ✕ o con Esc.
 * Nascosto sulle pagine /qr (devono restare pulite per la stampa).
 */
export default function MenuLaterale() {
  const pathname = usePathname();
  const { utente, caricamento, nickname, esci } = useAuth();
  const { t } = useLingua();
  const [aperto, setAperto] = useState(false);
  const [profilo, setProfilo] = useState<Profilo | null>(null);
  const [sonoAdmin, setSonoAdmin] = useState(false);

  const nascosto = pathname?.startsWith("/qr") ?? false;

  // Chiude il menu a ogni cambio pagina.
  useEffect(() => {
    setAperto(false);
  }, [pathname]);

  // Blocca lo scroll del fondo e chiude con Esc quando il menu e' aperto.
  useEffect(() => {
    if (!aperto) return;
    const precedente = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const suTasto = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAperto(false);
    };
    window.addEventListener("keydown", suTasto);
    return () => {
      document.body.style.overflow = precedente;
      window.removeEventListener("keydown", suTasto);
    };
  }, [aperto]);

  // Avatar e nickname vero arrivano dal profilo (caricati solo quando serve).
  useEffect(() => {
    if (!aperto || !utente || profilo) return;
    let attivo = true;
    caricaMioProfilo()
      .then((esito) => {
        if (attivo) setProfilo(esito.profilo);
      })
      .catch(() => {
        // Senza profilo mostriamo l'iniziale del nickname: nessun errore.
      });
    return () => {
      attivo = false;
    };
  }, [aperto, utente, profilo]);

  // Il tasto "Pannello admin" compare SOLO se l'account collegato e'
  // amministratore. La sicurezza vera resta nel database (RLS): anche
  // forzando l'URL /admin/muri, un non-admin non puo' fare nulla.
  useEffect(() => {
    if (!utente) {
      setSonoAdmin(false);
      return;
    }
    let attivo = true;
    eAmministratore()
      .then((si) => attivo && setSonoAdmin(si))
      .catch(() => attivo && setSonoAdmin(false));
    return () => {
      attivo = false;
    };
  }, [utente]);

  const chiudi = useCallback(() => setAperto(false), []);

  if (nascosto) return null;

  const nomeMostrato = profilo?.nickname || nickname || "";
  const avatar = urlAvatar(profilo);
  const iniziale = nomeMostrato.trim().charAt(0).toUpperCase() || "?";

  const voceBase =
    "flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-semibold text-amber-100 transition";
  const attivo = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");
  const voce = (href: string) =>
    `${voceBase} ${
      attivo(href)
        ? "bg-amber-100/15"
        : "hover:bg-amber-100/10 active:bg-amber-100/20"
    }`;

  return (
    <>
      <button
        type="button"
        onClick={() => setAperto(true)}
        aria-label={t("nav.apri")}
        aria-expanded={aperto}
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-amber-100/25 bg-stone-950/70 text-xl text-amber-100 shadow-lg backdrop-blur transition hover:scale-105 active:scale-95"
      >
        <span aria-hidden>☰</span>
      </button>

      {/* Velo: toccalo per chiudere */}
      <div
        aria-hidden
        onClick={chiudi}
        className={`fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm transition-opacity duration-200 ${
          aperto ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        aria-label="Menu principale"
        aria-hidden={!aperto}
        className={`fixed left-0 top-0 z-50 flex h-dvh w-72 max-w-[82vw] flex-col overflow-y-auto border-r border-amber-100/20 bg-stone-950/95 shadow-2xl backdrop-blur-md transition-transform duration-200 ${
          aperto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-5">
          <span className="font-scritta text-2xl text-amber-100">
            {t("nav.menu")}
          </span>
          <button
            type="button"
            onClick={chiudi}
            aria-label={t("nav.chiudi")}
            className="rounded-full px-2 py-1 text-lg text-stone-400 transition hover:text-amber-100"
          >
            ✕
          </button>
        </div>

        {/* Identità: profilo o invito all'account */}
        <div className="mx-4 mt-4 rounded-xl border border-amber-100/15 bg-stone-900/60 p-4">
          {caricamento ? null : utente ? (
            <Link
              href={`/profilo/${utente.id}`}
              onClick={chiudi}
              className="flex items-center gap-3"
            >
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-amber-300/60"
                />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-300 font-scritta text-2xl font-bold text-stone-900">
                  {iniziale}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate font-scritta text-xl text-amber-100">
                  {nomeMostrato || t("nav.tuoProfilo")}
                </span>
                <span className="block text-xs text-stone-400">
                  {t("nav.toccaProfilo")}
                </span>
              </span>
            </Link>
          ) : (
            <Link href="/impostazioni" onClick={chiudi} className="block">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-800 text-2xl">
                👤
              </span>
              <span className="mt-2 block font-scritta text-xl text-amber-100">
                {t("nav.ospite")}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-stone-400">
                {t("nav.ospiteDescr")}
              </span>
            </Link>
          )}
        </div>

        <nav className="mt-4 flex flex-col gap-1 px-3">
          <Link href="/" onClick={chiudi} className={voce("/")}>
            <span aria-hidden className="text-xl">🏠</span> {t("nav.home")}
          </Link>
          {utente && (
            <Link
              href={`/profilo/${utente.id}`}
              onClick={chiudi}
              className={voce(`/profilo/${utente.id}`)}
            >
              <span aria-hidden className="text-xl">🧑</span> {t("nav.tuoProfilo")}
            </Link>
          )}
          <Link href="/miei-muri" onClick={chiudi} className={voce("/miei-muri")}>
            <span aria-hidden className="text-xl">🧱</span> {t("nav.mieiMuri")}
          </Link>
          <Link href="/preferiti" onClick={chiudi} className={voce("/preferiti")}>
            <span aria-hidden className="text-xl">❤️</span> {t("nav.salvati")}
          </Link>
          <Link href="/scansiona" onClick={chiudi} className={voce("/scansiona")}>
            <span aria-hidden className="text-xl">📷</span> {t("nav.scansiona")}
          </Link>
          <Link href="/impostazioni" onClick={chiudi} className={voce("/impostazioni")}>
            <span aria-hidden className="text-xl">⚙️</span> {t("nav.impostazioni")}
          </Link>
          {utente && sonoAdmin && (
            <>
              <div className="mx-1 my-2 border-t border-amber-100/10" />
              <Link
                href="/admin/muri"
                onClick={chiudi}
                className={voce("/admin/muri")}
              >
                <span aria-hidden className="text-xl">🛠️</span> {t("nav.admin")}
              </Link>
            </>
          )}
        </nav>

        <div className="mt-auto px-4 pb-6 pt-6">
          {utente ? (
            <button
              type="button"
              onClick={() => {
                esci();
                chiudi();
              }}
              className="w-full rounded-full border border-amber-100/30 px-4 py-2.5 text-sm font-semibold text-amber-100/90 transition hover:border-amber-100/60 hover:bg-stone-900"
            >
              {t("nav.esci")}
            </button>
          ) : (
            <Link
              href="/impostazioni"
              onClick={chiudi}
              className="block rounded-full bg-amber-300 px-4 py-2.5 text-center text-sm font-bold text-stone-900 shadow-lg transition hover:scale-105 active:scale-95"
            >
              {t("nav.creaAccount")}
            </Link>
          )}
          <p className="mt-4">
            <CreditiCompatto />
          </p>
        </div>
      </aside>
    </>
  );
}
