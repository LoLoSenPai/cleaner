// polyfill.js
import { getRandomValues as expoGetRandomValues } from 'expo-crypto'
import process from 'process'
import 'react-native-get-random-values'

import { Buffer } from 'buffer'
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer
}

if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = { getRandomValues: expoGetRandomValues }
}

if (typeof globalThis.process === 'undefined') {
  globalThis.process = process
}
