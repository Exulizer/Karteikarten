/* KarteiDeck: Seite "Bald online". Nur das Umdrehen der Karte. */
(function () {
  var b = document.getElementById('flip');
  if (!b) return;
  document.documentElement.classList.remove('nojs');
  b.addEventListener('click', function () {
    var on = b.classList.toggle('on');
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
})();
