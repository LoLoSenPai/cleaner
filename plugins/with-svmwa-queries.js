// plugins/with-svmwa-queries.js
const { withAndroidManifest } = require('@expo/config-plugins')

function ensureQueries(manifestNode) {
  manifestNode.queries = manifestNode.queries || []

  const already = manifestNode.queries.some((q) =>
    q.intent?.some?.(
      (i) =>
        i.action?.some?.((a) => a.$['android:name'] === 'android.intent.action.VIEW') &&
        i.data?.some?.((d) => d.$['android:scheme'] === 'solana-wallet'),
    ),
  )

  if (!already) {
    manifestNode.queries.push({
      intent: [
        {
          action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
          data: [{ $: { 'android:scheme': 'solana-wallet' } }],
        },
      ],
    })
  }
}

module.exports = function withSvmwaQueries(config) {
  return withAndroidManifest(config, (cfg) => {
    ensureQueries(cfg.modResults.manifest)
    return cfg
  })
}
