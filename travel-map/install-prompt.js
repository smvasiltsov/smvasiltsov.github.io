// The browser owns eligibility and confirmation; an offer is usable only once.
export class InstallPrompt {
  constructor(changed = () => {}) { this.changed = changed; this.offer = null; }
  capture(event) { event.preventDefault(); this.offer = event; this.changed(); }
  clear() { this.offer = null; this.changed(); }
  async request() {
    const offer = this.offer;
    if (!offer) return null;
    this.clear();
    await offer.prompt();
    return (await offer.userChoice).outcome;
  }
}
export function installedDisplay({standalone = false, fullscreen = false, minimalUi = false, iosStandalone = false}) {
  return standalone || fullscreen || minimalUi || iosStandalone;
}
