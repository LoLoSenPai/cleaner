// plugins/with-proguard-walletadapter.js
const { withDangerousMod } = require('@expo/config-plugins')
const fs = require('fs')
const path = require('path')

const RULES_BLOCK = `
# --- Wallet Adapter & common deps (kept via config plugin) ---
-keep class com.solana.mobilewalletadapter.** { *; }
-keep interface com.solana.mobilewalletadapter.** { *; }
-dontwarn com.solana.mobilewalletadapter.**

-keep class com.solanamobile.** { *; }
-keep interface com.solanamobile.** { *; }
-dontwarn com.solanamobile.**

-keep class kotlinx.** { *; }
-dontwarn kotlinx.**

-keep class org.json.** { *; }
-dontwarn org.json.**
# --- end block ---
`.trim()

module.exports = function withProguardWalletAdapter(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot
      const proguardPath = path.join(projectRoot, 'android', 'app', 'proguard-rules.pro')

      try {
        let current = fs.existsSync(proguardPath) ? fs.readFileSync(proguardPath, 'utf8') : ''
        if (!current.includes('mobilewalletadapter') || !current.includes('solanamobile')) {
          const merged = (current.trim() ? current.trim() + '\n\n' : '') + RULES_BLOCK + '\n'
          fs.writeFileSync(proguardPath, merged, 'utf8')
        }
      } catch (e) {
        console.warn('[with-proguard-walletadapter] failed to ensure rules:', e)
      }

      return cfg
    },
  ])
}
