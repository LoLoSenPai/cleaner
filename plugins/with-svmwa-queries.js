// plugins/with-svmwa-queries.js
const { withAndroidManifest } = require('@expo/config-plugins')

function hasQuery(manifest, predicate) {
  return (manifest.queries ?? []).some((q) => (q.intent ?? []).some((i) => predicate(i)))
}

function pushQuery(manifest, intent) {
  manifest.queries = manifest.queries || []
  manifest.queries.push({ intent: [intent] })
}

function ensureQueries(manifest) {
  // VIEW https
  if (
    !hasQuery(
      manifest,
      (i) =>
        (i.action ?? []).some((a) => a.$['android:name'] === 'android.intent.action.VIEW') &&
        (i.category ?? []).some?.((c) => c.$['android:name'] === 'android.intent.category.BROWSABLE') &&
        (i.data ?? []).some((d) => d.$['android:scheme'] === 'https'),
    )
  ) {
    pushQuery(manifest, {
      action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
      category: [{ $: { 'android:name': 'android.intent.category.BROWSABLE' } }],
      data: [{ $: { 'android:scheme': 'https' } }],
    })
  }

  // solana-wallet scheme (generic wallet URL scheme)
  if (
    !hasQuery(
      manifest,
      (i) =>
        (i.action ?? []).some((a) => a.$['android:name'] === 'android.intent.action.VIEW') &&
        (i.data ?? []).some((d) => d.$['android:scheme'] === 'solana-wallet'),
    )
  ) {
    pushQuery(manifest, {
      action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
      data: [{ $: { 'android:scheme': 'solana-wallet' } }],
    })
  }

  // Phantom scheme
  if (
    !hasQuery(
      manifest,
      (i) =>
        (i.action ?? []).some((a) => a.$['android:name'] === 'android.intent.action.VIEW') &&
        (i.data ?? []).some((d) => d.$['android:scheme'] === 'phantom'),
    )
  ) {
    pushQuery(manifest, {
      action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
      data: [{ $: { 'android:scheme': 'phantom' } }],
    })
  }

  // MWA bind actions (les deux variantes)
  if (
    !hasQuery(manifest, (i) =>
      (i.action ?? []).some((a) => a.$['android:name'] === 'com.solana.mobilewalletadapter.action.BIND_WALLET_SERVICE'),
    )
  ) {
    pushQuery(manifest, {
      action: [{ $: { 'android:name': 'com.solana.mobilewalletadapter.action.BIND_WALLET_SERVICE' } }],
    })
  }
  if (
    !hasQuery(manifest, (i) =>
      (i.action ?? []).some((a) => a.$['android:name'] === 'com.solanamobile.walletadapter.BIND_WALLET_SERVICE'),
    )
  ) {
    pushQuery(manifest, {
      action: [{ $: { 'android:name': 'com.solanamobile.walletadapter.BIND_WALLET_SERVICE' } }],
    })
  }
}

module.exports = function withSvmwaQueries(config) {
  return withAndroidManifest(config, (cfg) => {
    ensureQueries(cfg.modResults.manifest)
    return cfg
  })
}
