# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# Solana Mobile Wallet Adapter
-keep class com.solana.mobilewalletadapter.** { *; }
-keep interface com.solana.mobilewalletadapter.** { *; }
-dontwarn com.solana.mobilewalletadapter.**

# Parfois packagé ainsi :
-keep class com.solanamobile.** { *; }
-keep interface com.solanamobile.** { *; }
-dontwarn com.solanamobile.**

# (optionnel) libs communes
-keep class kotlinx.** { *; }
-dontwarn kotlinx.**
-keep class org.json.** { *; }
-dontwarn org.json.**