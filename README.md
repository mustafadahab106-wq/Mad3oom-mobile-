# تطبيق مدعوم للموبايل

تطبيق Expo React Native مرتبط مباشرة بباك إند مدعوم على Railway:

`https://mad3oom-api2-production.up.railway.app`

## التشغيل

1. ثبّت Node.js.
2. داخل مجلد المشروع:
   `npm install`
3. افحص توافق الحزم:
   `npx expo install --fix`
4. شغّل:
   `npx expo start`
5. امسح QR بواسطة Expo Go على Android.

## إنشاء APK

1. `npm install -g eas-cli`
2. `eas login`
3. `eas build --platform android --profile preview`

## المزايا الحالية

- الرئيسية والإعلانات والبحث.
- تفاصيل الإعلان ومعرض الصور.
- إخفاء آخر 6 خانات من VIN.
- اتصال وواتساب ومحادثات.
- تسجيل الدخول وإنشاء الحساب.
- إضافة إعلان من الكاميرا أو الاستديو حتى 8 صور.
- تعليمات زوايا تصوير السيارة.
- الحساب وتسجيل الخروج.

## ملاحظة

مسارات الباك إند مستخدمة بدون بادئة `/api` حسب نسخة Railway الحالية.
