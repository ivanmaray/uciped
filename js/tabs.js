export function initTabs(){
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(tabName).classList.add('active');
      
      // Trigger auto-calculation for the active tab
      triggerTabCalculation(tabName);
    });
  });
}

function triggerTabCalculation(tabName) {
  // Dispatch custom event to trigger calculations
  const event = new CustomEvent('tabChanged', { detail: { tabName } });
  document.dispatchEvent(event);
}
