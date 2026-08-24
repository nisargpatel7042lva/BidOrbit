import { KitEventType, Networks, StellarWalletsKit } from '@creit.tech/stellar-wallets-kit'
import { AlbedoModule } from '@creit.tech/stellar-wallets-kit/modules/albedo'
import { FreighterModule } from '@creit.tech/stellar-wallets-kit/modules/freighter'
import { LobstrModule } from '@creit.tech/stellar-wallets-kit/modules/lobstr'
import { xBullModule } from '@creit.tech/stellar-wallets-kit/modules/xbull'

StellarWalletsKit.init({
  modules: [
    new FreighterModule(),
    new xBullModule(),
    new AlbedoModule(),
    new LobstrModule(),
  ],
  network: Networks.TESTNET,
  authModal: {
    // Show an install link for wallets that aren't installed so users know
    // how to get them rather than seeing a silent failure.
    showInstallLabel: true,
    hideUnsupportedWallets: false,
  },
})

export { KitEventType, Networks, StellarWalletsKit }
