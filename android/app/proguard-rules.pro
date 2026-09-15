# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*

# Capacitor Plugin rules
-keep public class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keep public class * extends com.getcapacitor.Bridge { *; }

# RevenueCat & Purchases
-keep class com.revenuecat.purchases.** { *; }

# Biometrics
-keep class com.aparajita.capacitor.biometricauth.** { *; }