export function initTabs(){
  const buttons = Array.from(document.querySelectorAll('.tab-btn'));
  const navigation = document.querySelector('.tab-navigation');

  navigation?.setAttribute('role', 'tablist');

  buttons.forEach((button) => {
    const tabName = button.getAttribute('data-tab');
    const panel = document.getElementById(tabName);
    const buttonId = `tab-${tabName}`;
    button.id = buttonId;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', tabName);
    panel?.setAttribute('role', 'tabpanel');
    panel?.setAttribute('aria-labelledby', buttonId);
  });

  function activateTab(tabName, { notify = true, updateUrl = true } = {}) {
    const panel = document.getElementById(tabName);
    const button = buttons.find((item) => item.getAttribute('data-tab') === tabName);
    if (!panel || !button) return false;

    buttons.forEach((item) => {
      item.classList.remove('active');
      item.setAttribute('aria-selected', 'false');
      item.setAttribute('tabindex', '-1');
    });
    document.querySelectorAll('.tab-panel').forEach((item) => {
      item.classList.remove('active');
      item.setAttribute('aria-hidden', 'true');
    });
    button.classList.add('active');
    button.setAttribute('aria-selected', 'true');
    button.setAttribute('tabindex', '0');
    panel.classList.add('active');
    panel.setAttribute('aria-hidden', 'false');

    if (updateUrl && typeof history !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabName);
      history.replaceState(null, '', url);
    }
    if (notify) triggerTabCalculation(tabName);
    return true;
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      activateTab(tabName);
    });

    btn.addEventListener('keydown', (event) => {
      const currentIndex = buttons.indexOf(btn);
      let nextIndex = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % buttons.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = buttons.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      const nextButton = buttons[nextIndex];
      activateTab(nextButton.getAttribute('data-tab'));
      nextButton.focus();
    });
  });

  const requestedTab = new URLSearchParams(window.location.search).get('tab');
  const initialTab = requestedTab && buttons.some((button) => button.getAttribute('data-tab') === requestedTab)
    ? requestedTab
    : buttons.find((button) => button.classList.contains('active'))?.getAttribute('data-tab');
  if (initialTab) activateTab(initialTab, { notify: false, updateUrl: false });
}

function triggerTabCalculation(tabName) {
  // Dispatch custom event to trigger calculations
  const event = new CustomEvent('tabChanged', { detail: { tabName } });
  document.dispatchEvent(event);
}
