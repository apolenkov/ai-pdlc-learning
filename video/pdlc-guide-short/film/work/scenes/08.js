const head = el("pd-h", "<b>07 ·</b>Наблюдение"); show(head, 0.1, 18);
  const tags = el("pd-tags");
  const tag0 = el("pd-tag", "Решает владелец продукта", tags); show(tag0, t("Решает") - 0.1);
  const card = el("pd-card", window.SKETCHES["pdlc-07-observe"]);
  card.style.left = "160px"; card.style.top = "200px"; card.style.width = "1600px";
  const svg = card.firstElementChild;
  svg.removeAttribute("role"); svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("viewBox", "0 90 960 450"); // шапку скетча закрывает плашка ролика
  const strokes = [...svg.querySelectorAll(".s")], texts = [...svg.querySelectorAll("text")];
  const t0 = 0.3, span = Math.min(4.5, DUR * 0.45);
  gsap.set(card, { autoAlpha: 0 });
  gsap.set(strokes, { strokeDashoffset: 1 });
  gsap.set(texts, { opacity: 0 });
  tl.fromTo(card, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out", immediateRender: false }, t0);
  strokes.forEach((p, k) => tl.to(p, { strokeDashoffset: 0, duration: Math.max(0.5, span / 6), ease: "none" }, t0 + 0.3 + (span * k) / strokes.length));
  texts.forEach((x, k) => tl.to(x, { opacity: 1, duration: 0.4, ease: "power1.out" }, t0 + 0.3 + (span * k) / texts.length));
  tl.fromTo(card, { scale: 1 }, { scale: 1.02, duration: DUR, ease: "none", immediateRender: false }, 0);
  [head, tags, card].forEach((e) => hide(e, DUR - 0.3));
