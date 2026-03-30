// Mobile menu toggle
(function() {
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.querySelector('.nav-links');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', function() {
    var isOpen = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen);
    toggle.querySelector('.icon-menu').style.display = isOpen ? 'none' : 'block';
    toggle.querySelector('.icon-close').style.display = isOpen ? 'block' : 'none';
  });

  menu.querySelectorAll('a').forEach(function(link) {
    link.addEventListener('click', function() {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.querySelector('.icon-menu').style.display = 'block';
      toggle.querySelector('.icon-close').style.display = 'none';
    });
  });
})();
