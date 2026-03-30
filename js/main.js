// RiskScent notify form
(function() {
  var form = document.getElementById('riskscent-notify');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    var btn = form.querySelector('.notify-btn');
    var status = form.querySelector('.notify-status');
    var input = form.querySelector('.notify-input');

    btn.disabled = true;
    btn.textContent = 'Sending…';
    status.textContent = '';
    status.className = 'notify-status';

    try {
      var data = new FormData(form);
      var res = await fetch('/notify', { method: 'POST', body: data });
      var json = await res.json();

      if (res.ok && json.ok) {
        status.textContent = "You're on the list — we'll email you when RiskScent launches.";
        status.className = 'notify-status success';
        input.value = '';
        btn.textContent = 'Done ✓';
      } else {
        status.textContent = json.error || 'Something went wrong. Try again.';
        status.className = 'notify-status error';
        btn.disabled = false;
        btn.textContent = 'Notify Me';
      }
    } catch (err) {
      status.textContent = 'Connection error. Try again.';
      status.className = 'notify-status error';
      btn.disabled = false;
      btn.textContent = 'Notify Me';
    }
  });
})();

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
